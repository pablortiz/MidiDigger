// SoundFont preview engine: the user's .sf2 (GeneralUser GS by default) played in the page by
// spessasynth_core (Apache-2.0), a full General MIDI synth: 16 channels, Program Change, Bank
// Select, drums on channel 10. Measured: GeneralUser loads in about 0.1 s and renders 20x
// faster than real time, events land within a few ms of their time.
//
// It renders through a ScriptProcessorNode, which needs no AudioWorklet module (Windows loads
// add-ons from file://). Messages wait in a queue and go to the synth just before the block
// they fall in, with their exact time, so a stop can drop what has not sounded yet.

import { SoundBankLoader, SpessaSynthProcessor } from 'spessasynth_core';

const BLOCK = 1024;   // samples per ScriptProcessor callback (about 21 ms at 48 kHz)

/** Locate a saved preset by its complete identity, not only its program number. */
export function findSoundFontPreset(bank, sound) {
  return bank?.presets.find((p) => p.name === sound.name && p.program === sound.program
    && p.bankMSB === sound.bankMSB && p.bankLSB === sound.bankLSB
    && p.isGMGSDrum === sound.isGMGSDrum && p.isDrum === sound.isDrum);
}

/** Some banks contain presets MIDI bank selection alone cannot address exactly. */
export function applySoundFontProgram(synth, bytes, time, preset) {
  const channel = synth.midiChannels[bytes[0] & 15];
  channel.setSystemParameter('presetLock', false);
  synth.processMessage(bytes, 0, { time });
  if (preset) {
    channel.preset = preset;
    channel.setSystemParameter('presetLock', true);
  }
}

/** Apply messages at their sample position, including exact preset overrides. */
export function processSoundFontBlock(synth, left, right, offset, length, sampleRate, messages, presets) {
  const start = synth.currentTime;
  let at = 0;
  for (const message of messages) {
    const next = Math.max(at, Math.min(length, Math.round((message.time - start) * sampleRate)));
    if (next > at) synth.process(left, right, offset + at, next - at);
    at = next;
    if ((message.bytes[0] & 0xf0) === 0xc0) applySoundFontProgram(synth, message.bytes, synth.currentTime, presets.get(message.bytes[0] & 15));
    else synth.processMessage(message.bytes, 0, { time: synth.currentTime });
  }
  if (at < length) synth.process(left, right, offset + at, length - at);
}

export class SoundFontEngine {
  constructor() {
    this.synth = null;
    this.node = null;
    this.ctx = null;
    this.queue = [];
    this.offset = 0;       // context time = synth time + offset
    this.name = '';
    this.presets = 0;
    this.channelPresets = new Map();
  }

  get ready() { return !!this.synth; }

  /** Parse a sound bank (SF2/SF3/DLS bytes) and build the synth for this sample rate. */
  async load(bytes, sampleRate, name = '', isCurrent = () => true) {
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const bank = SoundBankLoader.fromArrayBuffer(buffer);
    const synth = new SpessaSynthProcessor(sampleRate, { eventsEnabled: false, maxBufferSize: 128 });
    synth.soundBankManager.addSoundBank(bank, 'main');
    await synth.processorInitialized;
    if (!isCurrent()) return false;
    synth.setSystemParameter('autoAllocateVoices', true);
    this.synth = synth;
    this.bank = bank;   // also used to render parts for LUNA (render.js)
    this.name = name;
    this.presets = bank.presets.length;
    return true;
  }

  /** Start rendering into `destination` of `ctx`. */
  attach(ctx, destination) {
    if (this.node) return;
    this.ctx = ctx;
    const node = ctx.createScriptProcessor(BLOCK, 0, 2);
    node.onaudioprocess = (e) => this.render(e);
    node.connect(destination);
    this.node = node;
  }

  render(e) {
    const left = e.outputBuffer.getChannelData(0);
    const right = e.outputBuffer.getChannelData(1);
    left.fill(0);
    right.fill(0);
    const synth = this.synth;
    if (!synth) return;
    // This block plays at e.playbackTime; messages due before its end go in, at their time.
    this.offset = e.playbackTime - synth.currentTime;
    for (let i = 0; i < BLOCK; i += 128) {
      const end = e.playbackTime + (i + 128) / this.ctx.sampleRate;
      const messages = [];
      while (this.queue.length && this.queue[0].t < end) {
        const m = this.queue.shift();
        messages.push({ bytes: m.bytes, time: m.t - this.offset });
      }
      processSoundFontBlock(synth, left, right, i, 128, this.ctx.sampleRate, messages, this.channelPresets);
    }
  }

  /** Queue one MIDI message for context time t. */
  send(t, status, d1, d2 = 0) {
    const bytes = (status & 0xf0) === 0xc0 || (status & 0xf0) === 0xd0 ? [status, d1] : [status, d1, d2];
    const q = this.queue;
    let i = q.length;
    while (i > 0 && q[i - 1].t > t) i--;
    q.splice(i, 0, { t, bytes });
  }

  /**
   * Channel `ch` plays `preset` from now on, whatever its bank and program would choose (a sound
   * being tried in the row's dialog, on a channel of its own). At once, not queued.
   */
  force(ch, preset) {
    if (!this.synth || !preset) return;
    applySoundFontProgram(this.synth, [0xc0 | ch, preset.program], this.synth.currentTime, preset);
  }

  /** Now: drop what has not sounded and stop every note. */
  silence() {
    this.queue = [];
    this.synth?.stopAllChannels(true);
  }
}

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SoundBankLoader, SpessaSynthProcessor } from 'spessasynth_core';
import { findSoundFontPreset, processSoundFontBlock, SoundFontEngine } from '../src/preview/sf-engine.js';
import { renderPart } from '../src/preview/render.js';

describe('SoundFont row presets', () => {
  it('does not install a SoundFont when its load has been superseded', async () => {
    const bytes = readFileSync(new URL('../sounds/GeneralUser-GS.sf2', import.meta.url));
    const engine = new SoundFontEngine();
    expect(await engine.load(bytes, 48000, 'old', () => false)).toBe(false);
    expect(engine.ready).toBe(false);
  });

  it('plays the exact drum kit, even when MIDI bank selection chooses another preset', async () => {
    const bytes = readFileSync(new URL('../sounds/GeneralUser-GS.sf2', import.meta.url));
    const bank = SoundBankLoader.fromArrayBuffer(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    const kit = bank.presets.find((p) => p.name === 'Standard 2 Kit' && p.isDrum);
    const sound = { name: kit.name, program: kit.program, bankMSB: kit.bankMSB, bankLSB: kit.bankLSB, isDrum: kit.isDrum, isGMGSDrum: kit.isGMGSDrum };
    expect(findSoundFontPreset(bank, sound)).toBe(kit);
    expect(findSoundFontPreset(bank, { ...sound, bankMSB: 127 })).toBeUndefined();
    const synth = new SpessaSynthProcessor(48000, { eventsEnabled: false, maxBufferSize: 128 });
    synth.soundBankManager.addSoundBank(bank, 'main');
    await synth.processorInitialized;
    const left = new Float32Array(128), right = new Float32Array(128);
    processSoundFontBlock(synth, left, right, 0, 128, 48000, [
      { time: 0, bytes: [0xb9, 0, kit.bankMSB] },
      { time: 0, bytes: [0xb9, 32, kit.bankLSB] },
      { time: 0, bytes: [0xc9, kit.program] },
      { time: 0.0005, bytes: [0x99, 36, 100] },
    ], new Map([[9, kit]]));
    expect(synth.midiChannels[9].preset).toBe(kit);
    expect(Math.max(...left.map(Math.abs))).toBeGreaterThan(0);
    expect(left.slice(0, 24).every((sample) => sample === 0)).toBe(true);
  });

  it('renders the selected kit offline rather than the kit in the MIDI program change', async () => {
    const bytes = readFileSync(new URL('../sounds/GeneralUser-GS.sf2', import.meta.url));
    const bank = SoundBankLoader.fromArrayBuffer(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    const kits = ['Standard 1 Kit', 'Standard 2 Kit'].map((name) => bank.presets.find((p) => p.name === name && p.isDrum));
    const info = { ppq: 480, events: [
      { type: 'pc', ch: 9, tick: 0, a: 0 },
      { type: 'on', ch: 9, tick: 0, a: 38, b: 100 },
      { type: 'off', ch: 9, tick: 240, a: 38, b: 0 },
    ] };
    const options = { bank, info, channels: new Set([10]), startTick: 0, endTick: 480, bpm: 120, tail: 0 };
    const first = await renderPart({ ...options, presets: new Map([[9, kits[0]]]) });
    const second = await renderPart({ ...options, presets: new Map([[9, kits[1]]]) });
    expect(first.wav.slice(256, 4096)).not.toEqual(second.wav.slice(256, 4096));
  });
});

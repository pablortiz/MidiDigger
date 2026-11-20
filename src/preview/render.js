// Offline render of a part to WAV with the same soundfont and engine as the preview, so what
// goes to LUNA sounds exactly like what was heard. Timed on the bar grid at a fixed tempo (the
// LUNA session's), so the audio lines up with LUNA's bars whatever the file's own tempo.

import { audioToWav, SpessaSynthProcessor } from 'spessasynth_core';
import { EARLY } from '../midi/parts.js';
import { processSoundFontBlock } from './sf-engine.js';

const BLOCK = 128;
const LSB = 1 / 32768;   // one step of 16-bit audio, about -96 dB

/**
 * Make this render's bytes unique: a random ±1 LSB pattern on its first 32 samples, far below
 * hearing. LUNA files "identical" audio once and answers an upload with the existing source;
 * stems of the same range share their size and often a silent start, and LUNA took one for
 * another (the drum track got the bass audio, measured in LUNA 3.1.1).
 */
function markUnique(left, right) {
  const id = crypto.getRandomValues(new Uint32Array(1))[0];
  for (let k = 0; k < 32 && k < left.length; k++) {
    const bit = (id >>> k) & 1 ? LSB : -LSB;
    left[k] += bit;
    right[k] -= bit;
  }
}

/**
 * Render channels (a Set of 1-16) of a parsed file over ticks [startTick, endTick), repeated
 * `repeat` times, at `bpm`. Notes still sounding at the end of a lap stop there; `tail`
 * seconds let the last notes ring out.
 *
 * `loopable` (a region): what rings past the end is folded back onto the start, where the next
 * lap would hear it, as the preview's loop does. The clip is then exactly the range and loops
 * seamlessly in LUNA. Without it (a whole part) the clip keeps the tail at its end.
 *
 * The audio starts at startTick, silence before the first note and all, so a clip of it sits on
 * its bar line and moving it in LUNA bar by bar keeps it in time (markUnique keeps two stems
 * with the same silent start from being taken for one another).
 * Resolves to { wav, clipStartTicks (0), clipEndTicks, clipSeconds, lapSeconds } (ticks from
 * startTick), or null when the channels play nothing in the range.
 */
export async function renderPart({ bank, info, channels, startTick, endTick, repeat = 1, bpm, sampleRate = 48000, tail = 1.5, loopable = false, transpose = 0, gain = 1, presets = new Map(), onProgress }) {
  if (!info.ppq) throw new Error('This file uses SMPTE time: it cannot be aligned to bars.');
  // A note played just before the range's first bar line is its downbeat; one played just
  // before its end, the next bar's (EARLY), as the preview plays them.
  const early = EARLY * info.ppq;
  const firstOn = info.events.find((e) => e.type === 'on' && channels.has(e.ch + 1) && e.tick >= startTick - early && e.tick < endTick - early);
  if (!firstOn) return null;
  const secPerTick = 60 / bpm / info.ppq;
  const lapSec = (endTick - startTick) * secPerTick;
  const totalSec = lapSec * repeat;
  const samples = Math.ceil((totalSec + tail) * sampleRate);

  const synth = new SpessaSynthProcessor(sampleRate, { eventsEnabled: false, maxBufferSize: BLOCK });
  synth.soundBankManager.addSoundBank(bank, 'main');
  await synth.processorInitialized;
  synth.setSystemParameter('autoAllocateVoices', true);

  const mine = info.events.filter((e) => channels.has(e.ch + 1));
  const used = [...new Set(mine.map((e) => e.ch))];
  const msgs = [];
  const push = (t, bytes) => msgs.push({ t, bytes });
  // `transpose` (a part moved to another key) moves the notes, never drums.
  const pitch = (ch, a) => (ch === 9 ? a : Math.max(0, Math.min(127, a + transpose)));
  // `gain`: a channel's volume (its slider) times the song's, as the preview plays it.
  const cc7 = (v) => Math.max(0, Math.min(127, Math.round(v * gain)));
  const bytesOf = (e) => (e.type === 'on' ? [0x90 | e.ch, pitch(e.ch, e.a), e.b] : e.type === 'off' ? [0x80 | e.ch, pitch(e.ch, e.a), 0] : e.type === 'pc' ? [0xc0 | e.ch, e.a] : [0xb0 | e.ch, e.a, e.a === 7 ? cc7(e.b) : e.b]);

  // Each channel's program and controllers as they stand where the range starts.
  const setup = new Map();
  if (gain !== 1) for (const c of used) setup.set(`${c}:cc7`, { type: 'cc', ch: c, a: 7, b: 100 });   // the song's, if it sets none
  for (const e of mine) {
    if (e.tick >= startTick) break;
    if (e.type === 'pc') setup.set(`${e.ch}:pc`, e);
    else if (e.type === 'cc' && e.a !== 64 && e.a !== 123) setup.set(`${e.ch}:cc${e.a}`, e);
  }
  for (const e of setup.values()) push(0, bytesOf(e));

  for (let r = 0; r < repeat; r++) {
    const base = r * lapSec;
    // Notes sounding, counted: the same pitch struck again before it ends needs both its offs.
    const held = new Map();
    for (const e of mine) {
      if (e.tick < startTick - early) continue;
      if (e.tick >= endTick) break;
      const note = e.type === 'on' || e.type === 'off';
      if (e.tick < startTick && !note) continue;
      if (e.type === 'on' && e.tick >= endTick - early) continue;
      const key = e.ch * 128 + e.a;
      if (e.type === 'off') {
        const n = held.get(key) ?? 0;
        if (!n) continue;   // a note that began before the range
        if (n > 1) held.set(key, n - 1);
        else held.delete(key);
      } else if (e.type === 'on') held.set(key, (held.get(key) ?? 0) + 1);
      // (Its end, if before the bar line too, just after it.)
      push(base + (e.tick >= startTick ? e.tick - startTick : e.type === 'off' ? 1 : 0) * secPerTick, bytesOf(e));
    }
    // Lap end: what still sounds stops, so every lap (and the next clip) starts clean.
    const end = base + lapSec - 0.0005;
    for (const [key, n] of held) for (let j = 0; j < n; j++) push(end, [0x80 | (key >> 7), pitch(key >> 7, key & 127), 0]);
    for (const c of used) push(end, [0xb0 | c, 64, 0]);
  }
  msgs.sort((a, b) => a.t - b.t);

  const left = new Float32Array(samples);
  const right = new Float32Array(samples);
  let next = 0;
  let sliceAt = performance.now();
  for (let i = 0; i < samples; i += BLOCK) {
    const blockEnd = (i + BLOCK) / sampleRate;
    const messages = [];
    while (next < msgs.length && msgs[next].t < blockEnd) {
      messages.push({ bytes: msgs[next].bytes, time: msgs[next].t });
      next++;
    }
    processSoundFontBlock(synth, left, right, i, Math.min(BLOCK, samples - i), sampleRate, messages, presets);
    if (performance.now() - sliceAt > 30) {
      onProgress?.(i / samples);
      await new Promise((r) => setTimeout(r, 0));   // keep the window responsive
      sliceAt = performance.now();
    }
  }
  // No synth.destroySynthProcessor(): it also empties the sound bank this synth shares with the
  // preview, and every later render came out silent (measured). The garbage collector frees it.

  const endSample = Math.round(totalSec * sampleRate);
  let usable = samples;
  if (loopable) {
    // Fold the tail onto the start: the clip loops like the preview's loop.
    for (let i = endSample, j = 0; i < samples; i++, j++) { left[j] += left[i]; right[j] += right[i]; }
    usable = endSample;
  }
  // From the range's start, its silence too: the clip on its bar line. A few ms of silence more,
  // at random, beyond the clip: no two stems have the same length.
  const extra = Math.floor(Math.random() * 0.05 * sampleRate);
  const l = new Float32Array(usable + extra);
  const r = new Float32Array(usable + extra);
  l.set(left.subarray(0, usable));
  r.set(right.subarray(0, usable));
  // Notes went in: silence coming out is a fault, never a stem to put in LUNA.
  let peak = 0;
  for (let i = 0; i < l.length; i += 64) peak = Math.max(peak, Math.abs(l[i]), Math.abs(r[i]));
  if (peak < 1e-4) throw new Error('the rendered audio came out silent (the soundfont did not respond); not sent to LUNA');
  markUnique(l, r);
  // No normalizing: each stem keeps its level, so the stems together mix like the original.
  const wav = new Uint8Array(audioToWav([l, r], sampleRate, { normalizeAudio: false, metadata: {} }));
  const clipEndSec = usable / sampleRate;
  return {
    wav,
    lapSeconds: lapSec,
    clipStartTicks: 0,
    clipEndTicks: clipEndSec / secPerTick,
    clipSeconds: clipEndSec,
  };
}

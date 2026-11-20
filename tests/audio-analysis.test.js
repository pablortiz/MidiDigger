import { describe, expect, it } from 'vitest';
import { analyseTrack, wavSegment } from '../src/midi/audio-analysis.js';

const RATE = 48000;

/** A seeded noise, the same on every run. */
function noise(seed = 1) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 31 - 1; };
}

/** 4 s at 120 BPM: kick on 1 and 3 (0 and 1 s…), snare on 2 and 4, hats on every 8th. */
function drumKit() {
  const out = new Float32Array(RATE * 4);
  const rnd = noise(7);
  const add = (t0, f) => { for (let i = Math.round(t0 * RATE), k = 0; i < out.length && k < RATE * 0.4; i++, k++) out[i] += f(k / RATE); };
  for (let t = 0; t < 4; t += 1) add(t, (t1) => 0.9 * Math.sin(2 * Math.PI * 60 * t1) * Math.exp(-t1 / 0.06));        // kick
  for (let t = 0.5; t < 4; t += 1) add(t, (t1) => 0.5 * rnd() * Math.exp(-t1 / 0.05) + 0.4 * Math.sin(2 * Math.PI * 200 * t1) * Math.exp(-t1 / 0.04));   // snare
  for (let t = 0; t < 4; t += 0.25) add(t, (t1) => 0.12 * rnd() * Math.exp(-t1 / 0.015));                           // hats
  return out;
}

/** 4 s of bass: a note every half second (A1, E1, G1, D2…), held to the next. */
function bassLine() {
  const out = new Float32Array(RATE * 4);
  const notes = [55, 41.2, 49, 73.4, 55, 41.2, 49, 82.4];
  for (let n = 0; n < 8; n++) {
    for (let k = 0; k < RATE * 0.5; k++) {
      const t = k / RATE;
      out[n * RATE * 0.5 + k] = 0.7 * Math.min(1, t / 0.01) * Math.exp(-t / 1.5) * Math.sin(2 * Math.PI * notes[n] * t);
    }
  }
  return out;
}

/** 4 s of a pad: an A minor chord held, coming in slowly. */
function pad() {
  const out = new Float32Array(RATE * 4);
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    out[i] = 0.2 * Math.min(1, t / 0.8) * (Math.sin(2 * Math.PI * 220 * t) + Math.sin(2 * Math.PI * 261.6 * t) + Math.sin(2 * Math.PI * 329.6 * t));
  }
  return out;
}

describe('an audio track of the session', () => {
  it('tells drums by how they strike, and keeps their kick and snare, not the hats', () => {
    const got = analyseTrack(drumKit(), RATE);
    expect(got.role).toBe('drums');
    // Kick on 0, 1, 2, 3 s and snare on 0.5, 1.5…: 8 hits, a few ms out at most; no hat between.
    expect(got.hits.length).toBe(8);
    got.hits.forEach((sec, k) => expect(Math.abs(sec - k * 0.5)).toBeLessThan(0.012));
  });

  it('tells a bass by its lows held, and finds its notes', () => {
    const got = analyseTrack(bassLine(), RATE);
    expect(got.role).toBe('bass');
    expect(got.hits.length).toBe(8);
    // A low note is timed to about a cycle of it (18 ms at 55 Hz): well inside a 16th (125 ms
    // at 120 BPM), the grid the groove is read on.
    got.hits.forEach((sec, k) => expect(Math.abs(sec - k * 0.5)).toBeLessThan(0.025));
  });

  it('leaves a pad out: neither drums nor bass', () => {
    expect(analyseTrack(pad(), RATE).role).toBe('other');
  });

  it('does not take a low pad for a bass: as low and held, but it hardly strikes', () => {
    // A low A held 4 s, coming in slowly: what a "New Age Pad" did in a LUNA session.
    const low = new Float32Array(RATE * 4);
    for (let i = 0; i < low.length; i++) { const t = i / RATE; low[i] = 0.6 * Math.min(1, t / 0.5) * Math.sin(2 * Math.PI * 55 * t); }
    expect(analyseTrack(low, RATE).role).toBe('other');
  });
});

describe('a WAV file read in part', () => {
  it('takes only the seconds asked for, its channels mixed', () => {
    // 16-bit stereo, 1 s at 8 kHz: left 0.5, right -0.25 all through.
    const rate = 8000;
    const frames = rate;
    const bytes = new Uint8Array(44 + frames * 4);
    const v = new DataView(bytes.buffer);
    const put = (at, s) => [...s].forEach((c, k) => { bytes[at + k] = c.charCodeAt(0); });
    put(0, 'RIFF'); v.setUint32(4, 36 + frames * 4, true); put(8, 'WAVE');
    put(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true);
    put(36, 'data'); v.setUint32(40, frames * 4, true);
    for (let f = 0; f < frames; f++) { v.setInt16(44 + f * 4, 16384, true); v.setInt16(46 + f * 4, -8192, true); }
    const got = wavSegment(bytes, 0.25, 0.5);
    expect(got.rate).toBe(8000);
    expect(got.samples.length).toBe(2000);
    expect(got.samples[0]).toBeCloseTo(0.125, 4);   // (0.5 + -0.25) / 2
    expect(wavSegment(new Uint8Array(10))).toBe(null);
  });
});

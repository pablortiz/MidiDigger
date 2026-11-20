import { describe, expect, it } from 'vitest';
import { onsetsOf, strongHits } from '../src/midi/audio-onsets.js';

const RATE = 384;   // LUNA's fine overview: a peak every 2.6 ms

/** An envelope `sec` long with a decaying hit at each [time, level], a little noise under it. */
function envelope(sec, hits) {
  const e = new Float32Array(Math.round(sec * RATE));
  for (let i = 0; i < e.length; i++) e[i] = 0.01 + 0.005 * Math.sin(i * 1.7);
  for (const [t, level] of hits) {
    const at = Math.round(t * RATE);
    for (let k = 0; k < RATE * 0.25 && at + k < e.length; k++) e[at + k] = Math.max(e[at + k], level * Math.exp(-k / 20));
  }
  return e;
}

describe('hits in an audio track', () => {
  it('finds each hit where it starts, a few ms out at most', () => {
    // 120 BPM: kick and snare on every beat (0.5 s), hats between at a third of the level.
    const hits = [];
    for (let b = 0; b < 8; b++) { hits.push([b * 0.5, 0.9]); hits.push([b * 0.5 + 0.25, 0.3]); }
    const got = onsetsOf(envelope(4, hits), RATE);
    expect(got.length).toBe(16);
    got.forEach((h, k) => expect(Math.abs(h.sec - hits[k][0])).toBeLessThan(0.008));
    // The groove keeps the strong ones: the beats, not the hats.
    expect(strongHits(got).map((h) => Math.round(h.sec * 4) / 4)).toEqual([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5]);
  });

  it('finds nothing in a held, steady sound', () => {
    const pad = new Float32Array(RATE * 3).fill(0.4);
    expect(onsetsOf(pad, RATE)).toEqual([]);
  });

  it('reads a quiet track as a loud one', () => {
    const loud = onsetsOf(envelope(2, [[0.25, 0.8], [1.25, 0.8]]), RATE).map((h) => h.sec);
    const quiet = onsetsOf(envelope(2, [[0.25, 0.08], [1.25, 0.08]]), RATE).map((h) => h.sec);
    expect(quiet).toEqual(loud);
  });
});

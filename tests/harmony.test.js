import { describe, expect, it } from 'vitest';
import { smf, noteEvents } from './smf.js';
import { parseMidi } from '../src/midi/parser.js';
import { FRAG, PART, fileRecord } from '../src/midi/features.js';
import { HARMONY_GOOD, HARMONY_OK, STEPS_PER_BEAT, coarser, harmonyFeatures, harmonyFit, noteGrid, sounds, transposed } from '../src/midi/harmony.js';
import { addRow, loopGrid, newLoop, placeClip } from '../src/midi/loop.js';

const SPB = 4 * STEPS_PER_BEAT;   // steps of a 4/4 bar
/** Bars of held chords: each a list of pitches. */
const bars = (...chords) => noteGrid(chords.flatMap((pitches, b) => pitches.map((pitch) => ({ at: b * SPB, len: SPB, pitch }))), chords.length * SPB);
const C = [60, 64, 67], Am = [57, 60, 64], F = [53, 57, 60], G = [55, 59, 62], Db = [61, 65, 68];

describe('a grid of notes', () => {
  it('holds the pitch classes that sound on each step', () => {
    const g = noteGrid([{ at: 0, len: 2, pitch: 60 }, { at: 1, len: 1, pitch: 76 }, { at: 3.4, len: 0.2, pitch: 59 }, { at: 9, len: 1, pitch: 60 }, { at: -1, len: 3, pitch: 61 }], 4);
    expect([...g]).toEqual([1, 1 | 16, 0, 2048]);
    expect(sounds(g)).toBe(true);
    expect(sounds(new Uint16Array(4))).toBe(false);
  });

  it('is moved by semitones round the octave, and made coarser by joining steps', () => {
    expect([...transposed(new Uint16Array([1, 2048]), 1)]).toEqual([2, 1]);
    expect([...transposed(new Uint16Array([1]), -1)]).toEqual([2048]);
    expect([...coarser(new Uint16Array([1, 2, 0, 4, 8]), 2)]).toEqual([3, 4, 8]);
  });
});

describe('how a fragment goes over what plays', () => {
  it('fits well on the same chords and badly a semitone away', () => {
    const ctx = bars(C, Am, F, G);
    const same = harmonyFit(ctx, bars(C, Am, F, G), 0, SPB);
    const off = harmonyFit(ctx, bars(C, Am, F, G), 1, SPB);
    expect(same).toMatchObject({ clash: 0, cover: 1 });
    expect(same.chroma).toBeCloseTo(1);
    expect(same.fit).toBeGreaterThan(HARMONY_GOOD);
    expect(off.clash).toBe(1);
    expect(off.fit).toBeLessThan(0.1);
    expect(off.fit).toBeLessThan(HARMONY_OK);
  });

  it('is measured as it will sound: moved to the key first', () => {
    const ctx = bars(C, C);
    expect(harmonyFit(ctx, bars(Db, Db), -1, SPB).fit).toBeCloseTo(harmonyFit(ctx, bars(C, C), 0, SPB).fit);
  });

  it('goes round when it is shorter than what plays', () => {
    const f = harmonyFeatures(bars(C, Am, C, Am), bars(C, Am), 0, SPB);
    expect(f.clash).toBe(0);
    expect(f.chroma).toBeCloseTo(1);
    expect(f.both).toBe(4 * SPB);
  });

  it('cannot be told where one of the two is silent throughout', () => {
    expect(harmonyFit(bars(C), new Uint16Array(SPB), 0, SPB)).toBeNull();
    expect(harmonyFit(null, bars(C), 0, SPB)).toBeNull();
  });

  it('does not count as a clash what never sounds at the same time', () => {
    const ctx = noteGrid([{ at: 0, len: SPB / 2, pitch: 60 }], SPB);
    const cand = noteGrid([{ at: SPB / 2, len: SPB / 2, pitch: 61 }], SPB);
    expect(harmonyFeatures(ctx, cand, 0, SPB)).toMatchObject({ clash: 0, both: 0 });
  });
});

describe('the grids the add-on keeps', () => {
  it('a file record has one for each pitched fragment, over its whole bars, and none for drums', () => {
    // Two bars of a C chord then two of rest, twice; drums on every beat.
    const chord = [0, 4 * 384].flatMap((t) => [60, 64, 67].flatMap((p) => [[t, p, 380], [t + 384, p, 380]]));
    const drums = Array.from({ length: 32 }, (_, k) => [k * 96, 36, 24]);
    const info = parseMidi(smf(1, 96, [noteEvents(0, chord), noteEvents(9, drums)]));
    const record = fileRecord('x.mid', info);
    const piano = record.parts.find((p) => p[PART.ch] === 1);
    const frag = piano[PART.frags][0];
    expect(frag[FRAG.bars]).toBe(2);
    expect(frag[FRAG.grid]).toBeInstanceOf(Uint16Array);
    expect(frag[FRAG.grid]).toHaveLength(2 * SPB);
    expect(new Set(frag[FRAG.grid])).toEqual(new Set([1 | 16 | 128]));
    expect(record.parts.find((p) => p[PART.ch] === 10)[PART.frags][0][FRAG.grid]).toBeNull();
  });

  it('a loop has one of what its pitched rows sound, in its key, without muted rows or pads off', () => {
    const loop = { ...newLoop(), length: 2, key: '0 mayor' };
    const row = addRow(loop, { program: 0, drums: false, name: 'Piano' });
    const clip = (pitch, transpose = 0) => ({ name: 'x', key: '0 mayor', bars: 1, transpose, notes: [{ beat: 0, len: 4, pitch, vel: 100 }] });
    placeClip(row, 0, clip(60));
    placeClip(row, 1, clip(60, 2));
    const kit = addRow(loop, { program: 0, drums: true, name: 'Drums' });
    placeClip(kit, 0, clip(36));
    const { grid, stepsPerBar } = loopGrid(loop);
    expect(stepsPerBar).toBe(SPB);
    expect([...grid.subarray(0, 2 * SPB)]).toEqual([...new Array(SPB).fill(1), ...new Array(SPB).fill(4)]);
    row.off.push(1);
    expect([...loopGrid(loop).grid.subarray(SPB, 2 * SPB)]).toEqual(new Array(SPB).fill(0));
    expect(loopGrid(loop, { except: row })).toBeNull();
    row.mute = true;
    expect(loopGrid(loop)).toBeNull();
  });
});

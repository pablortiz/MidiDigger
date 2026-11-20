import { describe, expect, it } from 'vitest';
import { grooveFit, grooveNote, grooveOf, grooveText, grooveUnion } from '../src/midi/groove.js';
import { addRow, loopGrooves, newLoop, placeClip } from '../src/midi/loop.js';

// Onsets (quarter notes) of `bars` bars, the same in each: `inBar` the beats struck in a bar.
const repeat = (inBar, bars, perBar = 4) => Array.from({ length: bars }, (_, b) => inBar.map((x) => b * perBar + x)).flat();

describe('groove', () => {
  it('folds the bars into one: the 16ths struck in a third of them or more', () => {
    const four = grooveOf(repeat([0, 1, 2, 3], 4), 4, 4);   // four on the floor
    expect(four).toBe('16:1111');
    expect(grooveText(four)).toBe('straight, 4 of 16 16ths struck');
    // A hit in one bar of four is not the groove.
    expect(grooveOf([...repeat([0, 2], 4), 1.25], 4, 4)).toBe('16:101');   // steps 0 and 8 only
    expect(grooveOf([], 4, 4)).toBe('');
  });

  it('tells a swung part from a straight one', () => {
    expect(grooveOf(repeat([0, 2 / 3, 1, 5 / 3, 2, 8 / 3, 3, 11 / 3], 2), 4, 2).endsWith('s')).toBe(true);
    expect(grooveOf(repeat([0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], 2), 4, 2).endsWith('s')).toBe(false);
  });

  it('measures a part against the rhythm section: on its hits or the beats, and swing apart', () => {
    const kick = grooveOf(repeat([0, 1.75, 2], 2), 4, 2);   // a kick that pushes the third beat
    const locked = grooveOf(repeat([0, 1.75, 2, 3], 2), 4, 2);   // a bass on those and a beat
    const loose = grooveOf(repeat([0.25, 0.75, 1.25, 2.75], 2), 4, 2);   // 16ths of its own
    expect(grooveFit(locked, kick)).toBe(1);
    expect(grooveFit(loose, kick)).toBe(0);
    expect(grooveFit(grooveOf(repeat([0.5, 1.5], 2), 4, 2), kick, { loose: true })).toBe(1);   // 8ths: fine for chords
    const swung = grooveOf(repeat([0, 2 / 3, 1, 5 / 3, 2, 8 / 3, 3, 11 / 3], 2), 4, 2);
    // Half its hits on the beats (0.5), and swung on a straight section: half of that.
    expect(grooveFit(swung, grooveOf(repeat([0, 1, 2, 3], 2), 4, 2))).toBe(0.25);
    expect(grooveFit('', kick)).toBeNull();
    expect(grooveUnion([grooveOf(repeat([0], 2), 4, 2), grooveOf(repeat([2], 2), 4, 2)])).toBe('16:101');
  });

  it('takes only kicks, snares and claps of a drum kit', () => {
    expect([36, 38, 39, 42, 46, 51].map((p) => grooveNote(p, true))).toEqual([true, true, true, false, false, false]);
    expect(grooveNote(42, false)).toBe(true);
  });

  it('gives the loop its rhythm section: the drums and the bass rows, as they play', () => {
    const loop = { ...newLoop(), length: 2 };
    const drums = addRow(loop, { program: 0, drums: true, name: 'Drums' });
    const bass = addRow(loop, { program: 33, drums: false, name: 'Bass' });
    const notes = (beats, pitch) => beats.map((beat) => ({ beat, len: 0.25, pitch, vel: 100 }));
    placeClip(drums, 0, { name: 'd', key: '', bars: 2, notes: [...notes(repeat([0, 2], 2), 36), ...notes(repeat([0.5, 1.5, 2.5, 3.5], 2), 42)] });
    placeClip(bass, 0, { name: 'b', key: '', bars: 2, notes: notes(repeat([0, 1.75], 2), 40) });
    expect(loopGrooves(loop)).toEqual({ drums: '16:101', bass: '16:81' });   // the hats left out
  });
});

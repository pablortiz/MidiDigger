import { describe, expect, it } from 'vitest';
import { addRow, alignPads, clearBars, copyPads, layRow, layRowRange, loopFile, newLoop, pastePads, placeClip, readLoop, shiftPads, timePads } from '../src/midi/loop.js';
import { baselineFill, mergeConfirmations, retainedFill } from '../src/midi/loop-confirmations.js';

function fillClip(id, beats = [0, 4]) {
  return {
    name: id, key: '', beats: 4, bars: 2,
    notes: beats.map((beat) => ({ beat, len: 0.5, pitch: 60, vel: 100 })),
    fillOrigins: [{ id, candidate: { instrument: id }, context: { source: 'test' } }],
  };
}

function rowOf(loop) {
  return addRow(loop, { name: 'Piano', program: 0, drums: false });
}

describe('loop confirmations', () => {
  it('deduplicates repeats, excludes deleted material and reports edited and muted placements', () => {
    const loop = { ...newLoop(), length: 4 };
    const row = rowOf(loop);
    layRow(row, fillClip('a'), [{ at: 0, from: 0, bars: 4 }], 4);
    baselineFill(row, 'a');
    expect(retainedFill(loop)).toHaveLength(1);
    expect(retainedFill(loop)[0].modified).toBe(false);
    clearBars(row, 0, 1);
    expect(retainedFill(loop)[0].modified).toBe(false);
    shiftPads(loop, { r0: 0, r1: 0, c0: 1, c1: 1 }, 1, 1);
    row.mute = true;
    const result = retainedFill(loop)[0];
    expect(result.modified).toBe(true);
    expect(result.placements.every((p) => p.muted)).toBe(true);
    clearBars(row, 0, 4);
    expect(retainedFill(loop)).toEqual([]);
  });

  it('preserves provenance across copy, saved loops and undo-style snapshots', () => {
    const loop = { ...newLoop(), length: 4 };
    const row = rowOf(loop);
    placeClip(row, 0, fillClip('a'));
    baselineFill(row, 'a');
    const before = JSON.parse(JSON.stringify(loopFile(loop)));
    const copied = copyPads(loop, { r0: 0, r1: 0, c0: 0, c1: 0 }, 1);
    pastePads(loop, copied, { r: 0, c: 2 }, 1, 4);
    expect(retainedFill(loop)[0].placements).toHaveLength(2);
    clearBars(row, 0, 4);
    readLoop(loop, before);
    expect(retainedFill(loop).map((item) => item.id)).toEqual(['a']);
    expect(retainedFill(loop)[0].modified).toBe(false);
  });

  it('keeps only surviving suggestions after Fill replaces a selected range', () => {
    const loop = { ...newLoop(), length: 4 };
    const row = rowOf(loop);
    layRow(row, fillClip('a'), [{ at: 0, from: 0, bars: 4 }], 4);
    baselineFill(row, 'a');
    layRowRange(row, fillClip('b'), 0, 2, 4);
    baselineFill(row, 'b');
    expect(retainedFill(loop).map((item) => item.id).sort()).toEqual(['a', 'b']);
    clearBars(row, 2, 4);
    expect(retainedFill(loop).map((item) => item.id)).toEqual(['b']);
    expect(retainedFill(loop)[0].modified).toBe(false);
  });

  it('retains the actual contributing origins when alignment or half time combines clips', () => {
    const loop = { ...newLoop(), length: 4 };
    const row = rowOf(loop);
    placeClip(row, 0, fillClip('a', [1]));
    placeClip(row, 2, fillClip('b', [0]));
    baselineFill(row, 'a');
    baselineFill(row, 'b');
    expect(alignPads(loop, { r0: 0, r1: 0, c0: 0, c1: 3 }, 1, 'left')).toBe(true);
    expect(retainedFill(loop).map((item) => item.id).sort()).toEqual(['a', 'b']);
    expect(retainedFill(loop).every((item) => item.modified)).toBe(true);

    const other = { ...newLoop(), length: 4 };
    const otherRow = rowOf(other);
    placeClip(otherRow, 0, fillClip('a', [0]));
    placeClip(otherRow, 2, fillClip('b', [0]));
    baselineFill(otherRow, 'a');
    baselineFill(otherRow, 'b');
    timePads(other, { r0: 0, r1: 0, c0: 0, c1: 3 }, 1, 2);
    expect(retainedFill(other).map((item) => item.id)).toEqual(['a']);
  });

  it('merges backups by confirmation id and rejects malformed records', () => {
    const record = { id: 'one', loopId: 'loop', at: 'now', loop: loopFile(newLoop()), fill: [] };
    expect(mergeConfirmations([record], [record])).toEqual([record]);
    expect(() => mergeConfirmations([], [{ id: 'bad' }])).toThrow(/invalid/);
  });

  it('records off and solo-excluded placements but not material outside the loop length', () => {
    const loop = { ...newLoop(), length: 1 };
    const row = rowOf(loop);
    placeClip(row, 0, fillClip('a', [0, 4]));
    baselineFill(row, 'a');
    row.off = [0];
    const other = addRow(loop, { name: 'Other', program: 1, drums: false });
    other.solo = true;
    expect(retainedFill(loop)[0].placements[0]).toMatchObject({ offBars: [0], excludedBySolo: true });
    row.clips.get(0).notes = [{ beat: 4, len: 1, pitch: 60, vel: 100 }];
    expect(retainedFill(loop)).toEqual([]);
  });
});

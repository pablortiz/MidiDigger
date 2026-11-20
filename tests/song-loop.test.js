import { describe, expect, it } from 'vitest';
import { parseMidi } from '../src/midi/parser.js';
import { newLoop } from '../src/midi/loop.js';
import { fragmentsSongLoop, planSongImport, remixSongLoop, songLoopWindows } from '../src/midi/song-loop.js';
import { noteEvents, smf } from './smf.js';

const BAR = 384;   // 4/4 at 96 ticks a quarter note

// A chord a bar (whole notes) on channel 1, a bass note a beat on channel 2, a kick a beat on
// the drums: 24 bars, every bar another chord, so nothing repeats. Except that bar 17 plays what
// bar 9 played and bar 8 what bar 16 played: bars 9–16, looped, go back from their end to their
// start as the song itself goes on there.
const ROOTS = [62, 64, 66, 70, 61, 69, 63, 71, 60, 65, 67, 57, 68, 59, 58, 71, 60, 66, 63, 69, 61, 70, 64, 62];
const song = () => {
  const roots = [...ROOTS];
  roots[7] = roots[15];   // bar 8 as bar 16
  roots[16] = roots[8];   // bar 17 as bar 9
  const chords = roots.flatMap((r, b) => [r, r + 4, r + 7].map((p) => [b * BAR, p, BAR - 4]));
  const bass = roots.flatMap((r, b) => [0, 1, 2, 3].map((k) => [b * BAR + k * 96, r - 24, 90]));
  const kick = Array.from({ length: 24 * 4 }, (_, k) => [k * 96, 36, 30]);
  return parseMidi(smf(1, 96, [noteEvents(0, chords), noteEvents(1, bass), noteEvents(9, kick)]));
};

describe('a loop from a song where nothing repeats', () => {
  it('keeps locked rows and excludes their song channels without retaining unlocked imports', () => {
    const path = 'D:\\midi\\song.mid';
    const row = (fields, sources = []) => ({ ...fields, clips: new Map(sources.map((src, i) => [i, { src }])) });
    const drums = row({ imported: path, locked: true }, [{ path, ch: 10 }]);
    const piano = row({ imported: path, importedCh: 2, locked: true }, [{ path: 'other.mid', ch: 5 }]);
    const dragged = row({ locked: true }, [{ path, ch: 3 }]);
    const other = row({ imported: 'other.mid', locked: true }, [{ path: 'other.mid', ch: 4 }]);
    const replaced = row({ imported: path, locked: false }, [{ path, ch: 1 }]);
    const plan = planSongImport([drums, piano, dragged, other, replaced], path);
    expect(plan.rows).toEqual([drums, piano, dragged, other]);
    expect([...plan.protectedChannels].sort((a, b) => a - b)).toEqual([2, 3, 10]);
    expect(drums.clips.get(0).src).toEqual({ path, ch: 10 });
  });

  describe('remixing song fragments', () => {
    const path = 'D:\\midi\\song.mid';
    const layout = (loop) => loop.rows.map((row) => ({
      ch: row.importedCh,
      clips: [...row.clips].map(([at, clip]) => [at, clip.bars, clip.src.ch, clip.src.at]),
    }));

    it('creates different arrangements with gaps and concatenated fragments from the same song', () => {
      const info = song();
      const first = remixSongLoop(newLoop(), info, path);
      const second = remixSongLoop(first.loop, info, path, { turn: first.turn + 1 });
      const third = remixSongLoop(second.loop, info, path, { turn: second.turn + 1 });
      expect(layout(second.loop)).not.toEqual(layout(first.loop));
      expect(layout(third.loop)).not.toEqual(layout(second.loop));
      expect(first.loop.length).toBe(16);
      expect(first.rests).toBeGreaterThan(0);
      expect(first.score).toBeGreaterThan(0);
      expect(first.loop.rows.some((row) => row.clips.size > 1)).toBe(true);
      expect(first.loop.rows.some((row) => [...row.clips.values()].some((clip) => clip.src.ch !== row.importedCh))).toBe(true);
      for (const row of first.loop.rows) {
        for (const clip of row.clips.values()) {
          expect(clip.src.path).toBe(path);
          expect(clip.src.ch === 10).toBe(row.drums);
        }
      }
    });

    it('keeps locked rows untouched and excludes all their song sources from the remix', () => {
      const info = song();
      const first = remixSongLoop(newLoop(), info, path);
      const locked = first.loop.rows.find((row) => row.drums);
      locked.locked = true;
      locked.volume = 73;
      locked.off = [1];
      const before = JSON.stringify([...locked.clips]);
      const next = remixSongLoop(first.loop, info, path, { turn: first.turn + 1 });
      expect(next.loop.rows).toContain(locked);
      expect(JSON.stringify([...locked.clips])).toBe(before);
      expect(locked).toMatchObject({ volume: 73, off: [1], locked: true });
      for (const row of next.loop.rows.filter((row) => row !== locked)) {
        for (const clip of row.clips.values()) expect(clip.src.ch).not.toBe(10);
      }
      expect(first.loop.rows.find((row) => row.importedCh === 1).clips.size).toBeGreaterThan(0);
    });

    it('preserves each unlocked row sound and works with a single short fragment', () => {
      const info = parseMidi(smf(0, 96, [noteEvents(0, [[0, 60, 90]])]));
      const first = remixSongLoop({ ...newLoop(), length: 1 }, info, path);
      first.loop.rows[0].program = 42;
      const next = remixSongLoop(first.loop, info, path, { turn: first.turn + 1 });
      expect(next.loop.rows[0].program).toBe(42);
      expect([...next.loop.rows[0].clips.values()][0].notes).toHaveLength(1);
      expect(next.loop.length).toBe(1);
      expect(next.changed).toBe(false);
    });

    it('prefers the higher Fill score even when another candidate matches the slot length', () => {
      const quiet = Array.from({ length: 4 }, (_, n) => [n * 96, 60 + n, 90, 20]);
      const loud = Array.from({ length: 8 }, (_, n) => [n * 96, 72 + n, 90, 127]);
      const info = parseMidi(smf(1, 96, [noteEvents(0, quiet), noteEvents(1, loud)]));
      const result = remixSongLoop({ ...newLoop(), length: 2 }, info, path);
      const first = result.loop.rows.find((row) => row.importedCh === 1).clips.get(0);
      expect(first.bars).toBe(1);
      expect(first.src.ch).toBe(1);
    });
  });

  describe('⇉ All fragments: each instrument its different fragments one after another', () => {
    const path = 'D:\\midi\\fragments.mid';
    // Channel 1: A (bars 1–2), B (bar 4), A again (bars 6–7), C (bars 9–11), silences between.
    // Channel 2: two notes, no fragment.
    const quarters = (bar, pitches) => pitches.map((p, k) => [bar * BAR + k * 96, p, 90]);
    const A = [60, 62, 64, 65, 67, 65, 64, 62];
    const fragmentsSong = () => parseMidi(smf(1, 96, [
      noteEvents(0, [...quarters(0, A), ...quarters(3, [72, 74, 76, 77]), ...quarters(5, A), ...quarters(8, [50, 52, 53, 55, 57, 59, 60, 59, 57, 55, 53, 52])]),
      noteEvents(1, [[0, 40, 90], [BAR * 2, 41, 90]]),
    ]));
    const pads = (loop) => loop.rows.map((row) => [row.importedCh, [...row.clips].map(([at, clip]) => [at, clip.bars, clip.src.bar, clip.src.bars])]);

    it('lays them in the order the song first plays them, each once, and leaves the rest empty', () => {
      const result = fragmentsSongLoop({ ...newLoop(), length: 16 }, fragmentsSong(), path);
      expect(pads(result.loop)).toEqual([[1, [[0, 2, 1, 2], [2, 1, 4, 1], [3, 3, 9, 3]]]]);
      expect(result).toMatchObject({ added: 1, placed: 3, cut: 0, left: 0, total: 16 });
    });

    it('cuts the one that does not fit at the loop end, and counts those left out', () => {
      const four = fragmentsSongLoop({ ...newLoop(), length: 4 }, fragmentsSong(), path);
      expect(pads(four.loop)).toEqual([[1, [[0, 2, 1, 2], [2, 1, 4, 1], [3, 1, 9, 1]]]]);
      expect(four).toMatchObject({ placed: 3, cut: 1, left: 0 });
      expect(four.loop.rows[0].clips.get(3).notes.map((n) => n.pitch)).toEqual([50, 52, 53, 55]);
      const two = fragmentsSongLoop({ ...newLoop(), length: 2 }, fragmentsSong(), path);
      expect(pads(two.loop)).toEqual([[1, [[0, 2, 1, 2]]]]);
      expect(two).toMatchObject({ placed: 1, cut: 0, left: 2 });
    });

    it('takes only the tracks selected, and leaves the song\'s rows of the others as they are', () => {
      const info = fragmentsSong();
      const all = remixSongLoop({ ...newLoop(), length: 8 }, info, path);
      const others = all.loop.rows.filter((row) => row.importedCh !== 1);
      expect(others.length).toBeGreaterThan(0);
      const only = fragmentsSongLoop(all.loop, info, path, { channels: new Set([1]) });
      expect(only.added).toBe(1);
      for (const row of others) expect(only.loop.rows).toContain(row);
      expect(pads({ rows: only.loop.rows.filter((row) => row.importedCh === 1 && !others.includes(row)) })).toEqual([[1, [[0, 2, 1, 2], [2, 1, 4, 1], [3, 3, 9, 3]]]]);
      // A track selected with nothing to lay out: said, nothing changed.
      expect(() => fragmentsSongLoop(all.loop, info, path, { channels: new Set([2]) })).toThrow(/selected tracks/);
      const remixed = remixSongLoop(all.loop, info, path, { channels: new Set([2]), turn: 1 });
      expect(remixed.added).toBe(1);
      expect(remixed.loop.rows.filter((row) => row.imported === path)).toHaveLength(all.loop.rows.length);
    });

    it('pressed again replaces its rows, their sound kept; locked, they stay', () => {
      const info = fragmentsSong();
      const first = fragmentsSongLoop({ ...newLoop(), length: 8 }, info, path);
      first.loop.rows[0].program = 42;
      const again = fragmentsSongLoop(first.loop, info, path);
      expect(again.loop.rows).toHaveLength(1);
      expect(again.loop.rows[0].program).toBe(42);
      expect(pads(again.loop)).toEqual(pads(first.loop));
      again.loop.rows[0].locked = true;
      expect(() => fragmentsSongLoop(again.loop, info, path)).toThrow(/locked/);
    });
  });

  it('takes the bars whose end leads back to their start, with every instrument that plays there', () => {
    const windows = songLoopWindows(song());
    expect(windows.length).toBeGreaterThan(1);
    const [best] = windows;
    expect([best.startBar, best.bars]).toEqual([9, 8]);
    expect([...best.loops.keys()].sort((a, b) => a - b)).toEqual([1, 2, 10]);
    for (const l of best.loops.values()) expect(l).toEqual({ startBar: 9, bars: 8 });
    expect(best.seam).toBeGreaterThan(windows[1].seam);
    for (const w of windows) for (const k of ['fit', 'seam', 'full', 'mark']) expect(w[k]).toBeGreaterThanOrEqual(0);
    // Not overlapping.
    for (const a of windows) for (const b of windows) if (a !== b) expect(a.startBar + a.bars <= b.startBar || b.startBar + b.bars <= a.startBar).toBe(true);
  });

  it('works for one instrument alone, and gives nothing for a song without notes or bars', () => {
    const alone = parseMidi(smf(0, 96, [noteEvents(0, ROOTS.map((r, b) => [b * BAR, r, BAR - 4]))]));
    const [w] = songLoopWindows(alone);
    expect(w.fit).toBe(1);
    expect([...w.loops.keys()]).toEqual([1]);
    expect(songLoopWindows(parseMidi(smf(0, 96, [[]])))).toEqual([]);
  });
});

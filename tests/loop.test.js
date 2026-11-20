import { describe, expect, it } from 'vitest';
import { addRow, alignPads, arrangementMaterial, layRow, layRowRange, meterPulses, barBeats, clearBars, clearPads, clipFrom, copyPads, feelPads, feelText, heardNotes, loopChords, loopProgression, mutePads, pastePads, loopBars, loopFile, loopInfo, loopSong, newLoop, meterBeats, padBars, padOff, padSpans, placeClip, placeClipsAsRows, rangeClip, readLoop, replaceSlot, rowClip, slotRuns, legatoPads, setMeter, moveBlock, moveRow, padShift, shiftPads, tailPads, modePads, timePads, lockToDrums, duplicateRows, channelOf as channelOfRow, togglePad } from '../src/midi/loop.js';
import { parseMidi } from '../src/midi/parser.js';
import { extractNotes, lanesSong, sliceTicks, transposeBetween } from '../src/midi/parts.js';
import { channelFragments } from '../src/midi/features.js';
import { barChordText } from '../src/midi/chords.js';
import { octaveScale, pitchY } from '../src/ui/mini.js';
import { smf, noteEvents } from './smf.js';

const clip = (bars, beats, extra = {}) => ({ name: 'x', key: '', bars, notes: beats.map((beat) => ({ beat, len: 0.5, pitch: 60, vel: 100 })), ...extra });
const onsOf = (song, c) => song.events.filter((e) => e.type === 'on' && e.ch === c).map((e) => e.sec);

describe('▶▶ of Fill details: a proposal put in its row from the bar it comes in on', () => {
  it('starts on that bar and goes on round the loop, so the pads show what sounds', () => {
    // A 3-bar fragment (a note on each bar's first beat: pitches 60, 61, 62) coming in on bar 3 of 4.
    const fragment = { name: 'p', key: '', bars: 3, notes: [0, 4, 8].map((beat, k) => ({ beat, len: 1, pitch: 60 + k, vel: 100 })) };
    const row = { clips: new Map(), off: [] };
    const L = 4;
    const s = 2;   // as Fill details lays it: [{ at: s, from: 0, bars: L - s }, { at: 0, from: L - s, bars: s }]
    layRow(row, fragment, [{ at: s, from: 0, bars: L - s }, { at: 0, from: L - s, bars: s }], L);
    const pitchAt = (bar) => [...row.clips].filter(([at, c]) => at <= bar && bar < at + c.bars)
      .flatMap(([at, c]) => c.notes.filter((n) => Math.floor(n.beat / 4) === bar - at).map((n) => n.pitch));
    // Bar 3 its first bar, bar 4 its second; round the loop, bar 1 its third, bar 2 its first again.
    expect([pitchAt(2), pitchAt(3), pitchAt(0), pitchAt(1)]).toEqual([[60], [61], [62], [60]]);
  });
});

describe('a fragment Arrange put in a row, found and replaced', () => {
  it('finds every bar where it sounds and puts another there, the same bars of it, the rest untouched', () => {
    const a = clip(2, [0, 1], { name: 'A' });
    const b = clip(2, [2], { name: 'B' });
    const r = clip(1, [3], { name: 'R' });   // B's replacement: one bar, round twice in its two
    const material = arrangementMaterial([a, b], [a, r]);
    const places = [{ at: 0, from: 0, bars: 4 }, { at: 4, from: 2, bars: 2 }, { at: 6, from: 0, bars: 2 }];   // A B B A
    const row = { clips: new Map(), off: [] };
    layRow(row, material, places, 8);
    const slot = { places, length: 4, start: 2, bars: 2, whole: r, total: 8 };
    expect(slotRuns(row, slot)).toEqual([{ at: 2, n: 2, off: 0 }, { at: 4, n: 2, off: 0 }]);
    // A bar turned to something else since is not its any more.
    const edited = { clips: new Map(row.clips), off: [] };
    placeClip(edited, 5, clip(1, [0], { name: 'other' }));
    expect(slotRuns(edited, slot)).toEqual([{ at: 2, n: 2, off: 0 }, { at: 4, n: 1, off: 0 }]);

    const n = clip(2, [0, 5], { name: 'N' });
    replaceSlot(row, slotRuns(row, slot), n, 2);
    const heard = [...row.clips].flatMap(([at, c]) => c.notes.map((x) => at * 4 + x.beat)).sort((x, y) => x - y);
    expect(heard).toEqual([0, 1, 8, 13, 16, 21, 24, 25]);
    expect(slotRuns(row, { ...slot, whole: n })).toEqual([{ at: 2, n: 2, off: 0 }, { at: 4, n: 2, off: 0 }]);
  });
});

describe('a loop from nothing', () => {
  it('saves per-row sounds and emits bank selection before the chosen preset, without changing its original instrument', () => {
    const loop = newLoop();
    const row = addRow(loop, { program: 33, drums: false, name: 'Bass' });
    row.sound = { kind: 'soundfont', bankId: 'bank', name: 'Bell Piano', bankMSB: 12, bankLSB: 0, program: 0, isDrum: false, isGMGSDrum: false };
    placeClip(row, 0, clip(1, [0]));
    const restored = newLoop();
    readLoop(restored, loopFile(loop));
    expect(restored.rows[0].program).toBe(33);
    expect(restored.rows[0].sound).toEqual(row.sound);
    expect(loopSong(restored).events.filter((e) => e.tick === 0 && (e.type === 'pc' || (e.type === 'cc' && [0, 32].includes(e.a))))
      .map((e) => [e.type, e.a, e.b])).toEqual([['cc', 0, 12], ['cc', 32, 0], ['pc', 0, 0]]);
  });

  it('takes a row as one clip as it sounds: from its first pad to its last, shifted, pads off left out, muted or not', () => {
    const loop = { ...newLoop(), length: 8 };
    const other = addRow(loop, { program: 0, drums: false, name: 'Piano' });
    placeClip(other, 0, clip(8, [0]));
    const row = addRow(loop, { program: 33, drums: false, name: 'Bass' });
    placeClip(row, 2, clip(2, [0, 4], { transpose: 2 }));
    placeClip(row, 4, clip(1, [1]));
    row.off = [3];
    row.mute = true;
    other.solo = true;
    const got = rowClip(loop, row);
    expect(got.first).toBe(2);
    expect(got.bars).toBe(3);
    expect(got.notes.map((n) => [n.beat, n.pitch])).toEqual([[0, 62], [9, 60]]);
    expect(rowClip(loop, addRow(loop, { program: 1, drums: false, name: 'Empty' }))).toBeNull();
  });

  it('⌒ Legato ties the same note over a bar line, closes a short gap up to it, and leaves the rest', () => {
    const loop = { ...newLoop(), length: 4 };
    const row = addRow(loop, { program: 48, drums: false, name: 'Strings' });
    const pad = (notes) => ({ name: 'x', key: '', bars: 1, notes: notes.map(([beat, len, pitch]) => ({ beat, len, pitch, vel: 90 })) });
    // Bar 0: C and E to 3.5 (a short gap); bar 1 starts with C and G. Bar 2: a staccato hit at 1, rest after (long gap).
    placeClip(row, 0, pad([[0, 3.5, 60], [0, 3.5, 64]]));
    placeClip(row, 1, pad([[0, 4, 60], [0, 4, 67]]));
    placeClip(row, 2, pad([[0, 0.5, 62], [1, 0.5, 62]]));
    placeClip(row, 3, pad([[0, 4, 62]]));
    const ons = () => loopSong(loop).events.filter((e) => e.type === 'on').map((e) => `${e.a}@${e.tick / 480}`);
    const offs = () => loopSong(loop).events.filter((e) => e.type === 'off').map((e) => `${e.a}@${e.tick / 480}`);
    const before = ons();
    expect(legatoPads(loop, { r0: 0, r1: 0, c0: 0, c1: 3 }, 1, true).done).toBe(4);
    expect(row.legato).toEqual([0, 1, 2, 3]);
    const after = ons();
    expect(before).toContain('60@4');
    expect(after).not.toContain('60@4');            // C not struck again on bar 2
    expect(after).toContain('67@4');                // G is new: struck
    expect(offs()).toContain('64@4');               // E held to the line, not past it
    expect(offs()).toContain('60@8');               // the tied C ends where the second ends
    expect(offs()).toContain('62@9.5');             // bar 3's gap (2.5 beats) is a rest: kept
    expect(after).toContain('62@12');               // and its D is struck again
    expect(after.filter((x) => x.startsWith('62@')).length).toBe(3);
    // LUNA Export: the pads a tied note rings over go as one clip; the others as they were.
    expect(padSpans(loop).get(channelOfRow(loop, row) + 1).map((s) => [s.startTick / 1920, s.endTick / 1920])).toEqual([[0, 2], [2, 3], [3, 4]]);
    // Saved with the loop; No legato gives it all back.
    const restored = newLoop();
    readLoop(restored, JSON.parse(JSON.stringify(loopFile(loop))));
    expect(restored.rows[0].legato).toEqual([0, 1, 2, 3]);
    expect(legatoPads(loop, { r0: 0, r1: 0, c0: 0, c1: 3 }, 1, false).done).toBe(4);
    expect(row.legato).toBeUndefined();
    expect(ons()).toEqual(before);
  });

  it('⌒ Legato leaves the drums, pads switched off and the loop\'s end alone', () => {
    const loop = { ...newLoop(), length: 2 };
    const drums = addRow(loop, { program: 0, drums: true, name: 'Drums' });
    const row = addRow(loop, { program: 48, drums: false, name: 'Strings' });
    placeClip(drums, 0, clip(2, [0, 4]));
    placeClip(row, 0, clip(1, [0, 3.5]));
    placeClip(row, 1, clip(1, [0, 3.5]));
    const got = legatoPads(loop, { r0: 0, r1: 1, c0: 0, c1: 1 }, 1, true);
    expect(drums.legato).toBeUndefined();
    expect(got.done).toBe(2);
    const strings = channelOfRow(loop, row);
    const ons = () => loopSong(loop).events.filter((e) => e.type === 'on' && e.ch === strings).map((e) => e.tick / 480);
    // The C at 3.5 reaches the line and goes on as bar 2's C; bar 2's last one is not tied round to bar 1.
    expect(ons()).toEqual([0, 3.5, 7.5]);
    row.off = [1];
    expect(ons()).toEqual([0, 3.5]);   // into a pad switched off: nothing tied, it stops at the line
    expect(loopSong(loop).events.filter((e) => e.type === 'off' && e.ch === strings).map((e) => e.tick / 480)).toEqual([0.5, 4]);
  });

  it('saves a LUNA track assignment and leaves the original program unchanged', () => {
    const loop = newLoop();
    const row = addRow(loop, { program: 40, drums: false, name: 'Strings' });
    row.sound = { kind: 'luna', sessionUid: 'session', trackUid: 'track', trackName: 'Instrument' };
    const restored = newLoop();
    readLoop(restored, loopFile(loop));
    expect(restored.rows[0].sound).toEqual(row.sound);
    expect(loopSong(restored).events.find((e) => e.type === 'pc').a).toBe(40);
  });

  it('holds the notes a pad ends with into the empty pad after it, without striking them again', () => {
    const loop = { ...newLoop(), length: 4 };
    const row = addRow(loop, { program: 73, drums: false, name: 'Flute' });
    // Bar 0: a melody ending on a chord at beat 3 (C E G), a bass held under it since beat 2.
    placeClip(row, 0, { name: 'x', key: '', bars: 1, notes: [
      { beat: 0, len: 1, pitch: 72, vel: 90 },
      { beat: 2, len: 2, pitch: 48, vel: 80 },
      { beat: 3, len: 0.5, pitch: 60, vel: 100 }, { beat: 3, len: 0.5, pitch: 64, vel: 100 }, { beat: 3.05, len: 0.5, pitch: 67, vel: 100 },
    ], chords: [0, 0, 0, 0] });
    const sel = { r0: 0, r1: 0, c0: 1, c1: 1 };
    expect(tailPads(loop, sel, 1, 0.5)).toEqual({ done: 1, why: '' });
    const tailed = row.clips.get(0);
    expect(tailed.bars).toBe(2);
    // The last chord and the bass under it end half way into bar 1; the first note does not change.
    expect(tailed.notes.map((n) => [n.pitch, n.beat, n.len])).toEqual([[72, 0, 1], [48, 2, 4], [60, 3, 3], [64, 3, 3], [67, 3.05, 2.95]]);
    expect(tailed.chords).toEqual([0, 0, 0, 0, 0, 0, -1, -1]);
    // Played: no new note-on in bar 1 (2 s at 120 BPM), and the chord sounds until 3 s.
    const song = loopSong(loop);
    expect(onsOf(song, 0).filter((s) => s >= 2)).toEqual([]);
    expect(Math.max(...song.events.filter((e) => e.type === 'off').map((e) => e.sec))).toBeCloseTo(3, 5);
    // Again on it: made again from the clip as it was; No tail takes it away.
    expect(tailPads(loop, sel, 1, 1).done).toBe(1);
    expect(row.clips.get(0).notes.find((n) => n.pitch === 60).len).toBe(5);
    expect(tailPads(loop, sel, 1, 0).done).toBe(1);
    expect(row.clips.get(0).bars).toBe(1);
    expect(row.clips.get(0).notes.find((n) => n.pitch === 60).len).toBe(0.5);
  });

  it('pushes the notes the next pad starts with into the empty pad before it, an anticipation', () => {
    const loop = { ...newLoop(), length: 4 };
    const row = addRow(loop, { program: 48, drums: false, name: 'Strings' });
    // Bar 2: a chord on its first beat (C E G), then a note at beat 2.
    placeClip(row, 2, { name: 'x', key: '', bars: 1, notes: [
      { beat: 0, len: 2, pitch: 60, vel: 90 }, { beat: 0, len: 2, pitch: 64, vel: 90 }, { beat: 0.05, len: 2, pitch: 67, vel: 90 },
      { beat: 2, len: 1, pitch: 72, vel: 90 },
    ], chords: [0, 0, 7, 7] });
    const sel = { r0: 0, r1: 0, c0: 1, c1: 1 };
    expect(tailPads(loop, sel, 1, 0.25, 'right')).toEqual({ done: 1, why: '' });
    expect(row.clips.has(2)).toBe(false);
    const pushed = row.clips.get(1);
    expect(pushed.bars).toBe(2);
    // The chord comes in a beat early (beat 3 of bar 1) and ends where it did; the rest a bar later in the clip.
    expect(pushed.notes.map((n) => [n.pitch, n.beat, n.len])).toEqual([[60, 3, 3], [64, 3, 3], [67, 3, 3.05], [72, 6, 1]]);
    expect(pushed.chords).toEqual([-1, -1, -1, 0, 0, 0, 7, 7]);
    // Played: the chord struck once, at bar 1 beat 3 (3.5 s at 120 BPM), none on bar 2's first beat.
    const ons = loopSong(loop).events.filter((e) => e.type === 'on').map((e) => [e.a, e.sec]);
    expect(ons.filter(([p]) => p === 60)).toEqual([[60, 3.5]]);
    // Taken away: back on its own bar as it was.
    expect(tailPads(loop, sel, 1, 0).done).toBe(1);
    expect(row.clips.get(2).notes.map((n) => n.beat)).toEqual([0, 0, 0.05, 2]);
  });

  it('takes a tail and a push in one pad when they do not meet', () => {
    const loop = { ...newLoop(), length: 4 };
    const row = addRow(loop, { program: 48, drums: false, name: 'Strings' });
    placeClip(row, 0, clip(1, [3]));
    placeClip(row, 2, clip(1, [0]));
    const sel = { r0: 0, r1: 0, c0: 1, c1: 1 };
    expect(tailPads(loop, sel, 1, 0.5, 'left').done).toBe(1);
    expect(tailPads(loop, sel, 1, 0.75, 'right')).toEqual({ done: 0, why: 'it would meet the tail from the left: choose less' });
    expect(tailPads(loop, sel, 1, 0.25, 'right').done).toBe(1);
    expect([...row.clips.keys()].sort()).toEqual([0, 1]);
    expect(row.clips.get(0).bars).toBe(2);
    expect(row.clips.get(1).bars).toBe(2);
    // The tail made again shorter, the push kept; then both taken away.
    expect(tailPads(loop, sel, 1, 0.25, 'left').done).toBe(1);
    expect(row.clips.get(1).notes[0].beat).toBe(3);
    expect(tailPads(loop, sel, 1, 0).done).toBe(2);
    expect([...row.clips].map(([at, c]) => [at, c.bars])).toEqual([[0, 1], [2, 1]]);
  });

  it('pushes bar 1 into the last pad as a pickup, bar 1 kept as it is, and takes it away even after a save', () => {
    const loop = { ...newLoop(), length: 4 };
    const row = addRow(loop, { program: 48, drums: false, name: 'Strings' });
    placeClip(row, 0, { name: 'x', key: '', bars: 1, notes: [
      { beat: 0, len: 2, pitch: 60, vel: 90 }, { beat: 0, len: 2, pitch: 64, vel: 90 }, { beat: 2, len: 1, pitch: 72, vel: 90 },
    ], chords: [0, 0, 7, 7] });
    const last = { r0: 0, r1: 0, c0: 3, c1: 3 };
    expect(tailPads(loop, last, 1, 0.25, 'right')).toEqual({ done: 1, why: '' });
    const pickup = row.clips.get(3);
    expect(pickup.pickup).toBe(true);
    expect(pickup.notes.map((n) => [n.pitch, n.beat, n.len])).toEqual([[60, 3, 1], [64, 3, 1]]);
    expect(pickup.chords).toEqual([-1, -1, -1, 0]);
    expect(row.clips.get(0).notes).toHaveLength(3);
    // Heard: the chord early in bar 4 (7.5 s), to the loop's end (8 s), and again on bar 1.
    const song = loopSong(loop);
    expect(song.events.filter((e) => e.type === 'on' && e.a === 60).map((e) => e.sec)).toEqual([0, 7.5]);
    expect(Math.max(...song.events.filter((e) => e.type === 'off').map((e) => e.sec))).toBeCloseTo(8, 5);
    // Saved and opened again, it is still a pickup: made again, then taken away.
    const opened = newLoop();
    readLoop(opened, JSON.parse(JSON.stringify(loopFile(loop))));
    expect(tailPads(opened, last, 1, 0.5, 'right').done).toBe(1);
    expect(opened.rows[0].clips.get(3).notes[0].beat).toBe(2);
    expect(tailPads(opened, last, 1, 0).done).toBe(1);
    expect([...opened.rows[0].clips.keys()]).toEqual([0]);
  });

  it('tails and pushes every pad of a selection that can take one, never a tail from a tail', () => {
    const loop = { ...newLoop(), length: 8 };
    const a = addRow(loop, { program: 48, drums: false, name: 'Strings' });
    const b = addRow(loop, { program: 60, drums: false, name: 'Horn' });
    // a: phrases at bars 0 and 3, two empty pads between; b: phrases at 1 and 5.
    placeClip(a, 0, clip(1, [0]));
    placeClip(a, 3, clip(1, [0]));
    placeClip(b, 1, clip(1, [0]));
    placeClip(b, 5, clip(1, [0]));
    const all = { r0: 0, r1: 1, c0: 0, c1: 7 };
    // Tails: a's pads 1 and 4, b's 2 and 6; never a's 2 (after a tail) or b's 3.
    expect(tailPads(loop, all, 1, 0.5, 'left').done).toBe(4);
    expect([...a.clips].map(([at, c]) => [at, c.bars])).toEqual([[0, 2], [3, 2]]);
    expect([...b.clips].map(([at, c]) => [at, c.bars])).toEqual([[1, 2], [5, 2]]);
    // Again with another length: made again, not longer.
    expect(tailPads(loop, all, 1, 0.25, 'left').done).toBe(4);
    expect(a.clips.get(0).notes[0].len).toBe(5);
    // No tail over the selection: all gone. Pushes: into a's pad 2 and b's pads 0 and 4, once each,
    // and a's last pad (7) a pickup into its bar 1 (b's bar 1 now starts on its last beat: none).
    expect(tailPads(loop, all, 1, 0).done).toBe(4);
    expect(tailPads(loop, all, 1, 0.25, 'right').done).toBe(4);
    expect([...a.clips.keys()].sort()).toEqual([0, 2, 7]);
    expect(a.clips.get(7).pickup).toBe(true);
    expect([...b.clips.keys()].sort()).toEqual([0, 4]);
  });

  it('plays pads in another mode of the loop key by degree, and back to the notes as they came', () => {
    const loop = { ...newLoop(), length: 2, key: '2 mayor' };   // D major
    const row = addRow(loop, { program: 0, drums: false, name: 'Piano' });
    // A D major scale, D4 to C#5, from a clip in its own key (no transposition).
    const scale = [62, 64, 66, 67, 69, 71, 73];
    // Its chords, a beat each: D, G, Bm, A (root * 2 + minor).
    placeClip(row, 0, { name: 'x', key: '2 mayor', transpose: 0, bars: 1, chords: [4, 14, 23, 18], notes: scale.map((pitch, k) => ({ beat: k * 0.5, len: 0.5, pitch, vel: 90 })) });
    const sel = { r0: 0, r1: 0, c0: 0, c1: 0 };
    const pitches = () => row.clips.get(0).notes.map((n) => n.pitch);
    expect(modePads(loop, sel, 1, 'minor').changed).toBe(true);
    expect(pitches()).toEqual([62, 64, 65, 67, 69, 70, 72]);   // D E F G A Bb C
    expect(row.clips.get(0).mode).toBe('minor');
    // The chords as the notes: D to Dm, G to Gm, Bm to Bb, A to Am.
    expect(row.clips.get(0).chords).toEqual([5, 15, 20, 19]);
    modePads(loop, sel, 1, 'dorian');
    expect(row.clips.get(0).chords).toEqual([5, 14, 23, 19]);   // Dm, G, Bm, Am
    // Another mode from the notes as they came, not from the minor ones.
    modePads(loop, sel, 1, 'dorian');
    expect(pitches()).toEqual([62, 64, 65, 67, 69, 71, 72]);   // D E F G A B C
    modePads(loop, sel, 1, 'lydian');
    expect(pitches()).toEqual([62, 64, 66, 68, 69, 71, 73]);   // G#
    // Fewer notes (D F G A C): each to the nearest (E and F# to F; B and C# to C).
    modePads(loop, sel, 1, 'minpent');
    expect(pitches()).toEqual([62, 65, 65, 67, 69, 72, 72]);
    modePads(loop, sel, 1, 'original');
    expect(pitches()).toEqual(scale);
    expect(row.clips.get(0).notes.every((n) => n.base === undefined)).toBe(true);
    expect(row.clips.get(0).mode).toBeUndefined();
    expect(row.clips.get(0).chords).toEqual([4, 14, 23, 18]);
    expect(row.clips.get(0).chordsBase).toBeUndefined();
  });

  it('counts the mode from the loop key with the pad transposed, and needs a key', () => {
    // A clip in C major, heard in E major (transposed +4) and moved +12 on its own.
    const loop = { ...newLoop(), length: 1, key: '4 mayor' };
    const row = addRow(loop, { program: 0, drums: false, name: 'Piano' });
    placeClip(row, 0, { name: 'x', key: '0 mayor', transpose: 4, shift: 12, bars: 1, notes: [{ beat: 0, len: 1, pitch: 64, vel: 90 }] });
    // Heard: 64 + 16 = 80 (G#, the third of E): in E minor, the minor third, G (79): stored 63.
    modePads(loop, { r0: 0, r1: 0, c0: 0, c1: 0 }, 1, 'minor');
    expect(row.clips.get(0).notes[0].pitch).toBe(63);
    // Saved and opened again: Original still knows the note as it came.
    const opened = newLoop();
    readLoop(opened, JSON.parse(JSON.stringify(loopFile(loop))));
    modePads(opened, { r0: 0, r1: 0, c0: 0, c1: 0 }, 1, 'original');
    expect(opened.rows[0].clips.get(0).notes[0].pitch).toBe(64);
    const keyless = { ...newLoop(), length: 1 };
    placeClip(addRow(keyless, { program: 0, drums: false, name: 'P' }), 0, clip(1, [0]));
    expect(modePads(keyless, { r0: 0, r1: 0, c0: 0, c1: 0 }, 1, 'minor')).toEqual({ changed: false, why: "choose the loop's Key first: a mode is counted from its tonic" });
  });

  it('layers a row: a copy right under it with the same pads, never the drums', () => {
    const loop = { ...newLoop(), length: 4 };
    const drums = addRow(loop, { program: 0, drums: true, name: 'Drums' });
    const piano = addRow(loop, { program: 0, drums: false, name: 'Piano' });
    placeClip(piano, 1, clip(1, [0, 1]));
    piano.off = [1];
    piano.sound = { kind: 'soundfont', name: 'Grand Piano', program: 0, bankMSB: 0, bankLSB: 0 };
    void drums;
    expect(duplicateRows(loop, { r0: 0, r1: 1, c0: 0, c1: 0 })).toEqual({ added: 1, why: 'the drums have one row only' });
    expect(loop.rows.map((r) => r.name)).toEqual(['Drums', 'Piano', 'Piano (layer)']);
    const layer = loop.rows[2];
    expect([...layer.clips.keys()]).toEqual([1]);
    expect(layer.off).toEqual([1]);
    expect(layer.sound).toEqual(piano.sound);
    // Its own copy: changing it leaves the original alone.
    layer.clips.get(1).notes[0].pitch = 72;
    expect(piano.clips.get(1).notes[0].pitch).toBe(60);
    // Each row its own channel.
    expect(new Set(loop.rows.map((r) => channelOfRow(loop, r))).size).toBe(3);
  });

  it('plays the selected bars in half time and in double time, keeping their length', () => {
    const loop = { ...newLoop(), length: 4 };
    const row = addRow(loop, { program: 0, drums: false, name: 'Piano' });
    // Bars 0–1: a note on each beat (8 notes, half a beat long).
    placeClip(row, 0, clip(2, [0, 1, 2, 3, 4, 5, 6, 7]));
    const sel = { r0: 0, r1: 0, c0: 0, c1: 1 };
    expect(timePads(loop, sel, 1, 2)).toBe(true);
    const half = row.clips.get(0);
    expect(half.bars).toBe(2);
    expect(half.notes.map((n) => [n.beat, n.len])).toEqual([[0, 1], [2, 1], [4, 1], [6, 1]]);
    // Double time on that: every 2 beats → every beat, twice over.
    expect(timePads(loop, sel, 1, 0.5)).toBe(true);
    expect(row.clips.get(0).notes.map((n) => n.beat)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(row.clips.get(0).notes.every((n) => n.len === 0.5)).toBe(true);
    expect(timePads(loop, { r0: 0, r1: 0, c0: 2, c1: 3 }, 1, 2)).toBe(false);   // nothing there
  });

  it('moves notes near a drum hit onto it, the drums untouched', () => {
    const loop = { ...newLoop(), length: 1 };
    const drums = addRow(loop, { program: 0, drums: true, name: 'Drums' });
    const bass = addRow(loop, { program: 33, drums: false, name: 'Bass' });
    // Drums swung: hits at 0, 0.66, 1, 1.66 · bass straight 8ths at 0, 0.5, 1, 1.5, and one far off at 3.
    placeClip(drums, 0, clip(1, [0, 0.66, 1, 1.66]));
    placeClip(bass, 0, clip(1, [0, 0.5, 1, 1.5, 3]));
    const sel = { r0: 0, r1: 1, c0: 0, c1: 0 };
    expect(lockToDrums(loop, sel, 1)).toEqual({ changed: true, why: '' });
    expect(bass.clips.get(0).notes.map((n) => n.beat)).toEqual([0, 0.66, 1, 1.66, 3]);
    expect(drums.clips.get(0).notes.map((n) => n.beat)).toEqual([0, 0.66, 1, 1.66]);
    expect(lockToDrums(loop, sel, 1).changed).toBe(false);   // already with them
    const none = { ...newLoop(), length: 1 };
    placeClip(addRow(none, { program: 0, drums: false, name: 'P' }), 0, clip(1, [0]));
    expect(lockToDrums(none, { r0: 0, r1: 0, c0: 0, c1: 0 }, 1).why).toBe('the loop has no drums to follow');
  });

  it('does not push from a pad that does not start on its first beat', () => {
    const loop = { ...newLoop(), length: 4 };
    const row = addRow(loop, { program: 48, drums: false, name: 'Strings' });
    placeClip(row, 2, clip(1, [1.5]));
    expect(tailPads(loop, { r0: 0, r1: 0, c0: 1, c1: 1 }, 1, 0.25, 'right').why).toBe('the pad on the right does not start on its first beat: nothing to push');
    expect(tailPads(loop, { r0: 0, r1: 0, c0: 3, c1: 3 }, 1, 0.25, 'right').why).toBe('bar 1 does not start on its first beat: nothing to push');
  });

  it('does not hold notes into a pad with notes, from an empty pad, or on the drums', () => {
    const loop = { ...newLoop(), length: 4 };
    const row = addRow(loop, { program: 0, drums: false, name: 'Piano' });
    placeClip(row, 0, clip(1, [3]));
    placeClip(row, 1, clip(1, [0]));
    expect(tailPads(loop, { r0: 0, r1: 0, c0: 1, c1: 1 }, 1, 0.5)).toEqual({ done: 0, why: 'the selected pad has notes: choose an empty one' });
    expect(tailPads(loop, { r0: 0, r1: 0, c0: 3, c1: 3 }, 1, 0.5).why).toBe('the pad on the left has no notes');
    const empty = { ...newLoop(), length: 4 };
    placeClip(addRow(empty, { program: 0, drums: false, name: 'Piano' }), 1, clip(1, [0]));
    expect(tailPads(empty, { r0: 0, r1: 0, c0: 0, c1: 0 }, 1, 0.5).why).toBe('there is no pad on the left of the first bar');
    const drums = addRow(loop, { program: 0, drums: true, name: 'Drums' });
    placeClip(drums, 0, clip(1, [3]));
    expect(tailPads(loop, { r0: 0, r1: 0, c0: 1, c1: 1 }, 1, 0.5).why).toBe('the drums are not held');
  });

  it('aligns a pad to both edges without changing its rhythm or note lengths', () => {
    const loop = { ...newLoop(), length: 1 };
    const row = addRow(loop, { program: 1, drums: false, name: 'Lead' });
    placeClip(row, 0, clip(1, [1, 2]));
    const sel = { r0: 0, r1: 0, c0: 0, c1: 0 };
    expect(alignPads(loop, sel, 1, 'right')).toBe(true);
    expect(row.clips.get(0).notes.map(({ beat, len }) => [beat, len])).toEqual([[2.5, 0.5], [3.5, 0.5]]);
    expect(alignPads(loop, sel, 1, 'left')).toBe(true);
    expect(row.clips.get(0).notes.map(({ beat, len }) => [beat, len])).toEqual([[0, 0.5], [1, 0.5]]);
    expect(alignPads(loop, sel, 1, 'left')).toBe(false);
  });

  it('moves all selected rows and bars by the same amount, leaving the rest untouched', () => {
    const loop = { ...newLoop(), length: 4 };
    const drums = addRow(loop, { program: 0, drums: true, name: 'Drums' });
    const bass = addRow(loop, { program: 33, drums: false, name: 'Bass' });
    placeClip(drums, 1, clip(1, [1]));
    placeClip(drums, 2, clip(1, [1], { name: 'other' }));
    placeClip(bass, 1, clip(2, [2, 6]));
    placeClip(bass, 0, clip(1, [0]));
    placeClip(bass, 3, clip(1, [3]));
    const sel = { r0: 0, r1: 1, c0: 1, c1: 2 };
    expect(alignPads(loop, sel, 1, 'right')).toBe(true);
    expect(drums.clips.get(1).notes.map((n) => n.beat)).toEqual([2.5, 6.5]);
    expect(bass.clips.get(1).notes.map((n) => n.beat)).toEqual([3.5, 7.5]);
    expect(bass.clips.get(0).notes[0].beat).toBe(0);
    expect(bass.clips.get(3).notes[0].beat).toBe(3);
    expect(alignPads(loop, sel, 1, 'left')).toBe(true);
    expect(drums.clips.get(1).notes.map((n) => n.beat)).toEqual([0, 4]);
    expect(bass.clips.get(1).notes.map((n) => n.beat)).toEqual([1, 5]);
  });

  it('keeps swung timing, dynamics, pitches and saved playback when clips are combined', () => {
    const loop = { ...newLoop(), length: 2, key: '0 mayor' };
    const row = addRow(loop, { program: 1, drums: false, name: 'Keys' });
    placeClip(row, 0, clip(1, [0.5], { key: '0 mayor', swing: 66, swingGrid: 0.5, vel: 0.8, shift: 2 }));
    placeClip(row, 1, clip(1, [1], { key: '0 mayor', shift: -1 }));
    const events = () => loopSong(loop).events.filter((e) => e.type === 'on' || e.type === 'off');
    const before = events();
    expect(alignPads(loop, { r0: 0, r1: 0, c0: 0, c1: 1 }, 1, 'left')).toBe(true);
    const after = events();
    expect(after.map((e) => [e.type, e.a, e.b])).toEqual(before.map((e) => [e.type, e.a, e.b]));
    for (let i = 1; i < before.length; i++) {
      expect(after[i].sec - after[0].sec).toBeCloseTo(before[i].sec - before[0].sec);
    }
    const restored = newLoop();
    readLoop(restored, loopFile(loop));
    expect(loopSong(restored).events).toEqual(loopSong(loop).events);
  });

  it('rejects boundary-crossing and switched-off pads without changing any row', () => {
    const loop = { ...newLoop(), length: 3 };
    const first = addRow(loop, { program: 1, drums: false, name: 'First' });
    const second = addRow(loop, { program: 2, drums: false, name: 'Second' });
    placeClip(first, 1, clip(1, [1]));
    placeClip(second, 0, clip(2, [3], { notes: [{ beat: 3, len: 2, pitch: 60, vel: 100 }] }));
    const sel = { r0: 0, r1: 1, c0: 1, c1: 1 };
    const before = JSON.stringify(loopFile(loop).rows);
    expect(() => alignPads(loop, sel, 1, 'left')).toThrow('crosses the selection boundary');
    expect(JSON.stringify(loopFile(loop).rows)).toBe(before);
    togglePad(second, 1, 1);
    const muted = JSON.stringify(loopFile(loop).rows);
    expect(() => alignPads(loop, sel, 1, 'right')).toThrow('Turn on the selected pads');
    expect(JSON.stringify(loopFile(loop).rows)).toBe(muted);
  });

  it('handles other meters and rejects a shifted attack that would be snapped to a bar line', () => {
    const loop = { ...newLoop(), length: 2 };
    setMeter(loop, '3/4');
    const row = addRow(loop, { program: 1, drums: false, name: 'Lead' });
    placeClip(row, 0, clip(1, [1], { beats: 3 }));
    const one = { r0: 0, r1: 0, c0: 0, c1: 0 };
    expect(alignPads(loop, one, 1, 'right')).toBe(true);
    expect(row.clips.get(0).notes[0].beat).toBe(2.5);

    placeClip(row, 0, clip(2, [1, 3.98], { beats: 3 }));
    const two = { r0: 0, r1: 0, c0: 0, c1: 1 };
    const before = JSON.stringify(loopFile(loop).rows);
    expect(() => alignPads(loop, two, 1, 'left')).toThrow('too close to a bar line');
    expect(JSON.stringify(loopFile(loop).rows)).toBe(before);
  });

  it('retains the source key for future key changes and rejects incompatible source keys', () => {
    const loop = { ...newLoop(), length: 2, key: '0 mayor' };
    const row = addRow(loop, { program: 1, drums: false, name: 'Lead' });
    placeClip(row, 0, clip(1, [1], { key: '7 mayor', transpose: 5 }));
    placeClip(row, 1, clip(1, [1], { key: '7 mayor', transpose: 5 }));
    const sel = { r0: 0, r1: 0, c0: 0, c1: 1 };
    expect(alignPads(loop, sel, 1, 'left')).toBe(true);
    expect(row.clips.get(0)).toMatchObject({ key: '7 mayor', transpose: 5 });

    placeClip(row, 1, clip(1, [1], { key: '2 mayor', transpose: -2 }));
    const before = JSON.stringify(loopFile(loop).rows);
    expect(() => alignPads(loop, sel, 1, 'right')).toThrow('different source keys');
    expect(JSON.stringify(loopFile(loop).rows)).toBe(before);
  });

  it('keeps the common interval aligned when selected channels start in different bars', () => {
    const info = parseMidi(smf(1, 96, [noteEvents(0, [[0, 60, 48]]), noteEvents(1, [[480, 64, 48]])]));
    const range = { startTick: 0, endTick: 768 };
    const first = rangeClip(info, 1, range, 'First', '', 4, { preserveLeadingSilence: true });
    const second = rangeClip(info, 2, range, 'Second', '', 4, { preserveLeadingSilence: true });
    expect(first.notes[0].beat).toBe(0);
    expect(second.notes[0].beat).toBe(5);
    expect(second.bars).toBe(first.bars);
    expect(rangeClip(info, 2, range, 'Second', '').notes[0].beat).toBe(1);
  });

  it('places multiple tracks at the same bar on new rows, reusing drums', () => {
    const loop = newLoop();
    const drums = addRow(loop, { program: 0, drums: true, name: 'Drums' });
    const existing = addRow(loop, { program: 1, drums: false, name: 'Existing' });
    placeClip(existing, 4, clip(1, [1]));
    placeClipsAsRows(loop, [
      { program: 0, drums: true, name: 'Drums', clip: clip(2, [0]) },
      { program: 32, drums: false, name: 'Bass', clip: clip(2, [4]) },
      { program: 1, drums: false, name: 'Piano', clip: clip(2, [0]) },
    ], 4);
    expect(loop.rows).toHaveLength(4);
    expect(drums.clips.get(4).notes[0].beat).toBe(0);
    expect(existing.clips.get(4).notes[0].beat).toBe(1);
    expect(loop.rows.find((row) => row.name === 'Bass').clips.get(4).notes[0].beat).toBe(4);
    expect(loop.rows.find((row) => row.name === 'Piano').clips.has(4)).toBe(true);
  });

  it('does not partially place a multi-track selection when there are not enough channels', () => {
    const loop = newLoop();
    for (let i = 0; i < 14; i++) addRow(loop, { program: i, drums: false, name: String(i) });
    const items = [1, 2].map((n) => ({ program: n, drums: false, name: `New ${n}`, clip: clip(1, [0]) }));
    expect(() => placeClipsAsRows(loop, items, 0)).toThrow('No channels');
    expect(loop.rows).toHaveLength(14);
    expect(loop.rows.every((row) => row.clips.size === 0)).toBe(true);
  });

  it('extends the loop for the whole selection and rejects an interval past 32 bars', () => {
    const loop = newLoop();
    const items = [1, 2].map((n) => ({ program: n, drums: false, name: `Track ${n}`, clip: clip(9, [0]) }));
    placeClipsAsRows(loop, items, 10);
    expect(loop.length).toBe(32);
    expect(loop.rows.map((row) => row.clips.get(10).bars)).toEqual([9, 9]);
    const before = loop.rows.length;
    expect(() => placeClipsAsRows(loop, items, 24)).toThrow('32-bar maximum');
    expect(loop.rows).toHaveLength(before);
    expect(loop.rows.every((row) => !row.clips.has(24))).toBe(true);
  });

  it('takes a fragment with its beat in the bar, and only its notes', () => {
    // 96 ticks a beat, 4/4: notes all through; the fragment starts on the 3rd beat of bar 2.
    const line = Array.from({ length: 16 }, (_, k) => [k * 96, 60, 48]);
    const info = parseMidi(smf(0, 96, [noteEvents(0, line)]));
    const c = clipFrom(info, 1, { at: 576, ticks: 144, startBar: 2, bars: 1 }, 'Lead', '0 mayor');
    expect(c.notes.map((n) => n.beat)).toEqual([2, 3]);
    expect(c.bars).toBe(1);
  });

  it('keeps a fragment its own bars: a note held over its end is cut there, no bar of tail added', () => {
    // 96 ticks a beat, 4/4: a 1-bar fragment whose last note (beat 4) is held for 8 beats.
    const info = parseMidi(smf(0, 96, [noteEvents(0, [[0, 60, 96], [288, 62, 768]])]));
    const c = clipFrom(info, 1, { at: 0, ticks: 384, startBar: 1, bars: 1 }, 'Lead', '0 mayor');
    expect(c.bars).toBe(1);
    expect(c.notes.map((n) => [n.beat, n.len])).toEqual([[0, 1], [3, 1]]);
  });

  it('takes a selection as it is heard: from the top of the clip, a long note cut where it ends', () => {
    // 96 ticks a beat, 4/4: a note on the 1st beat of bar 2 that lasts 8 beats.
    const info = parseMidi(smf(0, 96, [noteEvents(0, [[384, 60, 768]])]));
    const c = rangeClip(info, 1, { startTick: 192, endTick: 768 }, 'Lead', '');   // bar 1 beat 3 → bar 3
    expect(c.notes).toHaveLength(1);
    expect(c.notes[0]).toMatchObject({ beat: 2, len: 4 });   // the silence selected stays
    expect(c.bars).toBe(2);
    const late = rangeClip(info, 1, { startTick: 384, endTick: 576 }, 'Lead', '');   // from the note on
    expect(late.notes[0]).toMatchObject({ beat: 0, len: 2 });
    expect(late.bars).toBe(1);
  });

  it('starts a selection from the middle of a bar on the first beat', () => {
    const line = Array.from({ length: 8 }, (_, k) => [k * 96, 60, 48]);
    const info = parseMidi(smf(0, 96, [noteEvents(0, line)]));
    const c = rangeClip(info, 1, { startTick: 288, endTick: 480 }, 'Lead', '');   // bar 1 beat 4 → bar 2 beat 2
    expect(c.notes.map((n) => n.beat)).toEqual([0, 1]);
  });

  it('gives a note played just before a bar line to that bar, not as a stub to the one before', () => {
    // 96 ticks a beat, 4/4: a half note 6 ticks (a 64th) before bar 2, and one an 8th before it.
    const info = parseMidi(smf(0, 96, [noteEvents(0, [[0, 60, 96], [330, 62, 30], [378, 64, 192]])]));
    const first = rangeClip(info, 1, { startTick: 0, endTick: 384 }, 'Bass', '');
    expect(first.notes.map((n) => n.pitch)).toEqual([60, 62]);   // the 8th before is a push: it stays
    const second = rangeClip(info, 1, { startTick: 384, endTick: 768 }, 'Bass', '');
    expect(second.notes).toHaveLength(1);
    expect(second.notes[0]).toMatchObject({ beat: 0, pitch: 64 });
    expect(second.notes[0].len).toBeCloseTo(2 - 6 / 96);   // it ends where it did
    // A clip of both bars: the note plays on the bar line, in the second pad.
    const loop = { ...newLoop(), bpm: 120, length: 2 };
    const row = addRow(loop, { program: 1, drums: false, name: 'a' });
    placeClip(row, 0, rangeClip(info, 1, { startTick: 0, endTick: 768 }, 'a', ''), 2);
    expect(onsOf(loopSong(loop), 0)).toEqual([0, 1.71875, 2]);
    togglePad(row, 1, 1);
    expect(onsOf(loopSong(loop), 0)).toEqual([0, 1.71875]);   // its bar off: it is not heard
  });

  it("makes the Loop kit at another tempo (LUNA's session's): the same notes, in time with it", () => {
    // 96 ticks a beat, a 120 BPM file: a bar of 4 beats lasts 2 s; at 60 BPM, 4 s.
    const info = parseMidi(smf(0, 96, [noteEvents(0, [[0, 60, 96], [192, 62, 96]])]));
    const at = (song) => song.events.filter((e) => e.type === 'on').map((e) => e.sec);
    const own = lanesSong(info, [{ ch: 1, startTick: 0, endTick: 384 }]);
    const slow = lanesSong(info, [{ ch: 1, startTick: 0, endTick: 384 }], null, 60);
    expect([own.durationSec, slow.durationSec]).toEqual([2, 4]);
    expect(at(slow)).toEqual(at(own).map((s) => s * 2));
  });

  it('plays and sends a Loop kit lane with a note played just before a bar line in that bar', () => {
    const info = parseMidi(smf(0, 96, [noteEvents(0, [[0, 60, 96], [330, 62, 30], [378, 64, 192]])]));
    const ons = (song) => song.events.filter((e) => e.type === 'on').map((e) => [e.tick, e.a]);
    expect(ons(lanesSong(info, [{ ch: 1, startTick: 0, endTick: 384 }]))).toEqual([[0, 60], [330, 62]]);
    expect(ons(lanesSong(info, [{ ch: 1, startTick: 384, endTick: 768 }]))).toEqual([[0, 64]]);
    const notes = extractNotes(info, 'ch:1').notes;
    expect(sliceTicks(info, notes, 0, 384).notes.map((n) => n.pitch)).toEqual([60, 62]);
    expect(sliceTicks(info, notes, 384, 768).notes).toMatchObject([{ pitch: 64, start: 0, stop: 186 }]);
  });

  it('writes a clip from left to right: no empty bar before its first note, the silence at its end', () => {
    // 96 ticks a beat, 4/4: bar 1 empty, notes on beats 2 and 3 of bar 2.
    const info = parseMidi(smf(0, 96, [noteEvents(0, [[480, 60, 48], [576, 62, 48]])]));
    const c = rangeClip(info, 1, { startTick: 0, endTick: 768 }, 'Lead', '');   // bars 1-2 picked
    expect(c.notes.map((n) => n.beat)).toEqual([1, 2]);   // on their beats, in the first bar
    expect(c.bars).toBe(2);   // as long as picked: the empty bar goes to the end
    // A fragment whose first note is played just before its bar line starts on that bar.
    const early = parseMidi(smf(0, 96, [noteEvents(0, [[378, 60, 96], [480, 62, 96], [576, 64, 96]])]));
    const [f] = channelFragments(early, extractNotes(early, 'ch:1').notes);
    expect(f.startBar).toBe(2);
    const clipped = clipFrom(early, 1, { at: f.at, ticks: f.ticks, startBar: f.startBar, bars: f.bars }, 'Lead', '');
    expect(clipped.notes.map((n) => n.beat)).toEqual([0, 1, 2]);
    expect(clipped.bars).toBe(1);
  });

  it('copies, pastes, switches off and clears a selection of pads', () => {
    const loop = { ...newLoop(), length: 8 };
    const drums = addRow(loop, { program: 0, drums: true, name: 'Drums' });
    const bass = addRow(loop, { program: 33, drums: false, name: 'Bass' });
    placeClip(drums, 0, clip(1, [0, 1]));
    placeClip(bass, 0, clip(1, [2]));
    placeClip(drums, 5, clip(1, [3]));
    // Pads 1-2 of both rows (the second one empty): pasted at pad 4, it replaces what is there.
    const block = copyPads(loop, { r0: 0, r1: 1, c0: 0, c1: 1 }, 1);
    expect(pastePads(loop, block, { r: 0, c: 4 }, 1, 8)).toBe(true);
    expect(drums.clips.get(4).notes.map((n) => n.beat)).toEqual([0, 1]);
    expect(bass.clips.get(4).notes.map((n) => n.beat)).toEqual([2]);
    expect(drums.clips.has(5)).toBe(false);   // the empty pad copied empties it
    expect(drums.clips.get(4).notes).not.toBe(drums.clips.get(0).notes);   // a copy, not the same notes
    // Past the loop's end it is left out; drums never land on another row.
    expect(pastePads(loop, block, { r: 0, c: 7 }, 1, 8)).toBe(true);
    expect(drums.clips.has(8)).toBe(false);
    expect(pastePads(loop, block, { r: 1, c: 2 }, 1, 8)).toBe(false);
    // On / off: all off, then all on again.
    const sel = { r0: 0, r1: 1, c0: 4, c1: 4 };
    expect(mutePads(loop, sel, 1)).toBe(true);
    expect([padOff(drums, 4, 1), padOff(bass, 4, 1)]).toEqual([true, true]);
    mutePads(loop, sel, 1);
    expect([padOff(drums, 4, 1), padOff(bass, 4, 1)]).toEqual([false, false]);
    expect(clearPads(loop, sel, 1)).toBe(true);
    expect(drums.clips.has(4) || bass.clips.has(4)).toBe(false);
    expect(clearPads(loop, sel, 1)).toBe(false);   // already empty
  });

  it('copies a pad onto an empty pad of another instrument without changing the source', () => {
    const loop = { ...newLoop(), length: 3 };
    const source = addRow(loop, { program: 33, drums: false, name: 'Bass' });
    const target = addRow(loop, { program: 0, drums: true, name: 'Drums' });
    placeClip(source, 0, clip(1, [1]));
    const block = copyPads(loop, { r0: 1, r1: 1, c0: 0, c1: 0 }, 1);
    expect(pastePads(loop, block, { r: 0, c: 1 }, 1, 3)).toBe(false);
    expect(pastePads(loop, block, { r: 0, c: 1 }, 1, 3, { allowDrumChange: true, onlyEmpty: true })).toBe(true);
    expect(source.clips.get(0).notes[0].beat).toBe(1);
    expect(target.clips.get(1).notes[0].beat).toBe(1);
    expect(target.clips.get(1).notes).not.toBe(source.clips.get(0).notes);
    expect(pastePads(loop, block, { r: 0, c: 1 }, 1, 3, { allowDrumChange: true, onlyEmpty: true })).toBe(false);
    expect(target.clips.get(1).notes[0].beat).toBe(1);
  });

  it('knows the bars of every meter', () => {
    expect(['4/4', '3/4', '6/8', '12/8', '2/2', '5/4', '7/8'].map(meterBeats)).toEqual([4, 3, 3, 6, 4, 5, 3.5]);
  });

  it('leaves no silence after a bar of 3/4 in a loop of 3/4', () => {
    // 96 ticks a beat, a bar of 3/4 with six eighth notes, as here_in_my_head.mid.
    const line = Array.from({ length: 12 }, (_, k) => [k * 48, 60, 24]);
    const info = { ...parseMidi(smf(0, 96, [noteEvents(0, line)])) };
    const loop = { ...newLoop(), bpm: 120, length: 2 };
    setMeter(loop, '3/4');
    const row = addRow(loop, { program: 1, drums: false, name: 'a' });
    placeClip(row, 0, rangeClip(info, 1, { startTick: 0, endTick: 288 }, 'a', '', barBeats(loop)), 2);
    placeClip(row, 1, rangeClip(info, 1, { startTick: 288, endTick: 576 }, 'a', '', barBeats(loop)), 2);
    const song = loopSong(loop);
    expect(song.durationSec).toBe(3);   // 2 bars of 3 beats, half a second each
    expect(onsOf(song, 0)).toEqual([0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75]);
    expect(loopInfo(loop).lastTick).toBe(2880);
  });

  it('cuts and swaps clips on the bars of their meter', () => {
    const row = addRow({ ...newLoop(), rows: [] }, { program: 0, drums: false, name: 'x' });
    placeClip(row, 0, clip(2, [0, 3, 5], { beats: 3 }));
    clearBars(row, 1, 2);
    expect(row.clips.get(0).notes.map((n) => n.beat)).toEqual([0]);
  });

  it('replaces only the selected range and repeats the new fragment to fill it', () => {
    const loop = { ...newLoop(), bpm: 120, length: 4 };
    const row = addRow(loop, { program: 38, drums: false, name: 'Synth Bass 2' });
    placeClip(row, 0, clip(4, [0, 4, 8, 12]));

    expect(layRowRange(row, clip(1, [1]), 1, 3, 4)).toBe(true);
    expect(onsOf(loopSong(loop), 0)).toEqual([0, 2.5, 4.5, 6]);
    expect(layRowRange(row, clip(1, [0]), 3, 3, 4)).toBe(false);
  });

  it('changes meter keeping the notes, and saves it', () => {
    const loop = { ...newLoop(), bpm: 120, length: 1 };
    placeClip(addRow(loop, { program: 1, drums: false, name: 'a' }), 0, clip(1, [0, 3], { beats: 4 }));
    setMeter(loop, '3/4');
    expect(onsOf(loopSong(loop), 0)).toEqual([0]);   // beat 4 is out of the bar
    setMeter(loop, '4/4');
    expect(onsOf(loopSong(loop), 0)).toEqual([0, 1.5]);
    setMeter(loop, '6/8');
    const back = newLoop();
    readLoop(back, JSON.parse(JSON.stringify(loopFile(loop))));
    expect(back.timeSig).toBe('6/8');
  });

  it('puts clips of any origin on one grid, at one tempo', () => {
    const loop = { ...newLoop(), bpm: 120, length: 4 };
    const bass = addRow(loop, { program: 33, drums: false, name: 'Bass' });
    placeClip(bass, 0, clip(1, [2, 3]));
    placeClip(bass, 2, clip(2, [0, 5]));
    const song = loopSong(loop);
    expect(onsOf(song, 0)).toEqual([1, 1.5, 4, 6.5]);   // half a second a beat, 2 s a bar
    expect(song.durationSec).toBe(8);
  });

  it('gives every clip of a row the sound of the row', () => {
    const loop = { ...newLoop(), length: 2 };
    placeClip(addRow(loop, { program: 81, drums: false, name: 'Lead' }), 0, clip(1, [0]));
    expect(loopSong(loop).events.find((e) => e.type === 'pc')).toMatchObject({ ch: 0, a: 81 });
  });

  it('puts the drums on top, on their channel, and never moves them in pitch', () => {
    const loop = { ...newLoop(), length: 1 };
    addRow(loop, { program: 33, drums: false, name: 'Bass' });
    const drums = addRow(loop, { program: 0, drums: true, name: 'Drums' });
    expect(loop.rows[0]).toBe(drums);
    expect(addRow(loop, { program: 0, drums: true, name: 'More' })).toBe(null);
    placeClip(drums, 0, clip(1, [0], { transpose: 5 }));
    const on = loopSong(loop).events.find((e) => e.type === 'on');
    expect([on.ch, on.a]).toEqual([9, 60]);
  });

  it('moves a clip to the key of the loop', () => {
    const loop = { ...newLoop(), length: 1 };
    placeClip(addRow(loop, { program: 0, drums: false, name: 'x' }), 0, clip(1, [0], { transpose: 3 }));
    expect(loopSong(loop).events.find((e) => e.type === 'on').a).toBe(63);
  });

  it('takes only the bars a clip covers: what it lands on keeps the rest', () => {
    const row = addRow({ ...newLoop(), rows: [] }, { program: 0, drums: false, name: 'x' });
    placeClip(row, 4, clip(4, [0, 4, 8, 12]));   // bars 5-8, one clip
    placeClip(row, 7, clip(1, [0], { name: 'new' }));   // on bar 8
    expect([...row.clips.entries()].map(([at, c]) => [at, c.bars, c.notes.length])).toEqual([[4, 3, 3], [7, 1, 1]]);
    placeClip(row, 5, clip(1, [1], { name: 'mid' }));   // in the middle: both sides stay
    const bars = [...row.clips.entries()].sort((a, b) => a[0] - b[0]);
    expect(bars.map(([at, c]) => [at, c.bars])).toEqual([[4, 1], [5, 1], [6, 1], [7, 1]]);
    expect(row.clips.get(6).notes[0].beat).toBe(0);   // the rest of it, from its own bar
  });

  it('cuts a clip where the loop ends', () => {
    const row = addRow({ ...newLoop(), rows: [] }, { program: 0, drums: false, name: 'x' });
    placeClip(row, 7, clip(4, [0, 3.5, 4, 8]), 8);
    const c = row.clips.get(7);
    expect([c.bars, c.notes.map((n) => n.beat)]).toEqual([1, [0, 3.5]]);
    expect(c.notes[1].len).toBe(0.5);
  });

  it('empties one pad of a long clip', () => {
    const row = addRow({ ...newLoop(), rows: [] }, { program: 0, drums: false, name: 'x' });
    placeClip(row, 0, clip(4, [0, 4, 8, 12]));
    clearBars(row, 1, 2);
    expect([...row.clips.keys()].sort()).toEqual([0, 2]);
  });

  it('silences a pad switched off and keeps its notes, in what is heard and what is sent', () => {
    const loop = { ...newLoop(), bpm: 120, length: 3 };
    const row = addRow(loop, { program: 1, drums: false, name: 'a' });
    placeClip(row, 0, clip(3, [0, 4, 8]));
    togglePad(row, 1, 1);
    expect(onsOf(loopSong(loop), 0)).toEqual([0, 4]);   // 2 s a bar: the second bar is gone
    expect(loopInfo(loop).events.filter((e) => e.type === 'on')).toHaveLength(2);
    expect(row.clips.get(0).notes).toHaveLength(3);
    togglePad(row, 1, 1);
    expect(onsOf(loopSong(loop), 0)).toEqual([0, 2, 4]);
  });

  it('stops a long note where a pad switched off begins', () => {
    const loop = { ...newLoop(), bpm: 120, length: 3 };
    const row = addRow(loop, { program: 1, drums: false, name: 'a' });
    placeClip(row, 0, { name: 'x', key: '', bars: 3, notes: [{ beat: 2, len: 8, pitch: 60, vel: 100 }] });
    togglePad(row, 1, 1);
    expect(loopSong(loop).events.find((e) => e.type === 'off').sec).toBe(2);
  });

  it('switches a long pad whole, and turns on what lands on it', () => {
    const row = addRow({ ...newLoop(), rows: [] }, { program: 0, drums: false, name: 'x' });
    placeClip(row, 0, clip(4, [0]));
    togglePad(row, 0, 2);
    expect(padOff(row, 0, 2)).toBe(true);
    togglePad(row, 1, 1);
    expect(padOff(row, 0, 2)).toBe(false);
    togglePad(row, 0, 2);   // one bar off: the pad goes off whole
    expect(row.off.sort()).toEqual([0, 1]);
    placeClip(row, 1, clip(1, [0]));
    expect(row.off).toEqual([0]);
  });

  it('keeps the pads switched off in its file, and reads loops saved without them', () => {
    const loop = { ...newLoop(), length: 2 };
    const row = addRow(loop, { program: 0, drums: false, name: 'x' });
    placeClip(row, 0, clip(2, [0, 4]));
    togglePad(row, 1, 1);
    const file = JSON.parse(JSON.stringify(loopFile(loop)));
    const back = newLoop();
    readLoop(back, file);
    expect(back.rows[0].off).toEqual([1]);
    delete file.rows[0].off;
    readLoop(back, file);
    expect(onsOf(loopSong(back), 0)).toHaveLength(2);
  });

  it('swaps two pads of a row, with their state', () => {
    const loop = { ...newLoop(), bpm: 120, length: 4 };
    const row = addRow(loop, { program: 1, drums: false, name: 'a' });
    placeClip(row, 0, clip(1, [1]));
    placeClip(row, 2, clip(1, [3]));
    togglePad(row, 2, 1);
    expect(moveBlock(loop, { r0: 0, r1: 0, c0: 0, c1: 0 }, { dr: 0, dc: 2 }, 1, 4)).toBe(true);
    expect(row.clips.get(0).notes[0].beat).toBe(3);
    expect(row.clips.get(2).notes[0].beat).toBe(1);
    expect(row.off).toEqual([0]);
  });

  it('moves a pad onto an empty one, and takes one bar out of a long clip', () => {
    const loop = { ...newLoop(), rows: [] };
    const row = addRow(loop, { program: 1, drums: false, name: 'a' });
    placeClip(row, 0, clip(3, [0, 4, 8]));
    moveBlock(loop, { r0: 0, r1: 0, c0: 1, c1: 1 }, { dr: 0, dc: 4 }, 1, 8);
    const bars = [...row.clips.entries()].sort((a, b) => a[0] - b[0]).map(([at, c]) => [at, c.bars, c.notes.length]);
    expect(bars).toEqual([[0, 1, 1], [2, 1, 1], [5, 1, 1]]);
  });

  it('swaps between rows, each with the sound of its row, but keeps the drums apart', () => {
    const loop = { ...newLoop(), length: 2 };
    const bass = addRow(loop, { program: 33, drums: false, name: 'Bass' });
    const lead = addRow(loop, { program: 81, drums: false, name: 'Lead' });
    addRow(loop, { program: 0, drums: true, name: 'Drums' });   // first row: the drums go on top
    placeClip(bass, 0, clip(1, [0]));
    const at = { r0: 1, r1: 1, c0: 0, c1: 0 };   // the bass's first pad
    expect(moveBlock(loop, at, { dr: -1, dc: 0 }, 1, 2)).toBe(false);
    expect(moveBlock(loop, at, { dr: 1, dc: 1 }, 1, 2)).toBe(true);
    expect(bass.clips.size).toBe(0);
    expect(lead.clips.has(1)).toBe(true);
    expect(moveBlock(loop, { r0: 2, r1: 2, c0: 1, c1: 1 }, { dr: 0, dc: 1 }, 1, 2)).toBe(false);   // past the end
  });

  it('moves the selected pads up or down on their own, over the loop key, never the drums', () => {
    const loop = { ...newLoop(), length: 4, key: '3 mayor' };
    const drums = addRow(loop, { program: 0, drums: true, name: 'Drums' });
    const bass = addRow(loop, { program: 33, drums: false, name: 'Bass' });
    placeClip(drums, 0, clip(1, [0]));
    placeClip(bass, 0, clip(2, [0, 4], { key: '0 menor', transpose: 0 }));   // C minor: Eb major's relative
    const sel = { r0: 0, r1: 1, c0: 1, c1: 1 };   // the second pad of both rows
    expect(shiftPads(loop, sel, 1, 2)).toBe(true);
    expect(padShift(bass, 1, 1)).toBe(2);
    expect(padShift(bass, 0, 1)).toBe(0);   // the long clip was cut: its first pad stays
    expect(drums.clips.get(1)).toBeUndefined();
    const pitches = loopSong(loop).events.filter((e) => e.type === 'on' && e.ch === 0).map((e) => e.a);
    expect(pitches).toEqual([60, 62]);
    shiftPads(loop, { r0: 1, r1: 1, c0: 1, c1: 1 }, 1, -2);
    expect(padShift(bass, 1, 1)).toBe(0);
    expect(shiftPads(loop, { r0: 0, r1: 0, c0: 0, c1: 0 }, 1, 1)).toBe(false);   // drums
  });

  it('keeps the chords under a clip, and the loop takes its harmony from its first harmonic row', () => {
    // 96 ticks a beat, 4/4: bar 1 a C major chord, bar 2 an A minor one.
    const info = parseMidi(smf(0, 96, [noteEvents(0, [[0, 60, 384], [0, 64, 384], [0, 67, 384], [384, 57, 384], [384, 60, 384], [384, 64, 384]])]));
    const c = rangeClip(info, 1, { startTick: 0, endTick: 768 }, 'Keys', '0 mayor');
    expect(c.chords).toEqual([0, 0, 0, 0, 19, 19, 19, 19]);   // C = 0 * 2, Am = 9 * 2 + 1
    const loop = { ...newLoop(), length: 2, key: '7 mayor' };   // G major: the part goes up 7 (-5)
    const drums = addRow(loop, { program: 0, drums: true, name: 'Drums' });
    const keys = addRow(loop, { program: 0, drums: false, name: 'Keys' });
    placeClip(drums, 0, { ...c, chords: [2, 2, 2, 2, 2, 2, 2, 2] });   // the drums never count
    placeClip(keys, 0, { ...c, transpose: transposeBetween('0 mayor', '7 mayor') });
    expect(loopChords(loop)).toEqual([14, 14, 14, 14, 9, 9, 9, 9]);   // G, then Em
    expect(loopProgression(loop)).toBe('M 0*4 9m*4');   // I and vi of G major, bar for bar
    shiftPads(loop, { r0: 1, r1: 1, c0: 1, c1: 1 }, 1, 2);   // the second pad 2 up: F#m
    expect(loopChords(loop).slice(4)).toEqual([13, 13, 13, 13]);
  });

  it('swings 16ths or 8ths and plays harder or softer the selected pads, their notes kept as they came', () => {
    const loop = { ...newLoop(), length: 2 };
    const drums = addRow(loop, { program: 0, drums: true, name: 'Drums' });
    const notes = [0, 0.27, 0.5, 0.75].map((beat) => ({ beat, len: 0.1, pitch: 36, vel: 100 }));
    placeClip(drums, 0, { name: 'd', key: '', bars: 2, notes });
    const sel = { r0: 0, r1: 0, c0: 0, c1: 0 };   // the first bar only
    expect(feelPads(loop, sel, 1, { swing: 58, swingGrid: 0.25, vel: 0.8 })).toBe(true);
    const felt = drums.clips.get(0);
    expect(felt.notes.map((n) => n.beat)).toEqual([0, 0.27, 0.5, 0.75]);   // kept as they came
    // Each second 16th of a pair (0.27, near enough, and 0.75) to 58 % of it: 0.29 and 0.79.
    expect(heardNotes(felt).map((n) => +n.beat.toFixed(3))).toEqual([0, 0.29, 0.5, 0.79]);
    expect(heardNotes(felt)[0].vel).toBe(80);
    expect(feelText(felt)).toBe('swing 1/16 58 %, velocity 80 %');
    expect(heardNotes(drums.clips.get(1))).toBe(drums.clips.get(1).notes);   // the second bar as it came
    expect(feelPads(loop, sel, 1, { swing: 58, swingGrid: 0.25 })).toBe(false);   // already so
    // Swing 1/8: each second 8th of a beat (0.5) to 66 % of the beat; the 16ths stay.
    expect(feelPads(loop, sel, 1, { swing: 66, swingGrid: 0.5 })).toBe(true);
    expect(heardNotes(drums.clips.get(0)).map((n) => +n.beat.toFixed(3))).toEqual([0, 0.27, 0.66, 0.75]);
    expect(feelText(drums.clips.get(0))).toBe('swing 1/8 66 %, velocity 80 %');
    // Straight again.
    expect(feelPads(loop, sel, 1, { swing: 50, swingGrid: 0.25 })).toBe(true);
    expect(heardNotes(drums.clips.get(0)).map((n) => n.beat)).toEqual([0, 0.27, 0.5, 0.75]);
    // A loop saved when pads could be quantized: its quantize is left out.
    expect(heardNotes({ notes: [{ beat: 0.27, len: 0.1, pitch: 36, vel: 100 }], quant: 0.25 })[0].beat).toBe(0.27);
    // An octave: never the drums.
    const keys = addRow(loop, { program: 0, drums: false, name: 'Keys' });
    placeClip(keys, 0, clip(1, [0]));
    expect(shiftPads(loop, { r0: 0, r1: 1, c0: 0, c1: 0 }, 1, 12)).toBe(true);
    expect([padShift(drums, 0, 1), padShift(keys, 0, 1)]).toEqual([0, 12]);
  });

  it('puts a row elsewhere among the rows, with all it has', () => {
    const loop = { ...newLoop(), length: 1 };
    const [a, b, c] = ['A', 'B', 'C'].map((name) => addRow(loop, { program: 0, drums: false, name }));
    placeClip(b, 0, clip(1, [0]));
    b.mute = true;
    const names = () => loop.rows.map((r) => r.name).join('');
    expect(moveRow(loop, 2, 0)).toBe(true);   // C to the top
    expect(names()).toBe('CAB');
    expect(moveRow(loop, 0, 3)).toBe(true);   // C under the last
    expect(names()).toBe('ABC');
    expect(moveRow(loop, 1, 0)).toBe(true);   // B, with its clip and its mute
    expect(loop.rows[0]).toBe(b);
    expect([loop.rows[0].clips.size, loop.rows[0].mute]).toEqual([1, true]);
    // Where it already is: before itself or before the next one.
    expect(moveRow(loop, 1, 1)).toBe(false);
    expect(moveRow(loop, 1, 2)).toBe(false);
    expect(moveRow(loop, 5, 0)).toBe(false);
    expect([a, c].every((r) => loop.rows.includes(r))).toBe(true);
  });

  it('moves a pad down or up as far as its notes stay MIDI notes, an octave always a whole one', () => {
    const loop = { ...newLoop(), length: 1 };
    const bass = addRow(loop, { program: 33, drums: false, name: 'Bass' });
    placeClip(bass, 0, { name: 'b', key: '', bars: 1, notes: [{ beat: 0, len: 1, pitch: 40, vel: 100 }, { beat: 1, len: 1, pitch: 47, vel: 100 }] });
    const pad = { r0: 0, r1: 0, c0: 0, c1: 0 };
    const lowest = () => 40 + padShift(bass, 0, 1);
    // Past the old limit of two octaves: three octaves down, from 40 to 4.
    for (let k = 0; k < 3; k++) expect(shiftPads(loop, pad, 1, -12)).toBe(true);
    expect(lowest()).toBe(4);
    // Another octave would take it under 0: it stays, and −1 still goes on, semitone by semitone.
    expect(shiftPads(loop, pad, 1, -12)).toBe(false);
    expect(lowest()).toBe(4);
    for (let k = 0; k < 4; k++) expect(shiftPads(loop, pad, 1, -1)).toBe(true);
    expect(lowest()).toBe(0);
    expect(shiftPads(loop, pad, 1, -1)).toBe(false);
    // Up: until its highest note (47) reaches 127.
    while (shiftPads(loop, pad, 1, 12));
    while (shiftPads(loop, pad, 1, 1));
    expect(47 + padShift(bass, 0, 1)).toBe(127);
  });

  it('names the chords of a bar, as said over the pads', () => {
    expect(barChordText([18, 18, 18, 18])).toBe('A');        // 9 * 2: A major
    expect(barChordText([19, 19, 10, 10])).toBe('Am F');     // A minor, then F major
    expect(barChordText([19, 19, 19, 19], 2)).toBe('Bm');    // moved 2 up
    expect(barChordText([-1, -1, 1, 1])).toBe('Cm');
    expect(barChordText([-1, -1])).toBe('');
  });

  it('draws notes on the whole octaves of a row: a note always at its height, a semitone a step', () => {
    const scale = octaveScale([50, 62]);   // D3 and D4: two octaves, C3 to B4
    expect([scale.lo, scale.span]).toEqual([48, 24]);
    expect(octaveScale([50, 55])).toMatchObject({ lo: 48, span: 12 });   // one octave
    expect(pitchY(48, scale)).toBeCloseTo(5 + (90 - scale.h));   // the lowest at the bottom
    expect(pitchY(71, scale)).toBeCloseTo(5);   // B4 at the top
    expect(pitchY(51, scale)).toBeLessThan(pitchY(50, scale));   // up a semitone: higher
  });

  it('moves a block of pads as a sliding puzzle: apart they change places, overlapping they shift', () => {
    const loop = { ...newLoop(), length: 6 };
    const row = addRow(loop, { program: 1, drums: false, name: 'a' });
    for (const [bar, beat] of [[0, 0], [1, 1], [2, 2], [4, 3]]) placeClip(row, bar, clip(1, [beat]));
    const beats = () => Array.from({ length: 6 }, (_, b) => row.clips.get(b)?.notes[0].beat ?? null);
    expect(moveBlock(loop, { r0: 0, r1: 0, c0: 0, c1: 1 }, { dr: 0, dc: 3 }, 1, 6)).toBe(true);   // pads 1-2 with 4-5
    expect(beats()).toEqual([null, 3, 2, 0, 1, null]);
    expect(moveBlock(loop, { r0: 0, r1: 0, c0: 3, c1: 4 }, { dr: 0, dc: 1 }, 1, 6)).toBe(true);   // one to the right
    expect(beats()).toEqual([null, 3, 2, null, 0, 1]);   // the empty pad it covered goes to the gap
  });

  it('tells the pads that sound, each to be a clip', () => {
    const loop = { ...newLoop(), length: 4 };
    const a = addRow(loop, { program: 1, drums: false, name: 'a' });
    const bar = 1920;   // 4 beats of 480 ticks
    placeClip(a, 0, clip(1, [0]));
    placeClip(a, 2, clip(2, [1, 5]));
    togglePad(a, 3, 1);
    expect(padSpans(loop).get(1)).toEqual([{ startTick: 0, endTick: bar }, { startTick: 2 * bar, endTick: 3 * bar }]);
  });

  it('counts a pad a long note rings into, and a pad of another meter', () => {
    const loop = { ...newLoop(), length: 3 };
    setMeter(loop, '3/4');
    const a = addRow(loop, { program: 1, drums: false, name: 'a' });
    placeClip(a, 0, { name: 'x', key: '', beats: 3, bars: 2, notes: [{ beat: 2, len: 2, pitch: 60, vel: 100 }] });
    expect(padSpans(loop).get(1)).toEqual([{ startTick: 0, endTick: 1440 }, { startTick: 1440, endTick: 2880 }]);
  });

  it('honours mute and solo, and keeps a row’s setup when silent', () => {
    const loop = { ...newLoop(), length: 1 };
    const a = addRow(loop, { program: 1, drums: false, name: 'a' });
    const b = addRow(loop, { program: 2, drums: false, name: 'b' });
    placeClip(a, 0, clip(1, [0]));
    placeClip(b, 0, clip(1, [0]));
    a.mute = true;
    expect(onsOf(loopSong(loop), 0)).toEqual([]);
    a.mute = false;
    b.solo = true;
    expect(onsOf(loopSong(loop), 0)).toEqual([]);
    expect(onsOf(loopSong(loop), 1)).toEqual([0]);
  });

  it('plays what is being listened to over the rest, round and round', () => {
    const loop = { ...newLoop(), bpm: 120, length: 2 };
    placeClip(addRow(loop, { program: 1, drums: false, name: 'a' }), 0, clip(2, [0]));
    const song = loopSong(loop, { clip: clip(1, [1]), program: 40, transpose: 2 });
    expect(onsOf(song, 15)).toEqual([0.5, 2.5]);
    expect(onsOf(song, 0)).toEqual([0]);
  });

  it('plays a longer fragment completely while a short loop repeats', () => {
    const loop = { ...newLoop(), bpm: 120, length: 1 };
    placeClip(addRow(loop, { program: 1, drums: false, name: 'loop' }), 0, clip(1, [0]));
    const three = { name: 'x', key: '', bars: 3, notes: [60, 62, 64].map((pitch, k) => ({ beat: k * 4, len: 0.5, pitch, vel: 100 })) };
    const song = loopSong(loop, { clip: three, program: 0 });
    expect(song.durationSec).toBe(6);
    expect(onsOf(song, 0)).toEqual([0, 2, 4]);
    expect(song.events.filter((e) => e.type === 'on' && e.ch === 15).map((e) => e.a)).toEqual([60, 62, 64]);
  });

  it('keeps different loop and fragment lengths in phase across the combined cycle', () => {
    const loop = { ...newLoop(), bpm: 120, length: 2 };
    placeClip(addRow(loop, { program: 1, drums: false, name: 'loop' }), 0, clip(1, [0]));
    const three = { name: 'x', key: '', bars: 3, notes: [60, 62, 64].map((pitch, k) => ({ beat: k * 4, len: 0.5, pitch, vel: 100 })) };
    const song = loopSong(loop, { clip: three, program: 0, from: 1 });
    expect(song.durationSec).toBe(12);
    expect(onsOf(song, 0)).toEqual([0, 4, 8]);
    expect(song.events.filter((e) => e.type === 'on' && e.ch === 15).map((e) => e.a)).toEqual([64, 60, 62, 64, 60, 62]);
  });

  it('auditions selected instruments and drums together over the loop without channel collisions', () => {
    const loop = { ...newLoop(), bpm: 120, length: 2 };
    placeClip(addRow(loop, { program: 1, drums: false, name: 'loop' }), 0, clip(2, [0]));
    const tracks = [
      { clip: clip(1, [0]), program: 40, transpose: 2 },
      { clip: clip(1, [1]), program: 73, transpose: -1 },
      { clip: clip(1, [2]), drums: true, transpose: 5 },
    ];
    const song = loopSong(loop, { tracks, from: 0 });
    expect(onsOf(song, 0)).toEqual([0]);
    expect(onsOf(song, 15)).toEqual([0, 2]);
    expect(onsOf(song, 14)).toEqual([0.5, 2.5]);
    expect(onsOf(song, 9)).toEqual([1, 3]);
    expect(song.events.filter((e) => e.type === 'pc').map(({ ch, a }) => [ch, a])).toEqual([[0, 1], [15, 40], [14, 73]]);
    expect(song.events.filter((e) => e.type === 'on' && e.sec < 2).map(({ ch, a }) => [ch, a])).toEqual([[0, 60], [15, 62], [14, 59], [9, 60]]);
  });

  it('refuses an overlay that needs more channels than the loop has free', () => {
    const loop = { ...newLoop(), length: 1 };
    for (let i = 0; i < 14; i++) addRow(loop, { program: i, drums: false, name: `row ${i}` });
    const tracks = [{ clip: clip(1, [0]), program: 1 }, { clip: clip(1, [1]), program: 2 }];
    expect(() => loopSong(loop, { tracks })).toThrow('Not enough MIDI channels');
    expect(loopSong(loop, { tracks: [tracks[0]] }).events.find((e) => e.type === 'on').ch).toBe(15);
  });

  it('starts what is listened to from its own first bar on the bar it comes in on', () => {
    // 8 bars at 120 (a bar: 2 s); a fragment of 3 bars, a note on each bar's first beat: 60, 62, 64.
    const loop = { ...newLoop(), bpm: 120, length: 8 };
    const three = { name: 'x', key: '', bars: 3, notes: [60, 62, 64].map((pitch, k) => ({ beat: k * 4, len: 0.5, pitch, vel: 100 })) };
    const at = (song) => song.events.filter((e) => e.type === 'on' && e.ch === 15).map((e) => `${e.sec}:${e.a}`);
    // From the start: its first bar on bars 1, 4 and 7.
    expect(at(loopSong(loop, { clip: three, program: 0 })).slice(0, 8)).toEqual(['0:60', '2:62', '4:64', '6:60', '8:62', '10:64', '12:60', '14:62']);
    // Coming in on bar 8 (from 0: 7): its first bar there, and the laps before it in step.
    const late = at(loopSong(loop, { clip: three, program: 0, from: 7 }));
    expect(late).toContain('14:60');
    expect(late.slice(0, 8)).toEqual(['0:64', '2:60', '4:62', '6:64', '8:60', '10:62', '12:64', '14:60']);
  });

  it('plays what is being listened to alone, when it is asked to', () => {
    const loop = { ...newLoop(), bpm: 120, length: 2 };
    placeClip(addRow(loop, { program: 1, drums: false, name: 'a' }), 0, clip(2, [0]));
    const song = loopSong(loop, { clip: clip(1, [1]), program: 40, alone: true });
    expect(onsOf(song, 15)).toEqual([0.5, 2.5]);
    expect(onsOf(song, 0)).toEqual([]);
  });

  it('reads as a parsed file, with what plays now', () => {
    const loop = { ...newLoop(), bpm: 100, length: 2 };
    placeClip(addRow(loop, { program: 33, drums: false, name: 'Bass' }), 0, clip(1, [1]));
    const muted = addRow(loop, { program: 81, drums: false, name: 'Lead' });
    placeClip(muted, 0, clip(1, [0]));
    muted.mute = true;
    placeClip(addRow(loop, { program: 0, drums: true, name: 'Drums' }), 0, clip(1, [0]));
    const info = loopInfo(loop);
    expect(info.playing).toEqual([1, 10]);   // drums on 10; bass on 1, as the drums come first in rows but not in channels
    expect(info.lastTick).toBe(3840);
    const notes = extractNotes(info, 'ch:1');
    expect(notes.program).toBe(33);
    expect(notes.notes[0].start).toBe(480);
    expect(extractNotes(info, 'ch:10').drums).toBe(true);
  });

  it('saves everything in its file, and reads it back the same', () => {
    const loop = { ...newLoop(), bpm: 128, key: '9 menor', length: 4 };
    const row = addRow(loop, { program: 33, drums: false, name: 'Bass' });
    placeClip(row, 2, clip(1, [0, 1], { transpose: 3 }));
    row.mute = true;
    const back = newLoop();
    readLoop(back, JSON.parse(JSON.stringify(loopFile(loop))));
    expect(back).toMatchObject({ bpm: 128, key: '9 menor', length: 4 });
    expect(back.rows[0]).toMatchObject({ name: 'Bass', mute: true });
    expect(loopSong(back).events).toEqual(loopSong({ ...loop }).events);
    expect(() => readLoop(back, { app: 'other' })).toThrow();
  });

  it('follows the Length (16 bars to start with), or in Auto what the clips reach; a pad a bar always', () => {
    const loop = newLoop();
    expect(loop.length).toBe(16);
    loop.length = null;   // Auto
    const row = addRow(loop, { program: 0, drums: false, name: 'x' });
    expect([loopBars(loop), padBars(loop)]).toEqual([8, 1]);
    placeClip(row, 9, clip(2, [0]));
    expect([loopBars(loop), padBars(loop)]).toEqual([12, 1]);
    loop.length = 4;
    expect([loopBars(loop), padBars(loop)]).toEqual([4, 1]);
  });
});

describe('a row laid out as a piece (Arrange)', () => {
  it('fits shorter and longer replacements into original slots without changing arrangement gaps', () => {
    const originals = [clip(4, [0, 4, 8, 12]), clip(2, [0, 4])];
    const replacements = [clip(2, [0, 4], { name: 'short' }), clip(4, [0, 4, 8, 12], { name: 'long' })];
    const material = arrangementMaterial(originals, replacements);
    expect(material.map((part) => [part.name, part.bars])).toEqual([['short', 2], ['short', 2], ['long', 2]]);
    const row = addRow(newLoop(), { program: 0, drums: false, name: 'p' });
    layRow(row, material, [{ at: 0, from: 0, bars: 3 }, { at: 6, from: 4, bars: 2 }], 8);
    expect([...row.clips].map(([at, part]) => [at, part.bars, part.name])).toEqual([[0, 2, 'short'], [2, 1, 'short'], [6, 2, 'long']]);
    expect(originals.map((part) => part.bars)).toEqual([4, 2]);
    expect(arrangementMaterial(originals, originals)).toEqual(originals);
  });

  it('plays its material round and round in its placements, from where each one says', () => {
    const loop = newLoop();
    const row = addRow(loop, { program: 0, drums: false, name: 'p' });
    placeClip(row, 5, clip(1, [0]));   // it goes: the row is laid out anew
    row.off = [6];
    // A 2-bar material (a note at the start of each bar): bars 2-5 from its start, bar 9 from its 2nd bar.
    const material = clip(2, [0, 4]);
    layRow(row, material, [{ at: 2, from: 0, bars: 4 }, { at: 9, from: 1, bars: 1 }], 16);
    expect([...row.clips.keys()].sort((a, b) => a - b)).toEqual([2, 4, 9]);
    expect(row.clips.get(2).bars).toBe(2);
    expect(row.clips.get(9).notes.map((n) => n.beat)).toEqual([0]);
    expect(row.off).toEqual([]);
    expect(material.notes[0].beat).toBe(0);   // the material itself untouched
    expect(row.clips.get(9).whole).toBe(material);   // each piece knows what it was cut from
    expect(JSON.stringify(row.clips.get(9))).not.toContain('whole');   // never in a file
  });

  it('plays fragments one after another, each its own, round again', () => {
    const loop = newLoop();
    const row = addRow(loop, { program: 0, drums: false, name: 'p' });
    const a = clip(2, [0], { key: '0 mayor' });
    const b = clip(1, [1], { key: '9 menor' });
    layRow(row, [a, b], [{ at: 0, from: 0, bars: 6 }], 16);
    // a (2 bars), b (1), a, b: and the last piece of a is cut where the placement ends.
    expect([...row.clips].map(([at, c]) => [at, c.bars, c.key])).toEqual([[0, 2, '0 mayor'], [2, 1, '9 menor'], [3, 2, '0 mayor'], [5, 1, '9 menor']]);
    // From the middle of the material: a's 2nd bar, then b.
    layRow(row, [a, b], [{ at: 0, from: 1, bars: 2 }], 16);
    expect([...row.clips].map(([at, c]) => [at, c.bars, c.key])).toEqual([[0, 1, '0 mayor'], [1, 1, '9 menor']]);
    // A piece cut again keeps what it came from.
    clearBars(row, 0, 1);
    expect(row.clips.get(1).whole).toBe(b);
  });
});

describe('the counter', () => {
  it('counts a bar in the beats of its meter, as a conductor does', () => {
    expect(['4/4', '2/2', '3/4', '2/4', '6/8', '9/8', '12/8', '5/4', '7/8'].map(meterPulses)).toEqual([4, 2, 3, 2, 2, 3, 4, 5, 7]);
  });
});
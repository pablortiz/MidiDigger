// A loop built from nothing: rows of one instrument each, with fragments of any song on their
// pads, on one grid of bars at one tempo, meter and key. Nothing here depends on a song being
// open: a clip keeps its notes, as beats from the start of its first bar, so each comes in on
// the beat it plays on in its song.

import { EARLY, extractNotes, transposeBetween } from './parts.js';
import { progressionIn, songChords } from './chords.js';
import { grooveNote, grooveOf, grooveUnion } from './groove.js';
import { STEPS_PER_BEAT, noteGrid, sounds } from './harmony.js';
import { HITS_PER_BEAT, hitGrid, strikes } from './rhythm.js';
import { adaptNotes } from './adapt.js';
import { mergeFillOrigins } from './loop-confirmations.js';

export { EARLY };

const PPQ = 480;
const BAR_BEATS = 4;   // a clip with no meter of its own, from a loop saved before they had one
const LENGTHS = [1, 2, 4, 8, 12, 16, 32];
const MAX_ROWS = 15;   // sixteen MIDI channels, one of them the drums'
/** A note starting `early` beats before a boundary, moved onto it; its end stays where it was. */
const onTime = (n, beat, early) => ({ ...n, beat, len: Math.max(1e-3, n.len - early) });

export const METERS = ['4/4', '3/4', '6/8', '2/4', '12/8', '2/2', '5/4', '7/8', '9/8'];

export const newLoop = () => ({ bpm: 120, timeSig: '4/4', key: '', length: 16, rows: [] });

/** Quarter notes in a bar of a meter ("3/4"). NaN if it is not one. */
export function meterBeats(ts) {
  const [num, den] = String(ts).split('/').map(Number);
  return (num * 4) / den;
}

/**
 * The beats a bar of a meter is counted in, as a conductor or a metronome does: 2/2 two halves,
 * 6/8 two dotted quarters (9/8 three, 12/8 four), the others their top number (3/4 three, 7/8 seven).
 */
export function meterPulses(ts) {
  const [num, den] = String(ts).split('/').map(Number);
  if (!num || !den) return 4;
  return den === 8 && num > 3 && num % 3 === 0 ? num / 3 : num;
}

/** Quarter notes in a bar of the loop. */
export const barBeats = (loop) => meterBeats(loop.timeSig);

/** Another meter: clips keep their bars and their notes; what no longer fits a bar is not heard. */
export function setMeter(loop, ts) {
  loop.timeSig = ts;
  const beats = barBeats(loop);
  for (const row of loop.rows) for (const clip of row.clips.values()) clip.beats = beats;
}

/**
 * A fragment as a clip: `frag` { at, ticks, startBar, bars } of channel `ch` of a parsed file.
 * Its bars are the loop's, of `beats` quarter notes; its notes count from the first bar they had.
 */
export function clipFrom(info, ch, frag, name, key, beats = BAR_BEATS) {
  const from = info.barStartTick(frag.startBar);
  const early = EARLY * info.ppq;   // a note this close before the start or the end: the next bar's (EARLY)
  const first = Math.max(0, (frag.at - from) / info.ppq);
  const { notes, skipped } = leftAligned(extractNotes(info, `ch:${ch}`).notes
    .filter((n) => n.start >= frag.at - early && n.start < frag.at + frag.ticks - early)
    .map((n) => ({ beat: (n.start - from) / info.ppq, len: (n.stop - n.start) / info.ppq, pitch: n.pitch, vel: n.velocity }))
    .map((n) => (n.beat < first ? onTime(n, first, first - n.beat) : n)), beats);
  // Its bars are the fragment's (to where it ends, as its card says), not to where its last note
  // ends: a note held over the end would add a bar holding only that tail. Held notes are cut there.
  const end = (frag.at + frag.ticks - from) / info.ppq - skipped * beats;
  const lastStart = Math.max(0, ...notes.map((n) => n.beat));
  const bars = Math.max(1, Math.ceil((end - EARLY) / beats - 1e-9), Math.floor(lastStart / beats + 1e-9) + 1);
  for (const n of notes) n.len = Math.max(1 / 64, Math.min(n.len, bars * beats - n.beat));
  return { name, key, notes, beats, bars, chords: chordsAt(info, from + skipped * beats * info.ppq, bars * beats) };
}

/**
 * A clip is written from left to right: whole empty bars before its first note go (its notes
 * keep their beat in the bar), the silence stays at its end. { notes, skipped: bars left out }.
 */
function leftAligned(notes, beats) {
  const skipped = notes.length ? Math.max(0, Math.floor(Math.min(...notes.map((n) => n.beat)) / beats + 1e-9)) : 0;
  return { notes: skipped ? notes.map((n) => ({ ...n, beat: n.beat - skipped * beats })) : notes, skipped };
}

/**
 * The chords its song plays under a clip, a quarter note each from `tick` (where the clip's
 * first beat is): as songChords gives them (root * 2 + minor, -1 none), in the song's own pitch.
 * They are the harmony the part was written over, as all its song's instruments make it.
 */
function chordsAt(info, tick, quarters) {
  const all = songChords(info);
  const from = Math.round(tick / info.ppq);
  return Array.from({ length: Math.ceil(quarters - 1e-9) }, (_, k) => all[from + k] ?? -1);
}

/**
 * A selection made by hand as a clip, as it is heard: its start falls on the first beat of the
 * clip, wherever it was in its bar. Only what starts in it, cut where it ends. Whole empty bars
 * at its start normally go to its end (leftAligned). Keep them when several tracks must stay aligned.
 */
export function rangeClip(info, ch, { startTick, endTick }, name, key, beats = BAR_BEATS, { preserveLeadingSilence = false } = {}) {
  const startBar = Math.floor(info.barOfTick(startTick) + 1e-9);
  const from = info.barStartTick(startBar);
  const early = EARLY * info.ppq;
  const skip = (startTick - from) / info.ppq;
  const end = (endTick - startTick) / info.ppq;
  // Its notes from the selection's start (not through clipFrom, which would left-align them from the bar's).
  const notes = extractNotes(info, `ch:${ch}`).notes
    .filter((n) => n.start >= startTick - early && n.start < endTick - early)
    .map((n) => ({ beat: (n.start - from) / info.ppq - skip, len: (n.stop - n.start) / info.ppq, pitch: n.pitch, vel: n.velocity }))
    .map((n) => (n.beat < 0 ? onTime(n, 0, -n.beat) : n))
    .map((n) => ({ ...n, len: Math.min(n.len, end - n.beat) }));
  const { notes: aligned, skipped } = preserveLeadingSilence ? { notes, skipped: 0 } : leftAligned(notes, beats);
  const bars = Math.max(1, Math.ceil(end / beats - 1e-9));
  return { name, key, notes: aligned, beats, bars, chords: chordsAt(info, startTick + skipped * beats * info.ppq, bars * beats) };
}

/** The last bar any clip reaches (0 with none). */
const clipsEnd = (loop) => Math.max(0, ...loop.rows.flatMap((r) => [...r.clips].map(([bar, c]) => bar + c.bars)));

/** The loop's bars: its Length, or (Auto) what its clips reach, up to a round length, 8 at least. */
export function loopBars(loop) {
  if (loop.length) return loop.length;
  return LENGTHS.find((L) => L >= Math.max(8, clipsEnd(loop))) ?? 32;
}

/** Bars in a pad: one, always (as a DAW's grid: pad 5 is bar 5). */
export const padBars = () => 1;

/** A new row. Null when no channel is left, or a second drums row. */
export function addRow(loop, { program, drums, name }) {
  if (loop.rows.length >= MAX_ROWS || (drums && loop.rows.some((r) => r.drums))) return null;
  const row = { program, drums, name, volume: 100, mute: false, solo: false, clips: new Map(), off: [] };
  // Rhythm first: the drums go on top, whatever came before.
  if (drums) loop.rows.unshift(row);
  else loop.rows.push(row);
  return row;
}

/** Place a set of synchronized clips on new rows, reusing an existing drums row. */
export function placeClipsAsRows(loop, clips, bar) {
  const drums = clips.filter((item) => item.drums);
  if (drums.length > 1) throw new Error('Only one drums track can be placed at once.');
  const existingDrums = loop.rows.find((row) => row.drums);
  const needed = clips.length - (existingDrums && drums.length ? 1 : 0);
  if (loop.rows.length + needed > MAX_ROWS) throw new Error('No channels are left for all selected tracks. Remove some rows or select fewer tracks.');
  const end = bar + Math.max(...clips.map((item) => item.clip.bars));
  if (end > LENGTHS[LENGTHS.length - 1]) throw new Error('The selected tracks do not fit within the 32-bar maximum. Select a shorter range or an earlier pad.');
  if (loop.length && end > loop.length) loop.length = LENGTHS.find((length) => length >= end);
  for (const item of clips) {
    const row = (item.drums && existingDrums) || addRow(loop, item);
    placeClip(row, bar, item.clip, loop.length);
  }
}

/**
 * The bars [from, to) of a clip (counted from its start) as a clip: what starts in them, cut at
 * their end; a note played just before a bar line is the next bar's (EARLY).
 */
export function cutClip(clip, from, to) {
  const beats = clip.beats ?? BAR_BEATS;
  const end = (to - from) * beats;
  const notes = clip.notes.map((n) => ({ ...n, beat: n.beat - from * beats })).filter((n) => n.beat >= -EARLY && n.beat < end - EARLY)
    .map((n) => (n.beat < 0 ? onTime(n, 0, -n.beat) : n))
    .map((n) => ({ ...n, len: Math.min(n.len, end - n.beat) }));
  const chords = clip.chords?.slice(Math.round(from * beats), Math.round(to * beats));
  // (A mode's chords as they came (modePads), cut alike.)
  const chordsBase = clip.chordsBase?.slice(Math.round(from * beats), Math.round(to * beats));
  const fillOrigins = clip.fillOrigins?.map((origin) => ({
    ...origin,
    base: origin.base && origin.base.bars === clip.bars ? cutClip(origin.base, from, to) : undefined,
  }));
  return { ...clip, notes, bars: to - from, ...(chords ? { chords } : {}), ...(chordsBase ? { chordsBase } : {}), ...(fillOrigins ? { fillOrigins } : {}) };
}

/** Are the `unit` bars of a pad all switched off? */
export const padOff = (row, bar, unit) => Array.from({ length: unit }, (_, k) => bar + k).every((b) => row.off.includes(b));

/** Switch a pad off, or on again: its notes stay, they only stop sounding. */
export function togglePad(row, bar, unit) {
  const bars = Array.from({ length: unit }, (_, k) => bar + k);
  const others = row.off.filter((b) => !bars.includes(b));
  row.off = padOff(row, bar, unit) ? others : [...others, ...bars];
}

/** Empty the bars [from, to) of a row: a clip they cover in part keeps the rest, either side. */
export function clearBars(row, from, to) {
  row.off = row.off.filter((b) => b < from || b >= to);   // what lands there sounds
  for (const [at, c] of [...row.clips]) {
    const end = at + c.bars;
    if (at >= to || end <= from) continue;
    row.clips.delete(at);
    // The pieces left remember the clip they were cut from, as layRow's do.
    if (at < from) row.clips.set(at, remember(cutClip(c, 0, from - at), c.whole));
    if (end > to) row.clips.set(to, remember(cutClip(c, to - at, end - at), c.whole));
  }
}

/** Put a clip on a row at a bar, in the bars it covers and no others, cut where the loop ends (`total`: its bars, if fixed). */
export function placeClip(row, bar, clip, total = null) {
  const fits = total ? Math.min(clip.bars, total - bar) : clip.bars;
  if (fits <= 0) return;
  clearBars(row, bar, bar + fits);
  row.clips.set(bar, fits < clip.bars ? remember(cutClip(clip, 0, fits), clip.whole) : clip);
}

/**
 * A row laid out again with its `material` (a clip, or clips played one after another, each
 * with its own key and feel) round and round: in each placement ({ at, from, bars }, as
 * parts.js lanePlacements gives them, `from` in bars of the material) the bars from there.
 * Every other clip of the row goes, and its pads are all on. Each piece placed remembers the
 * clip it was cut from (`whole`, kept out of files), so laying it out again starts from it whole.
 */
export function layRow(row, material, places, total = null) {
  const clips = [material].flat();
  const length = clips.reduce((n, c) => n + c.bars, 0);
  // The clip, and the bar of it, `pos` bars into the material.
  const clipAt = (pos) => {
    let k = 0;
    while (pos >= clips[k].bars) pos -= clips[k++].bars;
    return [clips[k], pos];
  };
  row.clips.clear();
  row.off = [];
  for (const p of places) {
    for (let at = p.at, pos = p.from % length; at < p.at + p.bars;) {
      const [clip, from] = clipAt(pos);
      const n = Math.min(clip.bars - from, p.at + p.bars - at);
      placeClip(row, at, remember(cutClip(clip, from, from + n), clip.whole ?? clip), total);
      at += n;
      pos = (pos + n) % length;
    }
  }
}

/** Fit replacement clips into the original material's slots without moving arrangement sections. */
export function arrangementMaterial(originals, replacements) {
  if (originals.length !== replacements.length) throw new Error('Each arrangement fragment needs a replacement or its original.');
  return originals.flatMap((original, i) => {
    const replacement = replacements[i];
    if (replacement === original) return [original];
    if (!(original.bars > 0) || !(replacement.bars > 0)) throw new Error('Arrangement fragments must have a positive length.');
    const staged = { clips: new Map(), off: [] };
    layRow(staged, replacement, [{ at: 0, from: 0, bars: original.bars }], original.bars);
    return [...staged.clips.values()];
  });
}

/**
 * Where one fragment of a row's material sounds after layRow laid it out with `places`: runs
 * { at, n, off } of row bars `at`… that play bars `off`… of it. `length`: the material's bars;
 * the fragment its bars [start, start + bars). Only bars still holding pieces of `whole` (what was
 * put there): those cleared or turned to something else since are left out. `total`: the loop's bars.
 */
export function slotRuns(row, { places, length, start, bars, whole, total = Infinity }) {
  const owner = new Map();
  for (const [at, c] of row.clips) for (let b = at; b < at + c.bars; b++) owner.set(b, c.whole ?? c);
  return placeRuns({ places, length, start, bars, total }, (at) => owner.get(at) === whole);
}

/**
 * Where one fragment of a row's material goes when layRow lays it out with `places`, the bars
 * `keep(at)` leaves (slotRuns); all of them, to put it back in a row made again.
 */
export function placeRuns({ places, length, start, bars, total = Infinity }, keep = () => true) {
  const runs = [];
  for (const p of places) {
    for (let k = 0; k < p.bars; k++) {
      const at = p.at + k;
      const off = ((p.from + k) % length) - start;
      if (off < 0 || off >= bars || at >= total || !keep(at)) continue;
      const last = runs.at(-1);
      if (last && last.at + last.n === at && last.off + last.n === off) last.n++;
      else runs.push({ at, n: 1, off });
    }
  }
  return runs;
}

/** Another fragment in the `runs` (slotRuns) of a row, `bars` long round and round: each run its same bars of it. */
export function replaceSlot(row, runs, material, bars) {
  const staged = { clips: new Map(), off: [] };
  layRow(staged, material, [{ at: 0, from: 0, bars }], bars);
  const whole = [material].flat().length === 1 ? [material].flat()[0] : null;
  for (const { at, n, off } of runs) {
    clearBars(row, at, at + n);
    for (const [sa, sc] of staged.clips) {
      const lo = Math.max(sa, off);
      const hi = Math.min(sa + sc.bars, off + n);
      if (lo < hi) row.clips.set(at + lo - off, remember(cutClip(sc, lo - sa, hi - sa), sc.whole ?? whole));
    }
  }
}

/** Replace only [from, to) on a row with a repeating fragment, leaving its other bars intact. */
export function layRowRange(row, material, from, to, total = null) {
  const end = total === null ? to : Math.min(to, total);
  if (!Number.isInteger(from) || !Number.isInteger(end) || from < 0 || end <= from || ![material].flat().length) return false;
  const staged = { clips: new Map(), off: [] };
  layRow(staged, material, [{ at: 0, from: 0, bars: end - from }], end - from);
  clearBars(row, from, end);
  for (const [at, clip] of staged.clips) row.clips.set(from + at, clip);
  return true;
}

/** A piece of a clip, told which clip it was cut from (not enumerable: never in a file). */
function remember(piece, whole) {
  if (whole) Object.defineProperty(piece, 'whole', { value: whole, enumerable: false });
  return piece;
}

/** What the `unit` bars from `bar` of a row hold: its pieces of clips and which bars are off, from that bar. */
function padContent(row, bar, unit) {
  const clips = [];
  for (const [at, c] of row.clips) {
    const from = Math.max(at, bar);
    const to = Math.min(at + c.bars, bar + unit);
    if (from < to) clips.push([from - bar, cutClip(c, from - at, to - at)]);
  }
  return { clips, off: row.off.filter((b) => b >= bar && b < bar + unit).map((b) => b - bar) };
}

// ── A selection of pads: `sel` { r0, r1, c0, c1 }, rows and columns (pads of `unit` bars), both
// ends included. Copied, it is a block of pads to paste anywhere, as in a sequencer. ─────────

/** Each pad of a selection: { row, r, c, bar }, rows that do not exist left out. */
function padsOf(loop, sel, unit) {
  const out = [];
  for (let r = sel.r0; r <= sel.r1; r++) {
    const row = loop.rows[r];
    if (row) for (let c = sel.c0; c <= sel.c1; c++) out.push({ row, r, c, bar: c * unit });
  }
  return out;
}

const hasNotes = (row, bar, unit) => [...row.clips].some(([at, c]) => at < bar + unit && at + c.bars > bar);

/** The selection as a block to paste: { rows, cols, cells: [{ dr, dc, drums, clips, off }] } (empty pads too). */
export function copyPads(loop, sel, unit) {
  const cells = padsOf(loop, sel, unit).map(({ row, r, c, bar }) => ({ dr: r - sel.r0, dc: c - sel.c0, drums: row.drums, ...padContent(row, bar, unit) }));
  return { rows: sel.r1 - sel.r0 + 1, cols: sel.c1 - sel.c0 + 1, cells };
}

/** Empty the selected pads. False when they were empty already. */
export function clearPads(loop, sel, unit) {
  const pads = padsOf(loop, sel, unit).filter(({ row, bar }) => hasNotes(row, bar, unit));
  for (const { row, bar } of pads) clearBars(row, bar, bar + unit);
  return pads.length > 0;
}

/**
 * Align the audible notes in a rectangular selection as one block. The selected material is
 * rendered into one clip per row so notes from different clips can share a destination bar.
 * Reject boundary-crossing notes instead of cutting material outside the selection.
 */
export function alignPads(loop, sel, unit, direction) {
  if (direction !== 'left' && direction !== 'right') throw new Error('Invalid alignment direction.');
  const beats = barBeats(loop);
  const fromBar = sel.c0 * unit;
  const toBar = (sel.c1 + 1) * unit;
  const from = fromBar * beats;
  const to = toBar * beats;
  const rows = [];
  let first = Infinity;
  let last = -Infinity;

  for (let r = sel.r0; r <= sel.r1; r++) {
    const row = loop.rows[r];
    if (!row) continue;
    if (row.off.some((bar) => bar >= fromBar && bar < toBar)) {
      throw new Error('Turn on the selected pads before aligning them.');
    }
    const clips = [...row.clips];
    const notes = [];
    for (const [bar, clip] of clips) {
      const clipStart = bar * beats;
      const clipEnd = (bar + clip.bars) * beats;
      for (const n of heardNotes(clip)) {
        const raw = clipStart + n.beat;
        const line = Math.ceil(raw / beats - 1e-9) * beats;
        const played = line - raw > 0 && line - raw <= EARLY ? onTime(n, line, line - raw) : { ...n, beat: raw };
        const end = Math.min(clipEnd, played.beat + played.len);
        if (end <= played.beat) continue;
        if ((played.beat < from && end > from + 1e-9) || (played.beat < to && end > to + 1e-9)) {
          throw new Error('A note crosses the selection boundary. Select its whole duration before aligning.');
        }
        if (played.beat < from - 1e-9 || played.beat >= to - 1e-9) continue;
        notes.push({ clip, note: { ...played, len: end - played.beat } });
        first = Math.min(first, played.beat);
        last = Math.max(last, end);
      }
    }
    if (notes.length) rows.push({ row, clips, notes });
  }
  if (!rows.length) return false;
  const delta = direction === 'left' ? from - first : to - last;
  if (Math.abs(delta) < 1e-9) return false;

  const staged = rows.map(({ row, clips, notes }) => {
    const key = notes[0].clip.key || '';
    if (!row.drums && notes.some(({ clip }) => (clip.key || '') !== key)) {
      throw new Error('The selected notes on one track have different source keys. Align them separately to keep their key changes.');
    }
    const transpose = row.drums ? 0 : transposeBetween(key, loop.key);
    const aligned = notes.map(({ clip, note }) => {
      const beat = note.beat + delta;
      const line = Math.ceil(beat / beats - 1e-9) * beats;
      if (line - beat > 1e-9 && line - beat <= EARLY) {
        throw new Error('Alignment would place a note too close to a bar line. Choose a different selection.');
      }
      const pitch = note.pitch + (row.drums ? 0 : (clip.transpose ?? 0) + (clip.shift ?? 0) - transpose);
      if (pitch < 0 || pitch > 127) throw new Error('Alignment would put a note outside the MIDI pitch range.');
      // (Its pitch written anew: a mode's note as it came (`base`) no longer fits it.)
      const { base: _base, ...plain } = note;
      return { ...plain, beat: beat - from, pitch };
    });
    const chords = Array.from({ length: Math.ceil(to - from - 1e-9) }, (_, k) => {
      const source = from + k - delta;
      const hit = clips.find(([bar, clip]) => source >= bar * beats && source < (bar + clip.bars) * beats);
      if (!hit) return -1;
      const [bar, clip] = hit;
      const chord = clip.chords?.[Math.floor(source - bar * beats + 1e-9)] ?? -1;
      if (chord < 0) return -1;
      const shift = (clip.transpose ?? 0) + (clip.shift ?? 0) - transpose;
      return ((((chord >> 1) + shift) % 12 + 12) % 12) * 2 + (chord & 1);
    });
    const { fillOrigins: _fillOrigins, ...original } = notes[0].clip;
    const fillOrigins = mergeFillOrigins(notes.map(({ clip: source }) => source));
    const clip = { ...original, ...(fillOrigins.length ? { fillOrigins } : {}), key, transpose, shift: 0, swing: 50, vel: 1, beats, bars: toBar - fromBar, notes: aligned, chords, mode: undefined, chordsBase: undefined };
    return { row, clip };
  });

  for (const { row, clip } of staged) {
    const off = row.off.filter((bar) => bar >= fromBar && bar < toBar);
    clearBars(row, fromBar, toBar);
    row.clips.set(fromBar, clip);
    row.off.push(...off);
  }
  return true;
}

/**
 * A phrase that does not stop or start abruptly, in the selected (empty) pad:
 * - `side` 'left', a tail: the notes the pad on its left ends with (its last chord or note, and what
 *   still sounds under it) held on into it, `fraction` of its bar from its start. The clip that ends
 *   on the left grows a bar to the right.
 * - `side` 'right', a push: the notes the pad on its right starts with (on its first beat) come in
 *   `fraction` of a bar before it, in the selected pad, and go on into theirs: an anticipation, as
 *   pop, funk and latin play it. The clip on the right grows a bar to the left.
 * The same notes either way, never struck twice. A pad between two phrases can take both, if they do
 * not meet. Again on a pad: made again from the clips as they were; `fraction` 0 takes both away.
 * Every pad of the selection that can take one, every row but the drums: the empty ones after (or
 * before) a phrase. A tail never goes on from a tail, nor a push from a push: two empty pads after a
 * phrase, only the first takes it (the pads are done right to left for tails, left to right for
 * pushes, so each sees its neighbour as it was). { done: pads changed, why: what stopped the others }.
 * The clips as they were stay with them (`tail`, `push`: not enumerable, never in a file).
 */
export function tailPads(loop, sel, unit, fraction, side = 'left') {
  const beats = barBeats(loop);
  const total = loopBars(loop);
  let done = 0;
  const why = [];
  const cols = [];
  for (let c = sel.c0; c <= sel.c1; c++) cols.push(c);
  if (side === 'left') cols.reverse();
  for (let r = sel.r0; r <= sel.r1; r++) for (const col of cols) {
    const row = loop.rows[r];
    if (!row) continue;
    const bar = col * unit;
    if (row.drums) { why.push('the drums are not held'); continue; }
    // What the pad holds already of its neighbours: a tail from the left, a push from the right.
    const tailed = [...row.clips].find(([at, c]) => c.tail && at < bar && at + c.tail.bars === bar);
    const pushed = [...row.clips].find(([at, c]) => (c.push || c.pickup) && at === bar);
    const own = [...row.clips].some(([at, c]) => at < bar + unit && at + c.bars > bar && !(tailed && at === tailed[0]) && !(pushed && at === pushed[0]));
    if (own) { why.push('the selected pad has notes: choose an empty one'); continue; }
    if (!fraction) {
      if (tailed) { undoTail(row, tailed); done++; }
      if (pushed?.[1].pickup) { row.clips.delete(pushed[0]); done++; }
      else if (pushed) { undoPush(row, pushed); done++; }
      continue;
    }
    if (side === 'left') {
      if (bar === 0 || bar >= total) { why.push('there is no pad on the left of the first bar'); continue; }
      const found = tailed ?? [...row.clips].find(([at, c]) => at < bar && at + c.bars === bar && !c.tail);
      if (!found) { why.push('the pad on the left has no notes'); continue; }
      // (A pickup read from a file has no fraction kept: where its notes start tells it.)
      const pushedFraction = pushed && (pushed[1].push?.fraction ?? 1 - Math.min(...pushed[1].notes.map((n) => n.beat)) / beats);
      if (pushed && fraction + pushedFraction > 1 + 1e-9) { why.push('it would meet the push from the right: choose less'); continue; }
      const [at, clip] = found;
      const base = clip.tail ?? { bars: clip.bars, notes: clip.notes, chords: clip.chords };
      // Its last notes: the last ones struck (a chord strummed counts as one) and what sounds with them.
      const end = base.bars * beats;
      const struck = base.notes.filter((n) => n.beat < end - EARLY);
      if (!struck.length) { why.push('the pad on the left has no notes'); continue; }
      const last = Math.max(...struck.map((n) => n.beat));
      const held = new Set(struck.filter((n) => n.beat >= last - 0.125 || (n.beat < last && n.beat + n.len > last)));
      const until = end + fraction * beats;
      const notes = base.notes.map((n) => (held.has(n) ? { ...n, len: until - n.beat } : n));
      const lastChord = base.chords?.length ? base.chords[base.chords.length - 1] : -1;
      const chords = base.chords && [...base.chords, ...Array.from({ length: Math.ceil(beats - 1e-9) }, (_, k) => (k < fraction * beats ? lastChord : -1))];
      const made = { ...clip, bars: base.bars + 1, notes, ...(chords ? { chords } : {}), chordsBase: undefined };
      Object.defineProperty(made, 'tail', { value: { ...base, fraction }, enumerable: false, configurable: true });
      row.clips.set(at, remember(made, clip.whole));
    } else if (bar + unit >= total) {
      // The last pad: the loop goes round to bar 1, so the push is a pickup into it. A note cannot
      // last over the loop's end (it starts again from nothing, in LUNA too): the first notes are
      // played early in the last pad, to the loop's end, and bar 1 strikes them again as it must
      // the first time round. A clip of its own (`pickup`, kept in files): made again, or taken away.
      if (bar >= total) { why.push('the selected pad is past the loop\'s end'); continue; }
      const first = [...row.clips].find(([at]) => at === 0);
      const starts = first ? Math.min(...first[1].notes.map((n) => n.beat)) : Infinity;
      if (!first || starts > 0.125) { why.push('bar 1 does not start on its first beat: nothing to push'); continue; }
      if (tailed && fraction + tailed[1].tail.fraction > 1 + 1e-9) { why.push('it would meet the tail from the left: choose less'); continue; }
      const [, clip] = first;
      const from = beats - fraction * beats;
      const notes = clip.notes.filter((n) => n.beat <= starts + 0.125).map((n) => ({ ...n, beat: from, len: fraction * beats }));
      const firstChord = clip.chords?.length ? clip.chords[0] : -1;
      const chords = clip.chords && Array.from({ length: Math.ceil(beats - 1e-9) }, (_, k) => (k + 1 > from + 1e-9 ? firstChord : -1));
      const made = { ...clip, bars: 1, notes, ...(chords ? { chords } : {}), chordsBase: undefined, pickup: true };
      Object.defineProperty(made, 'push', { value: { fraction }, enumerable: false, configurable: true });
      if (pushed) row.clips.delete(pushed[0]);
      row.clips.set(bar, made);
    } else {
      const found = pushed ?? [...row.clips].find(([at, c]) => at === bar + unit && !c.push && !c.pickup);
      if (!found) { why.push('the pad on the right has no notes starting in it'); continue; }
      if (tailed && fraction + tailed[1].tail.fraction > 1 + 1e-9) { why.push('it would meet the tail from the left: choose less'); continue; }
      const [at, clip] = found;
      const base = clip.push ?? { bars: clip.bars, notes: clip.notes, chords: clip.chords };
      // Its first notes, on its first beat (a chord strummed counts as one): those come in early.
      const first = base.notes.length ? Math.min(...base.notes.map((n) => n.beat)) : Infinity;
      if (first > 0.125) { why.push('the pad on the right does not start on its first beat: nothing to push'); continue; }
      const early = new Set(base.notes.filter((n) => n.beat <= first + 0.125));
      const from = beats - fraction * beats;
      const notes = base.notes.map((n) => (early.has(n)
        ? { ...n, beat: from, len: beats + n.beat + n.len - from }
        : { ...n, beat: n.beat + beats }));
      const firstChord = base.chords?.length ? base.chords[0] : -1;
      const chords = base.chords && [...Array.from({ length: Math.ceil(beats - 1e-9) }, (_, k) => (k + 1 > from + 1e-9 ? firstChord : -1)), ...base.chords];
      const made = { ...clip, bars: base.bars + 1, notes, ...(chords ? { chords } : {}), chordsBase: undefined };
      Object.defineProperty(made, 'push', { value: { ...base, fraction }, enumerable: false, configurable: true });
      row.clips.delete(at);
      row.clips.set(bar, remember(made, clip.whole));
    }
    row.off = row.off.filter((b) => b !== bar);   // what comes into it is heard
    done++;
  }
  return { done, why: [...new Set(why)].join('; ') };
}

/** A tail taken away: the clip on the left as it was. */
function undoTail(row, [at, clip]) {
  const { bars, notes, chords } = clip.tail;
  row.clips.set(at, remember({ ...clip, bars, notes, chords }, clip.whole));
}

/** A push taken away: the clip on the right as it was, back on its own bar. */
function undoPush(row, [at, clip]) {
  const { bars, notes, chords } = clip.push;
  row.clips.delete(at);
  row.clips.set(at + 1, remember({ ...clip, bars, notes, chords }, clip.whole));
}

/**
 * A block copied (copyPads) with its first pad at row `r`, column `c`: each pad in it replaces
 * the one it lands on, an empty one empties it; what falls past the last row or the loop's end
 * (`cols` pads) is left out, and so is a drums pad on another row or another's on the drums'.
 * `allowDrumChange` copies notes across row types; `onlyEmpty` rejects a block unless its whole
 * destination fits and is empty. False when nothing landed.
 */
export function pastePads(loop, block, { r, c }, unit, cols, { allowDrumChange = false, onlyEmpty = false } = {}) {
  if (onlyEmpty) {
    if (r < 0 || c < 0 || r + block.rows > loop.rows.length || c + block.cols > cols) return false;
    for (const cell of block.cells) {
      const row = loop.rows[r + cell.dr];
      const bar = (c + cell.dc) * unit;
      if ((!allowDrumChange && row.drums !== cell.drums)
        || hasNotes(row, bar, unit)
        || row.off.some((off) => off >= bar && off < bar + unit)) return false;
    }
  }
  let landed = false;
  for (const cell of block.cells) {
    const row = loop.rows[r + cell.dr];
    const col = c + cell.dc;
    if (!row || col >= cols || (!allowDrumChange && row.drums !== cell.drums)) continue;
    const bar = col * unit;
    clearBars(row, bar, bar + unit);
    for (const [at, clip] of cell.clips) row.clips.set(bar + at, { ...clip, notes: clip.notes.map((n) => ({ ...n })) });
    row.off.push(...cell.off.map((k) => bar + k));
    landed = true;
  }
  return landed;
}

/** A pad's own semitones over the loop's key (its first clip's), 0 with none. */
export function padShift(row, bar, unit) {
  const [, clip] = [...row.clips].find(([at, c]) => at < bar + unit && at + c.bars > bar) ?? [];
  return clip?.shift ?? 0;
}

/**
 * How far a clip can move on its own, in semitones: as far as its notes stay MIDI notes (0–127),
 * moved to the loop's key as they are. { down, up }: the most it can go each way from where it is.
 */
export function shiftRoom(clip) {
  if (!clip.notes?.length) return { down: 0, up: 0 };
  const moved = (clip.transpose ?? 0) + (clip.shift ?? 0);
  let lo = 127, hi = 0;
  for (const n of clip.notes) { lo = Math.min(lo, n.pitch); hi = Math.max(hi, n.pitch); }
  return { down: Math.max(0, lo + moved), up: Math.max(0, 127 - (hi + moved)) };
}

/**
 * The selected pads' clips changed by `edit(clip)` (the fields it returns, merged in): a clip
 * longer than a pad is cut at its edges, so only the pads selected change. `drums`: false to
 * leave the drums as they are. False when nothing changed.
 */
function editPads(loop, sel, unit, edit, { drums = true } = {}) {
  let changed = false;
  for (const { row, bar } of padsOf(loop, sel, unit)) {
    if ((row.drums && !drums) || !hasNotes(row, bar, unit)) continue;
    const { clips, off } = padContent(row, bar, unit);
    clearBars(row, bar, bar + unit);
    for (const [at, clip] of clips) {
      const fields = edit(clip);
      changed ||= Object.entries(fields).some(([k, v]) => (clip[k] ?? DEFAULTS[k]) !== v);
      row.clips.set(bar + at, { ...clip, ...fields });
    }
    row.off.push(...off.map((k) => bar + k));
  }
  return changed;
}

/** A clip's settings when it has none of its own: as it came, as its song played it. */
const DEFAULTS = { shift: 0, swing: 50, swingGrid: 0.25, vel: 1 };

/**
 * The selected pads `by` semitones up or down (12: an octave), on top of the loop's key: each
 * keeps it when the Key changes. Drums never. As far as the notes go (shiftRoom): a pad whose
 * lowest or highest note would leave the MIDI range stays where it is, so an octave is always
 * an octave. False when nothing moved.
 */
export function shiftPads(loop, sel, unit, by) {
  return editPads(loop, sel, unit, (clip) => {
    const room = shiftRoom(clip);
    const fits = by < 0 ? -by <= room.down : by <= room.up;
    return { shift: (clip.shift ?? 0) + (fits ? by : 0) };
  }, { drums: false });
}

/**
 * The modes a pad can be played in, over the loop's tonic: semitones of each step. Seven-note ones
 * map a note by its degree (the third stays the third, a minor one in minor); the others (fewer
 * notes) take each note to the nearest of theirs.
 */
export const MODES = {
  major: ['Major', [0, 2, 4, 5, 7, 9, 11]],
  minor: ['Natural minor', [0, 2, 3, 5, 7, 8, 10]],
  harmonic: ['Harmonic minor', [0, 2, 3, 5, 7, 8, 11]],
  melodic: ['Melodic minor', [0, 2, 3, 5, 7, 9, 11]],
  dorian: ['Dorian', [0, 2, 3, 5, 7, 9, 10]],
  phrygian: ['Phrygian', [0, 1, 3, 5, 7, 8, 10]],
  lydian: ['Lydian', [0, 2, 4, 6, 7, 9, 11]],
  mixolydian: ['Mixolydian', [0, 2, 4, 5, 7, 9, 10]],
  locrian: ['Locrian', [0, 1, 3, 5, 6, 8, 10]],
  majpent: ['Major pentatonic', [0, 2, 4, 7, 9]],
  minpent: ['Minor pentatonic', [0, 3, 5, 7, 10]],
  blues: ['Blues', [0, 3, 5, 6, 7, 10]],
};

/**
 * The selected pads played in another mode of the loop's key, its tonic kept: D major to D minor
 * moves F# to F, B to Bb and C# to C, and leaves the rest. Each note by its degree in the loop's
 * scale (major, or natural minor in a minor key); a note out of that scale (chromatic) stays; to a
 * mode of fewer notes, each to the nearest of them (the lower when two are as near). From the notes
 * as they came (`base` kept on each), so modes never pile up; 'original' puts them back. Never the
 * drums. { changed, why }: why nothing changed (no key).
 */
export function modePads(loop, sel, unit, mode) {
  const m = /^(\d+) (mayor|menor)$/.exec(loop.key ?? '');
  if (!m) return { changed: false, why: "choose the loop's Key first: a mode is counted from its tonic" };
  const tonic = Number(m[1]);
  const from = m[2] === 'menor' ? MODES.minor[1] : MODES.major[1];
  const to = mode === 'original' ? null : MODES[mode]?.[1];
  if (mode !== 'original' && !to) return { changed: false, why: `unknown mode ${mode}` };
  const moved = (heard) => {
    const pc = (((heard - tonic) % 12) + 12) % 12;
    if (to.length === 7) {
      const degree = from.indexOf(pc);
      return degree < 0 ? heard : heard + to[degree] - from[degree];
    }
    // Fewer notes: the nearest of them, either way (the lower on a tie).
    let best = 0;
    for (let d = 0; d <= 6; d++) {
      if (to.includes((pc - d + 12) % 12)) { best = -d; break; }
      if (to.includes((pc + d) % 12)) { best = d; break; }
    }
    return heard + best;
  };
  // A chord (root * 2 + minor, as the clip keeps it) in the mode: its three notes moved as the
  // notes are, the new root and its third telling the chord (D major to D minor: D to Dm, G to Gm,
  // Bm to Bb; to D dorian, G stays G).
  const chordIn = (id, shift) => {
    if (id < 0) return id;
    const root = (id >> 1) + shift;
    const [r, third] = [0, id & 1 ? 3 : 4].map((t) => moved(root + t));
    const minor = (((third - r) % 12) + 12) % 12 === 3 ? 1 : 0;
    return ((((r - shift) % 12) + 12) % 12) * 2 + minor;
  };
  const changed = editPads(loop, sel, unit, (clip) => {
    const shift = (clip.transpose ?? 0) + (clip.shift ?? 0);
    const notes = clip.notes.map((n) => {
      const base = n.base ?? n.pitch;
      if (!to) { const { base: _, ...rest } = n; return { ...rest, pitch: base }; }
      const pitch = Math.max(0, Math.min(127, moved(base + shift) - shift));
      return { ...n, pitch, base };
    });
    // The chords over the pad, as the notes: from those it came with (kept, as the notes' `base`).
    const chordsBase = clip.chordsBase ?? clip.chords;
    const chords = chordsBase && (to ? chordsBase.map((id) => chordIn(id, shift)) : chordsBase);
    return { notes, mode: to ? mode : undefined, ...(chords ? { chords } : {}), chordsBase: to ? chordsBase : undefined };
  }, { drums: false });
  return { changed, why: '' };
}

// ── Whole rows and the bars of a selection rewritten: layers, half and double time, the drums' groove ──

/**
 * The selected rows each doubled (a layer): a new row right under it with the same pads, notes,
 * sound, volume and pads off, to give another sound or move an octave (piano + pad, bass + sub).
 * Never the drums (one row only). { added, why }: why some were not.
 */
export function duplicateRows(loop, sel) {
  let added = 0;
  const why = [];
  for (let r = sel.r1; r >= sel.r0; r--) {
    const row = loop.rows[r];
    if (!row) continue;
    if (row.drums) { why.push('the drums have one row only'); continue; }
    if (loop.rows.length >= MAX_ROWS) { why.push(`no more than ${MAX_ROWS} rows (MIDI channels)`); break; }
    const copy = {
      ...row,
      name: `${row.name} (layer)`,
      mute: false,
      solo: false,
      locked: false,
      clips: new Map([...row.clips].map(([at, c]) => [at, { ...c, notes: c.notes.map((n) => ({ ...n })) }])),
      off: [...row.off],
      ...(row.sound ? { sound: { ...row.sound } } : {}),
    };
    loop.rows.splice(r + 1, 0, copy);
    added++;
  }
  return { added, why: [...new Set(why)].join('; ') };
}

/**
 * A row's notes in the bars [fromBar, toBar), as they sound: from the selection's start (beats),
 * cut at its end, swing and velocity in them, pitches heard (moved to the loop's key and by the
 * pad). Its chords a quarter note each, as heard. `first`: the first clip there (its name and kind).
 */
function heardRange(loop, row, fromBar, toBar) {
  const beats = barBeats(loop);
  const from = fromBar * beats, to = toBar * beats;
  const notes = [];
  const chords = new Array(Math.ceil(to - from - 1e-9)).fill(-1);
  let first = null;
  for (const [bar, clip] of [...row.clips].sort((a, b) => a[0] - b[0])) {
    const start = bar * beats, end = (bar + clip.bars) * beats;
    if (end <= from || start >= to) continue;
    first ??= clip;
    const shift = row.drums ? 0 : (clip.transpose ?? 0) + (clip.shift ?? 0);
    for (const n of heardNotes(clip)) {
      const b = start + n.beat;
      if (b < from - 1e-9 || b >= to - 1e-9) continue;
      const e = Math.min(end, to, b + n.len);
      if (e > b) notes.push({ beat: b - from, len: e - b, pitch: n.pitch + shift, vel: n.vel,
        ...(clip.fillOrigins?.length ? { _fillOrigins: clip.fillOrigins } : {}) });
    }
    clip.chords?.forEach((id, k) => {
      const q = Math.floor(start + k - from + 1e-9);
      if (id >= 0 && q >= 0 && q < chords.length) chords[q] = ((((id >> 1) + shift) % 12) + 12) % 12 * 2 + (id & 1);
    });
  }
  return { notes, chords, first };
}

/**
 * The bars [fromBar, toBar) of a row as one clip of these notes (as heardRange gives them): in the
 * loop's key as they sound (so Key moves them on), the pads switched off there kept off.
 */
function writeRange(loop, row, fromBar, toBar, first, notes, chords) {
  const off = row.off.filter((b) => b >= fromBar && b < toBar);
  clearBars(row, fromBar, toBar);
  if (notes.length) {
    const fillOrigins = mergeFillOrigins(notes.map((note) => ({ fillOrigins: note._fillOrigins })));
    const plainNotes = notes.map(({ _fillOrigins, ...note }) => note);
    const { fillOrigins: _fillOrigins, ...original } = first;
    row.clips.set(fromBar, {
      ...original, ...(fillOrigins.length ? { fillOrigins } : {}), key: row.drums ? first.key : (loop.key || first.key || ''), transpose: 0, shift: 0, swing: 50, vel: 1,
      beats: barBeats(loop), bars: toBar - fromBar, notes: plainNotes.sort((a, b) => a.beat - b.beat), chords,
      mode: undefined, chordsBase: undefined, pickup: undefined,
    });
  }
  row.off.push(...off.filter((b) => !row.off.includes(b)));
}

/**
 * The selected bars of each selected row (the drums too) in half time (`factor` 2: every note twice
 * as long and as far apart, the first half of them filling the bars) or double time (`factor` 0.5:
 * twice as fast, played twice to fill them). The selection keeps its length. False with no notes.
 */
export function timePads(loop, sel, unit, factor) {
  const fromBar = sel.c0 * unit, toBar = (sel.c1 + 1) * unit;
  const L = (toBar - fromBar) * barBeats(loop);
  let changed = false;
  for (let r = sel.r0; r <= sel.r1; r++) {
    const row = loop.rows[r];
    if (!row) continue;
    const { notes, chords, first } = heardRange(loop, row, fromBar, toBar);
    if (!first || !notes.length) continue;
    const out = factor > 1
      ? notes.filter((n) => n.beat * factor < L - 1e-9).map((n) => ({ ...n, beat: n.beat * factor, len: Math.min(n.len * factor, L - n.beat * factor) }))
      : [0, 1].flatMap((lap) => notes.map((n) => ({ ...n, beat: n.beat * factor + lap * L * factor, len: n.len * factor })));
    const timed = chords.map((_, q) => chords[factor > 1 ? Math.floor(q / factor) : Math.floor(q / factor) % chords.length]);
    writeRange(loop, row, fromBar, toBar, first, out, timed);
    changed = true;
  }
  return changed;
}

/**
 * The selected rows play with the drums (their groove): in the selected bars, each note that starts
 * within `reach` beats (a 16th) of a drum hit moves onto it, its length kept, so a bass or a piano
 * pushes and swings as the drums do. The drums row is the guide and is not moved. { changed, why }.
 */
export function lockToDrums(loop, sel, unit, reach = 0.25) {
  const drums = loop.rows.find((r) => r.drums && !r.mute);
  if (!drums) return { changed: false, why: 'the loop has no drums to follow' };
  const fromBar = sel.c0 * unit, toBar = (sel.c1 + 1) * unit;
  const hits = [...new Set(heardRange(loop, drums, fromBar, toBar).notes.map((n) => Math.round(n.beat * 1e4) / 1e4))].sort((a, b) => a - b);
  if (!hits.length) return { changed: false, why: 'the drums play nothing in the selected bars' };
  let changed = false;
  for (let r = sel.r0; r <= sel.r1; r++) {
    const row = loop.rows[r];
    if (!row || row.drums) continue;
    const { notes, chords, first } = heardRange(loop, row, fromBar, toBar);
    if (!first || !notes.length) continue;
    let moved = 0;
    const out = notes.map((n) => {
      let best = null;
      for (const h of hits) if (Math.abs(h - n.beat) <= reach + 1e-9 && (best === null || Math.abs(h - n.beat) < Math.abs(best - n.beat))) best = h;
      if (best === null || Math.abs(best - n.beat) < 1e-6) return n;
      moved++;
      return { ...n, beat: best };
    });
    if (!moved) continue;
    writeRange(loop, row, fromBar, toBar, first, out, chords);
    changed = true;
  }
  return { changed, why: changed ? '' : 'no note was near a drum hit (a 16th) to move onto it' };
}

/** The swings a pad can take (% of a pair of notes for the first: 50 straight, 66 a triplet feel, 75 a hard shuffle). */
export const SWINGS = [54, 58, 62, 66, 70, 75];
/** What is swung: the off-beat 8ths (0.5 beats) or 16ths (0.25), as an MPC's swing 1/8 or 1/16. */
export const SWING_GRIDS = [0.5, 0.25];
/** How hard a pad plays: its notes' velocity times this. */
export const VELS = [0.6, 0.8, 1, 1.2, 1.4];

/** "1/8" for a swing grid of 0.5 beats. */
export const gridName = (grid) => `1/${Math.round(4 / grid)}`;

/**
 * The selected pads' feel, the drums too: `swing` (SWINGS, or 50: straight) with its
 * `swingGrid` (SWING_GRIDS), `vel` (VELS), any of them. Their notes stay as they came:
 * heardNotes plays them so. False when nothing changed.
 */
export function feelPads(loop, sel, unit, fields) {
  return editPads(loop, sel, unit, () => fields);
}

/**
 * A clip's notes as they sound with its settings: the off-beat notes of its swing grid swung (as
 * an MPC does: each second 8th, or 16th, of a pair later, to `swing` % of the pair), its velocity
 * scaled. Lengths and pitches as they are (shift and the key are added where it plays). A loop
 * saved when pads could be quantized: that is left out (its files were on the grid already).
 */
export function heardNotes(clip) {
  const swing = clip.swing ?? 50;
  const grid = clip.swingGrid ?? 0.25;
  const vel = clip.vel ?? 1;
  if (swing === 50 && vel === 1) return clip.notes;
  return clip.notes.map((n) => {
    let beat = n.beat;
    if (swing !== 50) {
      const pair = Math.floor(beat / (2 * grid) + 1e-9) * 2 * grid;   // a pair of them
      // Played on the off-beat, or near it (a 32nd of a beat each way for 16ths, twice for 8ths).
      if (Math.abs(beat - pair - grid) < grid * 0.24) beat = pair + (2 * grid * swing) / 100;
    }
    return { ...n, beat, vel: Math.max(1, Math.min(127, Math.round(n.vel * vel))) };
  });
}

/** A pad's settings that are not as it came, for its tooltip: "swing 1/8 66 %, velocity 80 %". */
export function feelText(clip) {
  const out = [];
  if ((clip.swing ?? 50) !== 50) out.push(`swing ${gridName(clip.swingGrid ?? 0.25)} ${clip.swing} %`);
  if ((clip.vel ?? 1) !== 1) out.push(`velocity ${Math.round(clip.vel * 100)} %`);
  return out.join(', ');
}

/** The selected pads with notes off, or all on again when they all are off. False with none. */
export function mutePads(loop, sel, unit) {
  const pads = padsOf(loop, sel, unit).filter(({ row, bar }) => hasNotes(row, bar, unit));
  if (!pads.length) return false;
  const on = pads.every(({ row, bar }) => padOff(row, bar, unit));
  for (const { row, bar } of pads) if (padOff(row, bar, unit) === on) togglePad(row, bar, unit);
  return true;
}

/**
 * Row `from` taken to the place just before row `to` (`to` = how many rows there are: the last),
 * with everything it has. The loop takes its harmony from its first harmonic row (loopChords), so
 * a pitched row brought to the top leads it. False when it stays where it is.
 */
export function moveRow(loop, from, to) {
  const n = loop.rows.length;
  if (from < 0 || from >= n || to < 0 || to > n || to === from || to === from + 1) return false;
  const [row] = loop.rows.splice(from, 1);
  loop.rows.splice(to > from ? to - 1 : to, 0, row);
  return true;
}

/**
 * The selected pads dragged `dr` rows and `dc` pads away, as the tiles of a sliding puzzle: the
 * pads they land on take the places they leave (two blocks apart change places; one moved onto
 * itself in part shifts what it covers into the gap). A pad onto an empty one is a move. Each
 * takes its notes and whether it is off, and sounds with the row it lands on. False when it does
 * not move, would go past the rows or the loop's end (`cols` pads), or a drums pad would leave
 * the drums' row or another come into it.
 */
export function moveBlock(loop, sel, { dr, dc }, unit, cols) {
  if (!dr && !dc) return false;
  const from = [];
  for (let r = sel.r0; r <= sel.r1; r++) for (let c = sel.c0; c <= sel.c1; c++) from.push({ r, c });
  const to = from.map(({ r, c }) => ({ r: r + dr, c: c + dc }));
  if (to.some(({ r, c }) => r < 0 || c < 0 || r >= loop.rows.length || c >= cols)) return false;
  const key = ({ r, c }) => r * 4096 + c;
  const leaving = new Set(from.map(key));
  const coming = new Set(to.map(key));
  const freed = from.filter((p) => !coming.has(key(p)));
  const pushed = to.filter((p) => !leaving.has(key(p)));
  const moves = [...from.map((p, k) => [p, to[k]]), ...pushed.map((p, k) => [p, freed[k]])];
  if (moves.some(([a, b]) => loop.rows[a.r].drums !== loop.rows[b.r].drums)) return false;
  const contents = moves.map(([a, b]) => [b, padContent(loop.rows[a.r], a.c * unit, unit)]);
  for (const p of [...from, ...pushed]) clearBars(loop.rows[p.r], p.c * unit, (p.c + 1) * unit);
  for (const [{ r, c }, { clips, off }] of contents) {
    const row = loop.rows[r];
    for (const [at, clip] of clips) row.clips.set(c * unit + at, clip);
    row.off.push(...off.map((k) => c * unit + k));
  }
  return true;
}

/**
 * The loop's harmony, a quarter note each over its whole length: the chord under the first
 * row (not the drums) that sounds there, as it sounds (moved to the loop's key and by its pad),
 * root * 2 + minor, -1 where none does or its chords are not known (a loop saved before them).
 * The first harmonic row is the anchor: the others are measured against it.
 */
export function loopChords(loop, { except = null } = {}) {
  const perBar = barBeats(loop);
  const out = new Array(Math.ceil(loopBars(loop) * perBar - 1e-9)).fill(-1);
  for (let b = 0; b < out.length; b++) {
    const bar = Math.floor(b / perBar + 1e-9);
    for (const row of loop.rows) {
      if (row.drums || row === except || row.mute || row.off.includes(bar)) continue;
      const hit = [...row.clips].find(([at, c]) => at <= bar && bar < at + c.bars);
      if (!hit) continue;
      const [at, clip] = hit;
      const id = clip.chords?.[Math.floor(b - at * perBar + 1e-9)] ?? -1;
      if (id < 0) continue;
      const shift = (clip.transpose ?? 0) + (clip.shift ?? 0);
      out[b] = ((((id >> 1) + shift) % 12 + 12) % 12) * 2 + (id & 1);
      break;
    }
  }
  return out;
}

/**
 * The loop's harmony as a progression in its key (chords.js), to compare parts with: '' with no
 * key or no chord. `except`: a row left out (to measure that row against the rest).
 */
export function loopProgression(loop, options = {}) {
  const chords = loopChords(loop, options);
  return loop.key ? progressionIn(chords, 1, 0, chords.length, loop.key) : '';
}

/**
 * The loop's notes as a grid (midi/harmony.js), as they sound: every row but the drums, each pad
 * in the loop's key and with its own shift; rows muted and pads switched off left out. `except`:
 * a row left out (to measure what would take its place against the rest). { grid, stepsPerBar },
 * or null when nothing with pitch sounds or the bar does not fall on the grid's steps.
 */
export function loopGrid(loop, { except = null } = {}) {
  const perBar = barBeats(loop);
  const stepsPerBar = perBar * STEPS_PER_BEAT;
  if (!Number.isInteger(stepsPerBar)) return null;
  const beats = loopBars(loop) * perBar;
  const notes = [];
  for (const row of loop.rows) {
    if (row.drums || row === except || row.mute) continue;
    for (const [bar, clip] of row.clips) {
      const end = Math.min(beats, (bar + clip.bars) * perBar);
      const shift = (clip.transpose ?? 0) + (clip.shift ?? 0);
      for (const n of clip.notes) {
        const beat = Math.max(0, bar * perBar + n.beat);
        if (beat >= end || row.off.includes(Math.floor((beat + EARLY) / perBar + 1e-9))) continue;
        notes.push({ at: beat * STEPS_PER_BEAT, len: (Math.min(end, beat + n.len) - beat) * STEPS_PER_BEAT, pitch: n.pitch + shift });
      }
    }
  }
  const grid = noteGrid(notes, Math.round(beats * STEPS_PER_BEAT));
  return sounds(grid) ? { grid, stepsPerBar } : null;
}

/**
 * A row's fragments brought from the library (clips marked `adapt`: Fill's and Arrange's), in
 * the bars [from, to), made to go with what the other rows play there (midi/adapt.js): their
 * wrong notes moved a step. The clips must be in the loop's key already (tuneLoop). Returns how
 * many notes moved; the drums, a loop without key or with nothing else playing: none.
 */
export function adaptRow(loop, row, from = 0, to = Infinity) {
  if (row.drums || !loop.key) return 0;
  const ctx = loopGrid(loop, { except: row });
  if (!ctx) return 0;
  const perBar = barBeats(loop);
  let moved = 0;
  for (const [bar, clip] of [...row.clips]) {
    if (!clip.adapt || bar + clip.bars <= from || bar >= to) continue;
    const slice = ctx.grid.subarray(bar * ctx.stepsPerBar, (bar + clip.bars) * ctx.stepsPerBar);
    const got = adaptNotes(clip.notes, slice, { perBar, shift: (clip.transpose ?? 0) + (clip.shift ?? 0), key: loop.key });
    if (!got.moved) continue;
    row.clips.set(bar, remember({ ...clip, notes: got.notes }, clip.whole));
    moved += got.moved;
  }
  return moved;
}

/**
 * Where the loop's notes strike (midi/rhythm.js), as they sound: every row, drums too; rows muted
 * and pads switched off left out. `except`: a row left out. { hits, hitsPerBar }, or null when
 * nothing strikes or the bar does not fall on the steps.
 */
export function loopHits(loop, { except = null } = {}) {
  const perBar = barBeats(loop);
  const hitsPerBar = perBar * HITS_PER_BEAT;
  if (!Number.isInteger(hitsPerBar)) return null;
  const beats = [];
  for (const row of loop.rows) {
    if (row === except || row.mute) continue;
    for (const [bar, clip] of row.clips) {
      for (const n of clip.notes) {
        const beat = Math.max(0, bar * perBar + n.beat);
        if (beat >= (bar + clip.bars) * perBar || row.off.includes(Math.floor((beat + EARLY) / perBar + 1e-9))) continue;
        beats.push(beat);
      }
    }
  }
  const hits = hitGrid(beats, loopBars(loop) * hitsPerBar);
  return strikes(hits) ? { hits, hitsPerBar } : null;
}

/**
 * A row of the loop as one clip, as it sounds (in the loop's key, each pad's shift, swing and
 * velocity, pads switched off left out), from its first pad with notes to the end of its last,
 * with the loop's chords under it: what a favourite keeps. Null when it plays nothing.
 */
export function rowClip(loop, row) {
  const perBar = barBeats(loop);
  const length = loopBars(loop);
  const own = { ...loop, length, rows: [{ ...row, mute: false, solo: false }] };
  const held = new Map();
  const notes = [];
  for (const e of loopSong(own).events) {
    if (e.type === 'on') held.set(e.a, [...(held.get(e.a) ?? []), e]);
    else if (e.type === 'off') {
      const [on, ...rest] = held.get(e.a) ?? [];
      held.set(e.a, rest);
      if (on) notes.push({ beat: on.tick / PPQ, len: (e.tick - on.tick) / PPQ, pitch: e.a, vel: on.b });
    }
  }
  if (!notes.length) return null;
  const first = Math.floor(Math.min(...notes.map((n) => n.beat)) / perBar + 1e-9);
  const ends = [...row.clips].map(([bar, c]) => bar + c.bars).filter((end) => end > first);
  const last = Math.min(length, Math.max(first + 1, ...ends, Math.floor(Math.max(...notes.map((n) => n.beat)) / perBar + 1e-9) + 1));
  const bars = last - first;
  const chords = loopChords(loop).slice(first * perBar, Math.ceil(last * perBar - 1e-9));
  return {
    name: row.name, key: loop.key ?? '', beats: perBar, bars, first, chords,
    notes: notes.sort((a, b) => a.beat - b.beat || a.pitch - b.pitch).map((n) => ({ ...n, beat: n.beat - first * perBar })),
  };
}

/** Steps to a beat in loopMusic: fine enough for triplets, sixteenths and how they are swung. */
export const MUSIC_PER_BEAT = 96;

/**
 * The loop's notes as they sound, to keep with a vote (midi/votes.js): what a model that reads
 * notes would learn from. Every row with notes (muted ones left out, pads switched off too),
 * pitched rows in the loop's key and with their shift. `own`: the row the vote is on, kept even
 * when muted and told apart. { per, bpm, key, beatsPerBar, bars, own, rows: [{ drums, program,
 * notes }] }: `notes` flat, four numbers a note (start and length in 1/`per` of a beat, pitch,
 * velocity), in order; `own` the index of that row in `rows` (-1: it has no notes).
 */
export function loopMusic(loop, own = null) {
  const perBar = barBeats(loop);
  const beats = loopBars(loop) * perBar;
  const rows = [];
  let at = -1;
  for (const row of loop.rows) {
    if (row.mute && row !== own) continue;
    const got = [];
    for (const [bar, clip] of row.clips) {
      const end = Math.min(beats, (bar + clip.bars) * perBar);
      const shift = row.drums ? 0 : (clip.transpose ?? 0) + (clip.shift ?? 0);
      for (const n of clip.notes) {
        const beat = Math.max(0, bar * perBar + n.beat);
        if (beat >= end || row.off.includes(Math.floor((beat + EARLY) / perBar + 1e-9))) continue;
        got.push([Math.round(beat * MUSIC_PER_BEAT), Math.max(1, Math.round((Math.min(end, beat + n.len) - beat) * MUSIC_PER_BEAT)), n.pitch + shift, n.vel ?? 100]);
      }
    }
    if (!got.length) continue;
    got.sort((a, b) => a[0] - b[0] || a[2] - b[2]);
    if (row === own) at = rows.length;
    rows.push({ drums: !!row.drums, program: row.program ?? 0, notes: got.flat() });
  }
  return { per: MUSIC_PER_BEAT, bpm: loop.bpm, key: loop.key ?? '', beatsPerBar: perBar, bars: loopBars(loop), own: at, rows };
}

/** A row's groove as it plays in the loop (midi/groove.js), over the bars it sounds in. '' with none. */
function rowGroove(loop, row) {
  const perBar = barBeats(loop);
  const beats = [];
  const bars = new Set();
  for (const [at, clip] of row.clips) {
    for (let k = 0; k < clip.bars; k++) if (!row.off.includes(at + k)) bars.add(at + k);
    for (const n of clip.notes) {
      const beat = at * perBar + n.beat;
      if (!row.off.includes(Math.floor(beat / perBar + 1e-9)) && grooveNote(n.pitch, row.drums)) beats.push(beat);
    }
  }
  // Folded onto the bars it sounds in, one after the other.
  const order = [...bars].sort((a, b) => a - b);
  const index = new Map(order.map((b, k) => [b, k]));
  const folded = beats.map((b) => {
    const bar = Math.floor(b / perBar + 1e-9);
    return index.has(bar) ? index.get(bar) * perBar + (b - bar * perBar) : -1;
  }).filter((b) => b >= 0);
  return grooveOf(folded, perBar, order.length);
}

const isBassRow = (row) => !row.drums && row.program >= 32 && row.program <= 39;

/**
 * The loop's rhythm section, to match parts with: { drums, bass }, each the groove of its rows
 * (midi/groove.js; '' none). Rows muted are left out: they are not heard.
 */
export function loopGrooves(loop) {
  const of = (test) => grooveUnion(loop.rows.filter((r) => !r.mute && test(r)).map((r) => rowGroove(loop, r)));
  return { drums: of((r) => r.drums), bass: of(isBassRow) };
}

/** Every clip moved to the loop's key (they keep the key they came in). */
export function tuneLoop(loop) {
  for (const row of loop.rows) for (const clip of row.clips.values()) clip.transpose = transposeBetween(clip.key, loop.key);
}

export const channelOf = (loop, row) => {
  if (row.drums) return 9;
  const n = loop.rows.filter((r) => !r.drums).indexOf(row);
  return n >= 9 ? n + 1 : n;   // the drums' channel is left out
};

/** Each row's channel (0-15) and its name, for a MIDI file's tracks. */
export const loopTrackNames = (loop) => new Map(loop.rows.map((row) => [channelOf(loop, row), row.name]));

/**
 * The loop as a parsed file, as what sends to LUNA reads (luna/bridge.js, preview/render.js):
 * what it plays now, mute and solo as they are. `playing`: the channels with notes, 1-16.
 */
export function loopInfo(loop) {
  const song = loopSong(loop);
  const lastTick = loopBars(loop) * barBeats(loop) * PPQ;
  const channels = song.channels.map((c) => {
    const pc = song.events.find((e) => e.type === 'pc' && e.ch === c.channel - 1);
    return { ...c, programs: pc ? [pc.a] : [] };
  });
  return { ppq: PPQ, bpm: loop.bpm, events: song.events, channels, tracks: [], lastTick, playing: channels.map((c) => c.channel).sort((a, b) => a - b) };
}

/**
 * The pads that sound, by channel (1-16): Map channel -> [{ startTick, endTick }] in the ticks
 * of loopInfo, each what goes to LUNA as a clip of its own. A pad only a note rings into counts.
 * Pads tied by ⌒ Legato where a note rings over their line go as one clip: it is not cut there.
 */
export function padSpans(loop) {
  const tied = new Map(loop.rows.filter((r) => !r.drums && r.legato?.length).map((r) => [channelOf(loop, r) + 1, new Set(r.legato)]));
  const size = padBars(loop) * barBeats(loop) * PPQ;
  const held = new Map();    // channel and pitch -> ticks of the notes on
  const cells = new Map();   // channel -> numbers of the pads
  const crossed = new Map(); // channel -> the pads a note of it rings out of, into the next
  for (const e of loopSong(loop).events) {
    const key = e.ch * 128 + e.a;
    if (e.type === 'on') held.set(key, [...(held.get(key) ?? []), e.tick]);
    if (e.type !== 'off') continue;
    const [start, ...rest] = held.get(key) ?? [];
    held.set(key, rest);
    if (start === undefined) continue;
    const pads = cells.get(e.ch + 1) ?? new Set();
    cells.set(e.ch + 1, pads);
    const out = crossed.get(e.ch + 1) ?? new Set();
    crossed.set(e.ch + 1, out);
    const [first, last] = [Math.floor(start / size), Math.floor((e.tick - 1) / size)];
    for (let k = first; k <= last; k++) { pads.add(k); if (k < last) out.add(k); }
  }
  return new Map([...cells].map(([ch, pads]) => {
    const spans = [];
    for (const k of [...pads].sort((a, b) => a - b)) {
      const prev = spans[spans.length - 1];
      if (prev && prev.endTick === k * size && tied.get(ch)?.has(k - 1) && crossed.get(ch)?.has(k - 1)) prev.endTick = (k + 1) * size;
      else spans.push({ startTick: k * size, endTick: (k + 1) * size });
    }
    return [ch, spans];
  }));
}

/** How long a gap before a bar line ⌒ Legato closes, in beats: a quarter note at most, whatever the meter (a longer one is a rest of the phrase). */
const LEGATO_GAP = 1;
/** How near a bar line a note must start, or end, to be tied over it, in beats (a 32nd note). */
const LEGATO_NEAR = 0.125;

/**
 * ⌒ Legato on a row's pads (`row.legato`: the bars whose end is tied into the next bar), its notes as
 * they sound ({ beat, stop, pitch, vel }, in beats of the whole song): at the end of each such bar,
 * 1) a gap before the line, up to a beat after the last notes struck (and what sounds with
 * them), is closed: they are held to the line, never past it (the next bar's harmony starts there);
 * 2) a note that reaches the line is tied to the same pitch starting on it: one note, not struck
 * again. Only when the next bar plays; never over the loop's end (nothing crosses it, in LUNA
 * either), nor into or out of a bar switched off. The notes inside a bar are left as they are.
 */
export function tiedNotes(notes, row, totalBars, loopLength, perBar) {
  const list = notes.map((n) => ({ ...n })).sort((a, b) => a.beat - b.beat || a.pitch - b.pitch);
  const bars = [...new Set(row.legato)].filter((b) => b + 1 < loopLength && !row.off.includes(b) && !row.off.includes(b + 1)).sort((a, b) => a - b);
  const gone = new Set();
  for (let lap = 0; lap < totalBars; lap += loopLength) for (const b of bars) {
    const from = (lap + b) * perBar;
    const line = from + perBar;
    const live = list.filter((n) => !gone.has(n));
    const inBar = live.filter((n) => n.beat >= from - 1e-9 && n.beat < line - 1e-9);
    const next = live.filter((n) => n.beat >= line - 1e-9 && n.beat < line + perBar - 1e-9);
    if (!inBar.length || !next.length) continue;
    // 1) The last notes struck (a chord strummed counts as one) and what sounds with them.
    const last = Math.max(...inBar.map((n) => n.beat));
    const group = live.filter((n) => n.beat <= last + 1e-9 && (n.beat >= last - LEGATO_NEAR || n.stop > last + 1e-9));
    const reach = Math.max(...group.map((n) => n.stop));
    if (reach < line - 1e-9 && line - reach <= LEGATO_GAP + LEGATO_NEAR + 1e-9) for (const n of group) if (n.stop < line) n.stop = line;
    // 2) What reaches the line, tied to the same pitch starting on it.
    for (const n of live) {
      if (n.beat >= line - 1e-9 || n.stop < line - LEGATO_NEAR || n.stop > line + 1e-9) continue;
      const m = next.find((x) => !gone.has(x) && x.pitch === n.pitch && Math.abs(x.beat - line) <= LEGATO_NEAR);
      if (!m) continue;
      n.stop = Math.max(n.stop, m.stop);
      gone.add(m);
    }
  }
  return list.filter((n) => !gone.has(n));
}

/**
 * ⌒ Legato on the selected pads (every row but the drums), or `on` false: taken away. Each bar
 * marked ties into the next one as tiedNotes says, when it plays: the notes in the pads stay as
 * they are (No legato gives them back as they were). { done: pads changed, why }.
 */
export function legatoPads(loop, sel, unit, on) {
  let done = 0;
  const why = [];
  for (let r = sel.r0; r <= sel.r1; r++) {
    const row = loop.rows[r];
    if (!row) continue;
    if (row.drums) { why.push('not the drums'); continue; }
    const bars = [];
    for (let c = sel.c0; c <= sel.c1; c++) for (let k = 0; k < unit; k++) bars.push(c * unit + k);
    const had = new Set(row.legato ?? []);
    const now = new Set(had);
    for (const b of bars) if (on) now.add(b); else now.delete(b);
    if (now.size === had.size && [...now].every((b) => had.has(b))) continue;
    done += Math.abs(now.size - had.size);
    if (now.size) row.legato = [...now].sort((a, b) => a - b);
    else delete row.legato;
  }
  if (!done && !why.length) why.push(on ? 'those pads have ⌒ Legato already' : 'those pads have no ⌒ Legato');
  return { done, why: [...new Set(why)].join('; ') };
}

const LOOP_FILE = 'MIDI Digger loop';

/** The loop as a file: everything it needs is in it, the notes too, so no song is read again. */
export function loopFile(loop) {
  return {
    app: LOOP_FILE,
    saved: new Date().toISOString(),
    bpm: loop.bpm,
    timeSig: loop.timeSig,
    key: loop.key,
    length: loop.length,
    rows: loop.rows.map(({ clips, ...row }) => ({ ...row, clips: [...clips] })),
  };
}

/** A file of loopFile into `loop` (it stays the same object). Throws when it is not one. */
export function readLoop(loop, file) {
  if (file?.app !== LOOP_FILE || !Array.isArray(file.rows)) throw new Error('That file is not a loop saved by MIDI Digger.');
  loop.bpm = file.bpm;
  loop.timeSig = file.timeSig ?? '4/4';
  loop.key = file.key;
  loop.length = file.length;
  // A loop saved before pads could be switched off has rows without the list.
  loop.rows = file.rows.map((row) => ({ ...row, off: row.off ?? [], clips: new Map(row.clips) }));
}

/**
 * The loop as a song for the player. `listen` has one clip or `tracks` of clips with their own
 * instruments; `alone` replaces the loop and `from` is the bar where the clips start.
 */
export function loopSong(loop, listen = null) {
  const secPerBeat = 60 / loop.bpm;
  const perBar = barBeats(loop);
  const loopLength = loopBars(loop);
  const gcd = (a, b) => b ? gcd(b, a % b) : a;
  const lengths = listen ? (listen.tracks ?? [listen]).map((track) => track.clip.bars) : [];
  const totalBars = lengths.reduce((n, length) => n / gcd(n, length) * length, loopLength);
  if (!Number.isSafeInteger(totalBars) || totalBars > 65536) {
    throw new Error('This fragment and loop have too long a combined cycle to audition together.');
  }
  const beats = totalBars * perBar;
  const events = [];
  const used = new Set();
  const note = (c, beat, len, pitch, vel, end) => {
    const stop = Math.min(end, beat + len);
    if (beat >= end || stop <= beat) return;
    const a = Math.max(0, Math.min(127, pitch));
    events.push({ tick: Math.round(beat * PPQ), sec: beat * secPerBeat, rank: 3, type: 'on', ch: c, a, b: vel });
    events.push({ tick: Math.round(stop * PPQ), sec: stop * secPerBeat, rank: 2, type: 'off', ch: c, a, b: 0 });
    used.add(c);
  };
  const setup = (c, program, volume, sound = null) => {
    if (sound?.kind === 'soundfont') {
      events.push({ tick: 0, sec: 0, rank: -3, type: 'cc', ch: c, a: 0, b: sound.bankMSB });
      events.push({ tick: 0, sec: 0, rank: -2, type: 'cc', ch: c, a: 32, b: sound.bankLSB });
      events.push({ tick: 0, sec: 0, rank: 0, type: 'pc', ch: c, a: sound.program, b: 0 });
    } else if (c !== 9) events.push({ tick: 0, sec: 0, rank: 0, type: 'pc', ch: c, a: program, b: 0 });
    events.push({ tick: 0, sec: 0, rank: 1, type: 'cc', ch: c, a: 7, b: Math.round((volume / 100) * 127) });
  };
  const anySolo = loop.rows.some((r) => r.solo);
  for (const row of loop.rows) {
    const c = channelOf(loop, row);
    setup(c, row.program, row.volume, row.sound);
    if (row.mute || (anySolo && !row.solo) || listen?.alone) continue;
    // ⌒ Legato on some of its pads: its notes gathered first, tied where they meet, then played.
    const legato = !row.drums && row.legato?.length ? [] : null;
    const play = legato
      ? (beat, len, pitch, vel, end) => { const stop = Math.min(end, beat + len); if (beat < end && stop > beat) legato.push({ beat, stop, pitch, vel }); }
      : (beat, len, pitch, vel, end) => note(c, beat, len, pitch, vel, end);
    for (let lap = 0; lap < totalBars; lap += loopLength) for (const [bar, clip] of row.clips) {
      const at = (lap + bar) * perBar;
      const end = Math.min((lap + loopLength) * perBar, at + clip.bars * perBar);
      const shift = row.drums ? 0 : (clip.transpose ?? 0) + (clip.shift ?? 0);   // the loop's key, then the pad's own
      for (const n of heardNotes(clip)) {   // with its swing and velocity
        // A note of a bar switched off is not heard; one coming from before stops where it starts.
        // One played just before a bar line plays on it, as that bar's (EARLY): so it is in the
        // clip of that pad when it goes to LUNA, not a stub at the end of the one before.
        const raw = at + n.beat;
        const line = Math.ceil(raw / perBar - 1e-9) * perBar;
        const t = line - raw > 0 && line - raw <= EARLY ? onTime(n, line, line - raw) : { ...n, beat: raw };
        const bar = Math.floor(t.beat / perBar + 1e-9) - lap;
        if (row.off.includes(bar)) continue;
        const nextOff = Math.min(Infinity, ...row.off.filter((b) => b > bar));
        const silence = (lap + nextOff) * perBar;
        play(t.beat, t.len, n.pitch + shift, n.vel, Math.min(end, silence));
      }
    }
    if (legato) for (const n of tiedNotes(legato, row, totalBars, loopLength, perBar)) note(c, n.beat, n.stop - n.beat, n.pitch, n.vel, Infinity);
  }
  if (listen) {
    const tracks = listen.tracks ?? [listen];
    const occupied = new Set(loop.rows.map((row) => channelOf(loop, row)));
    const free = Array.from({ length: 16 }, (_, i) => 15 - i).filter((c) => c !== 9 && !occupied.has(c));
    if (listen.tracks && tracks.filter((track) => !track.drums).length > free.length) {
      throw Object.assign(new Error('Not enough MIDI channels to hear all selected tracks over the loop. Remove loop rows or select fewer tracks.'), { code: 'midi_channels_unavailable' });
    }
    for (const track of tracks) {
      // Drums share channel 10; pitched tracks need separate channels for their instruments.
      const c = track.drums ? 9 : listen.tracks ? free.shift() : 15;
      if (!track.drums) setup(c, track.program, 100);
      const size = track.clip.bars * perBar;
      // Round and round from the bar it comes in on (`from`, 0 by default): its first bar there,
      // whichever bar of the loop that is, and the laps before and after it in step.
      const phase = (((listen.from ?? 0) * perBar) % size + size) % size;
      for (let at = phase - size; at < beats; at += size) {
        for (const n of track.clip.notes) {
          if (at + n.beat < 0) continue;
          note(c, at + n.beat, n.len, n.pitch + (track.drums ? 0 : track.transpose ?? 0), n.vel, Math.min(beats, at + size));
        }
      }
    }
  }
  events.sort((x, y) => x.sec - y.sec || x.rank - y.rank);
  const channels = [...used].map((c) => ({ channel: c + 1, notes: 1, min: 0, max: 127, programs: [], tracks: [] }));
  return { events, durationSec: beats * secPerBeat, channels };
}

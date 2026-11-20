// What the catalogue knows about each part (one channel of one file): its role, how busy it
// is, and the loops it repeats. analyseFile turns a file into the record the store keeps.

import { parseMidi } from './parser.js';
import { EARLY, extractNotes, noteBar } from './parts.js';
import { grooveNote, grooveOf } from './groove.js';
import { formOf } from './director.js';
import { progressionIn, songChords } from './chords.js';
import { STEPS_PER_BEAT, noteGrid } from './harmony.js';
import { HITS_PER_BEAT, hitGrid, packHits } from './rhythm.js';

export const ROLES = ['drums', 'bass', 'chords', 'melody'];
export const ROLE_NAMES = { drums: 'Drums', bass: 'Bass', chords: 'Chords', melody: 'Melody' };

/** Two stretches of bars count as the same pattern from this share of notes in common. */
export const PATTERN_SIMILARITY = 0.75;   // 0.85 missed varied drums; 0.7 adds little more
/**
 * A pattern is shown when its repeats cover at least this share of the part's bars, or play
 * often anyway (a medley's groove: many repeats in one stretch of a long file).
 */
export const PATTERN_MIN_COVERAGE = 0.25;
const PATTERN_MANY = { count: 8, bars: 16 };
const MAX_PATTERNS = 6;
const MAX_PATTERN_SPAN = 512;
const MAX_PATTERN_CONTENTS = 512;
const MAX_ANALYSIS_BARS = 2048;
const NEW_BARS_LEAST = 4;    // bars a further pattern must add: less is a detail, not another riff
const BLOCK_MIN = 2;         // bars: a riff heard once; one bar alone is a hit or an ornament
const GROUP_GAP_BEATS = 2;   // a silence this long ends a group of notes (half a 4/4 bar)
const GROUP_MIN_NOTES = 3;   // fewer is a hit, not a riff
const GROUP_SPLIT_BARS = 4;  // from here a group may hold riffs that repeat inside it
const GROUP_MAX_BARS = 16;   // longer is a whole part played on end, never one riff

/**
 * Patterns a part repeats: for 1, 2, 4, 8, 12 (the blues) and 16 bars, the stretch that
 * recurs most, starting on any bar. Bars are compared as sets of notes on a 16th grid (pitch included, velocity and
 * length ignored), and two stretches match when they share PATTERN_SIMILARITY of their notes,
 * so a fill or a varied note does not break a loop. A pattern that is just a shorter one
 * played again, or that plays little (see PATTERN_MIN_COVERAGE), is left out. Sorted by how
 * much of the part it covers, shorter first on a tie.
 */
export function detectPatterns(info, notes) {
  const m = barModel(info, notes);
  if (!m) return [];
  const { first, active, ids, similar, span } = m;

  // A 1-bar loop runs in a row: one bar every other is a 2-bar pattern, and it would chop the
  // stretch it is in.
  const steady = (c) => c.bars > 1 || c.starts.some((s, k) => k > 0 && s === c.starts[k - 1] + 1);
  const found = [];
  for (const L of [1, 2, 4, 8, 12, 16]) {
    if (span < L * 2) break;
    const minCount = L === 1 ? 4 : 2;
    let best = null;
    for (const c of stretches(m, L)) if (c.count >= minCount && steady(c) && (!best || c.count > best.count)) best = c;
    const plays = best ? best.count * L : 0;
    if (best && (plays / active >= PATTERN_MIN_COVERAGE || (best.count >= PATTERN_MANY.count && plays >= PATTERN_MANY.bars))) found.push(best);
  }
  // Drop a pattern made of a shorter accepted one played again (4 bars = the 2-bar loop twice).
  const kept = found.filter((p) => !found.some((q) => madeOf(m, p, q)));
  // A stretch with empty bars in it is two riffs and a gap: better each on its own.
  const solid = (p) => !ids.slice(p.at, p.at + p.bars).includes(0);
  const covered = new Set();
  // The bars a pattern plays that sound and are not covered yet (silence in it counts for nothing).
  const newBars = (p) => {
    const bars = new Set();
    for (const s of p.starts) for (let k = 0; k < p.bars; k++) if (ids[s + k] && !covered.has(s + k)) bars.add(s + k);
    return bars;
  };
  const firm = kept.filter(solid);
  const picked = (firm.length ? firm : kept).sort((a, b) => newBars(b).size - newBars(a).size || a.bars - b.bars).slice(0, 1);
  // After the main pattern, those that share no sounding bar with the ones before, in any of
  // their repeats: the part's other riffs, not pieces of the same one.
  const shares = (p) => p.starts.some((s) => Array.from({ length: p.bars }, (_, k) => s + k).some((b) => ids[b] && covered.has(b)));
  const candidates = [1, 2, 4, 8, 12, 16].flatMap((L) => (span < L * 2 ? [] : stretches(m, L).filter((c) => c.count >= (L === 1 ? 4 : 2) && solid(c) && steady(c))));
  while (picked.length && picked.length < MAX_PATTERNS) {
    for (const s of picked[picked.length - 1].starts) for (let k = 0; k < picked[picked.length - 1].bars; k++) covered.add(s + k);
    let best = null, most = 0;
    for (const c of candidates) {
      const fresh = newBars(c).size;
      if (fresh < NEW_BARS_LEAST || shares(c)) continue;
      if (fresh > most || (fresh === most && best && c.bars < best.bars)) { best = c; most = fresh; }
    }
    if (!best) break;
    picked.push(best);
  }
  // starts: the first bar of every repeat (where the pattern plays).
  return picked.map((p) => ({ bars: p.bars, startBar: first + p.at, count: p.count, coverage: Math.min(1, (p.count * p.bars) / active), starts: p.starts.map((b) => first + b) }));
}

/**
 * What a part with no loop plays: each stretch of bars with no gap, at least BLOCK_MIN bars,
 * longest first, shaped like detectPatterns (count 1). A riff heard once is a riff all the same.
 * A block ends where its notes end, whatever its length (main.js may round it up). A
 * stretch over 16 bars gives one block for every 16.
 */
export function riffBlocks(info, notes, { taken = new Set(), max = MAX_PATTERNS } = {}) {
  if (!info.ppq || info.smpte || !notes.length) return [];
  const sounding = new Set();
  for (const n of notes) {
    // A note played just before a bar line sounds in that bar, not in the one before (EARLY).
    const first = noteBar(info, n.start);
    const last = Math.max(first, Math.floor(info.barOfTick(n.stop - 1) + 1e-9));
    for (let b = first; b <= last; b++) sounding.add(b);
  }
  const all = [...sounding].sort((a, b) => a - b);
  const bars = all.filter((b) => !taken.has(b));
  const runs = [];
  for (const b of bars) {
    const run = runs[runs.length - 1];
    if (run && b === run.at + run.bars) run.bars++;
    else runs.push({ at: b, bars: 1 });
  }
  const out = [];
  for (const { at, bars: len } of runs.filter((r) => r.bars >= BLOCK_MIN).sort((a, b) => b.bars - a.bars || a.at - b.at)) {
    for (let from = 0; from < len && out.length < max; from += 16) {
      const plays = Math.min(16, len - from);
      if (plays < BLOCK_MIN) break;
      out.push({ bars: plays, startBar: at + from, count: 1, coverage: Math.min(1, plays / bars.length), starts: [at + from] });
    }
  }
  return out;
}

/** A stretch with no gap: its repeating loops, then as blocks what it plays outside them. */
function barFragments(info, notes) {
  const loops = detectPatterns(info, notes);
  if (!loops.length) return riffBlocks(info, notes);
  const taken = new Set();
  for (const p of loops) for (const s of p.starts) for (let k = 0; k < p.bars; k++) taken.add(s + k);
  return [...loops, ...riffBlocks(info, notes, { taken, max: MAX_PATTERNS - loops.length })];
}

/** The notes of a part in groups: a group ends at a silence of GROUP_GAP_BEATS or more. */
export function noteGroups(info, notes) {
  const gap = info.ppq * GROUP_GAP_BEATS;
  const groups = [];
  for (const n of [...notes].sort((a, b) => a.start - b.start)) {
    const g = groups[groups.length - 1];
    if (g && n.start - g.end < gap) {
      g.end = Math.max(g.end, n.stop);
      g.notes.push(n);
    } else groups.push({ at: n.start, end: n.stop, notes: [n] });
  }
  return groups.filter((g) => g.notes.length >= GROUP_MIN_NOTES);
}

/** Do two groups play the same? As loops are compared: notes on a 16th grid, from their start. */
function sameGroup(info, a, b) {
  const grid = info.ppq / 4;
  const shape = (g) => new Set(g.notes.map((n) => Math.round((n.start - g.at) / grid) * 128 + n.pitch));
  const x = shape(a);
  const y = shape(b);
  let common = 0;
  for (const v of x) if (y.has(v)) common++;
  return common / (x.size + y.size - common) >= PATTERN_SIMILARITY;
}

/** A group as the riffs inside it: [{ g, ats }], each `g` a group of its own, `ats` its repeats. */
function groupPieces(info, g) {
  const startBar = noteBar(info, g.at);
  const bars = Math.ceil(info.barOfTick(g.end) - 1e-9) - startBar;
  const whole = [{ g, ats: [g.at] }];
  if (bars < GROUP_SPLIT_BARS) return whole;
  const inner = barFragments(info, g.notes);
  // Very long, it is a part played on end; shorter, only what repeats inside splits it.
  if (bars <= GROUP_MAX_BARS && !inner.some((f) => f.count > 1)) return whole;
  const pieces = [];
  for (const f of inner) {
    const base = info.barStartTick(f.startBar);
    const until = info.barStartTick(f.startBar + f.bars);
    const early = EARLY * info.ppq;
    const notes = g.notes.filter((n) => n.start >= base - early && n.start < until - early);
    if (notes.length < GROUP_MIN_NOTES) continue;
    // From its first note to its last: no silence at either end.
    const at = notes[0].start;
    const end = Math.min(until, Math.max(...notes.map((n) => n.stop)));
    pieces.push({ g: { at, end, notes }, ats: f.starts.map((s) => info.barStartTick(s) + at - base) });
  }
  return pieces.length ? pieces : whole;
}

/**
 * A channel's fragments for the catalogue: each group of notes between silences, or the riffs
 * inside it when it repeats them or is too long to be one; those that play the same are one,
 * with repeats. In exact ticks (`at`, `ticks`, `ats`: every repeat) and the bars they fall in
 * (`startBar`, `bars`, `starts`). Most played first.
 */
export function channelFragments(info, notes) {
  if (!info.ppq || info.smpte) return [];
  const barAt = (t) => noteBar(info, t);   // a fragment never starts on the bar before its first note
  const active = new Set(notes.map((n) => barAt(n.start))).size;
  const found = [];
  for (const group of noteGroups(info, notes)) {
    for (const piece of groupPieces(info, group)) {
      const same = found.find((f) => sameGroup(info, f.g, piece.g));
      if (same) same.ats.push(...piece.ats);
      else found.push(piece);
    }
  }
  return found.map(({ g, ats }) => {
    const startBar = barAt(g.at);
    const bars = Math.max(1, Math.ceil(info.barOfTick(g.end) - 1e-9) - startBar);
    const sorted = [...ats].sort((a, b) => a - b);
    return { bars, startBar, count: ats.length, starts: sorted.map(barAt), at: g.at, ticks: g.end - g.at, ats: sorted, coverage: Math.min(1, (ats.length * bars) / Math.max(1, active)) };
  }).sort((a, b) => b.count * b.ticks - a.count * a.ticks);
}

/**
 * Every different fragment a part repeats: 1, 2, 4, 8 and 16 bars, played at least twice,
 * most played first (repeats × bars). A fragment that
 * sounds like one already kept (PATTERN_SIMILARITY) or is a shorter kept one played again is
 * left out, so each one is worth hearing. Up to `max`, each { bars, startBar, count, starts,
 * coverage } like detectPatterns.
 */
export function findFragments(info, notes, { max = 12 } = {}) {
  const m = barModel(info, notes);
  if (!m) return [];
  const all = [];
  for (const L of [1, 2, 4, 8, 16]) {
    if (m.span < L * 2) break;
    for (const c of stretches(m, L)) if (c.count >= 2) all.push(c);
  }
  all.sort((a, b) => b.count * b.bars - a.count * a.bars || a.bars - b.bars);
  const kept = [];
  for (const c of all) {
    if (kept.length >= max) break;
    // The same fragment, or the same loop entered a few bars later (a rotation of it).
    const sameAs = (q) => q.bars === c.bars && Array.from({ length: q.bars }, (_, r) => q.at + r)
      .some((at) => at + c.bars <= m.span && m.similar(at, c.at, c.bars) >= PATTERN_SIMILARITY);
    if (kept.some((q) => sameAs(q) || madeOf(m, c, q))) continue;
    kept.push(c);
  }
  return kept.map((p) => ({ bars: p.bars, startBar: m.first + p.at, count: p.count, coverage: Math.min(1, (p.count * p.bars) / m.active), starts: p.starts.map((b) => m.first + b) }));
}

/** Is `p` just the shorter `q` played again (4 bars that are the 2-bar fragment twice)? */
function madeOf(m, p, q) {
  return q.bars < p.bars && p.bars % q.bars === 0
    && Array.from({ length: p.bars / q.bars }, (_, k) => m.similar(q.at, p.at + k * q.bars, q.bars)).every((s) => s >= PATTERN_SIMILARITY);
}

/**
 * Each different stretch of L bars (starting on a bar with notes) and its repeats, without
 * overlapping: { bars, at, count, starts } with bar indices from the model's first bar.
 */
function stretches(m, L) {
  const out = [];
  const tried = new Set();
  for (let a = 0; a + L <= m.span; a++) {
    if (!m.ids[a]) continue;
    const key = m.ids.slice(a, a + L).join(',');
    if (tried.has(key)) continue;
    tried.add(key);
    // Walk the part, jumping L bars after each match.
    const starts = [];
    for (let b = 0; b + L <= m.span;) {
      if (m.similar(a, b, L) >= PATTERN_SIMILARITY) { starts.push(b); b += L; } else b++;
    }
    out.push({ bars: L, at: a, count: starts.length, starts });
  }
  return out;
}

/**
 * A part's bars as sets of notes on a 16th grid (pitch included, velocity and length
 * ignored), and how alike two stretches are: the share of notes in common. Null when there is
 * too little to compare.
 */
function barModel(info, notes) {
  if (!info.ppq || info.smpte || notes.length < 4) return null;
  const grid = info.ppq / 4;
  const byBar = new Map();
  for (const n of notes) {
    const bar = noteBar(info, n.start);   // played just before its bar line: that bar's downbeat
    const pos = Math.max(0, Math.round((n.start - info.barStartTick(bar)) / grid));
    if (!byBar.has(bar)) byBar.set(bar, new Set());
    byBar.get(bar).add(pos * 128 + n.pitch);
  }
  const barNums = [...byBar.keys()];
  const first = Math.min(...barNums);
  const last = Math.max(...barNums);
  if (last - first + 1 > MAX_PATTERN_SPAN) return null;
  const active = byBar.size;

  // Each distinct bar content gets an id (0: empty); common and joint note counts are worked
  // out once per pair of ids, so comparing stretches is a few additions.
  const contents = [new Set()];
  const idOfKey = new Map([['', 0]]);
  const ids = [];
  for (let b = first; b <= last; b++) {
    const set = byBar.get(b) ?? new Set();
    const key = [...set].sort((x, y) => x - y).join(',');
    if (!idOfKey.has(key)) { idOfKey.set(key, contents.length); contents.push(set); }
    if (contents.length > MAX_PATTERN_CONTENTS) return null;
    ids.push(idOfKey.get(key));
  }
  const u = contents.length;
  const common = new Uint16Array(u * u);
  const joint = new Uint16Array(u * u);
  for (let i = 0; i < u; i++) {
    for (let j = i; j < u; j++) {
      let c = 0;
      for (const x of contents[i]) if (contents[j].has(x)) c++;
      const t = contents[i].size + contents[j].size - c;
      common[i * u + j] = common[j * u + i] = c;
      joint[i * u + j] = joint[j * u + i] = t;
    }
  }
  /** Share of notes in common between the L bars from index a and from index b. */
  const similar = (a, b, L) => {
    let c = 0;
    let t = 0;
    for (let k = 0; k < L; k++) {
      const p = ids[a + k] * u + ids[b + k];
      c += common[p];
      t += joint[p];
    }
    return t ? c / t : 0;
  };
  return { first, active, ids, similar, span: ids.length };
}

/**
 * Where to take a song's loops from (⇡ Loop from song) so they sound well together: the stretch of the song
 * (a window of `bars`) where the most channels play one of their repeating patterns. Parts of
 * one section were written to go together (the same chords), while each channel's own best
 * pattern may come from different sections and clash. `patternsOf` maps channel -> patterns
 * (detectPatterns, with `starts`); `activeIn(ch, fromBar, toBar)` says whether a channel plays
 * there. Returns the best windows first (up to `max`, not overlapping, and each with another
 * mix of patterns: the same patterns further on would sound the same), each
 * { startBar, bars, loops: Map ch -> { startBar, bars }, others: [ch…] }: `loops` are the
 * channels repeating a pattern inside it, `others` the ones that only play something there.
 */
export function loopSections(patternsOf, activeIn, { bars = 8, lastBar, max = 5 } = {}) {
  const scored = [];
  for (let s = 1; s + bars - 1 <= lastBar; s++) {
    const loops = new Map();
    let score = 0;
    for (const [ch, patterns] of patternsOf) {
      // The channel's pattern that fills most of the window (a section is where it keeps
      // repeating, not where one repeat happens to fall).
      let pick = null;
      patterns.forEach((p, k) => {
        if (p.bars > bars) return;
        const inside = p.starts.filter((b) => b >= s && b + p.bars <= s + bars);
        if (!inside.length) return;
        const fill = (inside.length * p.bars) / bars;
        if (!pick || fill > pick.fill || (fill === pick.fill && p.coverage > pick.coverage)) pick = { startBar: inside[0], bars: p.bars, coverage: p.coverage, fill, k };
      });
      if (pick) { loops.set(ch, { startBar: pick.startBar, bars: pick.bars, k: pick.k }); score += 1 + pick.fill + 0.1 * pick.coverage; }
    }
    // What the window sounds like: which pattern each channel plays (not where).
    const content = [...loops].map(([ch, l]) => `${ch}:${l.k}`).sort().join(' ');
    if (loops.size) scored.push({ startBar: s, bars, loops, score, content });
  }
  scored.sort((a, b) => b.score - a.score || a.startBar - b.startBar);
  const picked = [];
  for (const w of scored) {
    if (picked.length >= max) break;
    if (picked.some((p) => Math.abs(p.startBar - w.startBar) < bars)) continue;   // another section
    // The same patterns elsewhere in the song sound the same: only another mix is another section.
    if (picked.some((p) => p.content === w.content)) continue;
    picked.push(w);
  }
  for (const w of picked) {
    w.others = [...patternsOf.keys()].filter((ch) => !w.loops.has(ch) && activeIn(ch, w.startBar, w.startBar + bars));
    for (const l of w.loops.values()) delete l.k;
    delete w.score;
    delete w.content;
  }
  return picked;
}

// Key profiles (Krumhansl-Kessler), after midiGrid's harmonic-core.js: how much each degree
// of the scale weighs in a major and in a minor key.
const KK_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const KK_MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const MAJOR_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const MINOR_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
const KEY_MIN_FIT = 0.5;   // below this the music fits no key well (atonal, drums only…)

function correlation(a, b) {
  let sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0;
  for (let i = 0; i < 12; i++) { sa += a[i]; sb += b[i]; saa += a[i] * a[i]; sbb += b[i] * b[i]; sab += a[i] * b[i]; }
  const d = Math.sqrt((saa - (sa * sa) / 12) * (sbb - (sb * sb) / 12));
  return d ? (sab - (sa * sb) / 12) / d : 0;
}

/**
 * The key the notes suggest, for files without a key signature: how long each pitch class
 * sounds (drums left out, a note counted at most a bar), matched against the major and minor
 * profiles in all twelve keys. '' when nothing fits well.
 */
export function estimateKey(info) {
  const profile = new Array(12).fill(0);
  const cap = (info.ppq || 96) * 4;
  const open = new Map();
  let notes = 0;
  for (const e of info.events) {
    if ((e.type !== 'on' && e.type !== 'off') || e.ch === 9) continue;
    const k = e.ch * 128 + e.a;
    if (e.type === 'on') { open.set(k, e.tick); notes++; } else if (open.has(k)) {
      profile[e.a % 12] += Math.min(cap, e.tick - open.get(k));
      open.delete(k);
    }
  }
  if (notes < 16) return '';
  let best = { fit: -Infinity, name: '' };
  for (let t = 0; t < 12; t++) {
    const rot = (p) => p.map((_, i) => p[(i - t + 12) % 12]);
    const maj = correlation(profile, rot(KK_MAJOR));
    if (maj > best.fit) best = { fit: maj, name: `${MAJOR_NAMES[t]} mayor` };
    const min = correlation(profile, rot(KK_MINOR));
    if (min > best.fit) best = { fit: min, name: `${MINOR_NAMES[t]} menor` };
  }
  return best.fit >= KEY_MIN_FIT ? best.name : '';
}

/**
 * The song's key: the one written in the file, or the notes'. C major does not count as
 * written: it is what sequencers leave by default (79 % of the files that say so in a dance
 * library play in another key). Empty when nothing fits.
 */
export function songKeyOf(info) {
  const written = info.key && keyClass(info.key) !== '0 mayor' ? info.key : '';
  return written || estimateKey(info) || info.key || '';
}

const PITCH_CLASS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "Db mayor" and "C# mayor" are the same key: "1 mayor". '' stays ''. */
export function keyClass(key) {
  const m = /^([A-G])(#|b)? (mayor|menor)$/.exec(key ?? '');
  if (!m) return '';
  return `${(PITCH_CLASS[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? 11 : 0)) % 12} ${m[3]}`;
}

/** How the notes of a fragment move: index into SHAPES ('' for drums, or too few notes). */
export const SHAPES = ['', 'rising', 'falling', 'flat', 'wave'];
/** How many notes a fragment plays: index into ENERGIES. */
export const ENERGIES = ['sparse', 'medium', 'busy'];
const SHAPE_CHANGE = 4;     // semitones the line must travel to rise or fall
const SHAPE_FLAT = 2;       // spread of its pitches (semitones) under which it stays flat
const ENERGY_SPARSE = 4;    // notes per bar, at most
const ENERGY_BUSY = 12;     // notes per bar, at least

/**
 * A stretch of notes in words, for the Parts filters: the shape of its line (the average pitch
 * of each onset, fitted to a straight line) and its energy (notes per bar).
 */
export function feelOf(notes, bars, drums) {
  const perBar = notes.length / Math.max(1, bars);
  const energy = perBar <= ENERGY_SPARSE ? 0 : perBar >= ENERGY_BUSY ? 2 : 1;
  if (drums) return { shape: 0, energy };
  const onsets = new Map();
  for (const n of notes) {
    if (!onsets.has(n.start)) onsets.set(n.start, []);
    onsets.get(n.start).push(n.pitch);
  }
  if (onsets.size < 3) return { shape: 0, energy };
  const xs = [...onsets.keys()];
  const ys = xs.map((x) => onsets.get(x).reduce((a, b) => a + b, 0) / onsets.get(x).length);
  const mean = (v) => v.reduce((a, b) => a + b, 0) / v.length;
  const mx = mean(xs);
  const my = mean(ys);
  let sxx = 0, sxy = 0, syy = 0;
  xs.forEach((x, i) => { sxx += (x - mx) ** 2; sxy += (x - mx) * (ys[i] - my); syy += (ys[i] - my) ** 2; });
  const change = sxx ? (sxy / sxx) * (Math.max(...xs) - Math.min(...xs)) : 0;
  const shape = change >= SHAPE_CHANGE ? 1 : change <= -SHAPE_CHANGE ? 2 : Math.sqrt(syy / xs.length) < SHAPE_FLAT ? 3 : 4;
  return { shape, energy };
}

function velocityOf(notes) {
  if (!notes.length) return { mean: 0, spread: 0 };
  const mean = notes.reduce((sum, n) => sum + n.velocity, 0) / notes.length;
  const variance = notes.reduce((sum, n) => sum + (n.velocity - mean) ** 2, 0) / notes.length;
  return { mean: Math.round(mean), spread: Math.round(Math.sqrt(variance)) };
}

/** Role, activity and loops of one channel of a parsed file. */
export function partFeatures(info, channel) {
  const c = info.channels.find((x) => x.channel === channel);
  const { notes } = extractNotes(info, `ch:${channel}`);
  const bars = new Set(notes.map((n) => noteBar(info, n.start)));
  const starts = new Map();
  let pitchSum = 0;
  for (const n of notes) {
    starts.set(n.start, (starts.get(n.start) ?? 0) + 1);
    pitchSum += n.pitch;
  }
  let together = 0;
  for (const v of starts.values()) if (v > 1) together += v;
  const poly = notes.length ? together / notes.length : 0;
  const avg = notes.length ? pitchSum / notes.length : 60;
  const program = channel === 10 ? 0 : c.programs[0] ?? 0;
  let role;
  if (channel === 10) role = 'drums';
  else if ((program >= 32 && program <= 39) || (c.max < 55 && avg < 48)) role = 'bass';
  else if (poly > 0.4) role = 'chords';
  else role = 'melody';
  const trackName = info.tracks[(c.tracks[0] ?? 1) - 1]?.name ?? '';
  const patterns = detectPatterns(info, notes);
  const inFragment = (p) => notes.filter((n) => n.start >= p.at && n.start < p.at + p.ticks);
  const fragments = channelFragments(info, notes).map((p) => {
    const fragmentNotes = inFragment(p);
    return { ...p, feel: feelOf(fragmentNotes, p.bars, role === 'drums'), dynamics: velocityOf(fragmentNotes) };
  });
  return {
    channel,
    program,
    role,
    notes: notes.length,
    activeBars: bars.size,
    density: notes.length / Math.max(1, bars.size),
    poly,
    min: c.min,
    max: c.max,
    patterns,
    fragments,
    feel: feelOf(notes, bars.size, role === 'drums'),
    dynamics: velocityOf(notes),
    trackName,
  };
}

/**
 * The record the library store keeps for a file. Parts are compact tuples (see PART), so
 * half a million of them load quickly:
 * [channel, program, role index, notes, active bars, density×10, poly %, min, max,
 *  loop bars, loop count, loop coverage %, loop start bar, track name, fragments]
 * The loop fields are its first fragment. Fragments are [bars, start bar, count, coverage %,
 * shape, energy, chords, tick, ticks, groove, mean velocity, velocity spread, grid, hits,
 * hit steps, events and cached gesture scores] (see FRAG; events are temporary, scores are
 * compact derived values), as many as it has; a part with none has one of 0 bars, the feel of the whole part.
 */
export const PART = { ch: 0, program: 1, role: 2, notes: 3, bars: 4, density: 5, poly: 6, min: 7, max: 8, loopBars: 9, loopCount: 10, loopCov: 11, loopStart: 12, name: 13, frags: 14 };
export const FRAG = {
  bars: 0, start: 1, count: 2, cov: 3, shape: 4, energy: 5, chords: 6, at: 7, ticks: 8,
  groove: 9, velocity: 10, velocitySpread: 11, grid: 12, hits: 13, hitSteps: 14, events: 15,
  scoreSnareRoll: 16, scoreArpeggio: 17, gestureScores: 18,
  // After the gesture scores (18–27, one per midi/gestures.js DRUM_GESTURES). Temporary like
  // `events`: kept only for an analysis saved "with MIDI events", for other tools to play it.
  controls: 28, tempo: 29,
};

/** The controllers kept with a fragment saved with MIDI events: volume, pan, expression, sustain. */
export const PLAYBACK_CONTROLS = [7, 10, 11, 64];
/** Pitch bend among a fragment's controls (controllers are 0–127). */
export const CONTROL_BEND = 128;

/** Bumped when a record gains fields: older records are analysed again (their parts are kept). */
export const RECORD_VERSION = 23;   // 23: compact per-fragment MIDI note events (onset, duration, pitch, velocity) and PPQ · 22: each fragment's rhythm, drums too · 21: pitched note grid · 20: fragment velocity mean and spread · 19: song form · 18: fragment groove · 17: fragment chords · 16: notes just before a bar line belong to that bar · 15: longer fragments · 14: note groups · 13: blocks end with their notes · 12: 1-bar loops and short blocks · 11: blocks beside loops · 10: fragments share no bar · 9: riffs heard once · 8: up to six fragments · 7: fragments are different riffs, not pieces of one · 6: do not trust a written C major · 5: fragment shape, energy and chords · 4: estimated key, 12/16-bar loops · 3: loops with tolerance · 2: title and author

// Texts that say nothing about the song: placeholders, and the program that wrote the file.
const JUNK_TITLE = /^(untitled|nameless|no name|sin t[ií]tulo|track\s*\d*|pista\s*\d*|sequence\s*\d*|seq\s*-?\d*|song\s*\d*|new song|tempo( track)?|conductor|system( track)?|setup|general midi|gm|gs|xg|midi( file)?|\W*)$/i;
const JUNK_SOFTWARE = /cakewalk|cubase|sonar|logic|noteworthy|anvil|band-in-a-box|finale|sibelius|encore|powertracks|midisoft|voyetra|generated|converted|created with|made with|saved by|www\.|http/i;
const CREDIT = /©|\(c\)|copyright|\bby\b|sequenc|arrang|transcri|programm|composed|written|\bpor\b|secuenc/i;

const clean = (s) => s.replace(/[\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Text in another encoding read as Latin-1 (Chinese, Thai, Japanese files) comes out as runs
 * of symbols such as "³¯¥@µÓ": unreadable, so it is left out.
 */
function garbled(s) {
  const symbols = (s.match(/[\u0080-¨ª-¿×÷]/g) ?? []).length;
  return symbols >= 2 && symbols / s.replace(/\s/g, '').length > 0.12;
}

const usable = (s) => s.length > 2 && !JUNK_SOFTWARE.test(s) && !garbled(s);

/**
 * Title and author from the file's texts, when they say something: the title is the first
 * track's name (the song name in both SMF formats), the author the copyright notice or else
 * the first text that reads like a credit ("Sequenced by…").
 */
export function fileMeta(info) {
  const rawTitle = clean(info.tracks[0]?.name ?? '');
  const title = !JUNK_TITLE.test(rawTitle) && usable(rawTitle) ? rawTitle.slice(0, 80) : '';
  const credits = [info.copyright, ...info.texts.filter((t) => CREDIT.test(t))].map(clean);
  const author = credits.find(usable)?.slice(0, 80) ?? '';
  return { title, author };
}

export function fileRecord(path, info, { includeSearchScores = true, includePlaybackEvents = true } = {}) {
  if (!Number.isFinite(info.bars) || info.bars > MAX_ANALYSIS_BARS) {
    const { title, author } = fileMeta(info);
    const parts = info.channels.map((c) => {
      const program = c.channel === 10 ? 0 : c.programs[0] ?? 0;
      const role = c.channel === 10 ? 'drums' : (program >= 32 && program <= 39) || c.max < 55 ? 'bass' : 'melody';
      const trackName = info.tracks[(c.tracks[0] ?? 1) - 1]?.name ?? '';
      return [
        c.channel, program, ROLES.indexOf(role), c.notes, 0, 0, 0, c.min, c.max, 0, 0, 0, 0, trackName.slice(0, 60),
        [[0, 0, 0, 0, 0, 0, '', 0, 0, '', 0, 0]],
      ];
    });
    return {
      path, v: RECORD_VERSION, ok: true, limited: 'song is longer than 2048 bars; detailed part analysis was skipped',
      title, author, form: [], turns: [], dur: Math.round(info.durationSec * 10) / 10,
      bpm: Math.round(info.bpm * 10) / 10, ppq: info.ppq || 0, ts: info.timeSig, key: '', keyEst: false,
      fmt: info.format, tracks: info.trackCount, bars: 65535, parts,
    };
  }
  const key = songKeyOf(info);
  const chords = songChords(info);
  // Over the whole bars the fragment takes, from the first one's first beat: so the progressions
  // of two fragments compare bar for bar, as they sit on the pads.
  const chordsOf = (p) => (p.startBar && p.bars
    ? progressionIn(chords, info.ppq, info.barStartTick(p.startBar), info.barStartTick(p.startBar + p.bars), keyClass(key))
    : progressionIn(chords, info.ppq, p.at, p.at + p.ticks, keyClass(key)));
  const roles = [];   // each channel's role and notes, for the song's form (midi/director.js)
  const parts = info.channels.map((c) => {
    const f = partFeatures(info, c.channel);
    const loop = f.fragments[0];
    roles.push({ role: f.role, notes: extractNotes(info, `ch:${c.channel}`).notes });
    // Its groove over the whole bars it takes (a note played just before a bar line, that bar's).
    const all = extractNotes(info, `ch:${c.channel}`).notes;
    const notes = all.filter((n) => grooveNote(n.pitch, f.role === 'drums'));
    const early = EARLY * info.ppq;
    // Its notes over the same bars, as a grid (midi/harmony.js): what it is measured by against
    // what plays. Drums have no pitch.
    const gridIn = (p) => {
      if (f.role === 'drums' || !p.startBar || !p.bars) return null;
      const from = info.barStartTick(p.startBar);
      const until = info.barStartTick(p.startBar + p.bars);
      const step = info.ppq / STEPS_PER_BEAT;
      const steps = (until - from) / step;
      if (Math.abs(steps - Math.round(steps)) > 1e-6 || steps > 65535) return null;   // a bar that does not fall on 8ths
      const inside = all.filter((n) => n.start >= from - early && n.start < until - early)
        .map((n) => ({ at: Math.max(0, n.start - from) / step, len: (n.stop - n.start) / step, pitch: n.pitch }));
      return noteGrid(inside, steps);
    };
    // Where its notes strike over the same bars (midi/rhythm.js), drums too: its rhythm, measured
    // against what plays. [the strikes as bits, how many steps]; [null, 0] without whole bars.
    const hitsIn = (p) => {
      if (!p.startBar || !p.bars) return [null, 0];
      const from = info.barStartTick(p.startBar);
      const until = info.barStartTick(p.startBar + p.bars);
      const steps = ((until - from) / info.ppq) * HITS_PER_BEAT;
      if (Math.abs(steps - Math.round(steps)) > 1e-6 || steps > 65535) return [null, 0];
      const beats = all.filter((n) => n.start >= from - early && n.start < until - early).map((n) => Math.max(0, n.start - from) / info.ppq);
      return [packHits(hitGrid(beats, steps)), Math.round(steps)];
    };
    const eventsIn = (p) => {
      if (!includeSearchScores) return null;
      if (!p.startBar || !p.bars) return null;
      const from = info.barStartTick(p.startBar);
      const until = info.barStartTick(p.startBar + p.bars);
      const events = all
        .filter((n) => n.start >= from - early && n.start < until - early)
        .map((n) => {
          const start = Math.max(n.start, from);
          const stop = Math.min(n.stop, until);
          return { start: start - from, duration: stop - start, pitch: n.pitch, velocity: n.velocity };
        })
        .filter((n) => n.duration > 0)
        .sort((a, b) => a.start - b.start || a.pitch - b.pitch || a.velocity - b.velocity);
      if (!events.length) return null;
      const packed = new Uint32Array(events.length * 3);
      events.forEach((n, i) => {
        packed[i * 3] = n.start;
        packed[i * 3 + 1] = n.duration;
        packed[i * 3 + 2] = n.pitch | (n.velocity << 8);
      });
      return packed;
    };
    // The controls of its channel over the same bars that change how its notes sound: volume
    // (CC7), pan (CC10), expression (CC11), sustain pedal (CC64) and pitch bend. As [tick from the
    // fragment's first bar, number | value << 8] pairs, number the controller or CONTROL_BEND
    // (value 0–16383, 8192 at rest). Each one as it stands when the fragment starts comes first, at
    // tick 0 (the channel's base volume, a pedal held down, a bend not at rest). Null with none.
    const controls = includeSearchScores && includePlaybackEvents
      ? [...info.events.filter((e) => e.type === 'cc' && PLAYBACK_CONTROLS.includes(e.a) && e.ch === c.channel - 1).map((e) => ({ tick: e.tick, n: e.a, v: e.b })),
        ...(info.bends ?? []).filter((e) => e.ch === c.channel - 1).map((e) => ({ tick: e.tick, n: CONTROL_BEND, v: e.value }))]
        .sort((x, y) => x.tick - y.tick)
      : [];
    const controlsIn = (p) => {
      if (!includeSearchScores || !includePlaybackEvents || !p.startBar || !p.bars || !controls.length) return null;
      const from = info.barStartTick(p.startBar);
      const until = info.barStartTick(p.startBar + p.bars);
      const before = new Map();
      const inside = [];
      for (const e of controls) {
        if (e.tick < from) before.set(e.n, e.v);
        else if (e.tick < until) inside.push(e.tick - from, e.n | (e.v << 8));
        else break;
      }
      const start = [];
      for (const [n, v] of [...before].sort((x, y) => x[0] - y[0])) {
        if (n === CONTROL_BEND && v === 8192) continue;
        if (!inside.some((w, k) => k % 2 === 1 && inside[k - 1] === 0 && (w & 0xff) === n)) start.push(0, n | (v << 8));
      }
      const out = [...start, ...inside];
      return out.length ? Uint32Array.from(out) : null;
    };
    // The tempo over the same bars, as [tick from the fragment's first bar, microseconds a quarter
    // note] pairs: the one in force when it starts at tick 0, then each change inside it.
    const tempoIn = (p) => {
      if (!includeSearchScores || !includePlaybackEvents || !p.startBar || !p.bars) return null;
      const from = info.barStartTick(p.startBar);
      const until = info.barStartTick(p.startBar + p.bars);
      const out = [0, info.tempos[0].uspq];
      for (const t of info.tempos) {
        if (t.tick <= from) { out[1] = t.uspq; continue; }
        if (t.tick >= until) break;
        out.push(t.tick - from, t.uspq);
      }
      return Uint32Array.from(out);
    };
    const withPlayback = (frag, p) => {
      if (!includeSearchScores || !includePlaybackEvents) return frag;
      frag[FRAG.controls] = controlsIn(p);
      frag[FRAG.tempo] = tempoIn(p);
      return frag;
    };
    const grooveIn = (p) => {
      if (!p.startBar || !p.bars) return '';
      const from = info.barStartTick(p.startBar);
      const until = info.barStartTick(p.startBar + p.bars);
      const perBar = (info.barStartTick(p.startBar + 1) - from) / info.ppq;
      const beats = notes.filter((n) => n.start >= from - early && n.start < until - early).map((n) => Math.max(0, (n.start - from) / info.ppq));
      return grooveOf(beats, perBar, p.bars);
    };
    return [
      f.channel, f.program, ROLES.indexOf(f.role), f.notes, f.activeBars, Math.round(f.density * 10), Math.round(f.poly * 100),
      f.min, f.max, loop?.bars ?? 0, loop?.count ?? 0, loop ? Math.round(loop.coverage * 100) : 0, loop?.startBar ?? 0, f.trackName.slice(0, 60),
      f.fragments.length
        ? f.fragments.map((p) => withPlayback([p.bars, p.startBar, p.count, Math.round(p.coverage * 100), p.feel.shape, p.feel.energy, chordsOf(p), p.at, p.ticks, grooveIn(p), p.dynamics.mean, p.dynamics.spread, gridIn(p), ...hitsIn(p), eventsIn(p)], p))
        : [[0, 0, 0, 0, f.feel.shape, f.feel.energy, '', 0, 0, '', f.dynamics.mean, f.dynamics.spread, null, null, 0, null]],
    ];
  });
  // How it is arranged, a phrase of 4 bars at a time: the director learns from it.
  const { form, turns } = info.smpte ? { form: [], turns: [] } : formOf(roles, {
    barOf: (t) => noteBar(info, t), barStart: (b) => info.barStartTick(b), ppq: info.ppq, bars: Math.ceil(info.bars),
  });
  return {
    path,
    v: RECORD_VERSION,
    ok: true,
    ...fileMeta(info),
    form,
    turns,
    dur: Math.round(info.durationSec * 10) / 10,
    bpm: Math.round(info.bpm * 10) / 10,
    ppq: info.ppq || 0,
    ts: info.timeSig,
    searchScores: includeSearchScores,
    key,
    keyEst: key !== info.key,   // from the notes, not the file's key signature
    fmt: info.format,
    tracks: info.trackCount,
    bars: Math.ceil(info.bars),
    parts,
  };
}

/** Parse and describe a file; a file that is not MIDI gets { path, ok: false }. */
export function analyseFile(path, bytes, options) {
  try {
    return fileRecord(path, parseMidi(bytes), options);
  } catch {
    return { path, v: RECORD_VERSION, ok: false };
  }
}

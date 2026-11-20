// Where to cut a loop from a song in which no instrument repeats (Loop from song, Arrange on an
// empty loop): the stretch of whole bars that sounds best played round and round. Told from the
// same 9 measures Fill and Arrange use (midi/harmony.js, midi/rhythm.js), in three parts:
//
//   fit      how well its instruments go together there: each one measured against the others
//            (its notes and its rhythm, jointScore; drums by their rhythm, rhythmScore), the mean.
//            The parts of a song were written together, so this mostly finds where they are
//            settled (not a break, a fill or a lone instrument).
//   seam     how well its end leads back to its start: the bar the song plays after the stretch
//            set against the stretch's first bar, and the bar before it against its last bar
//            (their notes and where they strike alike). A loop is that jump, end to start; where
//            the song itself goes on with what its start had, the jump is not heard.
//   full     how many of the song's instruments play there.
//
//   mark = 0.5 · fit + 0.3 · seam + 0.2 · full
//
// The weights are a choice, not learned: fit and seam are what is heard, fullness breaks ties.
// Stretches of 8 bars are tried, then 4 and 16, from the first bar of a phrase (bars 1, 5, 9…);
// 2 and 1 for a song too short for them.

import { extractNotes, EARLY, noteBar, transposeBetween } from './parts.js';
import { ENERGIES, partFeatures } from './features.js';
import { ROLE_BIT } from './director.js';
import { scoreFillCandidate } from './fill.js';
import { addRow, barBeats, clipFrom, cutClip, loopGrid, loopHits, placeClip, rangeClip } from './loop.js';
import { channelWhat, programAt } from '../luna/bridge.js';
import { STEPS_PER_BEAT, harmonyFeatures, harmonyFit, noteGrid, sounds } from './harmony.js';
import { HITS_PER_BEAT, hitGrid, jointScore, rhythmFeatures, rhythmScore, strikes } from './rhythm.js';

const LENGTHS = [8, 4, 16, 2, 1];   // 2 and 1: songs of a bar or two (a jingle, a sound effect)
// An instrument with fewer notes in the stretch does not count as playing there: 4 in 4 bars or
// more, 1 in a stretch of a bar or two (a short song may have a chord of 3 notes and no more).
const minNotes = (bars) => (bars >= 4 ? 4 : 1);
export const SONG_LOOP_WEIGHTS = { fit: 0.5, seam: 0.3, full: 0.2 };

/**
 * Keep locked rows and exclude their source channels when replacing a song's imported rows.
 * `channels`: only these of the song come in (the tracks selected in Explore; null, all): the
 * song's rows of the others stay as they are.
 */
export function planSongImport(rows, path, channels = null) {
  const protectedChannels = new Set();
  for (const row of rows) {
    if (!row.locked) continue;
    if (row.imported === path && Number.isInteger(row.importedCh)) protectedChannels.add(row.importedCh);
    for (const clip of row.clips.values()) {
      if (clip.src?.path === path && Number.isInteger(clip.src.ch)) protectedChannels.add(clip.src.ch);
    }
  }
  const leftOut = (row) => channels !== null && !channels.has(row.importedCh);
  return {
    rows: rows.filter((row) => row.imported !== path || row.locked || leftOut(row)),
    protectedChannels,
    channels,
  };
}

/** Does channel `ch` of the song come in (planSongImport)? Not locked, and selected if there is a selection. */
const comesIn = (plan, ch) => !plan.protectedChannels.has(ch) && (plan.channels === null || plan.channels.has(ch));

/**
 * Rearrange only this song's material. The returned loop is staged: the input rows, including
 * locked rows, are never modified. Pitched fragments use the receiving row's instrument.
 */
export function remixSongLoop(loop, info, path, { key = '', turn = 0, model = null, weights = {}, channels = null } = {}) {
  const plan = planSongImport(loop.rows, path, channels);
  const total = loop.length || 16;
  const staged = { ...loop, length: total, rows: [...plan.rows] };
  const beats = barBeats(staged);
  const lastBar = Math.ceil(info.bars);
  const sources = [];
  const skipped = [];

  for (const channel of info.channels) {
    const ch = channel.channel;
    if (!comesIn(plan, ch)) continue;
    const features = partFeatures(info, ch);
    if (!features.notes) continue;
    const notes = extractNotes(info, `ch:${ch}`).notes;
    const ranges = new Map();
    const addRange = (start, bars) => {
      if (start < 1 || start > lastBar || bars < 1) return;
      bars = Math.min(bars, lastBar - start + 1);
      ranges.set(`${start}|${bars}`, { start, bars });
    };
    for (const fragment of [...features.fragments, ...features.patterns]) {
      for (const start of (fragment.starts ?? [fragment.startBar]).slice(0, 8)) {
        for (let offset = 0; offset < fragment.bars; offset += 2) {
          addRange(start + offset, Math.min(2, fragment.bars - offset));
          addRange(start + offset, 1);
        }
      }
    }
    if (!ranges.size) for (const n of notes) addRange(noteBar(info, n.start), 1);
    const clips = [];
    for (const { start, bars } of [...ranges.values()].slice(0, 128)) {
      const startTick = info.barStartTick(start);
      const endTick = info.barStartTick(start + bars);
      const name = channelWhat(info, ch, startTick);
      const clip = rangeClip(info, ch, { startTick, endTick }, name, key, beats, { preserveLeadingSilence: true });
      if (!clip.notes.length) continue;
      clip.src = { path, ch, at: startTick, bar: start, bars };   // (bars of its song, from 1: what the loop's pads say they are)
      clip.transpose = transposeBetween(key, staged.key);
      const velocity = clip.notes.reduce((sum, n) => sum + n.vel, 0) / clip.notes.length;
      const velocitySpread = Math.sqrt(clip.notes.reduce((sum, n) => sum + (n.vel - velocity) ** 2, 0) / clip.notes.length);
      const energy = ENERGIES[clip.notes.length / clip.bars <= 4 ? 0 : clip.notes.length / clip.bars >= 12 ? 2 : 1];
      const hits = hitGrid(clip.notes.map((n) => n.beat), clip.bars * beats * HITS_PER_BEAT);
      const grid = ch === 10 ? null : noteGrid(clip.notes.map((n) => ({
        at: n.beat * STEPS_PER_BEAT, len: n.len * STEPS_PER_BEAT, pitch: n.pitch + clip.transpose,
      })), clip.bars * beats * STEPS_PER_BEAT);
      clips.push({ clip, loopBars: clip.bars, velocity, velocitySpread, energy, role: features.role, hits, grid });
    }
    if (clips.length) sources.push({ ch, features, clips });
  }
  if (!sources.length) {
    if (plan.protectedChannels.size) throw new Error(`All ${channels ? 'selected ' : 'available '}tracks from this song are locked or have no notes. Unlock a row to change it.`);
    throw new Error(channels ? 'The selected tracks have no fragments with notes to make a loop from: select others in Explore.' : 'This song has no fragments with notes to make a loop from.');
  }

  const rows = [];
  for (const source of [...sources].sort((a, b) => Number(a.ch !== 10) - Number(b.ch !== 10) || a.ch - b.ch)) {
    const { ch } = source;
    const old = loop.rows.find((row) => row.imported === path && row.importedCh === ch && !row.locked);
    const firstTick = source.clips[0].clip.src.at;
    const row = addRow(staged, {
      program: old?.program ?? (ch === 10 ? 0 : programAt(info, ch, firstTick) ?? 0),
      drums: ch === 10,
      name: old?.name ?? channelWhat(info, ch, firstTick),
    });
    if (!row) { skipped.push(ch); continue; }
    if (old) Object.assign(row, old, { clips: new Map(), off: [] });
    Object.assign(row, { imported: path, importedCh: ch });
    rows.push({ row, source });
  }
  if (!rows.length) throw new Error('No song tracks can be added: the loop has no free instrument channels or already has drums.');

  const make = (phase) => {
    for (const { row } of rows) { row.clips.clear(); row.off = []; }
    let scoreTotal = 0, scored = 0, rests = 0;
    for (const [r, { row, source }] of rows.entries()) {
      const pool = sources.filter((s) => (s.ch === 10) === row.drums).flatMap((s) => s.clips);
      let previous = '';
      for (let at = 0, slot = 0; at < total; slot++) {
        const bars = Math.min(2, total - at);
        if (total > 2 && (phase + r * 3 + slot * 2) % 5 === 0) {
          rests += bars;
          at += bars;
          continue;
        }
        const targetGrid = loopGrid(staged, { except: row });
        const targetHits = loopHits(staged, { except: row });
        const grid = targetGrid?.grid.subarray(at * targetGrid.stepsPerBar, (at + bars) * targetGrid.stepsPerBar);
        const hits = targetHits?.hits.subarray(at * targetHits.hitsPerBar, (at + bars) * targetHits.hitsPerBar);
        const haveMask = staged.rows.reduce((mask, other) => {
          if (other === row || other.mute || ![...other.clips].some(([b, c]) => b < at + bars && b + c.bars > at && c.notes.length)) return mask;
          const own = rows.find((item) => item.row === other);
          const role = other.drums ? 'drums' : own?.source.features.role ?? (other.program >= 32 && other.program <= 39 ? 'bass' : 'melody');
          return mask | (ROLE_BIT[role] ?? 0);
        }, 0);
        const usable = pool.filter((candidate) => candidate.clip.notes.some((n) => n.beat < Math.min(bars, candidate.clip.bars) * beats - EARLY));
        if (!usable.length) { rests += bars; at += bars; continue; }
        const ranked = usable.map((candidate) => {
          const h = grid && sounds(grid) && candidate.grid && sounds(candidate.grid)
            ? harmonyFit(grid, candidate.grid, 0, beats * STEPS_PER_BEAT) : null;
          const rhythm = hits && strikes(hits) ? rhythmFeatures(hits, candidate.hits, beats * HITS_PER_BEAT) : null;
          const fit = h && rhythm ? jointScore(h, rhythm, weights.J)
            : h ? h.fit : row.drums && rhythm ? rhythmScore(rhythm, weights.R) : null;
          return scoreFillCandidate({ ...candidate, fit }, {
            bars, dynamics: source.features.dynamics, notesPerBar: source.features.density,
            model, haveMask,
          });
        }).sort((a, b) => b.score - a.score);
        const eligible = ranked.filter((candidate) => candidate.score >= ranked[0].score - 0.08);
        const alternatives = eligible.filter((candidate) => `${candidate.clip.src.ch}|${candidate.clip.src.at}` !== previous);
        const choices = alternatives.length ? alternatives : eligible;
        const pick = choices[(phase + r + slot) % choices.length];
        const length = Math.min(bars, pick.clip.bars);
        const clip = length < pick.clip.bars ? cutClip(pick.clip, 0, length) : { ...pick.clip, notes: pick.clip.notes.map((n) => ({ ...n })) };
        placeClip(row, at, clip, total);
        previous = `${pick.clip.src.ch}|${pick.clip.src.at}`;
        scoreTotal += pick.score;
        scored++;
        at += length;
      }
      if (!row.clips.size) {
        const clip = source.clips[phase % source.clips.length].clip;
        placeClip(row, 0, { ...clip, notes: clip.notes.map((n) => ({ ...n })) }, total);
      }
    }
    return { score: scored ? scoreTotal / scored : null, rests };
  };
  const signature = (items) => JSON.stringify(items.map(({ row }) => [
    row.importedCh,
    [...row.clips].flatMap(([at, clip]) => clip.notes
      .filter((n) => !(row.off ?? []).includes(Math.floor((at * beats + n.beat + EARLY) / beats)))
      .map((n) => [at * beats + n.beat, n.len, n.pitch + (clip.transpose ?? 0) + (clip.shift ?? 0), n.vel]))
      .sort((a, b) => a[0] - b[0] || a[2] - b[2] || a[1] - b[1] || a[3] - b[3]),
  ]));
  const before = signature(rows.map(({ source }) => ({
    row: loop.rows.find((row) => row.imported === path && row.importedCh === source.ch && !row.locked)
      ?? { importedCh: source.ch, clips: new Map() },
  })));
  let result;
  let phase = turn, changed = false;
  for (let attempt = 0; attempt < 8; attempt++) {
    phase = turn + attempt;
    result = make(phase);
    changed = signature(rows) !== before;
    if (changed) break;
  }
  return { loop: staged, added: rows.length, skipped, ...result, turn: phase, changed };
}

/**
 * ⇉ All fragments: each instrument of the song in a row of its own, its different fragments (as
 * Explore's Fragments shows them: what it plays once and again counted once) one after another
 * from bar 1, in the order the song first plays them. One longer than the bars left is cut at the
 * loop's end; when they run out, the rest of the row stays empty. An instrument with none stays
 * out. As remixSongLoop: staged (the input rows never changed), the song's earlier rows replaced
 * (their sound kept), locked rows and their channels left as they are.
 * { loop, added, skipped: channels with no row free, placed, cut, left: those that did not fit }.
 */
export function fragmentsSongLoop(loop, info, path, { key = '', channels = null } = {}) {
  const plan = planSongImport(loop.rows, path, channels);
  const total = loop.length || 16;
  const staged = { ...loop, length: total, rows: [...plan.rows] };
  const beats = barBeats(staged);
  const sources = [];
  for (const channel of info.channels) {
    const ch = channel.channel;
    if (!comesIn(plan, ch)) continue;
    const fragments = [...partFeatures(info, ch).fragments].sort((a, b) => a.at - b.at);
    const clips = [];
    for (const fragment of fragments) {
      const name = channelWhat(info, ch, fragment.at);
      const clip = clipFrom(info, ch, fragment, name, key, beats);
      if (!clip.notes.length) continue;
      clip.src = { path, ch, at: info.barStartTick(fragment.startBar), bar: fragment.startBar, bars: clip.bars };
      clip.transpose = transposeBetween(key, staged.key);
      clips.push(clip);
    }
    if (clips.length) sources.push({ ch, clips });
  }
  if (!sources.length) {
    if (plan.protectedChannels.size) throw new Error(`All ${channels ? 'selected ' : ''}tracks of this song with fragments are locked. Unlock a row to change it.`);
    throw new Error(channels ? 'The selected tracks have no fragments with notes to lay out: select others in Explore.' : 'This song has no fragments with notes to lay out.');
  }

  const skipped = [];
  let added = 0, placed = 0, cut = 0, left = 0;
  // Drums first (their row goes on top), then the others as the song numbers them.
  for (const { ch, clips } of sources.sort((a, b) => Number(a.ch !== 10) - Number(b.ch !== 10) || a.ch - b.ch)) {
    const old = loop.rows.find((row) => row.imported === path && row.importedCh === ch && !row.locked);
    const row = addRow(staged, {
      program: old?.program ?? (ch === 10 ? 0 : programAt(info, ch, clips[0].src.at) ?? 0),
      drums: ch === 10,
      name: old?.name ?? clips[0].name,
    });
    if (!row) { skipped.push(ch); continue; }
    if (old) Object.assign(row, old, { clips: new Map(), off: [] });
    Object.assign(row, { imported: path, importedCh: ch });
    added++;
    let at = 0;
    for (const clip of clips) {
      if (at >= total) { left++; continue; }
      const fits = Math.min(clip.bars, total - at);
      // Cut at the loop's end: the pad says the bars of the song it holds.
      placeClip(row, at, fits < clip.bars ? { ...cutClip(clip, 0, fits), src: { ...clip.src, bars: fits } } : clip, total);
      if (fits < clip.bars) cut++;
      placed++;
      at += fits;
    }
  }
  if (!added) throw new Error('No song tracks can be added: the loop has no free instrument channels or already has drums.');
  return { loop: staged, added, skipped, placed, cut, left, total };
}

/** Cosine of two vectors: 0 when either is silent. */
function cosine(a, b) {
  let ab = 0, aa = 0, bb = 0;
  for (let k = 0; k < a.length; k++) { ab += a[k] * b[k]; aa += a[k] * a[k]; bb += b[k] * b[k]; }
  return aa && bb ? ab / Math.sqrt(aa * bb) : 0;
}

/**
 * The best stretches of a song to loop, when its instruments repeat nothing (or as a fallback):
 * up to `max`, not overlapping, the best first. Each as midi/features.js loopSections gives them:
 * { startBar, bars, loops: Map ch -> { startBar, bars }, others: [], mark, fit, seam, full },
 * `loops` every instrument that plays in it. `info`: a parsed file (midi/parser.js); `lengths`:
 * the stretches tried, in bars, the first preferred on a tie.
 */
export function songLoopWindows(info, { max = 5, lengths = LENGTHS } = {}) {
  if (!info?.ppq || info.smpte) return [];
  const lastBar = Math.ceil(info.bars);
  const early = EARLY * info.ppq;
  const channels = info.channels.map((c) => ({ ch: c.channel, drums: c.channel === 10, notes: extractNotes(info, `ch:${c.channel}`).notes }))
    .filter((c) => c.notes.length);
  if (!channels.length) return [];

  // A channel's notes in bars [from, to): a note grid (drums: none) and its strikes, and how many.
  const take = (c, from, to) => {
    const a = info.barStartTick(from), b = info.barStartTick(to);
    const inside = c.notes.filter((n) => n.start >= a - early && n.start < b - early);
    const beats = (b - a) / info.ppq;
    const hits = hitGrid(inside.map((n) => Math.max(0, n.start - a) / info.ppq), Math.round(beats * HITS_PER_BEAT));
    const step = info.ppq / STEPS_PER_BEAT;
    const grid = c.drums ? null : noteGrid(inside.map((n) => ({ at: Math.max(0, n.start - a) / step, len: (n.stop - n.start) / step, pitch: n.pitch })), Math.round(beats * STEPS_PER_BEAT));
    return { n: inside.length, hits, grid };
  };
  // What a bar sounds like, all instruments together: how long each note name sounds, and where it strikes.
  const barCache = new Map();
  const bar = (k) => {
    if (barCache.has(k)) return barCache.get(k);
    let got = null;
    if (k >= 1 && k <= lastBar) {
      const chroma = new Float32Array(12);
      const hits = new Float32Array(Math.round(((info.barStartTick(k + 1) - info.barStartTick(k)) / info.ppq) * HITS_PER_BEAT));
      for (const c of channels) {
        const t = take(c, k, k + 1);
        if (t.grid) for (const m of t.grid) for (let pc = 0; pc < 12; pc++) if (m >> pc & 1) chroma[pc]++;
        t.hits.forEach((h, s) => { if (h && s < hits.length) hits[s]++; });
      }
      got = { chroma, hits };
    }
    barCache.set(k, got);
    return got;
  };
  // How alike two bars are, 0–1: their notes and their strikes; null when either is outside the song.
  const alike = (x, y) => {
    const a = bar(x), b = bar(y);
    if (!a || !b) return null;
    const pitched = a.chroma.some((v) => v) || b.chroma.some((v) => v);
    const notes = cosine(a.chroma, b.chroma);
    const hits = a.hits.length === b.hits.length ? cosine(a.hits, b.hits) : 0;
    return pitched ? (notes + hits) / 2 : hits;
  };

  const scored = [];
  for (const L of lengths) {
    for (let s = 1; s + L - 1 <= lastBar; s += Math.min(L, 4)) {
      const parts = channels.map((c) => ({ ...c, ...take(c, s, s + L) })).filter((c) => c.n >= minNotes(L));
      if (!parts.length) continue;
      const beatsPerBar = (info.barStartTick(s + 1) - info.barStartTick(s)) / info.ppq;
      const hitsPerBar = Math.round(beatsPerBar * HITS_PER_BEAT);
      const stepsPerBar = Math.round(beatsPerBar * STEPS_PER_BEAT);
      // Each instrument against the rest of the stretch.
      const marks = [];
      for (const p of parts) {
        const others = parts.filter((o) => o !== p);
        if (!others.length) continue;
        const hits = new Uint8Array(p.hits.length);
        let grid = null;
        for (const o of others) {
          o.hits.forEach((h, k) => { if (h && k < hits.length) hits[k] = 1; });
          if (o.grid) { grid ??= new Uint16Array(p.hits.length ? Math.round(L * stepsPerBar) : 0); o.grid.forEach((m, k) => { if (k < grid.length) grid[k] |= m; }); }
        }
        if (!strikes(hits) || !strikes(p.hits)) continue;
        const r = rhythmFeatures(hits, p.hits, hitsPerBar);
        if (!r) continue;
        const h = p.grid && sounds(p.grid) && grid && sounds(grid) ? harmonyFeatures(grid, p.grid, 0, stepsPerBar) : null;
        marks.push(h ? jointScore(h, r) : rhythmScore(r));
      }
      // One instrument alone: nothing to fit, it fits.
      const fit = marks.length ? marks.reduce((a, b) => a + b, 0) / marks.length : parts.length === 1 ? 1 : 0;
      const ends = [alike(s + L, s), alike(s - 1, s + L - 1)].filter((x) => x !== null);
      const seam = ends.length ? ends.reduce((a, b) => a + b, 0) / ends.length : 0.5;
      const full = parts.length / channels.length;
      const mark = SONG_LOOP_WEIGHTS.fit * fit + SONG_LOOP_WEIGHTS.seam * seam + SONG_LOOP_WEIGHTS.full * full;
      scored.push({ startBar: s, bars: L, loops: new Map(parts.map((p) => [p.ch, { startBar: s, bars: L }])), others: [], mark, fit, seam, full });
    }
  }
  scored.sort((a, b) => b.mark - a.mark || lengths.indexOf(a.bars) - lengths.indexOf(b.bars) || a.startBar - b.startBar);
  const picked = [];
  for (const w of scored) {
    if (picked.length >= max) break;
    if (picked.some((p) => w.startBar < p.startBar + p.bars && p.startBar < w.startBar + w.bars)) continue;
    picked.push(w);
  }
  return picked;
}

import { ROLE_BIT } from './director.js';

export const FILL_MIN_DURATION_FIT = 0.5;
export const FILL_MIN_SCORE = 0.55;

const FILL_DIMENSIONS = [
  ['fit', 'Fit', 0.45],
  ['duration', 'Length', 0.25],
  ['dynamic', 'Dynamics', 0.15],
  ['activity', 'Activity', 0.05],
  ['markov', 'Role', 0.10],
];

export function fillScoreBreakdown(candidate) {
  const total = FILL_DIMENSIONS.reduce((sum, [key, , weight]) =>
    sum + (Number.isFinite(candidate[key]) ? weight : 0), 0);
  return FILL_DIMENSIONS.map(([key, label, weight]) => ({
    key, label, value: Number.isFinite(candidate[key]) ? candidate[key] : null,
    weight: Number.isFinite(candidate[key]) && total ? weight / total : 0,
  }));
}

export function fillInstrumentKey(candidate) {
  return candidate.role === 'drums' ? 'drums' : `program:${candidate.program}`;
}

export function fillFragmentKey(candidate) {
  return `${candidate.path.toLowerCase()}|${candidate.ch}|${candidate.atTick}|${candidate.ticks}`;
}

export function unseenFillCandidates(candidates, suggested) {
  return candidates.filter((candidate) => !suggested.has(candidate.instrumentKey ?? fillInstrumentKey(candidate)));
}

export function unseenFillFragments(candidates, suggested) {
  return candidates.filter((candidate) => !suggested.has(candidate.replacementKey ?? candidate.fragmentKey ?? fillFragmentKey(candidate)));
}

export function preferredArrangementSource(groups) {
  const scores = new Map();
  for (const candidates of groups) {
    const best = new Map();
    for (const candidate of candidates) {
      const path = candidate.path.toLowerCase();
      if (candidate.score > (best.get(path) ?? -1)) best.set(path, candidate.score);
    }
    for (const [path, score] of best) {
      const value = scores.get(path) ?? { slots: 0, score: 0 };
      value.slots++;
      value.score += score;
      scores.set(path, value);
    }
  }
  return [...scores].sort((a, b) => b[1].slots - a[1].slots || b[1].score - a[1].score)[0]?.[0] ?? null;
}

export function preferSharedArrangementCandidate(ranked, source, maxScoreLoss = 0.08) {
  if (!source || !ranked.length) return null;
  const best = ranked.reduce((score, candidate) => Math.max(score, candidate.score), -1);
  return ranked.find((candidate) => candidate.path.toLowerCase() === source
    && candidate.score >= best - maxScoreLoss) ?? null;
}

/**
 * How well a fragment of `candidateBars` fills `targetBars`. As long: 1. One that goes in a whole
 * number of times repeats without a cut, so it is nearly as good, a little less each time it
 * doubles (twice 0.9, four times 0.8, 16 times 0.6): 4 bars three times fill 12. One that would be
 * cut, a longer one or a shorter one whose last turn does not end, is worth the share that is
 * whole, and the shorter one less (its cut is heard every time round): 8 bars in 12 are 0.5.
 */
export function durationFit(candidateBars, targetBars) {
  if (!(candidateBars > 0) || !(targetBars > 0)) return null;
  if (candidateBars >= targetBars) return targetBars / candidateBars;
  const times = targetBars / candidateBars;
  return Number.isInteger(times) ? 1 - 0.1 * Math.log2(times) : 0.75 / times;
}

/** What the loop's Velocity menu can scale a pad by (loop.js VELS): a level within it is not a mismatch. */
export const VELOCITY_REACH = [0.6, 1.4];

/**
 * How a fragment's dynamics go with the reference's, 0–1. How loud it plays on average counts only
 * beyond what the Velocity menu sets right (×0.6 to ×1.4, VELOCITY_REACH): a part that fits but
 * plays softer is turned up in a click, it is not worse. What counts is the shape: how much its
 * velocity moves (the spread), once brought to the reference's level as far as the menu goes.
 */
export function dynamicsFit(candidate, target) {
  if (!target || !Number.isFinite(candidate.velocity) || !Number.isFinite(candidate.velocitySpread) || !(candidate.velocity > 0)) return null;
  const [low, high] = VELOCITY_REACH;
  const ratio = target.mean / candidate.velocity;
  const scale = Math.min(high, Math.max(low, ratio));
  // Beyond the menu's reach: an octave of loudness (twice or half) past it is no match at all.
  const beyond = ratio > high ? ratio / high : ratio < low ? low / ratio : 1;
  const mean = Math.max(0, 1 - Math.log2(beyond));
  const spread = Math.max(0, 1 - Math.abs(candidate.velocitySpread * scale - target.spread) / Math.max(12, candidate.velocitySpread * scale, target.spread));
  return 0.4 * mean + 0.6 * spread;
}

/**
 * The first `n` of `ranked` (best first), varied: the best always first; then, among those within
 * `margin` of the best still left, one of a group not taken yet (`groupOf`: an instrument family,
 * a song) before one of a group already in. Those further down are taken as they come. `taken`:
 * groups already in (what is in the loop now).
 */
export function diverseTop(ranked, n, groupOf, { margin = 0.03, taken = [] } = {}) {
  const pool = [...ranked];
  const out = [];
  const groups = new Set(taken);
  while (out.length < n && pool.length) {
    const top = pool[0].score;
    const fresh = groups.size ? pool.find((c) => c.score >= top - margin - 1e-9 && !groups.has(groupOf(c))) : pool[0];
    const pick = fresh ?? pool[0];
    out.push(pick);
    groups.add(groupOf(pick));
    pool.splice(pool.indexOf(pick), 1);
  }
  return out;
}

/** How alike two fragments' notes are before one is taken for the other's repeat: other transcriptions of the same piece. */
export const NEAR_SAME = 0.85;

const bitsOf = (m) => { let n = 0; for (let x = m; x; x &= x - 1) n++; return n; };

/**
 * How much two grids (harmony.js: the pitch classes sounding at each step, as heard; or where a
 * drum part strikes) hold the same, 0–1: what both have over what either has. Grids of another
 * length (other bars, another step) are not alike: 0.
 */
export function likeness(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let both = 0;
  let either = 0;
  for (let i = 0; i < a.length; i++) {
    both += bitsOf(a[i] & b[i]);
    either += bitsOf(a[i] | b[i]);
  }
  return either ? both / either : 1;
}

/** The instrument family of a fragment (General MIDI: eight programs each), the drums one of their own. */
export const familyOf = (candidate) => (candidate.role === 'drums' ? 'drums' : `family:${Math.floor((candidate.program ?? 0) / 8)}`);

export function activityLevel(notesPerBar) {
  return notesPerBar <= 4 ? 0 : notesPerBar >= 12 ? 2 : 1;
}

function activityFit(candidate, target) {
  if (!Number.isFinite(target) || !candidate.energy) return null;
  const levels = { sparse: 0, medium: 1, busy: 2 };
  const level = levels[candidate.energy];
  return level === undefined ? null : 1 - Math.abs(level - activityLevel(target)) / 2;
}

export function markovRoleFit(model, haveMask, role) {
  if (!model?.songs || !ROLE_BIT[role]) return null;
  let total = 0;
  let withRole = 0;
  for (let mask = 1; mask < 16; mask++) {
    if ((mask & haveMask) !== haveMask) continue;
    let count = model.start[mask] ?? 0;
    for (const transitions of model.next) count += transitions[mask] ?? 0;
    total += count;
    if (mask & ROLE_BIT[role]) withRole += count;
  }
  return total ? withRole / total : null;
}

/** Score a fragment using only available evidence; no unknown feature is treated as a match. */
export function scoreFillCandidate(candidate, { bars, dynamics, notesPerBar, model, haveMask, daring = 1 }) {
  const duration = durationFit(candidate.loopBars, bars);
  const dynamic = dynamicsFit(candidate, dynamics);
  const activity = activityFit(candidate, notesPerBar);
  const prior = markovRoleFit(model, haveMask, candidate.role);
  const markov = prior === null ? null : prior ** (1 / Math.max(0.2, daring));
  const values = { fit: candidate.fit, duration, dynamic, activity, markov };
  const dimensions = FILL_DIMENSIONS.filter(([key]) => Number.isFinite(values[key]));
  const weight = dimensions.reduce((sum, [, , w]) => sum + w, 0);
  const score = weight ? dimensions.reduce((sum, [key, , w]) => sum + values[key] * w, 0) / weight : 0;
  return { ...candidate, duration, dynamic, activity, markov, score };
}

export function rankFillCandidates(candidates, context) {
  return candidates.map((candidate) => scoreFillCandidate(candidate, context)).sort((a, b) => b.score - a.score);
}

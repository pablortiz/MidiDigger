import { fillInstrumentKey } from './fill.js';

export const SUMMARY_GOOD_SCORE = 0.7;

function insertBest(items, candidate, limit) {
  const at = items.findIndex((item) => item.score < candidate.score);
  if (at < 0) {
    if (items.length < limit) items.push(candidate);
  } else {
    items.splice(at, 0, candidate);
    if (items.length > limit) items.pop();
  }
}

function addStat(map, key, candidate) {
  const value = map.get(key) ?? { key, count: 0, total: 0, best: 0, average: 0 };
  value.count++;
  value.total += candidate.score;
  value.best = Math.max(value.best, candidate.score);
  value.average = value.total / value.count;
  map.set(key, value);
}

/**
 * A bounded ranking and the catalogue-wide statistics for candidates already scored with Fill.
 * Keeping only the best fragments per instrument avoids retaining a potentially huge library.
 */
export function buildFillSummary(candidates, { perInstrument = 20, bestLimit = 100 } = {}) {
  const instruments = new Map();
  const bars = new Map();
  const bpm = new Map();
  const best = [];
  const seen = new Set();
  let count = 0;

  for (const candidate of candidates) {
    if (!Number.isFinite(candidate.score)) continue;
    const fragmentKey = candidate.fragmentKey ?? (candidate.path
      && Number.isFinite(candidate.ch) && Number.isFinite(candidate.atTick) && Number.isFinite(candidate.ticks)
      ? `${candidate.path.toLowerCase()}|${candidate.ch}|${candidate.atTick}|${candidate.ticks}`
      : null);
    if (fragmentKey) {
      if (seen.has(fragmentKey)) continue;
      seen.add(fragmentKey);
    }
    count++;
    const key = fillInstrumentKey(candidate);
    const group = instruments.get(key) ?? {
      key, instrument: candidate.instrument, role: candidate.role, program: candidate.program,
      count: 0, goodCount: 0, total: 0, average: 0, best: 0, candidates: [], roles: {},
    };
    group.count++;
    if (candidate.score >= SUMMARY_GOOD_SCORE) group.goodCount++;
    group.total += candidate.score;
    group.best = Math.max(group.best, candidate.score);
    group.average = group.total / group.count;
    insertBest(group.candidates, candidate, perInstrument);
    // What its fragments play (a piano: chords and melody), each counted and its best kept, for Summary's role filter.
    const role = (group.roles[candidate.role] ??= { count: 0, goodCount: 0, candidates: [] });
    role.count++;
    if (candidate.score >= SUMMARY_GOOD_SCORE) role.goodCount++;
    insertBest(role.candidates, candidate, perInstrument);
    instruments.set(key, group);
    insertBest(best, candidate, bestLimit);
    addStat(bars, candidate.loopBars, candidate);
    if (Number.isFinite(candidate.bpm)) addStat(bpm, Math.floor(candidate.bpm / 10) * 10, candidate);
  }

  const groups = [...instruments.values()].sort((a, b) =>
    b.best - a.best || b.average - a.average || a.instrument.localeCompare(b.instrument));
  const rank = (values) => [...values].sort((a, b) => b.best - a.best || b.average - a.average);
  return {
    count,
    best,
    groups,
    bars: rank(bars.values()),
    bpm: rank(bpm.values()),
  };
}

import { describe, expect, it } from 'vitest';
import { Catalog } from '../src/library/catalog.js';
import { ROLE_BIT } from '../src/midi/director.js';
import { NEAR_SAME, likeness, diverseTop, durationFit, dynamicsFit, familyOf, fillFragmentKey, fillInstrumentKey, fillScoreBreakdown, markovRoleFit, preferSharedArrangementCandidate, preferredArrangementSource, rankFillCandidates, scoreFillCandidate, unseenFillCandidates, unseenFillFragments } from '../src/midi/fill.js';
import { FRAG, PART, fileRecord } from '../src/midi/features.js';
import { buildFillSummary } from '../src/midi/fill-summary.js';
import { parseMidi } from '../src/midi/parser.js';
import { smf, noteEvents } from './smf.js';

describe('Fill fragment scoring', () => {
  it('summarises scored fragments by instrument, bars and tempo', () => {
    const summary = buildFillSummary([
      { score: 0.9, instrument: 'Bass', program: 32, role: 'bass', loopBars: 4, bpm: 122 },
      { score: 0.7, instrument: 'Bass', program: 32, role: 'bass', loopBars: 8, bpm: 128 },
      { score: 0.8, instrument: 'Piano', program: 0, role: 'chords', loopBars: 4, bpm: 121 },
    ]);
    expect(summary.count).toBe(3);
    expect(summary.groups[0]).toMatchObject({ instrument: 'Bass', count: 2, best: 0.9 });
    expect(summary.best.map((candidate) => candidate.score)).toEqual([0.9, 0.8, 0.7]);
    expect(summary.bars[0]).toMatchObject({ key: 4, count: 2, best: 0.9 });
    expect(summary.bpm[0]).toMatchObject({ key: 120, count: 3, best: 0.9 });
  });

  it('does not list the same source fragment twice in Summary', () => {
    const fragment = {
      score: 0.9, path: 'D:\\Songs\\Piano.mid', ch: 1, atTick: 384, ticks: 1536,
      instrument: 'Piano', program: 0, role: 'chords', loopBars: 4, bpm: 160,
    };
    const summary = buildFillSummary([fragment, { ...fragment }, { ...fragment, atTick: 768 }]);
    expect(summary.count).toBe(2);
    expect(summary.best).toHaveLength(2);
    expect(summary.groups[0].count).toBe(2);
  });

  it('counts all eligible fragments at or above 70%, even beyond the displayed limit', () => {
    const make = (score, atTick) => ({
      score, path: 'D:\\Songs\\Bass.mid', ch: 1, atTick, ticks: 384,
      instrument: 'Bass', program: 32, role: 'bass', loopBars: 4, bpm: 120,
    });
    const summary = buildFillSummary([
      make(0.9, 0), make(0.7, 384), make(0.6999, 768),
      make(0.7, 384), make(0.8, 1152),
    ], { perInstrument: 1 });
    expect(summary.groups[0]).toMatchObject({ count: 4, goodCount: 3, best: 0.9 });
    expect(summary.groups[0].candidates).toHaveLength(1);
  });

  it('counts each instrument\'s fragments by what they play, for the role filter', () => {
    const make = (score, role, atTick) => ({
      score, path: 'D:\\Songs\\Piano.mid', ch: 1, atTick, ticks: 384,
      instrument: 'Piano', program: 0, role, loopBars: 4, bpm: 120,
    });
    const summary = buildFillSummary([make(0.9, 'chords', 0), make(0.6, 'chords', 384), make(0.8, 'melody', 768)]);
    const piano = summary.groups[0];
    expect(piano).toMatchObject({ count: 3, goodCount: 2 });
    expect(piano.roles.chords).toMatchObject({ count: 2, goodCount: 1 });
    expect(piano.roles.melody).toMatchObject({ count: 1, goodCount: 1 });
    expect(piano.roles.melody.candidates.map((c) => c.score)).toEqual([0.8]);
  });

  it('uses the requested 45/25/15/5/10 weights when all evidence is available', () => {
    const model = { songs: 1, start: Array(16).fill(0), next: Array.from({ length: 16 }, () => Array(16).fill(0)) };
    model.start[ROLE_BIT.drums] = 1;
    model.start[ROLE_BIT.drums | ROLE_BIT.bass] = 1;
    const scored = scoreFillCandidate(
      { loopBars: 4, fit: 0.4, velocity: 127, velocitySpread: 127, energy: 'busy', role: 'bass' },
      { bars: 4, dynamics: { mean: 0, spread: 0 }, notesPerBar: 0, model, haveMask: ROLE_BIT.drums },
    );
    expect(scored.score).toBeCloseTo(0.45 * 0.4 + 0.25 * 1 + 0.15 * 0 + 0.05 * 0 + 0.10 * 0.5);
  });

  it('explains unavailable measures and the actual redistributed weights', () => {
    const scored = scoreFillCandidate(
      { loopBars: 4, fit: 0.8, energy: 'medium', role: 'bass' },
      { bars: 4, dynamics: null, notesPerBar: 8, model: null, haveMask: 0 },
    );
    const dimensions = fillScoreBreakdown(scored);
    expect(dimensions.find((d) => d.key === 'dynamic')).toMatchObject({ value: null, weight: 0 });
    expect(dimensions.find((d) => d.key === 'markov')).toMatchObject({ value: null, weight: 0 });
    expect(dimensions.find((d) => d.key === 'fit').weight).toBeCloseTo(0.45 / 0.75);
    expect(dimensions.reduce((sum, d) => sum + (d.value ?? 0) * d.weight, 0)).toBeCloseTo(scored.score);
    expect(fillScoreBreakdown({}).every((d) => d.value === null && d.weight === 0)).toBe(true);
  });

  it('stores MIDI velocity mean and variation on each indexed fragment', () => {
    const notes = Array.from({ length: 8 }, (_, bar) => [
      [bar * 384, 36, 24, 40],
      [bar * 384 + 96, 38, 24, 60],
      [bar * 384 + 192, 36, 24, 80],
      [bar * 384 + 288, 38, 24, 100],
    ]).flat();
    const record = fileRecord('D:\\drum-pattern.mid', parseMidi(smf(0, 96, [noteEvents(9, notes)])));
    const entry = record.parts[0];
    const fragment = entry[PART.frags].find((f) => f[FRAG.bars] === 1);
    expect(fragment.slice(FRAG.velocity, FRAG.velocitySpread + 1)).toEqual([70, 22]);

    const catalog = new Catalog();
    catalog.addFile(record);
    const part = catalog.part(catalog.fragmentIds(0).find((id) => catalog.part(id).loopBars === 1));
    expect(part).toMatchObject({ velocity: 70, velocitySpread: 22 });
  });

  it('prefers fragments matching the loop duration, then those that repeat whole', () => {
    expect(durationFit(16, 16)).toBe(1);
    expect(durationFit(8, 16)).toBeCloseTo(0.9);
    expect(durationFit(4, 16)).toBeCloseTo(0.8);
    expect(durationFit(0, 16)).toBeNull();
    // 12 bars: 4 three times and 6 twice go in whole; 8 is cut on its second turn, 16 at its end.
    expect(durationFit(4, 12)).toBeGreaterThan(durationFit(16, 12));
    expect(durationFit(6, 12)).toBeGreaterThan(durationFit(4, 12));
    expect(durationFit(16, 12)).toBeGreaterThan(durationFit(8, 12));
    expect(durationFit(1, 12)).toBeGreaterThanOrEqual(0.5);   // whole, however many times: still taken
    expect(durationFit(5, 12)).toBeLessThan(0.5);             // cut and short: not taken
  });

  it('compares average velocity and its variation with the current loop', () => {
    expect(dynamicsFit({ velocity: 80, velocitySpread: 20 }, { mean: 80, spread: 20 })).toBe(1);
    expect(dynamicsFit({ velocity: 40, velocitySpread: 0 }, { mean: 80, spread: 20 })).toBeLessThan(1);
    expect(dynamicsFit({ velocity: 80, velocitySpread: 20 }, null)).toBeNull();
  });

  it('does not count against a part a level the Velocity menu sets right; its shape counts', () => {
    // Softer or louder within ×0.6–×1.4, the same shape once scaled: as good as one at the loop's level.
    expect(dynamicsFit({ velocity: 75, velocitySpread: 10 }, { mean: 103, spread: 13.7 })).toBeCloseTo(1, 2);
    expect(dynamicsFit({ velocity: 140, velocitySpread: 20 }, { mean: 100, spread: 14.3 })).toBeCloseTo(1, 2);
    // Beyond the menu's reach it does count, more the further it is.
    const half = dynamicsFit({ velocity: 50, velocitySpread: 0 }, { mean: 103.6, spread: 3.5 });
    const third = dynamicsFit({ velocity: 34, velocitySpread: 0 }, { mean: 103.6, spread: 3.5 });
    expect(half).toBeLessThan(1);
    expect(third).toBeLessThan(half);
    // A flat part against an expressive one (or the other way round): the shape differs.
    expect(dynamicsFit({ velocity: 80, velocitySpread: 0 }, { mean: 80, spread: 25 })).toBeLessThan(0.5);
  });

  it('offers varied alternatives: other groups first among those nearly as good, the best always first', () => {
    const c = (name, score, group) => ({ name, score, group });
    const ranked = [c('a', 0.91, 'guitar'), c('b', 0.91, 'guitar'), c('c', 0.905, 'guitar'), c('d', 0.90, 'pad'), c('e', 0.89, 'strings'), c('f', 0.70, 'organ')];
    const names = (list) => list.map((x) => x.name).join('');
    expect(names(diverseTop(ranked, 4, (x) => x.group))).toBe('adeb');
    // Far below the best: taken as it comes, not before one nearly as good.
    expect(names(diverseTop(ranked, 6, (x) => x.group))).toBe('adebcf');
    // Groups already in (the song of the one chosen) count as taken.
    expect(names(diverseTop(ranked, 2, (x) => x.group, { taken: ['guitar'] }))).toBe('de');
    expect(familyOf({ role: 'chords', program: 26 })).toBe(familyOf({ role: 'melody', program: 24 }));
    expect(familyOf({ role: 'drums', program: 0 })).toBe('drums');
  });

  it('tells another transcription of the same notes from a different part', () => {
    const C = 1, E = 1 << 4, G = 1 << 7, A = 1 << 9;
    const a = Uint16Array.from([C | E | G, 0, C | E | G, 0, E, G, C, E, G, C]);
    const nearly = Uint16Array.from([C | E | G, 0, C | E | G, 0, E, G, C, E, G, C | A]);
    const other = Uint16Array.from([A, A, 0, 0, A, C | E, 0, A, 0, E]);
    expect(likeness(a, a)).toBe(1);
    expect(likeness(a, nearly)).toBeGreaterThanOrEqual(NEAR_SAME);
    expect(likeness(a, other)).toBeLessThan(0.3);
    expect(likeness(a, a.subarray(0, 8))).toBe(0);
  });

  it('uses learned role co-occurrence as a prior and ranks exact-length fragments first', () => {
    const model = {
      songs: 1,
      start: Array.from({ length: 16 }, () => 0),
      next: Array.from({ length: 16 }, () => Array.from({ length: 16 }, () => 0)),
    };
    model.start[ROLE_BIT.drums | ROLE_BIT.bass] = 4;
    model.start[ROLE_BIT.drums | ROLE_BIT.bass | ROLE_BIT.melody] = 8;
    expect(markovRoleFit(model, ROLE_BIT.drums | ROLE_BIT.bass, 'melody')).toBeCloseTo(2 / 3);

    const ranked = rankFillCandidates([
      { loopBars: 4, velocity: 80, velocitySpread: 10, energy: 'medium', fit: 0.9, role: 'melody' },
      { loopBars: 16, velocity: 80, velocitySpread: 10, energy: 'medium', fit: 0.9, role: 'melody' },
    ], {
      bars: 16,
      dynamics: { mean: 80, spread: 10 },
      notesPerBar: 8,
      model,
      haveMask: ROLE_BIT.drums | ROLE_BIT.bass,
    });
    expect(ranked[0].loopBars).toBe(16);
    expect(ranked[0].duration).toBe(1);
    expect(ranked[1].duration).toBeCloseTo(0.8);
  });

  it('does not suggest an instrument again after its previous suggestion was removed', () => {
    const candidates = [
      { program: 0, role: 'melody', score: 0.9 },
      { program: 32, role: 'bass', score: 0.8 },
    ];
    const suggested = new Set([fillInstrumentKey(candidates[0])]);

    expect(unseenFillCandidates(candidates, suggested)).toEqual([candidates[1]]);
    suggested.add(fillInstrumentKey(candidates[1]));
    expect(unseenFillCandidates(candidates, suggested)).toEqual([]);
  });

  it('tracks replacement suggestions by source fragment and selected region', () => {
    const candidate = { path: 'D:\\Library\\Bass.mid', ch: 1, atTick: 384, ticks: 1536 };
    const alternate = { ...candidate, atTick: 1920 };
    const suggested = new Set([`2|38|4|8|${fillFragmentKey(candidate)}`]);
    const candidates = [
      { ...candidate, replacementKey: `2|38|4|8|${fillFragmentKey(candidate)}` },
      { ...alternate, replacementKey: `2|38|4|8|${fillFragmentKey(alternate)}` },
    ];

    expect(unseenFillFragments(candidates, suggested)).toEqual([candidates[1]]);
  });

  it('lets Daring increase the influence of a less common Markov role', () => {
    const model = {
      songs: 1,
      start: Array.from({ length: 16 }, () => 0),
      next: Array.from({ length: 16 }, () => Array.from({ length: 16 }, () => 0)),
    };
    model.start[ROLE_BIT.drums | ROLE_BIT.bass] = 4;
    model.start[ROLE_BIT.drums | ROLE_BIT.bass | ROLE_BIT.melody] = 8;
    const candidate = { loopBars: 4, velocity: 80, velocitySpread: 10, energy: 'medium', fit: 0.8, role: 'melody' };
    const context = { bars: 4, dynamics: { mean: 80, spread: 10 }, notesPerBar: 8, model, haveMask: ROLE_BIT.drums | ROLE_BIT.bass };

    expect(scoreFillCandidate(candidate, { ...context, daring: 1.8 }).markov)
      .toBeGreaterThan(scoreFillCandidate(candidate, { ...context, daring: 0.6 }).markov);
  });

  it('favors a common source song across arrangement fragments when its fit is close', () => {
    const groups = [
      [{ path: 'D:\\A.mid', score: 0.9 }, { path: 'D:\\B.mid', score: 0.85 }],
      [{ path: 'D:\\A.mid', score: 0.9 }, { path: 'D:\\C.mid', score: 0.95 }],
    ];
    const source = preferredArrangementSource(groups);
    expect(source).toBe('d:\\a.mid');
    expect(preferSharedArrangementCandidate(groups[1], source)).toBe(groups[1][0]);
    expect(preferSharedArrangementCandidate([{ path: 'D:\\A.mid', score: 0.7 }, { path: 'D:\\C.mid', score: 0.9 }], source)).toBeNull();
  });
});

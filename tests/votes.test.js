import { describe, expect, it } from 'vitest';
import { J, R, jointScore, rhythmScore } from '../src/midi/rhythm.js';
import { PRIOR_VOTES, castVote, learnWeights, mergeVotes, readVotes, removeVote, voteLearnable, voteOf, votesFile } from '../src/midi/votes.js';
import { MUSIC_PER_BEAT, addRow, clearBars, loopGrid, loopHits, loopMusic, newLoop, placeClip } from '../src/midi/loop.js';
import { harmonyFit } from '../src/midi/harmony.js';
import { rhythmFeatures } from '../src/midi/rhythm.js';

const fragment = (over = {}) => ({ path: 'D:\\midi\\A.mid', ch: 2, atTick: 960, ticks: 3840, role: 'bass', program: 33, instrument: 'Electric Bass (finger)', ...over });
const harmony = { clash: 0.1, chroma: 0.7, cover: 0.8 };
const rhythm = { hit: 0.9, cover: 0.5, beat: 0.95, accent: 0.8, bar: 0.7, density: 0.4 };
const measured = (over = {}) => ({ score: 0.84, harmony, rhythm, ...over });

describe('a vote', () => {
  it('keeps what was measured of the fragment, which fragment it was and the vote', () => {
    const v = voteOf(fragment(), measured(), 1, { fp: '10:abc', moved: 3, at: '2026-11-11T10:00:00.000Z' });
    expect(v).toMatchObject({ vote: 1, path: 'D:\\midi\\A.mid', ch: 2, atTick: 960, ticks: 3840, fp: '10:abc', role: 'bass', score: 0.84, moved: 3 });
    expect(v.features).toEqual({ clash: 0.1, chroma: 0.7, harmonyCover: 0.8, hit: 0.9, cover: 0.5, beat: 0.95, accent: 0.8, bar: 0.7, density: 0.4 });
    expect(voteOf(fragment(), measured(), -1).vote).toBe(-1);
  });

  it('is the same vote for the same fragment over the same music, another over other music', () => {
    const a = voteOf(fragment(), measured(), 1);
    expect(voteOf(fragment({ path: 'd:\\MIDI\\a.mid' }), measured(), -1).id).toBe(a.id);
    expect(voteOf(fragment(), measured({ rhythm: { ...rhythm, hit: 0.2 } }), 1).id).not.toBe(a.id);
    expect(voteOf(fragment({ atTick: 0 }), measured(), 1).id).not.toBe(a.id);
  });

  it('cannot be cast on what was not measured; drums need no notes', () => {
    expect(voteOf(fragment(), { score: 0.7, harmony, rhythm: null }, 1)).toBeNull();
    expect(voteOf(fragment(), { score: 0.7, harmony: null, rhythm }, 1)).toBeNull();
    const kit = voteOf(fragment({ role: 'drums' }), { score: 0.7, harmony: null, rhythm }, 1);
    expect(Object.keys(kit.features)).toEqual(['hit', 'cover', 'beat', 'accent', 'bar', 'density']);
  });

  it('can preserve a selected Fill vote without inventing missing measures', () => {
    const partial = voteOf(fragment(), null, 1, { allowPartial: true });
    expect(partial.features).toEqual({});
    expect(partial.score).toBeNull();
    expect(voteLearnable(partial)).toBe(false);
    expect(learnWeights([partial]).pitched).toBe(0);
    expect(readVotes(JSON.stringify(votesFile([partial])))).toEqual([partial]);
    expect(voteOf(fragment(), null, -1, { allowPartial: true }).id).toBe(partial.id);
    expect(voteOf(fragment(), measured(), 1, { allowPartial: true }).id).not.toBe(partial.id);

    const rhythmOnly = voteOf(fragment(), measured({ harmony: null }), -1, { allowPartial: true });
    expect(rhythmOnly.features).toEqual(rhythm);
    expect(voteLearnable(rhythmOnly)).toBe(false);
    expect(voteLearnable(voteOf(fragment({ role: 'drums' }), measured({ harmony: null }), 1))).toBe(true);
  });

  it('can measure replaced selected rows against the other new rows', () => {
    const loop = { ...newLoop(), length: 1, key: '0 mayor' };
    const piano = addRow(loop, { program: 0, drums: false, name: 'Piano' });
    const bass = addRow(loop, { program: 33, drums: false, name: 'Bass' });
    const clip = (pitch) => ({ name: 'x', key: '0 mayor', bars: 1, notes: [
      { beat: 0, len: 1, pitch, vel: 100 }, { beat: 2, len: 1, pitch, vel: 100 },
    ] });
    placeClip(piano, 0, clip(60));
    placeClip(bass, 0, clip(48));
    const emptied = { ...loop, rows: loop.rows.map((row) => ({ ...row, clips: new Map(row.clips), off: [...row.off] })) };
    for (const row of emptied.rows) clearBars(row, 0, 1);
    expect(loopGrid(emptied)).toBeNull();
    expect(loopHits(emptied)).toBeNull();

    const contextGrid = loopGrid(loop, { except: piano });
    const contextHits = loopHits(loop, { except: piano });
    const ownGrid = loopGrid({ ...loop, rows: [piano] });
    const ownHits = loopHits({ ...loop, rows: [piano] });
    const h = harmonyFit(contextGrid.grid, ownGrid.grid, 0, contextGrid.stepsPerBar);
    const r = rhythmFeatures(contextHits.hits, ownHits.hits, contextHits.hitsPerBar);
    const vote = voteOf(fragment(), { score: 0.8, harmony: h, rhythm: r }, 1);
    expect(voteLearnable(vote)).toBe(true);
    expect(learnWeights([vote]).pitched).toBe(1);
  });
});

describe('the notes kept with a vote', () => {
  const clip = (notes, over = {}) => ({ name: 'x', key: '0 mayor', bars: 1, notes: notes.map(([beat, pitch, len = 0.5, vel = 100]) => ({ beat, len, pitch, vel })), ...over });

  it('are the loop as it sounds: each row, its own told apart, shifted, without muted rows or pads off', () => {
    const loop = { ...newLoop(), length: 2, key: '0 mayor' };
    const piano = addRow(loop, { program: 0, drums: false, name: 'Piano' });
    placeClip(piano, 0, clip([[0, 60], [2, 64, 4]]));   // the second rings past its bar: cut there
    const bass = addRow(loop, { program: 33, drums: false, name: 'Bass' });
    placeClip(bass, 0, clip([[1 / 3, 36]], { shift: 2 }));
    placeClip(bass, 1, clip([[0, 36]]));
    const kit = addRow(loop, { program: 0, drums: true, name: 'Drums' });
    placeClip(kit, 1, clip([[1, 38, 0.25, 90]], { shift: 5 }));
    addRow(loop, { program: 48, drums: false, name: 'Empty' });
    const m = loopMusic(loop, bass);
    expect(m).toMatchObject({ per: MUSIC_PER_BEAT, bpm: loop.bpm, key: '0 mayor', beatsPerBar: 4, bars: 2, own: 2 });
    // In the loop's order of rows (the drums go first).
    expect(m.rows).toEqual([
      { drums: true, program: 0, notes: [480, 24, 38, 90] },
      { drums: false, program: 0, notes: [0, 48, 60, 100, 192, 192, 64, 100] },
      { drums: false, program: 33, notes: [32, 48, 38, 100, 384, 48, 36, 100] },
    ]);
    bass.off.push(1);
    piano.mute = true;
    const less = loopMusic(loop, bass);
    expect(less.rows.map((r) => r.notes.length / 4)).toEqual([1, 1]);
    expect(less.own).toBe(1);
    bass.mute = true;
    expect(loopMusic(loop, bass).own).toBe(1);   // its own row is kept though muted
    expect(loopMusic(loop).rows).toHaveLength(1);
  });

  it('go in the vote, to the file and back, and leave its measures and its id as they were', () => {
    const music = { per: 96, bpm: 120, key: '0 mayor', beatsPerBar: 4, bars: 1, own: 0, rows: [{ drums: false, program: 33, notes: [0, 48, 36, 100] }] };
    const bare = voteOf(fragment(), measured(), 1, { at: '2026-11-11T10:00:00.000Z' });
    const full = voteOf(fragment(), measured(), 1, { at: '2026-11-11T10:00:00.000Z', music });
    expect(bare).not.toHaveProperty('music');
    expect(full.music).toEqual(music);
    expect(full.id).toBe(bare.id);
    expect(readVotes(JSON.stringify(votesFile([full])))).toEqual([full]);
    expect(learnWeights([full]).J).toEqual(learnWeights([bare]).J);
  });
});

describe('the list of votes', () => {
  const a = voteOf(fragment(), measured(), 1, { at: '2026-11-11T10:00:00.000Z' });
  const b = voteOf(fragment({ atTick: 0 }), measured(), -1, { at: '2026-11-11T11:00:00.000Z' });

  it('holds one vote for each: cast again it replaces, removed it is gone', () => {
    let votes = castVote(castVote([], a), b);
    expect(votes).toHaveLength(2);
    votes = castVote(votes, { ...a, vote: -1 });
    expect(votes.map((v) => v.vote)).toEqual([-1, -1]);
    expect(removeVote(votes, a.id).map((v) => v.id)).toEqual([b.id]);
  });

  it('is saved to a file and read back; two lists make one, the latest of each vote', () => {
    const text = JSON.stringify(votesFile([a, b]));
    expect(readVotes(text)).toEqual([a, b]);
    expect(() => readVotes('{"app":"other"}')).toThrow(/not a list of votes/);
    expect(() => readVotes('nonsense')).toThrow(/not a list of votes/);
    const later = { ...a, vote: -1, at: '2026-11-12T09:00:00.000Z' };
    const merged = mergeVotes([a, b], [later]);
    expect(merged).toHaveLength(2);
    expect(merged.find((v) => v.id === a.id).vote).toBe(-1);
    expect(mergeVotes([later], [a]).find((v) => v.id === a.id).vote).toBe(-1);
  });
});

describe('the marks learned from the votes', () => {
  /** `n` votes: 👍 on fragments that divide the beat as the others (beat high), 👎 on those that do not, whatever their notes. */
  const taste = (n, role = 'bass') => Array.from({ length: n }, (_, k) => {
    const liked = k % 2 === 0;
    const r = { ...rhythm, beat: liked ? 0.9 + (k % 5) / 100 : 0.3 + (k % 7) / 100, hit: 0.5 + (k % 3) / 10 };
    const h = { clash: (k % 4) / 10, chroma: 0.5 + (k % 6) / 20, cover: 0.7 };
    return voteOf(fragment({ atTick: k, role }), { score: 0.5, harmony: role === 'drums' ? null : h, rhythm: r }, liked ? 1 : -1);
  });

  it('are the factory ones with no votes', () => {
    const got = learnWeights([]);
    expect(got.J).toEqual(J);
    expect(got.R).toEqual(R);
    expect([got.pitched, got.drums]).toEqual([0, 0]);
  });

  it('move a little with a few votes and more with many, towards what the user likes', () => {
    const few = learnWeights(taste(6));
    const many = learnWeights(taste(PRIOR_VOTES * 6));
    expect(many.pitched).toBe(PRIOR_VOTES * 6);
    expect(few.J.beat).toBeGreaterThan(J.beat);
    expect(many.J.beat - J.beat).toBeGreaterThan((few.J.beat - J.beat) * 3);
    expect(many.R).toEqual(R);   // no vote on drums: theirs as they were
    // The same notes: the fragment with the rhythm liked is marked further above the other than before.
    const liked = { ...rhythm, beat: 0.92 }, disliked = { ...rhythm, beat: 0.32 };
    const gap = (w) => jointScore(harmony, liked, w) - jointScore(harmony, disliked, w);
    expect(gap(many.J)).toBeGreaterThan(gap(J));
  });

  it('keep drums and pitched apart, and are as before once the votes are removed', () => {
    const votes = [...taste(40), ...taste(40, 'drums')];
    const got = learnWeights(votes);
    expect([got.pitched, got.drums]).toEqual([40, 40]);
    expect(got.R.beat).toBeGreaterThan(R.beat);
    expect(rhythmScore({ ...rhythm, beat: 0.95 }, got.R)).toBeGreaterThan(rhythmScore({ ...rhythm, beat: 0.3 }, got.R));
    let left = votes;
    for (const v of votes) left = removeVote(left, v.id);
    expect(learnWeights(left).J).toEqual(J);
    // A vote changed: the same as if it had been cast that way from the start.
    const changed = castVote(votes, { ...votes[0], vote: -1 });
    const fresh = [...votes.slice(1), { ...votes[0], vote: -1 }];
    expect(learnWeights(changed).J.beat).toBeCloseTo(learnWeights(fresh).J.beat, 10);
  });
});

import { describe, expect, it } from 'vitest';
import { smf, noteEvents } from './smf.js';
import { parseMidi } from '../src/midi/parser.js';
import { FRAG, PART, fileRecord } from '../src/midi/features.js';
import { HITS_PER_BEAT, hitGrid, jointScore, packHits, rhythmFeatures, rhythmScore, strikes, unpackHits } from '../src/midi/rhythm.js';
import { addRow, loopHits, newLoop, placeClip } from '../src/midi/loop.js';
import { Catalog } from '../src/library/catalog.js';
import { analysisFile, encodeAnalysis, readAnalysis } from '../src/library/backup.js';
import { sessionTarget } from '../src/midi/session-fit.js';

const BAR = 4 * HITS_PER_BEAT;   // steps of a 4/4 bar
/** `bars` bars with a strike on each of these beats of the bar. */
const pattern = (beats, bars = 2) => hitGrid(Array.from({ length: bars }, (_, b) => beats.map((x) => b * 4 + x)).flat(), bars * BAR);
const straight = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5];
const swung = [0, 2 / 3, 1, 5 / 3, 2, 8 / 3, 3, 11 / 3];

describe('where notes strike', () => {
  it('is a step for each 12th of a beat: 16ths and triplets both fall on one', () => {
    const hits = hitGrid([0, 0.25, 1 / 3, 1, -1, 99], BAR);
    expect([...hits].flatMap((h, k) => (h ? [k] : []))).toEqual([0, 3, 4, 12]);
    expect(strikes(hits)).toBe(true);
    expect(strikes(new Uint8Array(8))).toBe(false);
  });

  it('is kept as bits and read back the same', () => {
    const hits = pattern(swung, 3).subarray(0, 100);
    const bytes = packHits(hits);
    expect(bytes).toHaveLength(13);
    expect([...unpackHits(bytes, 100)]).toEqual([...hits]);
  });
});

describe('how a rhythm goes over what plays', () => {
  it('is all one with itself, and apart from a swung one over a straight one', () => {
    const same = rhythmFeatures(pattern(straight), pattern(straight), BAR);
    expect(same).toMatchObject({ hit: 1, cover: 1, density: 0 });
    expect(same.beat).toBeCloseTo(1);
    expect(same.bar).toBeGreaterThan(0.8);   // not 1: the context counts half a step either side too
    const apart = rhythmFeatures(pattern(straight), pattern(swung), BAR);
    expect(apart.beat).toBeLessThan(0.6);
    expect(apart.hit).toBeLessThan(0.6);
    expect(apart.bar).toBeLessThan(same.bar);
  });

  it('goes round a shorter fragment until the context ends, and tells how far apart they are in strikes', () => {
    const f = rhythmFeatures(pattern([0, 1, 2, 3], 4), pattern([0, 2], 1), BAR);
    expect(f.hit).toBe(1);
    expect(f.cover).toBe(0.5);
    expect(f.density).toBeCloseTo(1);   // half as many: an octave
  });

  it('cannot be told when they never strike in the same bar', () => {
    const ctx = hitGrid([0, 1], 2 * BAR);
    const cand = hitGrid([4, 5], 2 * BAR);
    expect(rhythmFeatures(ctx, cand, BAR)).toBeNull();
    expect(rhythmFeatures(new Uint8Array(BAR), pattern(straight, 1), BAR)).toBeNull();
  });

  it('marks higher the rhythm that divides the beat as the others do', () => {
    const ctx = pattern(straight, 4);
    const h = { clash: 0, chroma: 0.8, cover: 0.9 };
    const good = rhythmFeatures(ctx, pattern([0, 1, 1.5, 2, 3, 3.5], 4), BAR);
    const bad = rhythmFeatures(ctx, pattern([1 / 3, 2 / 3, 4 / 3, 7 / 3, 8 / 3, 10 / 3], 4), BAR);
    expect(rhythmScore(good)).toBeGreaterThan(rhythmScore(bad));
    expect(jointScore(h, good)).toBeGreaterThan(jointScore(h, bad));
    // The same rhythm, notes that clash: lower.
    expect(jointScore(h, good)).toBeGreaterThan(jointScore({ clash: 0.6, chroma: 0.2, cover: 0.3 }, good));
  });
});

describe('the rhythms the add-on keeps', () => {
  // Two bars of a C chord on beats 1 and 2 then two of rest, twice; drums on every beat.
  const chord = [0, 4 * 384].flatMap((t) => [60, 64, 67].flatMap((p) => [[t, p, 380], [t + 384, p, 380]]));
  const drums = Array.from({ length: 32 }, (_, k) => [k * 96, 36, 24]);
  const record = () => fileRecord('D:\\midi\\x.mid', parseMidi(smf(1, 96, [noteEvents(0, chord), noteEvents(9, drums)])));

  it('a file record has one for each fragment over its whole bars, drums too', () => {
    const r = record();
    const kit = r.parts.find((p) => p[PART.ch] === 10)[PART.frags][0];
    expect(r.ppq).toBe(96);
    expect(kit[FRAG.hitSteps]).toBe(kit[FRAG.bars] * BAR);
    const hits = unpackHits(kit[FRAG.hits], kit[FRAG.hitSteps]);
    expect([...hits].flatMap((h, k) => (h ? [k] : [])).slice(0, 4)).toEqual([0, 12, 24, 36]);
    expect(kit[FRAG.events]).toBeInstanceOf(Uint32Array);
    expect(kit[FRAG.events].length % 3).toBe(0);
    expect([...kit[FRAG.events].subarray(0, 3)]).toEqual([0, 24, 36 | (100 << 8)]);
    const piano = r.parts.find((p) => p[PART.ch] === 1)[PART.frags][0];
    expect(piano[FRAG.hits]).toBeInstanceOf(Uint8Array);
    expect(piano[FRAG.hitSteps]).toBe(piano[FRAG.bars] * BAR);
    expect(piano[FRAG.events]).toBeInstanceOf(Uint32Array);
    expect(piano[FRAG.events][2]).toBe(60 | (100 << 8));
  });

  it('the catalogue gives them back, also from a saved analysis', () => {
    const r = { ...record(), fp: '1:00000001' };
    for (const files of [[r], readAnalysis(encodeAnalysis(analysisFile('D:\\midi', [r]))).files]) {
      const c = new Catalog();
      for (const f of files) c.addFile(f);
      const [kit] = c.query({ role: 'drums' });
      const got = c.hits(kit);
      expect(got.stepsPerBar).toBe(BAR);
      expect(got.steps).toBe(c.part(kit).loopBars * BAR);
      expect([...got.hits].flatMap((h, k) => (h ? [k] : [])).slice(0, 3)).toEqual([0, 12, 24]);
      expect(c.gestureScore(kit, 'kick')).toBe(1);
      const [piano] = c.query({ role: 'chords' }).concat(c.query({ role: 'melody' }));
      expect(c.hits(piano).steps).toBeGreaterThan(0);
      expect(c.gestureScore(piano, 'arpeggio')).toBe(0);
    }
  });

  it('a loop has one of what all its rows strike, without muted rows or pads off', () => {
    const loop = { ...newLoop(), length: 2, key: '0 mayor' };
    const row = addRow(loop, { program: 0, drums: false, name: 'Piano' });
    const clip = (beats) => ({ name: 'x', key: '0 mayor', bars: 1, notes: beats.map((beat) => ({ beat, len: 0.5, pitch: 60, vel: 100 })) });
    placeClip(row, 0, clip([0, 2]));
    const kit = addRow(loop, { program: 0, drums: true, name: 'Drums' });
    placeClip(kit, 1, clip([1]));
    const { hits, hitsPerBar } = loopHits(loop);
    expect(hitsPerBar).toBe(BAR);
    expect([...hits].flatMap((h, k) => (h ? [k] : []))).toEqual([0, 24, BAR + 12]);
    expect([...loopHits(loop, { except: kit }).hits].flatMap((h, k) => (h ? [k] : []))).toEqual([0, 24]);
    kit.off.push(1);
    row.mute = true;
    expect(loopHits(loop)).toBeNull();
  });

  it('a LUNA session has one too: its MIDI notes and its audio hits', () => {
    const got = sessionTarget([
      { name: 'Keys', drums: false, notes: [{ beat: 0, len: 2, pitch: 60, vel: 90 }, { beat: 2, len: 2, pitch: 64, vel: 90 }] },
      { name: 'Kick', audio: true, role: 'drums', onsets: [1, 3] },
    ], { perBar: 4, bars: 1 });
    expect(got.target.hitsPerBar).toBe(BAR);
    expect([...got.target.hits].flatMap((h, k) => (h ? [k] : []))).toEqual([0, 12, 24, 36]);
  });
});

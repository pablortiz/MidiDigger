// How well a fragment's rhythm goes with what already plays, told from where its notes strike.
//
// A stretch of music is kept as its strikes: for every step of its bars (HITS_PER_BEAT a quarter
// note: 16ths and triplets both fall on a step), 1 where a note starts. The catalogue keeps one
// per fragment, drums too, a bit a step; a loop's is worked out from its pads as they sound.
//
// A fragment (the candidate) is measured over a context (the other instruments) by six numbers:
//   hit      the share of its strikes that fall with one of the context (a step either side counts)
//   cover    the share of the context's strikes that it strikes too
//   beat     how alike they divide the beat: where in it their strikes fall (straight, swung, triplets)
//   accent   how alike they fill the bar: how often each place of the bar is struck
//   bar      the same bar by bar, then the mean: do they move together
//   density  how far apart their strikes a bar are, in octaves (twice as many: 1)
// and these are joined into one, the chance that the two were written to go together:
//   drums:        rhythm = 1 / (1 + exp(-(R.bias + R.hit·hit + … + R.density·density)))
//   with pitch:   fit = 1 / (1 + exp(-(J.bias + J.clash·clash + J.chroma·chroma + J.cover·cover
//                                      + J.hit·hit + … + J.density·density)))
//                 the three numbers of its notes (midi/harmony.js) and the six of its rhythm at once.
//
// Where the weights come from (.dev/joint-study.mjs): as in harmony.js, the library says what goes
// together. A channel of a song over the song's other channels is a real case; a fragment of the
// same role of another song at a similar tempo, put there, is a random one. Notes and rhythm see
// different things (their marks hardly go together: correlation 0.02 on random cases), so the two
// at once tell more than either. The study prints the weights with the songs, the seed and the
// figures on songs it did not learn from; run it again to change them.

export const HITS_PER_BEAT = 12;
export const RHYTHM_NAMES = ['hit', 'cover', 'beat', 'accent', 'bar', 'density'];

/** Learned by .dev/joint-study.mjs (see RHYTHM_MODEL for the run). Drums: the rhythm alone. */
export const R = { bias: -3.904, hit: 0.722, cover: 1.041, beat: 3.694, accent: -1.786, bar: 1.819, density: 0.140 };
/** With pitch: notes (harmony.js names its three) and rhythm together. */
export const J = { bias: -4.320, clash: -3.524, chroma: 4.524, harmonyCover: 0.145, hit: 0.078, cover: 0.055, beat: 2.880, accent: -1.089, bar: 2.452, density: 0.233 };
export const RHYTHM_MODEL = { songs: 3000, seed: 1, aucDrums: 0.729, aucPitched: 0.864, date: '2026-11-11', library: 'D:/midi, songs at random (82 932 files)' };
/**
 * Marks from which a fragment fits (amber) and fits well (green). In that run, on songs not
 * learned from, against fragments of the same role and a similar tempo of other songs:
 *   with pitch (J)  0.8 is reached by 46 % of the real cases and 3.4 % of the random ones; 0.9 by
 *                   22 % and 0.7 %. The notes alone (harmony.js, AUC 0.832 there) let through as
 *                   many real ones with 5.2 % and 1.1 % of the random: a third fewer strangers.
 *   drums (R)       0.6 is reached by 55 % and 23 %; 0.7 by 23 % and 8 % (AUC 0.729: a rhythm says
 *                   less than notes do, but the groove it replaces said 0.57).
 * Trying the twelve keys and keeping the best was measured too and is worse (AUC 0.752 against
 * 0.832): every stranger gets twelve chances. The key told is the one used.
 */
export const RHYTHM_OK = 0.6;
export const RHYTHM_GOOD = 0.7;
export const JOINT_OK = 0.8;
export const JOINT_GOOD = 0.9;

/**
 * The strikes of `steps` steps from where notes start (`beats`: quarter notes from the start;
 * fractions go to the nearest step): a Uint8Array, 1 where one does. Those outside are left out.
 */
export function hitGrid(beats, steps) {
  const hits = new Uint8Array(Math.max(0, Math.round(steps)));
  for (const beat of beats) {
    const at = Math.round(beat * HITS_PER_BEAT);
    if (at >= 0 && at < hits.length) hits[at] = 1;
  }
  return hits;
}

/** Strikes as bits, eight steps a byte (the first in the lowest bit): how they are kept. */
export function packHits(hits) {
  const bytes = new Uint8Array(Math.ceil(hits.length / 8));
  for (let k = 0; k < hits.length; k++) if (hits[k]) bytes[k >> 3] |= 1 << (k & 7);
  return bytes;
}

/** The `steps` strikes kept in `bytes` (packHits), into `out` when given (as long at least). */
export function unpackHits(bytes, steps, out = new Uint8Array(steps)) {
  for (let k = 0; k < steps; k++) out[k] = (bytes[k >> 3] >> (k & 7)) & 1;
  return out;
}

/** Does it strike at all? */
export const strikes = (hits) => !!hits && hits.some((h) => h);

const cosine = (a, b) => {
  let ab = 0, aa = 0, bb = 0;
  for (let k = 0; k < a.length; k++) { ab += a[k] * b[k]; aa += a[k] * a[k]; bb += b[k] * b[k]; }
  return aa && bb ? ab / Math.sqrt(aa * bb) : 0;
};
const beatC = new Float64Array(HITS_PER_BEAT);
const beatX = new Float64Array(HITS_PER_BEAT);
let barC = new Float64Array(64);   // kept between calls: half a million fragments are measured in a row
let barX = new Float64Array(64);

/**
 * The six numbers of `cand` played over `ctx` (strikes, as hitGrid gives them), the candidate
 * going round until the context ends (`candSteps` of it, all by default); `stepsPerBar` of both.
 * { hit, cover, beat, accent, bar, density }, or null when they share no bar where both strike.
 */
export function rhythmFeatures(ctx, cand, stepsPerBar, candSteps = cand?.length) {
  const n = ctx?.length;
  if (!n || !candSteps || !(stepsPerBar > 0)) return null;
  if (barC.length < stepsPerBar) { barC = new Float64Array(stepsPerBar); barX = new Float64Array(stepsPerBar); }
  beatC.fill(0);
  beatX.fill(0);
  barC.fill(0, 0, stepsPerBar);
  barX.fill(0, 0, stepsPerBar);
  let nc = 0, nx = 0, hit = 0, cover = 0, sum = 0, bars = 0;
  // The candidate's step before, at and after the context's, each going round on its own.
  let j = 0, beat = 0;
  let prev = 0, c = cand[0], next = cand[1 % candSteps];
  for (let from = 0; from < n; from += stepsPerBar) {
    const until = Math.min(n, from + stepsPerBar);
    let ab = 0, aa = 0, bb = 0;
    for (let k = from; k < until; k++) {
      const x = ctx[k];
      const before = k > from ? ctx[k - 1] : 0;
      const after = k + 1 < until ? ctx[k + 1] : 0;
      if (c) {
        nc++;
        if (x || (k && ctx[k - 1]) || ctx[k + 1]) hit++;
        beatC[beat]++;
        barC[k - from]++;
        aa++;
      }
      if (x) {
        nx++;
        if (c || (k && prev) || (k + 1 < n && next)) cover++;
        beatX[beat]++;
        barX[k - from]++;
      }
      // A step either side counts half: the context spread to its neighbours within the bar.
      const wide = x ? 1 : before || after ? 0.5 : 0;
      if (c) ab += wide;
      bb += wide * wide;
      if (++beat === HITS_PER_BEAT) beat = 0;
      if (++j === candSteps) j = 0;
      prev = c;
      c = next;
      next = cand[j + 1 === candSteps ? 0 : j + 1];
    }
    if (!aa || !bb) continue;   // one of them does not strike in this bar
    sum += ab / Math.sqrt(aa * bb);
    bars++;
  }
  if (!bars) return null;
  let ab = 0, aa = 0, bb = 0;
  for (let k = 0; k < stepsPerBar; k++) { ab += barC[k] * barX[k]; aa += barC[k] * barC[k]; bb += barX[k] * barX[k]; }
  return { hit: hit / nc, cover: cover / nx, beat: cosine(beatC, beatX), accent: aa && bb ? ab / Math.sqrt(aa * bb) : 0, bar: sum / bars, density: Math.abs(Math.log2(nc / nx)) };
}

const sigmoid = (z) => 1 / (1 + Math.exp(-z));
const rhythmSum = (r, w) => w.hit * r.hit + w.cover * r.cover + w.beat * r.beat + w.accent * r.accent + w.bar * r.bar + w.density * r.density;

/** The six numbers as one, 0–1: the rhythm alone (drums). */
export function rhythmScore(r, w = R) {
  return sigmoid(w.bias + rhythmSum(r, w));
}

/** The notes' three numbers (`h`, harmony.js harmonyFeatures) and the rhythm's six as one, 0–1. */
export function jointScore(h, r, w = J) {
  return sigmoid(w.bias + w.clash * h.clash + w.chroma * h.chroma + w.harmonyCover * h.cover + rhythmSum(r, w));
}

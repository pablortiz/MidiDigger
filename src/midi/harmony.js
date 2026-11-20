// How well a fragment sounds over what already plays, told from the notes themselves.
//
// A stretch of music is kept as a grid: for every step of its bars (STEPS_PER_BEAT a quarter
// note), the pitch classes that sound then, a 12-bit mask (bit 0 = C). The catalogue keeps one
// per fragment; a loop's is worked out from its pads as they sound.
//
// A fragment (the candidate) is measured over a context (the other instruments) by three
// numbers, each 0–1, and they are joined into one, the chance that the two were written to go
// together:
//   clash   of the steps where both sound, the share that hold a semitone between them
//   chroma  how alike their notes are, bar by bar (cosine of the time each pitch class sounds)
//   cover   of what the candidate plays, the share on pitch classes the context plays in that bar
//   fit = 1 / (1 + exp(-(W.bias + W.clash·clash + W.chroma·chroma + W.cover·cover)))
//
// Where the weights come from (.dev/harmony-study.mjs): the library itself says what goes
// together. A channel of a song over the song's other channels is a real case; a fragment of
// another song put there, moved to the key as the add-on moves it, is a random one. The weights
// are the logistic regression that best tells one from the other, both counting the same, so
// 0.5 means "as likely written together as not". The study prints them with the songs, the seed
// and the figures on songs it did not learn from; run it again to change them.

export const STEPS_PER_BEAT = 2;   // 8ths: half the size of 16ths for the same result (AUC 0.804 against 0.810 in the study)

/** Learned by .dev/harmony-study.mjs (see HARMONY_MODEL for the run). */
export const W = { bias: -2.229, clash: -4.285, chroma: 4.626, cover: -0.238 };
export const HARMONY_MODEL = { songs: 3000, seed: 1, auc: 0.804, date: '2026-11-11', library: 'Various Artists (18 288 files)' };
/**
 * Marks from which a fragment fits (amber) and fits well (green). In that run, on songs not
 * learned from: 0.5 is reached by 45 % of the real cases and 7 % of the random ones; 0.7 by 19 %
 * and 1.8 %. Strict on purpose: a large library has plenty that pass.
 */
export const HARMONY_OK = 0.5;
export const HARMONY_GOOD = 0.7;

const rot = (mask, by) => { const k = ((by % 12) + 12) % 12; return k ? ((mask << k) | (mask >> (12 - k))) & 0xfff : mask; };

/**
 * A grid of `steps` steps from notes [{ at, len, pitch }] (`at` and `len` in steps, from the
 * grid's start; fractions are rounded, a note lasts one step at least). Notes that start before
 * it or after its end are left out.
 */
export function noteGrid(notes, steps) {
  const grid = new Uint16Array(Math.max(0, Math.round(steps)));
  for (const n of notes) {
    const a = Math.round(n.at);
    if (a < 0 || a >= grid.length) continue;
    const b = Math.min(grid.length, Math.max(a + 1, Math.round(n.at + n.len)));
    const bit = 1 << (((n.pitch % 12) + 12) % 12);
    for (let k = a; k < b; k++) grid[k] |= bit;
  }
  return grid;
}

/** A grid `factor` times coarser: each step holds what sounded in any of the steps it joins. */
export function coarser(grid, factor) {
  const out = new Uint16Array(Math.ceil(grid.length / factor));
  for (let k = 0; k < grid.length; k++) out[Math.floor(k / factor)] |= grid[k];
  return out;
}

/** A grid moved `shift` semitones (a copy). */
export function transposed(grid, shift) {
  return grid.map((m) => rot(m, shift));
}

/** Does anything sound in it? */
export const sounds = (grid) => !!grid && grid.some((m) => m);

const ca = new Float32Array(12);
const cb = new Float32Array(12);

/**
 * The three numbers of `cand` played over `ctx` (grids), the candidate moved `shift` semitones
 * and going round until the context ends; `stepsPerBar` of both. { clash, chroma, cover, both
 * (steps where both sound) }, or null when they share no bar where both sound.
 */
export function harmonyFeatures(ctx, cand, shift, stepsPerBar) {
  if (!ctx?.length || !cand?.length || !(stepsPerBar > 0)) return null;
  let both = 0, clash = 0, cos = 0, bars = 0, played = 0, covered = 0;
  for (let from = 0; from < ctx.length; from += stepsPerBar) {
    const until = Math.min(ctx.length, from + stepsPerBar);
    ca.fill(0);
    cb.fill(0);
    let barCtx = 0;
    for (let k = from; k < until; k++) {
      const x = ctx[k];
      const y = rot(cand[k % cand.length], shift);
      barCtx |= x;
      for (let m = x; m; m &= m - 1) ca[31 - Math.clz32(m & -m)]++;
      for (let m = y; m; m &= m - 1) cb[31 - Math.clz32(m & -m)]++;
      if (x && y) {
        both++;
        if ((rot(x, 1) | rot(x, 11)) & y) clash++;
      }
    }
    let ab = 0, aa = 0, bb = 0, all = 0, inside = 0;
    for (let pc = 0; pc < 12; pc++) {
      ab += ca[pc] * cb[pc]; aa += ca[pc] * ca[pc]; bb += cb[pc] * cb[pc];
      all += cb[pc];
      if (barCtx >> pc & 1) inside += cb[pc];
    }
    if (!aa || !bb) continue;   // one of them is silent in this bar: nothing to compare
    cos += ab / Math.sqrt(aa * bb);
    played += all;
    covered += inside;
    bars++;
  }
  if (!bars) return null;
  return { clash: both ? clash / both : 0, chroma: cos / bars, cover: covered / played, both };
}

/** The three numbers as one, 0–1 (see the top of the file). */
export function harmonyScore(f, w = W) {
  return 1 / (1 + Math.exp(-(w.bias + w.clash * f.clash + w.chroma * f.chroma + w.cover * f.cover)));
}

/** How well `cand` goes over `ctx`: { fit, clash, chroma, cover }, or null when it cannot be told. */
export function harmonyFit(ctx, cand, shift, stepsPerBar) {
  const f = harmonyFeatures(ctx, cand, shift, stepsPerBar);
  return f ? { fit: harmonyScore(f), ...f } : null;
}

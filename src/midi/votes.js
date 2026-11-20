// The user's ear: 👍 / 👎 on what Fill and Arrange bring, and the marks learned from them.
//
// A vote keeps what was measured of a fragment against what played when it was brought (the
// numbers of midi/harmony.js and midi/rhythm.js), not "this fragment is good": "with these
// measures, the user liked it or not". So what is learned in one folder holds in any other.
// It also says which fragment it was (file, channel, tick, and the file's fingerprint), so its
// measures can be worked out again if the formula changes, and the notes that sounded then (the
// loop's rows, the fragment's among them), for a model that reads notes instead of measures.
//
// The marks are the same formula as rhythm.js, its weights moved by the votes. They start as the
// factory ones (learned from what was written together in the library) and each vote pulls them:
// the weights w that make the votes most likely, held to the factory ones w0,
//   minimise   Σ votes −log P(vote | w)  +  PRIOR/2 · |w − w0|²
// (logistic regression with a Gaussian prior, by Newton's method). With no votes w = w0; a few
// change little; PRIOR is how many votes it takes to weigh as much as the factory model. The
// weights are always worked out again from the whole list, so a vote changed or removed leaves
// them as if it had never been cast.

import { J, R, RHYTHM_NAMES } from './rhythm.js';

export const VOTES_FILE = 'MIDI Digger votes';
export const VOTES_VERSION = 1;
/** About this many votes weigh as much as the factory model (a vote's pull on a weight is ~0.05). */
export const PRIOR_VOTES = 50;
const PRIOR = PRIOR_VOTES * 0.05;

const PITCHED = ['clash', 'chroma', 'harmonyCover', ...RHYTHM_NAMES];
const DRUMS = RHYTHM_NAMES;
const round = (x) => Math.round(x * 1000) / 1000;

/**
 * A vote (1: 👍, -1: 👎) on `candidate` (a fragment as the catalogue gives it), `measured` as
 * main.js fitOf told it then ({ score, harmony, rhythm }). `fp`: its file's fingerprint; `moved`:
 * notes adapted in its row. Partial votes can be kept without inventing missing measurements.
 */
export function voteOf(candidate, measured, vote, { fp = '', moved = 0, at = new Date().toISOString(), music = null, allowPartial = false } = {}) {
  const h = measured?.harmony;
  const r = measured?.rhythm;
  if (!allowPartial && (!r || (candidate.role !== 'drums' && !h))) return null;
  const features = {
    ...(h ? { clash: round(h.clash), chroma: round(h.chroma), harmonyCover: round(h.cover) } : {}),
    ...(r ? Object.fromEntries(RHYTHM_NAMES.map((n) => [n, round(r[n])])) : {}),
  };
  const complete = (candidate.role === 'drums' ? DRUMS : PITCHED).every((n) => Number.isFinite(features[n]));
  const where = `${String(candidate.path).toLowerCase()}|${candidate.ch}|${candidate.atTick}|${candidate.ticks}`;
  return {
    // The same fragment over the same music is the same vote: cast again, it replaces the first.
    id: complete ? `${where}|${Object.values(features).join(',')}` : `${where}|partial:${Object.entries(features).map(([name, value]) => `${name}=${value}`).join(',')}`,
    at, vote: vote > 0 ? 1 : -1,
    path: candidate.path, ch: candidate.ch, atTick: candidate.atTick, ticks: candidate.ticks, fp,
    role: candidate.role, program: candidate.program, instrument: candidate.instrument,
    score: measured?.score == null ? null : round(measured.score), moved, features,
    // The notes that sounded, the fragment's row among them (loop.js loopMusic): the nine measures
    // are all today's marks learn from; a model that reads notes needs these.
    ...(music ? { music } : {}),
  };
}

/** Whether a vote has all the measurements used by its compatibility model. */
export const voteLearnable = (v) => (v.role === 'drums' ? DRUMS : PITCHED).every((n) => Number.isFinite(v.features?.[n]));

/** The list with `record` cast: in place of the vote with its id, or added. */
export const castVote = (votes, record) => [...votes.filter((v) => v.id !== record.id), record];

/** The list without the vote `id`. */
export const removeVote = (votes, id) => votes.filter((v) => v.id !== id);

/** Two lists as one: each vote once, the latest of two with the same id. */
export function mergeVotes(a, b) {
  const all = new Map();
  for (const v of [...a, ...b]) if (!all.has(v.id) || String(v.at) > String(all.get(v.id).at)) all.set(v.id, v);
  return [...all.values()].sort((x, y) => String(x.at).localeCompare(String(y.at)));
}

/** The votes as the file Save votes writes. */
export const votesFile = (votes) => ({ app: VOTES_FILE, v: VOTES_VERSION, saved: new Date().toISOString(), votes });

/** The votes of a file's text. Throws, saying why, when it is not one. */
export function readVotes(text) {
  let file;
  try { file = JSON.parse(text); } catch { throw new Error('That file is not a list of votes saved by MIDI Digger.'); }
  if (file?.app !== VOTES_FILE || !Array.isArray(file.votes)) throw new Error('That file is not a list of votes saved by MIDI Digger.');
  return file.votes.filter((v) => v && typeof v.id === 'string' && (v.vote === 1 || v.vote === -1) && v.features && typeof v.features === 'object');
}

/** `names` weights and the bias held to `w0` and pulled by `rows` [{ x: [...], y: 0 | 1 }]. */
function pulled(w0, names, rows) {
  const d = names.length;
  const start = [...names.map((n) => w0[n]), w0.bias];
  if (!rows.length) return { ...w0 };
  const m = d + 1;
  const w = [...start];
  for (let it = 0; it < 25; it++) {
    const g = w.map((x, a) => PRIOR * (x - start[a]));
    const H = Array.from({ length: m }, (_, a) => { const row = new Array(m).fill(0); row[a] = PRIOR; return row; });
    for (const { x, y } of rows) {
      let z = w[d];
      for (let k = 0; k < d; k++) z += w[k] * x[k];
      const p = 1 / (1 + Math.exp(-z));
      for (let a = 0; a < m; a++) {
        const xa = a < d ? x[a] : 1;
        g[a] += (p - y) * xa;
        for (let b = 0; b < m; b++) H[a][b] += p * (1 - p) * xa * (b < d ? x[b] : 1);
      }
    }
    // H · step = g, by elimination.
    for (let a = 0; a < m; a++) {
      let top = a;
      for (let r = a + 1; r < m; r++) if (Math.abs(H[r][a]) > Math.abs(H[top][a])) top = r;
      [H[a], H[top]] = [H[top], H[a]];
      [g[a], g[top]] = [g[top], g[a]];
      for (let r = a + 1; r < m; r++) {
        const q = H[r][a] / H[a][a];
        for (let b = a; b < m; b++) H[r][b] -= q * H[a][b];
        g[r] -= q * g[a];
      }
    }
    let step = 0;
    for (let a = m - 1; a >= 0; a--) {
      let v = g[a];
      for (let b = a + 1; b < m; b++) v -= H[a][b] * g[b];
      g[a] = v / H[a][a];
      w[a] -= g[a];
      step = Math.max(step, Math.abs(g[a]));
    }
    if (step < 1e-8) break;
  }
  return { ...Object.fromEntries(names.map((n, k) => [n, w[k]])), bias: w[d] };
}

/**
 * The weights for rhythm.js jointScore (J) and rhythmScore (R) as the votes leave them, and how
 * many votes each took: { J, R, pitched, drums }. Votes that lack a measure are left out.
 */
export function learnWeights(votes, factory = { J, R }) {
  const rows = (names, test) => votes.filter(test).filter((v) => names.every((n) => Number.isFinite(v.features?.[n])))
    .map((v) => ({ x: names.map((n) => v.features[n]), y: v.vote > 0 ? 1 : 0 }));
  const pitched = rows(PITCHED, (v) => v.role !== 'drums');
  const drums = rows(DRUMS, (v) => v.role === 'drums');
  return { J: pulled(factory.J, PITCHED, pitched), R: pulled(factory.R, DRUMS, drums), pitched: pitched.length, drums: drums.length };
}

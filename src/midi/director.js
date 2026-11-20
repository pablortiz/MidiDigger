// The director: how songs are arranged, learned from the library, and a new arrangement in that
// manner. A song is read as phrases of 4 bars (from its first bar with drums): in each, which
// roles play (drums, bass, chords, melody, as bits of a mask) and whether its last bar is a
// drum bar of its own (a fill, a break, a turn) . Which phrase follows which is a Markov chain:
// a new piece walks it, phrase by phrase, among the roles the loop has.

export const PHRASE = 4;   // bars
export const ROLE_BIT = { drums: 1, bass: 2, chords: 4, melody: 8 };
const TOMS = new Set([41, 43, 45, 47, 48, 50]);

const jaccard = (a, b) => {
  if (!a.size && !b.size) return 1;
  let common = 0;
  for (const x of a) if (b.has(x)) common++;
  return common / (a.size + b.size - common);
};

/**
 * The drum bars of a channel that are a turn of their own (1-based): bars that leave the
 * groove of the bar before and come back to it after (or change it), and bars with toms
 * between bars without. `bars`: [{ start, pitch }] notes of the channel; `barOf(tick)`,
 * `barStart(bar)`, `ppq` of its file.
 */
export function drumTurns(notes, { barOf, barStart, ppq, bars }) {
  const hits = Array.from({ length: bars + 2 }, () => new Set());
  const toms = new Array(bars + 2).fill(false);
  for (const n of notes) {
    const b = barOf(n.start);
    if (b < 1 || b > bars) continue;
    hits[b].add(n.pitch * 16 + Math.max(0, Math.round((n.start - barStart(b)) / (ppq / 4))) % 16);
    if (TOMS.has(n.pitch)) toms[b] = true;
  }
  const out = [];
  for (let b = 2; b <= bars; b++) {
    if (!hits[b].size || !hits[b - 1].size) continue;
    const leaves = jaccard(hits[b], hits[b - 1]) < 0.4;
    const after = hits[b + 1];
    const back = after.size && jaccard(hits[b - 1], after) > 0.6;
    if ((leaves && (back || jaccard(hits[b], after) < 0.4)) || (toms[b] && !toms[b - 1] && !toms[b + 1])) out.push(b);
  }
  return out;
}

/**
 * A song's form: { form: [role mask per phrase], turns: [1 where the phrase ends on a drum turn] }.
 * `channels`: [{ role, notes: [{ start, stop, pitch }] }]; the file's `barOf`, `barStart`,
 * `ppq` and `bars`. A role plays in a bar its notes sound through a quarter of, smoothed (2 of
 * the 3 bars around it: a melody breathing for a bar has not left), and in a phrase when it
 * plays in most of its bars. Empty for a song too short or without bars.
 */
export function formOf(channels, { barOf, barStart, ppq, bars }) {
  if (!ppq || bars < PHRASE * 2) return { form: [], turns: [] };
  const plays = new Array(bars + 2).fill(0);
  let firstDrums = 0;
  let firstNote = 0;
  for (const { role, notes } of channels) {
    const bit = ROLE_BIT[role];
    if (!bit || notes.length < 8) continue;
    const sounding = new Array(bars + 2).fill(0);
    for (const n of notes) {
      const b = barOf(n.start);
      if (b < 1 || b > bars) continue;
      if (!firstNote || b < firstNote) firstNote = b;
      if (role === 'drums' && (!firstDrums || b < firstDrums)) firstDrums = b;
      const stop = role === 'drums' ? n.start + ppq / 2 : n.stop;
      for (let k = b; k <= bars && barStart(k) < stop; k++) sounding[k] += Math.min(stop, barStart(k + 1)) - Math.max(n.start, barStart(k));
    }
    const on = sounding.map((s, k) => k >= 1 && s >= (barStart(k + 1) - barStart(k)) / 4);
    for (let k = 1; k <= bars; k++) if ((on[k - 1] ? 1 : 0) + (on[k] ? 1 : 0) + (on[k + 1] ? 1 : 0) >= 2) plays[k] |= bit;
  }
  const first = firstDrums || firstNote;
  if (!first) return { form: [], turns: [] };
  const drums = channels.filter((c) => c.role === 'drums').flatMap((c) => c.notes);
  const turnBars = new Set(drumTurns(drums, { barOf, barStart, ppq, bars }));
  const form = [];
  const turns = [];
  for (let a = first; a + PHRASE - 1 <= bars; a += PHRASE) {
    let mask = 0;
    for (const bit of Object.values(ROLE_BIT)) {
      let n = 0;
      for (let k = a; k < a + PHRASE; k++) if (plays[k] & bit) n++;
      if (n * 2 > PHRASE) mask |= bit;
    }
    form.push(mask);
    turns.push(turnBars.has(a + PHRASE - 1) ? 1 : 0);
  }
  // The silence after its last note is not part of it.
  while (form.length && !form[form.length - 1]) { form.pop(); turns.pop(); }
  return { form, turns };
}

/**
 * What the director knows, from songs' forms ({ form, turns } each): how pieces start, which
 * phrase follows which, and how often a phrase ends on a drum turn when the next one changes
 * and when it does not. With none, a modest default: start on the drums, change now and then.
 */
export function learn(forms) {
  const start = new Array(16).fill(0);
  const next = Array.from({ length: 16 }, () => new Array(16).fill(0));
  let turnChange = 0, changes = 0, turnStay = 0, stays = 0, songs = 0;
  for (const { form, turns } of forms) {
    if (!form?.length) continue;
    songs++;
    start[form[0]]++;
    for (let k = 0; k + 1 < form.length; k++) {
      next[form[k]][form[k + 1]]++;
      if (form[k] !== form[k + 1]) { changes++; turnChange += turns[k] ?? 0; } else { stays++; turnStay += turns[k] ?? 0; }
    }
  }
  if (!songs) {
    start[ROLE_BIT.drums] = 3;
    for (let a = 0; a < 16; a++) next[a][a] = 3;
    return { start, next, turnOnChange: 0.4, turnOnStay: 0.1, songs: 0 };
  }
  return { start, next, turnOnChange: changes ? turnChange / changes : 0.4, turnOnStay: stays ? turnStay / stays : 0.1, songs };
}

/** A seeded random number generator (mulberry32): the same seed, the same piece. */
export function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One of `weights` (an array), drawn with `rand`; -1 when they are all 0. */
function draw(weights, rand) {
  const total = weights.reduce((a, b) => a + b, 0);
  if (!total) return -1;
  let x = rand() * total;
  for (let k = 0; k < weights.length; k++) {
    x -= weights[k];
    if (x < 0) return k;
  }
  return weights.length - 1;
}

/**
 * A new arrangement: `phrases` role masks, each a part of `have` (the roles the loop has, a
 * mask), walking the learned chain, and where each phrase ends on a drum turn. `daring` > 1
 * goes for what songs do less often, < 1 for what they do most. `rand`: seeded() or Math.random.
 * Returns { form: [mask…], turns: [bool…] }.
 */
export function compose(model, have, phrases, { daring = 1, rand = Math.random } = {}) {
  const allowed = Array.from({ length: 16 }, (_, m) => m > 0 && (m & have) === m);
  // Counts, a little for every allowed phrase (so the loop's roles can all be reached), then
  // bent by the daring: a power under 1 evens them out, over 1 sharpens them.
  const weigh = (counts) => counts.map((c, m) => (allowed[m] ? (c + 0.25) ** (1 / Math.max(0.2, daring)) : 0));
  const form = [];
  let at = draw(weigh(model.start), rand);
  if (at < 0) at = have;
  form.push(at);
  for (let k = 1; k < phrases; k++) {
    let to = draw(weigh(model.next[at]), rand);
    if (to < 0) to = at;
    form.push(to);
    at = to;
  }
  // Somewhere it should all play: the loop's whole band once at least, at its height.
  if (phrases >= 3 && !form.includes(have)) {
    const peak = form.reduce((best, m, k) => (bitCount(m) > bitCount(form[best]) ? k : best), 0);
    form[peak] = have;
  }
  const turns = form.map((m, k) => k + 1 < form.length && rand() < (form[k + 1] !== m ? model.turnOnChange : model.turnOnStay));
  return { form, turns };
}

const bitCount = (m) => (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1) + ((m >> 3) & 1);

/** "drums + bass", for the log. */
export function rolesText(mask) {
  return Object.entries(ROLE_BIT).filter(([, bit]) => mask & bit).map(([r]) => r).join(' + ') || 'silence';
}

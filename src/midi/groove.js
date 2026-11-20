// The groove of a stretch of music: on which 16th notes of the bar it strikes, its bars folded
// into one, and whether it swings (its off-beats on a triplet grid) or goes straight. Kept as a
// short text, so the catalogue holds each different one once:
//   "16:8a8a"     16 steps a bar; a hex mask of the steps struck in a third of its bars or more
//   "16:8a8as"    the same, swung
// Parts are matched by it: what they strike should fall with what the rhythm section (drums
// and bass) strikes, or on the beats; a swung part on a straight one is the worst.

/** The drum notes that make a groove: kicks, snares, rims, claps (cymbals and hats would fill every step). */
const GROOVE_DRUMS = new Set([35, 36, 37, 38, 39, 40]);
const STEP_MIN = 1 / 3;   // a step counts when struck in this share of the bars
const SWING_MIN = 0.3;    // share of the off-beats on the triplet grid that makes it swing

/** Is a note one that makes the groove (`drums`: a drum kit's, of those only)? */
export const grooveNote = (pitch, drums) => !drums || GROOVE_DRUMS.has(pitch);

/**
 * The groove of onsets `beats` (quarter notes from the first bar's start) over `bars` bars of
 * `perBar` quarter notes. '' when there are too few to tell or the bar does not fall on 16ths.
 */
export function grooveOf(beats, perBar, bars) {
  const steps = Math.round(perBar * 4);
  if (!bars || !beats.length || Math.abs(steps - perBar * 4) > 1e-6 || steps > 32) return '';
  const struck = Array.from({ length: steps }, () => new Set());
  let offBeats = 0;
  let triplets = 0;
  for (const b of beats) {
    const bar = Math.floor(b / perBar + 1e-9);
    if (bar < 0 || bar >= bars) continue;
    const inBar = b - bar * perBar;
    struck[Math.round(inBar * 4) % steps].add(bar);
    // Off the beat: on the 16th grid, or nearer the triplet grid (a swung 8th, a shuffle)?
    const frac = inBar % 1;
    if (frac > 0.05 && frac < 0.95) {
      offBeats++;
      const to16 = Math.abs(frac * 4 - Math.round(frac * 4));
      const to3 = Math.abs(frac * 3 - Math.round(frac * 3));
      if (to3 < 0.08 && to16 > 0.12) triplets++;
    }
  }
  let mask = 0n;
  struck.forEach((s, k) => { if (s.size / bars >= STEP_MIN) mask |= 1n << BigInt(k); });
  if (!mask) return '';
  const swing = offBeats >= 4 && triplets / offBeats >= SWING_MIN;
  return `${steps}:${mask.toString(16)}${swing ? 's' : ''}`;
}

const parsed = new Map();   // groove text -> { steps, hits: Set of steps, swing }

function parse(g) {
  if (!g) return null;
  let p = parsed.get(g);
  if (p) return p;
  const m = /^(\d+):([0-9a-f]+)(s?)$/.exec(g);
  if (!m) return null;
  const steps = Number(m[1]);
  const mask = BigInt(`0x${m[2]}`);
  const hits = new Set();
  for (let k = 0; k < steps; k++) if ((mask >> BigInt(k)) & 1n) hits.add(k);
  p = { steps, hits, swing: m[3] === 's' };
  parsed.set(g, p);
  return p;
}

/** Grooves played together, as one: every step any of them strikes; it swings if one does. '' with none. */
export function grooveUnion(grooves) {
  const all = grooves.map(parse).filter(Boolean);
  if (!all.length || all.some((g) => g.steps !== all[0].steps)) return all.length ? grooves.find(Boolean) : '';
  let mask = 0n;
  for (const g of all) for (const k of g.hits) mask |= 1n << BigInt(k);
  return `${all[0].steps}:${mask.toString(16)}${all.some((g) => g.swing) ? 's' : ''}`;
}

/**
 * How well a part's groove falls with the rhythm section's, 0–1: the share of the steps it
 * strikes where the section strikes too or on a beat (`loose`: on any 8th, for chords and
 * melodies, which may push ahead of the section). Half, a swung part on a straight section or
 * the other way round. Null when either is unknown or they are in other meters.
 */
export function grooveFit(part, section, { loose = false } = {}) {
  const a = parse(part);
  const b = parse(section);
  if (!a || !b || a.steps !== b.steps || !a.hits.size) return null;
  const grid = loose ? 2 : 4;
  let with_ = 0;
  for (const k of a.hits) if (b.hits.has(k) || k % grid === 0) with_++;
  const share = with_ / a.hits.size;
  return a.swing === b.swing ? share : share * 0.5;
}

/** "Swung" or "straight", and how many 16ths of the bar it strikes, for a tooltip. */
export function grooveText(g) {
  const p = parse(g);
  return p ? `${p.swing ? 'swung' : 'straight'}, ${p.hits.size} of ${p.steps} 16ths struck` : '';
}

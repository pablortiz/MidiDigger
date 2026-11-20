// A fragment taken from another song, made to go with the notes that play: the few of its notes
// that are wrong there are moved a step, the rest stay as they were written.
//
// A note is wrong over a context (a grid of midi/harmony.js: the pitch classes that sound on each
// step) when, while it sounds,
//   it is a semitone from a note of the context (what harmony.js counts as a clash), or
//   it is outside the key and no instrument plays it in that bar (a stranger to both).
// A wrong note goes to the nearest pitch, one or two semitones away, that is a semitone from
// nothing that sounds with it; of those, first one the context plays while it sounds (a note of
// the chord), then one it plays in that bar, then one of the key; the nearer first, and down
// before up. With no such pitch it stays. Rhythm, lengths and velocities are never touched: what
// made the fragment worth choosing is kept, and what made it clash is gone.

import { STEPS_PER_BEAT } from './harmony.js';

const rot = (mask, by) => { const k = ((by % 12) + 12) % 12; return k ? ((mask << k) | (mask >> (12 - k))) & 0xfff : mask; };
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10, 11];   // natural, and the raised seventh of its dominant

/** The pitch classes of a key ("9 menor", as features.js keyClass gives it) as a 12-bit mask; all twelve when unknown. */
export function scaleMask(key) {
  const [pc, mode] = String(key ?? '').split(' ');
  if (!mode || !Number.isFinite(Number(pc))) return 0xfff;
  return (mode === 'menor' ? MINOR : MAJOR).reduce((mask, step) => mask | (1 << ((Number(pc) + step) % 12)), 0);
}

/**
 * `notes` [{ beat, len, pitch, … }] (beats from the context's first step; they sound `shift`
 * semitones from their pitch) over `ctx`, the grid of what the others play there, `perBar` beats
 * a bar, in `key`. { notes (new ones where moved, their pitch as kept: without the shift), moved }.
 */
export function adaptNotes(notes, ctx, { perBar = 4, shift = 0, key = '' } = {}) {
  if (!ctx?.length) return { notes, moved: 0 };
  const scale = scaleMask(key);
  const stepsPerBar = Math.round(perBar * STEPS_PER_BEAT);
  let moved = 0;
  const out = notes.map((n) => {
    const a = Math.round(n.beat * STEPS_PER_BEAT);
    if (a < 0 || a >= ctx.length) return n;
    const b = Math.min(ctx.length, Math.max(a + 1, Math.round((n.beat + n.len) * STEPS_PER_BEAT)));
    let span = 0, bar = 0;
    for (let k = a; k < b; k++) span |= ctx[k];
    const from = Math.floor(a / stepsPerBar) * stepsPerBar;
    for (let k = from; k < Math.min(ctx.length, from + stepsPerBar); k++) bar |= ctx[k];
    if (!bar) return n;   // nothing plays in its bar: nothing to go with
    const near = rot(span, 1) | rot(span, 11);
    const has = (mask, pitch) => (mask >> ((((pitch + shift) % 12) + 12) % 12)) & 1;
    if (!has(near, n.pitch) && (has(bar, n.pitch) || has(scale, n.pitch))) return n;
    let best = null;
    for (const d of [-1, 1, -2, 2]) {
      const pitch = n.pitch + d;
      if (pitch < 0 || pitch > 127 || has(near, pitch)) continue;
      const rank = has(span, pitch) ? 3 : has(bar, pitch) ? 2 : has(scale, pitch) ? 1 : 0;
      if (rank && (!best || rank > best.rank)) best = { pitch, rank };
    }
    if (!best) return n;
    moved++;
    return { ...n, pitch: best.pitch };
  });
  if (!moved) return { notes, moved: 0 };
  // Two notes of a chord brought to the same pitch at the same time: one is enough.
  const seen = new Set();
  const kept = out.filter((n) => {
    const id = `${Math.round(n.beat * 96)}|${n.pitch}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  return { notes: kept, moved };
}

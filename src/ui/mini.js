// Part thumbnails, after midiGrid's library panel: time across the whole song, pitch up within
// the part's own range (so its shape shows), octave colours brighter with velocity on the dark
// background the timeline lanes use, drums amber. An optional loop is shaded so the pattern
// stands out.

import { EARLY, extractNotes } from '../midi/parts.js';

const MIN_LOOP_W = 8;   // px: a bar of a long song still shows
const MIN_RULER_GAP = 7;   // px between the lines of the bar ruler

/** A hue for a channel's n-th fragment, the same here and on the lanes: the first amber, the rest far from the one before. */
export const fragmentHue = (n) => (42 + n * 137) % 360;

/** A note's hue: one per octave (C0 red … C8 pink), drums amber, wherever notes are drawn. */
export const octaveHue = (pitch, drums = false) => (drums ? 35 : [0, 25, 50, 95, 170, 205, 250, 290, 330][Math.max(0, Math.min(8, Math.floor(pitch / 12) - 1))]);

export function noteColor(pitch, velocity, drums, alpha = 1) {
  const hue = octaveHue(pitch, drums);
  return `hsl(${hue} 70% ${45 + (velocity / 127) * 22}% / ${alpha})`;
}

/**
 * The heights a row of pads draws its notes at: the whole octaves its notes take (C to B), the
 * same for every pad of the row, so a note is always at the same height, a semitone up is a step
 * up and emptying a pad moves nothing on the others. `pitches`: as they sound. { lo, span, h }:
 * the lowest note, how many notes high, each note's height (in a 100 high viewBox).
 */
export function octaveScale(pitches) {
  if (!pitches.length) return { lo: 48, span: 12, h: 90 / 12 };
  const lo = Math.floor(Math.min(...pitches) / 12) * 12;
  const span = (Math.floor(Math.max(...pitches) / 12) + 1) * 12 - lo;
  return { lo, span, h: Math.max(3, Math.min(10, 90 / span)) };
}

/** Where a note of `pitch` goes in a pad (its top, in a 100 high viewBox) on an octaveScale. */
export const pitchY = (pitch, { lo, span, h }) => 5 + (90 - h) * (1 - (pitch - lo) / Math.max(1, span - 1));

/** Bars between ruler lines: 4, or 8, 16… when a long song would pack them closer than MIN_RULER_GAP. */
export function rulerStep(bars, width) {
  let step = 4;
  while ((width / Math.max(1, bars)) * step < MIN_RULER_GAP) step *= 2;
  return step;
}

/** A faint line every few bars, a stronger one with its bar number every fourth line. */
function drawRuler(g, info, W, H, dur) {
  const bars = Math.ceil(info.bars);
  const step = rulerStep(bars, W);
  g.font = `${Math.round(H / 7)}px Consolas, monospace`;
  for (let k = 1; 1 + k * step <= bars; k++) {
    const bar = 1 + k * step;
    const x = Math.round((info.tickToSec(info.barStartTick(bar)) / dur) * W);
    const strong = k % 4 === 0;
    g.fillStyle = `rgba(255, 255, 255, ${strong ? 0.26 : 0.11})`;
    g.fillRect(x, 0, 1, H);
    if (strong) {
      g.fillStyle = 'rgba(255, 255, 255, 0.5)';
      g.fillText(String(bar), x + 3, H / 7);
    }
  }
}

/**
 * Draw channel `ch` of a parsed file, every note sharp; `loop` { at, ticks, n } stands out with
 * a bright band, `others` (more of the same) are the channel's other fragments, each in its
 * tone (see fragmentHue, n: its number).
 */
export function drawPartMini(canvas, info, ch, loop = null, others = []) {
  const { notes } = extractNotes(info, `ch:${ch}`);
  const c = info.channels.find((x) => x.channel === ch);
  const g = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const dur = Math.max(info.durationSec, 0.001);
  g.clearRect(0, 0, W, H);
  if (!c) return;
  const band = (f) => {
    const x = (info.tickToSec(f.at) / dur) * W;
    return [x, Math.max(MIN_LOOP_W, (info.tickToSec(f.at + f.ticks) / dur) * W - x)];
  };
  const shaded = loop?.ticks && info.ppq;
  if (shaded) {
    for (const f of others) {
      const [x, w] = band(f);
      g.fillStyle = `hsl(${fragmentHue(f.n)} 70% 60% / 0.16)`;
      g.fillRect(x, 0, w, H);
      g.fillStyle = `hsl(${fragmentHue(f.n)} 70% 60% / 0.6)`;
      g.fillRect(x, 0, 1, H);
      g.fillRect(x + w - 1, 0, 1, H);
    }
    const [x, w] = band(loop);
    g.fillStyle = `hsl(${fragmentHue(loop.n ?? 0)} 70% 60% / 0.4)`;
    g.fillRect(x, 0, w, H);
  }
  if (info.ppq) drawRuler(g, info, W, H, dur);   // under the notes, over the shading
  const span = c.max - c.min + 1;
  const rowH = Math.min(H / 6, Math.max(2, (H - 2) / span));
  for (const n of notes) {
    g.fillStyle = noteColor(n.pitch, n.velocity, ch === 10);
    g.fillRect((n.startSec / dur) * W, 1 + (H - 2) * (1 - (n.pitch - c.min + 1) / span), Math.max(1.5, ((n.stopSec - n.startSec) / dur) * W), rowH);
  }
  if (shaded) {
    // Over the notes: the frame of the fragment chosen, thick enough to find at a glance.
    const [x, w] = band(loop);
    g.fillStyle = '#fff';
    g.fillRect(x, 0, 3, H);
    g.fillRect(x + w - 3, 0, 3, H);
    g.fillRect(x, 0, w, 2);
    g.fillRect(x, H - 2, w, 2);
  }
}

/**
 * Only the bars of one fragment of channel `ch` across the whole width: `startBar` (its song's
 * number) and `bars` on, `n` its number (its tone, as the bands of drawPartMini). Every result of
 * the same length at the same scale (Parts, a length searched). Each bar ruled with its number in
 * the song, the fragment's tone behind and framed as the one chosen is, its notes within, their
 * height over its own range. Returns its span in its song's seconds: { from, to }.
 */
export function drawFragmentMini(canvas, info, ch, { startBar, bars, n = 0 }) {
  const g = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  g.clearRect(0, 0, W, H);
  const fromTick = info.barStartTick(startBar);
  const untilTick = info.barStartTick(startBar + bars);
  const from = info.tickToSec(fromTick);
  const to = info.tickToSec(untilTick);
  const dur = Math.max(to - from, 0.001);
  const xOf = (sec) => ((sec - from) / dur) * W;
  g.fillStyle = `hsl(${fragmentHue(n)} 70% 60% / 0.18)`;
  g.fillRect(0, 0, W, H);
  // Its bars, numbered as in the song: every one, or every few when they would crowd.
  const every = W / Math.max(1, bars) >= 28 ? 1 : W / Math.max(1, bars) >= 10 ? 4 : 8;
  g.font = `${Math.round(H / 7)}px Consolas, monospace`;
  for (let k = 0; k < bars; k++) {
    const x = Math.round(xOf(info.tickToSec(info.barStartTick(startBar + k))));
    if (k) {
      g.fillStyle = 'rgba(255, 255, 255, 0.2)';
      g.fillRect(x, 0, 1, H);
    }
    if (k % every === 0) {
      g.fillStyle = 'rgba(255, 255, 255, 0.5)';
      g.fillText(String(startBar + k), x + 4, H / 7 + 2);
    }
  }
  // Its notes (one played just before its first bar line is its downbeat), over their own range.
  const early = EARLY * (info.ppq || 0);
  const notes = extractNotes(info, `ch:${ch}`).notes.filter((note) => note.start >= fromTick - early && note.start < untilTick - early);
  if (notes.length) {
    const lo = Math.min(...notes.map((note) => note.pitch));
    const hi = Math.max(...notes.map((note) => note.pitch));
    const span = hi - lo + 1;
    const rowH = Math.min(H / 6, Math.max(2, (H - 6) / span));
    for (const note of notes) {
      const x = Math.max(0, xOf(note.startSec));
      const w = Math.max(1.5, xOf(Math.min(note.stopSec, to)) - x);
      g.fillStyle = noteColor(note.pitch, note.velocity, ch === 10);
      g.fillRect(x, 3 + (H - 6) * (1 - (note.pitch - lo + 1) / span), w, rowH);
    }
  }
  // Framed, as the fragment chosen is on the whole track.
  g.fillStyle = '#fff';
  g.fillRect(0, 0, 3, H);
  g.fillRect(W - 3, 0, 3, H);
  g.fillRect(0, 0, W, 2);
  g.fillRect(0, H - 2, W, 2);
  return { from, to };
}

/**
 * Draw a whole file, all its channels over each other on one strip, as the song sounds: the
 * pitched ones over the range they share together, the drums (channel 10) on the lower band.
 */
export function drawSongMini(canvas, info) {
  const g = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const dur = Math.max(info.durationSec, 0.001);
  g.clearRect(0, 0, W, H);
  if (info.ppq) drawRuler(g, info, W, H, dur);
  const pitched = info.channels.filter((c) => c.channel !== 10);
  const min = Math.min(...pitched.map((c) => c.min));
  const max = Math.max(...pitched.map((c) => c.max));
  const span = Number.isFinite(min) ? max - min + 1 : 1;
  const drumsH = info.channels.some((c) => c.channel === 10) ? Math.round(H * 0.2) : 0;   // the drums' band, at the bottom
  const top = H - drumsH;
  const rowH = Math.min(top / 6, Math.max(1.5, (top - 2) / span));
  for (const c of info.channels) {
    const drums = c.channel === 10;
    for (const n of extractNotes(info, `ch:${c.channel}`).notes) {
      const x = (n.startSec / dur) * W;
      const w = Math.max(1.5, ((n.stopSec - n.startSec) / dur) * W);
      g.fillStyle = noteColor(n.pitch, n.velocity, drums);
      if (drums) g.fillRect(x, top + 1, Math.max(1, w), drumsH - 2);
      else g.fillRect(x, 1 + (top - 2) * (1 - (n.pitch - min + 1) / span), w, rowH);
    }
  }
}

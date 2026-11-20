// Parts of a parsed file: the notes of one channel or track, cut to a range of ticks or
// bars, positions on the bar grid (snapping, "9.2.3"), loops laid out as a piece (Arrange),
// lanes looped as a song for the preview, and the notes for LUNA.

import { GM_PROGRAMS } from './gm.js';
import { PHRASE, ROLE_BIT, compose, learn, seeded } from './director.js';

/**
 * A note played up to a 32nd (in beats) before a bar line is that bar's downbeat, played early:
 * it belongs to what starts there (it comes in on its first beat), not as a stub at the end of
 * what ends there.
 */
export const EARLY = 1 / 8;

/** The bar (1-based) a note starting at `tick` belongs to: the next one when it is played just before it (EARLY). */
export const noteBar = (info, tick) => Math.floor(info.barOfTick(tick + EARLY * info.ppq) + 1e-9);

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const lcm = (a, b) => (a * b) / gcd(a, b);

/** The order instruments come in: the groove first, then the harmony, then the tune. */
const ENTRY_ORDER = ['drums', 'bass', 'chords', 'melody'];

/**
 * Loops laid out as a piece (New loop's Arrange), with as few repeats as can be: the longest loop (the
 * anchor) is heard once, start to end, and sets the piece's length (at least 8 bars); the
 * shorter ones repeat inside it, each coming in and going out at its own bar, so no two bars
 * in a row sound the same and it never turns into a jukebox. `lanes`: [{ ch, role, bars }].
 *   'loops'     all together, the shorter loops nested inside the longer ones: the shortest
 *               come in last and go out first
 *   'build'     one after another (drums, bass, chords, melody), all ending together
 *   'builddown' build's mirror, to bring the tension down: all starting together, then out
 *               one after another the other way round (melody first, drums last)
 *   'breakdown' one after another, drums and bass out for a moment halfway, then out the way
 *               they came in (first in, last out)
 *   'song'      the arc: in step by step to the top, all together there, out the way they
 *               came (a pyramid, with no gap at its top)
 * and the sections of an arranger keyboard's style (arrangerStyle): 'fill', 'stop'.
 * and 'markov': as the songs of the library are arranged (midi/director.js), a phrase of 4
 * bars at a time; `director` { model, daring, seed } then (the same seed, the same piece).
 * `bars` sets the piece's length instead (the anchor then may not be heard whole).
 * Returns { sectionBars, continuous, sections: [{ channels: [ch…], bars }] }; sectionBars is
 * the gap after which a loop starts again (lanePlacements).
 */
export function arrangement(lanes, template, bars = null, director = null) {
  const all = ENTRY_ORDER.flatMap((role) => lanes.filter((l) => l.role === role));
  if (!all.length) return { sectionBars: 8, continuous: true, sections: [] };
  const longest = Math.max(...all.map((l) => l.bars));
  if (template === 'markov') {
    // At least 16 bars, on whole laps of the longest loop: phrases to walk.
    const total = bars ?? longest * Math.ceil(16 / longest);
    const have = all.reduce((m, l) => m | (ROLE_BIT[l.role] ?? 0), 0);
    const phrases = Math.max(1, Math.ceil(total / PHRASE));
    const { form, turns } = compose(director?.model ?? learn([]), have, phrases, { daring: director?.daring ?? 1, rand: seeded(director?.seed ?? 1) });
    // The last bar of a phrase that ends on a turn: the drums alone, a fill into the next.
    const drums = all.filter((l) => l.role === 'drums');
    return sectionsOf(all, total, (l, bar) => {
      const k = Math.floor(bar / PHRASE);
      if (turns[k] && bar % PHRASE === PHRASE - 1 && drums.length) return drums.includes(l);
      return !!(form[k] & ROLE_BIT[l.role]);
    });
  }
  const total = bars ?? longest * Math.ceil(8 / longest);
  const style = arrangerStyle(template, all, total, Math.min(...all.map((l) => l.bars)));
  if (style) return sectionsOf(all, total, style);
  // Every lane its own entry, the longest loop (the anchor) heard once, whole, all through. The
  // arc ('song', its pyramid) goes in steps instead (arcSteps): its base all through, each step
  // a group of instruments, so the pyramid fits however many instruments there are.
  const byRole = template === 'song';
  const anchor = all.find((l) => l.bars === longest);
  const arc = byRole ? arcSteps(all, total) : null;
  const others = byRole ? arc.steps.flat() : all.filter((l) => l !== anchor);
  if (template === 'loops') others.sort((a, b) => b.bars - a.bars);
  const level = (l, i) => (byRole ? arc.steps.findIndex((s) => s.includes(l)) + 1 : i);   // its step
  const m = byRole ? arc.steps.length : others.length;
  // Bars between one entry and the next: on 8, 4, 2 or 1, the most the piece's first half holds;
  // the arc's, the first half shared out evenly among its steps and its top.
  const step = byRole ? Math.max(1, Math.floor(total / 2 / (m + 1))) : [8, 4, 2, 1].find((s) => m * s <= total / 2) ?? 1;
  // A lane's stretch [a, b) cut to whole laps of its loop (a lap at least), keeping its start,
  // its end or its middle where it was. The arc keeps its stretch as it is (a loop heard in part
  // where it does not fit), or its pyramid would be lost.
  const laps = (a, b, bars, keep) => {
    if (byRole) return b > a ? [a, b] : [0, 0];
    const len = Math.min(total, Math.max(bars, Math.floor((b - a) / bars) * bars));
    const from = keep === 'end' ? b - len : keep === 'middle' ? a + Math.floor((b - a - len) / 2) : a;
    return [Math.max(0, Math.min(from, total - len)), Math.max(0, Math.min(from, total - len)) + len];
  };
  const windows = new Map(all.filter((l) => !others.includes(l)).map((l) => [l.ch, [0, total]]));
  others.forEach((l, i) => {
    const k = level(l, i);
    if (template === 'loops') windows.set(l.ch, laps(k * step, total - k * step, l.bars, 'middle'));
    else if (template === 'build') windows.set(l.ch, laps(k * step, total, l.bars, 'end'));
    else if (template === 'builddown') windows.set(l.ch, laps(0, total - k * step, l.bars, 'start'));   // last in, first out
    else windows.set(l.ch, laps(k * step, total - k * step, l.bars, 'start'));   // first in, last out
  });
  // Bars where some lanes are left out: the breakdown's (drums and bass) or the song's break bar.
  const mid = total / 2;
  const groove = (l) => l.role === 'drums' || l.role === 'bass';
  let hole = null;
  if (template === 'breakdown' && all.some((l) => !groove(l))) hole = { a: mid, b: mid + Math.max(1, total / 8), out: groove };
  return sectionsOf(all, total, (l, bar) => {
    const [a, b] = windows.get(l.ch);
    return bar >= a && bar < b && !(hole && bar >= hole.a && bar < hole.b && hole.out(l));
  });
}

const ARC_STEPS = 3;   // the arc's steps when its roles are too few to make them

/**
 * The arc's pyramid (`all` in entry order, `total` bars): { base, steps: [[lane…]…] }. The base,
 * all through, is the first role (the drums, when there are some), or the first lane when all
 * are of one role; then a step for each role after it, its instruments together. Too few roles
 * for a pyramid (drums and six melodies): the instruments one after another in ARC_STEPS
 * steps instead. Never more steps than the first half holds with a top above them.
 */
function arcSteps(all, total) {
  const roles = [...new Set(all.map((l) => l.role))];
  const base = roles.length > 1 ? all.filter((l) => l.role === roles[0]) : [all[0]];
  const rest = all.filter((l) => !base.includes(l));
  let steps = roles.length > 1 ? roles.slice(1).map((r) => rest.filter((l) => l.role === r)) : [rest];
  if (steps.length < ARC_STEPS && rest.length > steps.length) {
    const n = Math.min(ARC_STEPS, rest.length);
    steps = Array.from({ length: n }, (_, k) => rest.slice(Math.round((k * rest.length) / n), Math.round(((k + 1) * rest.length) / n)));
  }
  const most = Math.max(1, Math.floor(total / 2) - 1);
  if (steps.length > most) steps = [...steps.slice(0, most - 1), steps.slice(most - 1).flat()];
  return { base, steps: steps.filter((s) => s.length) };
}

/** A plan from which lanes play each bar (`plays(lane, bar)`): sections where the same lanes play, one after another. */
function sectionsOf(all, total, plays) {
  const sections = [];
  for (let bar = 0; bar < total; bar++) {
    const channels = all.filter((l) => plays(l, bar)).map((l) => l.ch);
    const last = sections[sections.length - 1];
    if (last && last.channels.join() === channels.join()) last.bars++;
    else sections.push({ channels, bars: 1 });
  }
  return { sectionBars: 8, continuous: true, sections };
}

/**
 * The sections of an arranger keyboard's style, as which lanes play each bar (null for the
 * other templates). The groove (drums and bass; else the first instrument) is its Main A, one
 * instrument more its verse, everything its Main B; a fill or a stop leaves the drums alone.
 * Blocks are `block` bars (the shortest loop), so they fall on the pads.
 *   'fill'   all, the last block of every four the drums alone, a fill-in
 *   'stop'   stop-time: a block all, a block the drums alone
 */
function arrangerStyle(template, all, total, block) {
  if (!['fill', 'stop'].includes(template)) return null;
  const isGroove = (l) => l.role === 'drums' || l.role === 'bass';
  const base = all.some(isGroove) ? all.filter(isGroove) : [all[0]];
  const drums = all.filter((l) => l.role === 'drums');
  const alone = drums.length ? drums : base;
  const blockOf = (bar) => Math.floor(bar / block);
  if (template === 'fill') {
    const blocks = Math.ceil(total / block);
    const isFill = (k) => k % 4 === 3 || (blocks < 4 && k === blocks - 1);
    return (l, bar) => (isFill(blockOf(bar)) ? alone.includes(l) : true);
  }
  return (l, bar) => (blockOf(bar) % 2 === 1 ? alone.includes(l) : true);   // 'stop'
}

/** A plan's length in bars. */
export const planBars = (plan) => plan.sections.reduce((n, s) => n + (s.bars ?? plan.sectionBars), 0);

/** The pads as a plan (arrangement()'s shape): a section per run of blocks with the same lanes on. */
export function gridPlan(grid, channels) {
  const sections = [];
  for (let c = 0; c < grid.cols; c++) {
    const on = channels.filter((ch) => grid.rows.get(ch)?.[c]);
    const last = sections[sections.length - 1];
    if (last && last.channels.join() === on.join()) last.bars += grid.unit;
    else sections.push({ channels: on, bars: grid.unit });
  }
  return { sectionBars: 8, continuous: true, sections };
}

/**
 * Where a lane `bars` long plays in a plan: [{ at, from, bars }], at the piece's bar `at`
 * (from 0) its own bars from `from`. Each section starts the loop again; with
 * `plan.continuous` the loop runs on from where the lane came in, through the sections it
 * stays in and through a break shorter than a block, and starts again only after it has been
 * out a whole block. A piece ends at the loop's end.
 */
export function lanePlacements(plan, ch, bars) {
  const out = [];
  let at = 0;
  let since = 0;      // where the lane's run began
  let until = -Infinity;   // where it last stopped playing
  for (const s of plan.sections) {
    const len = s.bars ?? plan.sectionBars;
    if (s.channels.includes(ch)) {
      if (!plan.continuous || at - until >= plan.sectionBars) since = at;
      until = at + len;
      for (let b = at; b < at + len;) {
        const from = (b - since) % bars;
        const n = Math.min(bars - from, at + len - b);
        const last = out[out.length - 1];
        // Joined to the one before when it simply goes on (the same loop, next sections).
        if (last && last.at + last.bars === b && last.from + last.bars === from) last.bars += n;
        else out.push({ at: b, from, bars: n });
        b += n;
      }
    }
    at += len;
  }
  return out;
}

/**
 * Lanes as a song the preview player can loop (a part of Parts heard alone): every lane ({ ch, startTick, endTick },
 * whole bars) repeats its own range until the cycle, the least common multiple of their
 * lengths in bars, is full. At the file's main tempo, so lanes taken from bars of different
 * tempi still meet. Each lane starts with its channel's program and controllers as they stand
 * where its range starts, and every lap ends with its notes off, as the preview's loop does.
 * With `plan` (arrangement()), the lanes play as that piece instead: each one, in the
 * sections it is in, repeated to fill them, so the preview sounds like what goes to LUNA.
 * A lane may come from another file: `info` is that file, `srcCh` its channel there and
 * `transpose` the semitones to this one's key; it plays on the lane's
 * own channel `ch`, at this file's tempo. Drums (channel 10) are never transposed. `bpm`: another
 * tempo for all of it (LUNA's session's, so it sounds here as it will there).
 * Returns { events, durationSec, channels, cycleBars } (the shape PreviewPlayer.load takes),
 * or null with no lanes.
 */
export function lanesSong(info, lanes, plan = null, bpm = null) {
  if (!lanes.length || !info.ppq) return null;
  const fileOf = (l) => l.info ?? info;
  const barsOf = (l) => Math.max(1, Math.round(fileOf(l).barOfTick(l.endTick) - fileOf(l).barOfTick(l.startTick)));
  const cycleBars = lanes.map(barsOf).reduce(lcm, 1);
  const events = [];
  let durationSec = 0;
  for (const lane of lanes) {
    const src = fileOf(lane);
    const secPerTick = 60 / (bpm || info.bpm) / src.ppq;   // its own ticks, this file's tempo (or the one asked for)
    const from = (lane.srcCh ?? lane.ch) - 1;
    const c = lane.ch - 1;
    const shift = c === 9 ? 0 : lane.transpose ?? 0;
    const pitch = (a) => Math.max(0, Math.min(127, a + shift));
    const len = lane.endTick - lane.startTick;
    const bars = barsOf(lane);
    const barTicks = len / bars;
    const early = EARLY * src.ppq;
    // What plays where: the lane's bars `from` for `bars` bars, at the song's bar `at`.
    const pieces = plan
      ? lanePlacements(plan, lane.ch, bars)
      : Array.from({ length: cycleBars / bars }, (_, k) => ({ at: k * bars, from: 0, bars }));
    const mine = src.events.filter((e) => e.ch === from);
    const setup = new Map();
    for (const e of mine) {
      // Up to and including the range's first tick: a program set right there counts.
      if (e.tick > lane.startTick) break;
      if (e.type === 'pc') setup.set('pc', e);
      else if (e.type === 'cc' && e.a !== 64 && e.a !== 123) setup.set(`cc${e.a}`, e);
    }
    for (const e of setup.values()) events.push({ ...e, ch: c, tick: 0, sec: 0 });
    for (const p of pieces) {
      // Notes sounding, by pitch, counted: the same pitch struck again before it ends (a
      // trumpet's repeated notes) needs both its offs, or one goes on sounding for ever.
      const held = new Map();
      const a = lane.startTick + p.from * barTicks;
      const b = a + p.bars * barTicks;
      const start = p.at * barTicks;
      let pedal = false;
      for (const e of mine) {
        // A note played just before the piece's first bar line is its downbeat; one played
        // just before its end, the next one's (EARLY).
        if (e.tick < a - early || e.type === 'pc') continue;
        if (e.tick >= b) break;
        const note = e.type === 'on' || e.type === 'off';
        if (e.tick < a && !note) continue;
        if (e.type === 'on' && e.tick >= b - early) continue;
        if (e.type === 'off') {
          const n = held.get(e.a) ?? 0;
          if (!n) continue;   // began before the piece
          if (n > 1) held.set(e.a, n - 1);
          else held.delete(e.a);
        }
        if (e.type === 'on') held.set(e.a, (held.get(e.a) ?? 0) + 1);
        if (e.type === 'cc' && e.a === 64) pedal = e.b >= 64;
        // (Its end, if before the bar line too, just after it: an off sorts before an on.)
        const tick = start + (e.tick >= a ? e.tick - a : e.type === 'off' ? 1 : 0);
        events.push({ ...e, ch: c, a: note ? pitch(e.a) : e.a, tick, sec: tick * secPerTick });
      }
      // The piece's end: what still sounds stops, and a sustain pedal still down comes up.
      const end = start + (b - a) - 1;
      for (const [n, k] of held) for (let j = 0; j < k; j++) events.push({ tick: end, sec: end * secPerTick, rank: 2, type: 'off', ch: c, a: pitch(n), b: 0 });
      if (pedal) events.push({ tick: end, sec: end * secPerTick, rank: 2, type: 'cc', ch: c, a: 64, b: 0 });
    }
    const totalBars = plan ? planBars(plan) : cycleBars;
    durationSec = Math.max(durationSec, totalBars * barTicks * secPerTick);
  }
  events.sort((x, y) => x.sec - y.sec || x.rank - y.rank);
  // The lanes' channels as the player knows them (a borrowed lane plays on its lane's channel).
  const used = new Set(lanes.map((l) => l.ch));
  const channels = [...used].map((ch) => info.channels.find((c) => c.channel === ch) ?? { channel: ch, notes: 1, min: 0, max: 127, programs: [], tracks: [] });
  return { events, durationSec, cycleBars, channels };
}

/**
 * A channel's fragments one after the other on one bar grid, at the file's main tempo, so that
 * they keep time with each other. Each takes the whole bars it falls in (`startBar`, `bars`):
 * its notes come in on the same beat of the bar as in the song, nothing but its own notes
 * sounds there, and the silence around them is the rest of those bars.
 * `frags`: [{ at, ticks, startBar, bars }]. Returns the shape PreviewPlayer.load takes, plus
 * `places`: [{ startSec, endSec }], where each fragment plays.
 */
export function fragmentSequence(info, ch, frags) {
  const c = ch - 1;
  const secPerTick = 60 / info.bpm / info.ppq;
  const notes = extractNotes(info, `ch:${ch}`).notes;
  const events = [];
  const places = [];
  let tick = 0;
  for (const f of frags) {
    const from = info.barStartTick(f.startBar);
    const length = info.barStartTick(f.startBar + f.bars) - from;
    // The program and controllers as they stand where the fragment starts.
    const setup = new Map();
    for (const e of info.events) {
      if (e.tick > f.at) break;
      if (e.ch !== c) continue;
      if (e.type === 'pc') setup.set('pc', e);
      else if (e.type === 'cc' && e.a !== 64 && e.a !== 123) setup.set(`cc${e.a}`, e);
    }
    for (const e of setup.values()) events.push({ ...e, tick, sec: tick * secPerTick });
    for (const n of notes) {
      if (n.start < f.at || n.start >= f.at + f.ticks) continue;
      const on = tick + n.start - from;
      const off = Math.min(tick + length - 1, tick + n.stop - from);
      events.push({ tick: on, sec: on * secPerTick, rank: 3, type: 'on', ch: c, a: n.pitch, b: n.velocity });
      events.push({ tick: off, sec: off * secPerTick, rank: 2, type: 'off', ch: c, a: n.pitch, b: 0 });
    }
    places.push({ startSec: tick * secPerTick, endSec: (tick + length) * secPerTick });
    tick += length;
  }
  events.sort((x, y) => x.sec - y.sec || x.rank - y.rank);
  const own = info.channels.find((x) => x.channel === ch);
  return { events, durationSec: tick * secPerTick, channels: own ? [own] : [], places };
}

/**
 * The second of a song that a looping collage of it is playing at second `pos`. `pieces`:
 * [{ startSec, endSec (where it plays), fromSec, toSec (what of the song it is) }], in order.
 */
export function songPlace(pieces, pos) {
  const lap = pieces[pieces.length - 1].endSec;
  const at = ((pos % lap) + lap) % lap;
  const p = pieces.find((x) => at >= x.startSec && at < x.endSec) ?? pieces[0];
  return p.fromSec + ((at - p.startSec) / (p.endSec - p.startSec)) * (p.toSec - p.fromSec);
}

/**
 * Semitones that take a part from key `from` to key `to` (both as keyClass gives them,
 * "9 menor"), by the shortest way (-6…+5). Across modes a part goes to the relative key
 * (A minor into C major), which shares its notes. 0 when either key is unknown.
 */
export function transposeBetween(from, to) {
  if (!from || !to) return 0;
  const [fpc, fmode] = from.split(' ');
  const [tpc, tmode] = to.split(' ');
  let target = Number(tpc);
  if (fmode !== tmode) target = fmode === 'menor' ? target + 9 : target + 3;   // the relative key
  const up = (((target - Number(fpc)) % 12) + 12) % 12;
  return up > 5 ? up - 12 : up;
}

/**
 * The notes of one part of a parsed file, paired on/off, in MIDI ticks and seconds. `pick`
 * is "ch:<1-16>" (a channel, across tracks) or "tr:<n>" (one track of the file). Also returns
 * the first Program Change of the part's channel, and whether it is GM drums.
 */
export function extractNotes(info, pick) {
  const [kind, value] = pick.split(':');
  const n = Number(value);
  const match = kind === 'ch' ? (e) => e.ch === n - 1 : (e) => e.tr === n;
  const open = new Map();
  const notes = [];
  const chans = new Set();
  for (const e of info.events) {
    if ((e.type !== 'on' && e.type !== 'off') || !match(e)) continue;
    const key = e.ch * 128 + e.a;
    if (e.type === 'on') {
      if (!open.has(key)) open.set(key, []);
      const note = { pitch: e.a, start: e.tick, stop: undefined, startSec: e.sec, stopSec: undefined, velocity: e.b, ch: e.ch + 1 };
      open.get(key).push(note);
      notes.push(note);
      chans.add(e.ch + 1);
    } else {
      const note = open.get(key)?.shift();   // first in, first out
      if (note) { note.stop = e.tick; note.stopSec = e.sec; }
    }
  }
  const fallback = info.ppq || 96;
  for (const note of notes) {
    if (note.stop === undefined || note.stop <= note.start) { note.stop = note.start + fallback / 4; note.stopSec = note.startSec + 0.25; }
  }
  const ch = [...chans][0];
  const program = info.channels.find((c) => c.channel === ch)?.programs[0];
  return { notes, channels: [...chans].sort((a, b) => a - b), program, drums: chans.has(10) };
}

/**
 * The notes that start inside [startT, endT) ticks, with ticks relative to startT and note
 * ends cut at endT; one played just before either end, the bar's after it (EARLY).
 * `lengthTicks` is the range length.
 */
export function sliceTicks(info, notes, startT, endT) {
  const early = EARLY * (info.ppq || 0);
  return {
    notes: notes
      .filter((n) => n.start >= startT - early && n.start < endT - early)
      .map((n) => ({ ...n, start: Math.max(n.start, startT) - startT, stop: Math.min(n.stop, endT) - startT }))
      .filter((n) => n.stop > n.start),
    lengthTicks: endT - startT,
    startSec: info.tickToSec(startT),
    endSec: info.tickToSec(endT),
  };
}

/** The same for whole bars fromBar..toBar (inclusive). */
export function sliceBars(info, notes, fromBar, toBar) {
  return sliceTicks(info, notes, info.barStartTick(fromBar), info.barStartTick(toBar + 1));
}

/** Tick at a bar position: 3.5 is halfway through bar 3. */
export function tickAtBar(info, bar) {
  const whole = Math.floor(bar);
  const start = info.barStartTick(whole);
  return start + (info.barStartTick(whole + 1) - start) * (bar - whole);
}

/**
 * Round a tick to the nearest grid line of `unit`: 'step' (a 16th, midiGrid's grid square),
 * 'beat' (a quarter note) or 'bar'. Lines count from the start of the tick's bar, so they
 * follow meter changes, as midiGrid's ruler snaps its loop.
 */
export function snapTick(info, tick, unit) {
  const bar = Math.floor(info.barOfTick(tick) + 1e-9);
  const barStart = info.barStartTick(bar);
  const barEnd = info.barStartTick(bar + 1);
  if (unit === 'bar') return tick - barStart < (barEnd - barStart) / 2 ? barStart : barEnd;
  const size = unit === 'beat' ? info.ppq : info.ppq / 4;
  return Math.min(barEnd, barStart + Math.round((tick - barStart) / size) * size);
}

/** "9.2.3": bar 9, beat 2, 16th 3 (all from 1). Beats are quarter notes. */
export function formatPos(info, tick) {
  const bar = Math.floor(info.barOfTick(tick) + 1e-9);
  const into = tick - info.barStartTick(bar);
  const beat = Math.floor(into / info.ppq + 1e-9);
  const six = Math.floor((into - beat * info.ppq) / (info.ppq / 4) + 1e-9);
  return six ? `${bar}.${beat + 1}.${six + 1}` : beat ? `${bar}.${beat + 1}` : `${bar}`;
}

/** What a channel will sound like: GM drums on channel 10, else its programs. */
export function channelInstrument(c) {
  if (c.channel === 10) return 'Drums (channel 10)';
  if (!c.programs.length) return 'no Program Change → piano';
  return c.programs.map((p) => GM_PROGRAMS[p] ?? p).join(' → ');
}

/**
 * Things about this file that change how it lands in LUNA, and that the facts above them do
 * not already say (tempo changes, meter changes, lyrics and SMPTE are shown there).
 */
export function lunaNotes(info) {
  const out = [];
  const tracksWithNotes = info.tracks.filter((t) => t.notes > 0);
  if (info.format === 0) {
    out.push(`Format 0: all ${info.channels.length} channels are in one track. LUNA may import it as a single track; better send the parts by channel.`);
  }
  const empty = info.tracks.length - tracksWithNotes.length;
  if (info.format === 1 && empty > 0) out.push(`${empty} track(s) without notes (tempo, names…): LUNA may create empty tracks.`);
  const multi = tracksWithNotes.filter((t) => t.channels.length > 1);
  if (info.format === 1 && multi.length) out.push(`${multi.length} track(s) mix several channels (e.g. "${multi[0].name || `track ${multi[0].index}`}": ${multi[0].channels.join(', ')}). One instrument per track will not be enough.`);
  const changing = info.channels.filter((c) => c.channel !== 10 && c.programs.length > 1);
  if (changing.length) out.push(`Change instrument mid-song: channel ${changing.map((c) => c.channel).join(', ')}.`);
  const noPc = info.channels.filter((c) => c.channel !== 10 && !c.programs.length);
  if (noPc.length) out.push(`No Program Change (will sound as piano): channel ${noPc.map((c) => c.channel).join(', ')}.`);
  const banks = info.channels.filter((c) => (c.bankMsb ?? 0) > 0 || (c.bankLsb ?? 0) > 0);
  if (banks.length) out.push(`Use variation banks (GS/XG) on channel ${banks.map((c) => c.channel).join(', ')}: the sound may differ with GeneralUser GS.`);
  if (info.standard === 'XG') out.push('Archivo XG (Yamaha): GeneralUser-GS es GS, algunos sonidos pueden variar.');
  return out;
}


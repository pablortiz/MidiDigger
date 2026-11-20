// The chords of a song, beat by beat, from all its pitched channels together: a single channel
// (a bass, a melody) rarely spells a chord. A stretch of the song is kept as a progression, a
// short text relative to the song's key, so the same chords match in any key:
//   "M 0*4 7*2 9m*2"   in a major key, the tonic 4 beats, the fifth 2, the minor sixth 2
//   "-" for a beat with no clear chord. Roots are semitones above the tonic.

import { extractNotes } from './parts.js';

const TRIADS = [[0, 4, 7], [0, 3, 7]];   // major, minor
const CHORD_MIN = 0.6;   // share of what sounds that must be chord notes
const SPLIT_GAIN = 0.08; // how much better two chords must explain a bar than one
const ROMAN_MAJOR = ['I', 'bII', 'II', 'bIII', 'III', 'IV', '#IV', 'V', 'bVI', 'VI', 'bVII', 'VII'];
const ROMAN_MINOR = ['I', 'bII', 'II', 'III', '#III', 'IV', '#IV', 'V', 'VI', '#VI', 'VII', '#VII'];

const cache = new WeakMap();   // parsed file -> its chords

/** The chord of each beat (quarter note) of a parsed file: root * 2 + minor, or -1. */
export function songChords(info) {
  if (cache.has(info)) return cache.get(info);
  let beats = new Int8Array(0);
  if (info.ppq && !info.smpte) {
    const chroma = [];
    const add = (beat, pc, w) => { (chroma[beat] ??= new Float32Array(12))[pc] += w; };
    for (const c of info.channels) {
      if (c.channel === 10) continue;
      for (const n of extractNotes(info, `ch:${c.channel}`).notes) {
        const last = Math.floor((n.stop - 1) / info.ppq);
        for (let b = Math.floor(n.start / info.ppq); b <= last; b++) {
          add(b, n.pitch % 12, Math.min(n.stop, (b + 1) * info.ppq) - Math.max(n.start, b * info.ppq));
        }
      }
    }
    beats = new Int8Array(chroma.length).fill(-1);
    /** The chord that best explains the notes of beats [from, to): { id, score }. */
    const chordOf = (from, to) => {
      const sum = new Float32Array(12);
      for (let b = from; b < to; b++) if (chroma[b]) chroma[b].forEach((v, pc) => { sum[pc] += v; });
      const total = sum.reduce((x, y) => x + y, 0);
      let id = -1, score = 0;
      if (!total) return { id, score };
      for (let root = 0; root < 12; root++) {
        if (!sum[root]) continue;
        TRIADS.forEach((tones, minor) => {
          const share = tones.reduce((s, t) => s + sum[(root + t) % 12], 0) / total;
          if (share >= CHORD_MIN && share > score) { score = share; id = root * 2 + minor; }
        });
      }
      return { id, score };
    };
    // Chords change on a bar or halfway through it, so each bar is one chord, or two when that
    // explains its notes clearly better: an arpeggio needs its whole stretch to show its chord.
    for (let bar = 1; ; bar++) {
      const from = Math.floor(info.barStartTick(bar) / info.ppq);
      if (from >= chroma.length) break;
      const to = Math.min(chroma.length, Math.max(from + 1, Math.floor(info.barStartTick(bar + 1) / info.ppq)));
      const mid = from + Math.floor((to - from) / 2);
      const whole = chordOf(from, to);
      const first = chordOf(from, mid);
      const second = chordOf(mid, to);
      const split = mid > from && first.id >= 0 && second.id >= 0 && first.id !== second.id
        && (first.score + second.score) / 2 > whole.score + SPLIT_GAIN;
      beats.fill(split ? first.id : whole.id, from, split ? mid : to);
      if (split) beats.fill(second.id, mid, to);
    }
  }
  cache.set(info, beats);
  return beats;
}

const tonicOf = (key) => {
  const m = /^(\d+) (mayor|menor)$/.exec(key ?? '');
  return m ? { tonic: Number(m[1]), minor: m[2] === 'menor' } : null;
};

/**
 * The chords between two ticks as a progression (see above). `key` as keyClass gives it
 * ("9 menor"); `transpose`: semitones the music is moved. '' without a key or any chord.
 */
export function progressionIn(chords, ppq, startTick, endTick, key, transpose = 0) {
  const k = tonicOf(key);
  if (!k || !ppq) return '';
  const tokens = [];
  let last = null, run = 0;
  const flush = () => { if (run) tokens.push(`${last}*${run}`); };
  for (let b = Math.floor(startTick / ppq); b < Math.ceil(endTick / ppq); b++) {
    const id = chords[b] ?? -1;
    const name = id < 0 ? '-' : `${(((id >> 1) + transpose - k.tonic) % 12 + 12) % 12}${id & 1 ? 'm' : ''}`;
    if (name === last) run++;
    else { flush(); last = name; run = 1; }
  }
  flush();
  return tokens.some((t) => t[0] !== '-') ? `${k.minor ? 'm' : 'M'} ${tokens.join(' ')}` : '';
}

function parse(prog) {
  const [mode, ...tokens] = prog.split(' ');
  const beats = [];
  for (const t of tokens) {
    const [name, run] = t.split('*');
    const chord = name === '-' ? null : { root: parseInt(name, 10), minor: name.endsWith('m') };
    for (let k = 0; k < Number(run); k++) beats.push(chord);
  }
  return { minor: mode === 'm', beats };
}

/** "M 0*4 7*2 9m*2" as "I:4 V:2 vi:2", for reading. */
export function romanProgression(prog) {
  if (!prog) return '';
  const [mode, ...tokens] = prog.split(' ');
  const roman = mode === 'm' ? ROMAN_MINOR : ROMAN_MAJOR;
  return tokens.map((t) => {
    const [name, run] = t.split('*');
    if (name === '-') return `–:${run}`;
    const degree = roman[parseInt(name, 10)];
    return `${name.endsWith('m') ? degree.toLowerCase() : degree}:${run}`;
  }).join(' ');
}

const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

/** A chord as songChords gives it (root * 2 + minor), moved `transpose` semitones: "Am", "F#", '' for none. */
export function chordName(id, transpose = 0) {
  if (id === undefined || id < 0) return '';
  return `${NOTE_NAMES[((((id >> 1) + transpose) % 12) + 12) % 12]}${id & 1 ? 'm' : ''}`;
}

/**
 * A bar's chords (`beats`: one id a quarter note), as said over a pad: "Am", or "Am F" when it
 * changes within the bar; '' with none.
 */
export function barChordText(beats, transpose = 0) {
  const names = [];
  for (const id of beats) {
    const n = chordName(id, transpose);
    if (n && n !== names[names.length - 1]) names.push(n);
  }
  return names.slice(0, 2).join(' ');
}

const tonesOf = (c, shift = 0) => new Set(TRIADS[c.minor ? 1 : 0].map((t) => (c.root + shift + t) % 12));

/**
 * How well two progressions sound together, 0–1: beat by beat, 1 for the same chord, 0.75 for
 * two sharing two notes, 0.5 where one has no chord, 0 for a clash. The shorter one goes round
 * until the longer ends. Across modes a progression goes to the relative key, as parts are.
 */
export function progressionFit(a, b) {
  if (!a || !b) return 0;
  const x = parse(a);
  const y = parse(b);
  if (!x.beats.length || !y.beats.length) return 0;
  const shift = x.minor === y.minor ? 0 : y.minor ? 9 : 3;   // a minor tonic is the sixth of its relative major
  const n = Math.max(x.beats.length, y.beats.length);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const p = x.beats[i % x.beats.length];
    const q = y.beats[i % y.beats.length];
    if (!p || !q) { sum += 0.5; continue; }
    const tones = tonesOf(p);
    const common = [...tonesOf(q, shift)].filter((t) => tones.has(t)).length;
    sum += common === 3 ? 1 : common === 2 ? 0.75 : 0;
  }
  return sum / n;
}

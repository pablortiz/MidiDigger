// An audio track of the LUNA session, read from its WAV file: split into low (kick, bass), mid
// (snare, voices, guitars) and high (hats, cymbals) bands, what it is told from how its energy
// sits in them and how it dies away (drums, bass or something else), and where it strikes, as
// the groove of a MIDI track is taken: the drums' kick and snare (not the hats), the bass's notes.

import { onsetsOf } from './audio-onsets.js';

const LOW_HZ = 150;     // under this: kick and bass
const HIGH_HZ = 2500;   // over this: hats and cymbals
const HOP = 256;        // samples a step of the envelopes (5.3 ms at 48 kHz)

/**
 * The samples of a WAV file between two seconds, its channels mixed to one: { rate, samples },
 * or null when it is not a WAV it can read (PCM 16, 24 or 32 bits, or 32-bit float). Only that
 * stretch is converted, so a long file costs little.
 */
export function wavSegment(bytes, fromSec = 0, toSec = Infinity) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (at) => String.fromCharCode(bytes[at], bytes[at + 1], bytes[at + 2], bytes[at + 3]);
  if (bytes.length < 12 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE') return null;
  let fmt = null;
  let data = null;
  for (let at = 12; at + 8 <= bytes.length;) {
    const id = tag(at);
    const size = view.getUint32(at + 4, true);
    if (id === 'fmt ') {
      let format = view.getUint16(at + 8, true);
      if (format === 0xfffe && size >= 26) format = view.getUint16(at + 32, true);   // extensible: its sub-format
      fmt = { format, channels: view.getUint16(at + 10, true), rate: view.getUint32(at + 12, true), bits: view.getUint16(at + 22, true) };
    } else if (id === 'data') {
      data = { at: at + 8, size: Math.min(size, bytes.length - at - 8) };
      break;
    }
    at += 8 + size + (size & 1);
  }
  if (!fmt || !data || !fmt.channels) return null;
  const width = fmt.bits / 8;
  const float = fmt.format === 3 && fmt.bits === 32;
  if (!float && !(fmt.format === 1 && [16, 24, 32].includes(fmt.bits))) return null;
  const frameBytes = width * fmt.channels;
  const frames = Math.floor(data.size / frameBytes);
  const first = Math.max(0, Math.min(frames, Math.floor(fromSec * fmt.rate)));
  const last = Math.max(first, Math.min(frames, Math.ceil(toSec * fmt.rate)));
  const read = (p) => (float ? view.getFloat32(p, true)
    : fmt.bits === 16 ? view.getInt16(p, true) / 32768
      : fmt.bits === 24 ? ((view.getUint8(p) | (view.getUint8(p + 1) << 8) | (view.getInt8(p + 2) << 16)) / 8388608)
        : view.getInt32(p, true) / 2147483648);
  const samples = new Float32Array(last - first);
  for (let f = first; f < last; f++) {
    let sum = 0;
    for (let c = 0; c < fmt.channels; c++) sum += read(data.at + f * frameBytes + c * width);
    samples[f - first] = sum / fmt.channels;
  }
  return { rate: fmt.rate, samples };
}

/** A second-order filter (RBJ's cookbook): 'low' or 'high' pass at `hz`. */
function biquad(kind, hz, rate) {
  const w = (2 * Math.PI * hz) / rate;
  const a = Math.sin(w) / (2 * Math.SQRT1_2);
  const c = Math.cos(w);
  const b0 = kind === 'low' ? (1 - c) / 2 : (1 + c) / 2;
  const b1 = kind === 'low' ? 1 - c : -(1 + c);
  const a0 = 1 + a;
  const k = [b0 / a0, b1 / a0, b0 / a0, (-2 * c) / a0, (1 - a) / a0];
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x) => {
    const y = k[0] * x + k[1] * x1 + k[2] * x2 - k[3] * y1 - k[4] * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    return y;
  };
}

/**
 * The loudness of each band, a step of HOP samples at a time (the peak of the step): { perSecond,
 * low, mid, high } (Float32Arrays), and each band's energy over all of it (its share of the whole).
 */
export function bandEnvelopes(samples, rate) {
  const lowPass = [biquad('low', LOW_HZ, rate), biquad('low', LOW_HZ, rate)];
  const highPass = [biquad('high', HIGH_HZ, rate), biquad('high', HIGH_HZ, rate)];
  const midHigh = biquad('high', LOW_HZ, rate);
  const midLow = biquad('low', HIGH_HZ, rate);
  const steps = Math.floor(samples.length / HOP);
  const env = { perSecond: rate / HOP, low: new Float32Array(steps), mid: new Float32Array(steps), high: new Float32Array(steps) };
  const energy = { low: 0, mid: 0, high: 0 };
  for (let s = 0; s < steps; s++) {
    let lo = 0, mi = 0, hi = 0;
    for (let i = s * HOP; i < (s + 1) * HOP; i++) {
      const x = samples[i];
      const l = lowPass[1](lowPass[0](x));
      const h = highPass[1](highPass[0](x));
      const m = midLow(midHigh(x));
      lo = Math.max(lo, Math.abs(l)); mi = Math.max(mi, Math.abs(m)); hi = Math.max(hi, Math.abs(h));
      energy.low += l * l; energy.mid += m * m; energy.high += h * h;
    }
    env.low[s] = lo; env.mid[s] = mi; env.high[s] = hi;
  }
  const total = energy.low + energy.mid + energy.high || 1;
  env.share = { low: energy.low / total, mid: energy.mid / total, high: energy.high / total };
  // A low tone lasts longer than a step (55 Hz: 18 ms a cycle): the peak of the last 26 ms, or
  // its level would ripple with the wave and hide the notes' attacks.
  env.low = recentMax(env.low, 5);
  return env;
}

/** Each step the loudest of the last `n` (a rise shows at once, a fall is held that long). */
function recentMax(e, n) {
  const out = new Float32Array(e.length);
  for (let i = 0; i < e.length; i++) {
    let m = 0;
    for (let k = Math.max(0, i - n + 1); k <= i; k++) if (e[k] > m) m = e[k];
    out[i] = m;
  }
  return out;
}

/** An envelope scaled to its loudest point (hits are found the same in a quiet track and a loud one). */
const normalized = (e) => {
  let max = 0;
  for (const v of e) if (v > max) max = v;
  return max ? e.map((v) => v / max) : e;
};

/** How much of a hit is left 80 ms after it, on average (0: dies at once, a drum; 1: held). */
function sustain(env, hits, perSecond) {
  const later = Math.round(0.08 * perSecond);
  const ratios = hits.map((h) => {
    const at = Math.round(h.sec * perSecond);
    const peak = Math.max(...env.slice(at, at + Math.round(0.01 * perSecond) + 1));
    return peak ? (env[Math.min(env.length - 1, at + later)] ?? 0) / peak : 1;
  });
  return ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 1;
}

/**
 * What an audio track is and where it strikes: { role: 'drums' | 'bass' | 'other', why (a few
 * words, for the log), hits: [sec…] (its groove: a drum kit's kick and snare, a bass's notes) }.
 * A bass is mostly low and held; drums strike and die away, with highs (hats, snare) or a
 * kick; anything else (a voice, a pad, guitars) is 'other'.
 */
export function analyseTrack(samples, rate) {
  const env = bandEnvelopes(samples, rate);
  const { perSecond, share } = env;
  const full = normalized(env.low.map((v, i) => Math.max(v, env.mid[i], env.high[i])));
  const hitsAll = onsetsOf(full, perSecond);
  const held = sustain(full, hitsAll, perSecond);
  const perSec = hitsAll.length / Math.max(0.5, samples.length / rate);
  const pc = (x) => `${Math.round(x * 100)} %`;
  const facts = `low ${pc(share.low)}, high ${pc(share.high)}, ${perSec.toFixed(1)} hits/s, ${pc(held)} left after 80 ms`;
  const lows = onsetsOf(normalized(env.low), perSecond);
  const kick = lows.filter((h) => h.strength > 0.3);
  // Measured on a LUNA session's tracks: a drum kit always has some highs (hats, snare: 5 % and
  // up), a bass next to none (0–1 %), whether slapped, fingered or fretless; a kick may be as low
  // as a bass. So the highs tell them apart. A kit with no kick (a shaker, hats) strikes shorter.
  if (share.high >= 0.04 && held < 0.6 && perSec >= 0.8 && (share.low >= 0.1 || held < 0.3)) {
    // Kick (lows) and snare (mids, strong): the hats (highs alone) left out.
    const snare = onsetsOf(normalized(env.mid), perSecond).filter((h) => h.strength > 0.4);
    const hits = [...kick, ...snare].map((h) => h.sec).sort((a, b) => a - b)
      .filter((t, k, all) => k === 0 || t - all[k - 1] > 0.04);
    return { role: 'drums', why: `strikes and dies away, with highs (${facts})`, hits };
  }
  // A bass plays notes (measured: 3.8 to 9.5 a second); a low pad is as low, highless and held,
  // but hardly strikes (1.4).
  if (share.low >= 0.25 && share.high < 0.03 && held > 0.3 && perSec >= 2) {
    // A bass's notes: every attack in its lows (a note over a held one rises less than a kick).
    return { role: 'bass', why: `low, no highs, held (${facts})`, hits: lows.filter((h) => h.strength > 0.1).map((h) => h.sec) };
  }
  return { role: 'other', why: facts, hits: [] };
}

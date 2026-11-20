import { noteColor } from './mini.js';

const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const pitchName = (pitch) => `${NAMES[pitch % 12]}${Math.floor(pitch / 12) - 1}`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** One colour for each row of the loop in its grid. */
export const LAYER_COLORS = ['#e8a33d', '#5fb3e6', '#8fd16a', '#e06c9f', '#b48cf0', '#e6d35f', '#5fe0c4', '#f08c6a', '#9aa6b2', '#d0d0d0'];

function checkMeter(bars, beats) {
  if (!(Number.isInteger(bars) && bars > 0 && Number.isFinite(beats) && beats > 0)) throw new Error('Invalid fragment or meter.');
}

function checkNote(note) {
  if (![note.beat, note.len, note.pitch, note.vel].every(Number.isFinite)
    || !Number.isInteger(note.pitch) || note.len <= 0) throw new Error('Invalid MIDI note in the fragment.');
}

/**
 * The grid itself: notes ({ beat, len, pitch, vel, fill, title }) by pitch and bar. With `width`
 * and `height` (pixels) it fits them whole, no scroll: the bars share the width, the octaves the
 * notes use share the height.
 */
function gridSvg(notes, { bars, beats, width = null, height = null, label = 'MIDI notes by pitch and bar' }) {
  const end = bars * beats;
  const range = notes.reduce((r, note) => ({ low: Math.min(r.low, note.pitch), high: Math.max(r.high, note.pitch) }), { low: 127, high: 0 });
  // The notes it has and a step either side: no empty octaves taking the room.
  const low = Math.max(0, range.low - 1);
  const high = Math.min(127, range.high + 1);
  const pitchesN = high - low + 1;
  const top = 20, left = 34;
  const inner = width ? Math.max(120, width - left - 2) : Math.max(360, bars * 65);
  const row = height ? Math.min(8, Math.max(1.2, (height - top - 2) / pitchesN)) : 7;
  const full = top + pitchesN * row + 2;
  const x = (beat) => left + beat / end * inner;
  const y = (pitch) => top + (high - pitch) * row;
  // A name on each C, and on the lowest note when no C is in (a few drums, a short phrase).
  const named = (pitch) => pitch % 12 === 0 || (pitch === range.low && !Array.from({ length: pitchesN }, (_, i) => low + i).some((p) => p % 12 === 0));
  const lines = Array.from({ length: pitchesN }, (_, i) => high - i).map((pitch) => {
    const strong = pitch % 12 === 0;
    const text = named(pitch) ? `<text x="${left - 3}" y="${Math.min(full - 1, y(pitch) + row / 2 + 3.5).toFixed(2)}" text-anchor="end">${pitchName(pitch)}</text>` : '';
    if (!strong && row < 3) return text;
    return `<path d="M${left} ${y(pitch).toFixed(2)}h${inner}" class="${strong ? 'octave' : 'pitch'}"/>${text}`;
  }).join('');
  // Half beats while there is room for them; else the beats; else only the bars.
  const perBeat = inner / end;
  const step = perBeat >= 12 ? 0.5 : perBeat >= 5 ? 1 : beats;
  const measures = Array.from({ length: bars }, (_, bar) => {
    const at = x(bar * beats);
    const subdivisions = step < beats ? Array.from({ length: Math.ceil(beats / step) - 1 }, (_, k) =>
      `<path d="M${x(bar * beats + (k + 1) * step).toFixed(2)} ${top}v${full - top}" class="beat"/>`).join('') : '';
    const number = inner / bars >= 14 || bar % Math.ceil(14 / (inner / bars)) === 0 ? `<text x="${at + 3}" y="14">${bar + 1}</text>` : '';
    return `${subdivisions}<path d="M${at.toFixed(2)} ${top}v${full - top}" class="bar"/>${number}`;
  }).join('');
  const tall = Math.max(1, row > 3 ? row - 1 : row);
  const rectangles = notes.map((note) => {
    const length = Math.min(note.len, end - note.beat);
    return `<rect class="note" x="${x(note.beat).toFixed(2)}" y="${y(note.pitch).toFixed(2)}" width="${Math.max(1, length / end * inner).toFixed(2)}" height="${tall.toFixed(2)}" fill="${note.fill}"><title>${esc(note.title ? `${note.title} · ` : '')}${pitchName(note.pitch)} · velocity ${note.vel}</title></rect>`;
  }).join('');
  const w = left + inner;
  return `<svg class="fill-midi-grid" role="img" aria-label="${esc(label)}" viewBox="0 0 ${w} ${full.toFixed(2)}" width="${w}" height="${full.toFixed(2)}">${lines}${measures}${rectangles}</svg>`;
}

/** A fragment's auditioned notes, with time in bars and MIDI pitches on the vertical axis. */
export function fillMidiGrid(clip, { bars, beats, transpose = 0, drums = false, width = null, height = null }) {
  checkMeter(bars, beats);
  if (!Number.isFinite(transpose) || !Array.isArray(clip.notes)) throw new Error('Invalid fragment or meter.');
  const end = bars * beats;
  const notes = clip.notes.map((note) => {
    checkNote(note);
    const pitch = Math.max(0, Math.min(127, note.pitch + (drums ? 0 : transpose)));
    return { ...note, pitch, fill: noteColor(pitch, note.vel, drums) };
  }).filter((note) => note.beat >= 0 && note.beat < end);
  if (!notes.length) throw new Error('The fragment has no notes within its length.');
  return gridSvg(notes, { bars, beats, width, height });
}

/**
 * Several rows at once, each its colour (LAYER_COLORS), with a key of names: those with notes in
 * one grid, the drums in one of their own under it (their notes are drums, not pitches).
 * `layers`: [{ name, drums, notes }], notes in beats from the start.
 */
export function loopMidiGrid(layers, { bars, beats, width = null, height = null }) {
  checkMeter(bars, beats);
  const end = bars * beats;
  const colored = layers.map((layer, i) => ({ ...layer, color: LAYER_COLORS[i % LAYER_COLORS.length] }))
    .filter((layer) => layer.notes?.length);
  if (!colored.length) throw new Error('No row plays notes.');
  const notesOf = (list) => list.flatMap((layer) => layer.notes.map((note) => { checkNote(note); return { ...note, fill: layer.color, title: layer.name }; }))
    .filter((note) => note.beat >= 0 && note.beat < end);
  const pitched = notesOf(colored.filter((layer) => !layer.drums));
  const drums = notesOf(colored.filter((layer) => layer.drums));
  const key = colored.map((layer) => `<span><i style="background:${layer.color}"></i>${esc(layer.name || 'Instrument')}</span>`).join('');
  const share = pitched.length && drums.length ? 0.7 : 1;
  return `<div class="fill-midi-key">${key}</div>`
    + (pitched.length ? gridSvg(pitched, { bars, beats, width, height: height && height * share, label: 'The loop rows with notes, by pitch and bar' }) : '')
    + (drums.length ? gridSvg(drums, { bars, beats, width, height: height && height * (1 - share || 1), label: 'The loop drums, by drum and bar' }) : '');
}

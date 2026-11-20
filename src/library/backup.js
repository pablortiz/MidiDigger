// The analysis as one binary file (.mdig), to take it up again without analysing (LUNA wipes the
// page's storage when it restarts). Each file's record goes with a fingerprint of its bytes, so
// that a restore only takes the records of files that are still the same.
//
// The file is columns, not text: a number of each part or fragment sits in a typed array, every
// one of a kind in a row, so it is a third of the size of a .json, has no limit of length (a
// .json of millions of fragments does not fit in a string) and is read without parsing.
//   bytes 0–7    "MDIGGER1"
//   bytes 8–11   the header's length, a 32-bit number, low byte first
//   the header   JSON: { app, v, saved, root, model, sections: [{ name, type, length, offset }] }
//   the data     from the next multiple of 8; each section at its `offset` from there (a multiple
//                of 8 too), `length` elements of `type`: 'u8', 'u16', 'u32', 'f32' or 'json' (UTF-8 text,
//                `length` in bytes). Numbers low byte first.
// Sections: `files` (json: each file's record without its parts, with `partCount`), `names`
// (json: a track name per part), `progressions` and `grooves` (json: the different ones; a
// fragment says which by its place), a column per number of a part (`part.<field>`, as PART names
// them, and `part.fragCount`) and of a fragment (`frag.<field>` as FRAG names them), `grids` and
// `hits` for the existing compact harmonic/rhythm summaries, and compact per-fragment gesture
// scores. Older v23 files may also have `noteEvents`, three u32 values per note; those are read
// for compatibility. New exports may include them for other tools; the plugin can skip them
// while restoring because compact gesture scores are stored separately.
// An export "with MIDI events" (`includeEvents`) holds, per fragment:
//   frag.eventCount + noteEvents   notes: [start, duration, pitch | velocity << 8], ticks from the
//                                  fragment's first bar, in the file's PPQ
//   frag.controlCount + controlEvents  [tick, number | value << 8] pairs: volume (7), pan (10),
//                                  expression (11), sustain (64) and pitch bend (128, value 0–16383);
//                                  each as it stands when the fragment starts comes first, at tick 0
//   frag.tempoCount + tempoEvents  tempo: [tick, microseconds a quarter note] pairs; the first, at
//                                  tick 0, is the one in force when the fragment starts
// Enough to play a fragment without its MIDI file: the instrument is `part.program`, drums
// (`part.role` 0) go to channel 10.
// `model` says which harmony model the add-on had (midi/harmony.js), for the record.

import { FRAG, PART, RECORD_VERSION, ROLES } from '../midi/features.js';
import { DRUM_GESTURES, fragmentGestureScores } from '../midi/gestures.js';
import { HARMONY_MODEL, STEPS_PER_BEAT } from '../midi/harmony.js';

const ANALYSIS_FILE = 'MIDI Digger analysis';
const MAGIC = 'MDIGGER1';
export const ANALYSIS_EXT = '.mdig';
const TYPES = { u8: Uint8Array, u16: Uint16Array, u32: Uint32Array, f32: Float32Array };

// Each number of a part and of a fragment, and how wide it is kept.
const PART_COLUMNS = { ch: 'u8', program: 'u8', role: 'u8', notes: 'u32', bars: 'u16', density: 'u16', poly: 'u8', min: 'u8', max: 'u8', loopBars: 'u16', loopCount: 'u16', loopCov: 'u8', loopStart: 'u16' };
const FRAG_COLUMNS = { bars: 'u16', start: 'u16', count: 'u16', cov: 'u8', shape: 'u8', energy: 'u8', at: 'u32', ticks: 'u32', velocity: 'u8', velocitySpread: 'u8' };
const SCORE_COLUMNS = [
  ['snareRoll', 'f32', FRAG.scoreSnareRoll],
  ['arpeggio', 'f32', FRAG.scoreArpeggio],
  ...DRUM_GESTURES.map((gesture, k) => [gesture, 'u8', FRAG.gestureScores + k]),
];

/** A file's bytes in a few characters: its length and a 32-bit FNV-1a hash. */
export function fingerprint(bytes) {
  let h = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) h = Math.imul(h ^ bytes[i], 0x01000193);
  return `${bytes.length}:${(h >>> 0).toString(16).padStart(8, '0')}`;
}

/** The analysis of the library at `root`: `records` as the store keeps them, each with its `fp`. */
export function analysisFile(root, records) {
  return { app: ANALYSIS_FILE, v: RECORD_VERSION, saved: new Date().toISOString(), root, files: records };
}

/** An analysisFile as the bytes of a .mdig (see the top of the file): a Uint8Array. */
export function encodeAnalysis(file, { includeEvents = false, extra = {} } = {}) {
  let parts = 0, frags = 0, steps = 0, hitBytes = 0, eventWords = 0, controlWords = 0, tempoWords = 0;
  for (const r of file.files) {
    for (const p of r.parts ?? []) {
      parts++;
      for (const f of p[PART.frags] ?? []) {
        frags++;
        steps += f[FRAG.grid]?.length ?? 0;
        hitBytes += f[FRAG.hits] ? Math.ceil((f[FRAG.hitSteps] ?? 0) / 8) : 0;
        if (includeEvents) {
          eventWords += f[FRAG.events]?.length ?? 0;
          controlWords += f[FRAG.controls]?.length ?? 0;
          tempoWords += f[FRAG.tempo]?.length ?? 0;
        }
      }
    }
  }
  const cols = { 'part.fragCount': new Uint32Array(parts), 'frag.chords': new Uint32Array(frags), 'frag.groove': new Uint32Array(frags), 'frag.gridLen': new Uint16Array(frags), grids: new Uint16Array(steps), 'frag.hitLen': new Uint16Array(frags), hits: new Uint8Array(hitBytes) };
  if (includeEvents) {
    cols['frag.eventCount'] = new Uint32Array(frags);
    cols.noteEvents = new Uint32Array(eventWords);
    cols['frag.controlCount'] = new Uint32Array(frags);
    cols.controlEvents = new Uint32Array(controlWords);
    cols['frag.tempoCount'] = new Uint16Array(frags);
    cols.tempoEvents = new Uint32Array(tempoWords);
  }
  for (const [k, t] of Object.entries(PART_COLUMNS)) cols[`part.${k}`] = new TYPES[t](parts);
  for (const [k, t] of Object.entries(FRAG_COLUMNS)) cols[`frag.${k}`] = new TYPES[t](frags);
  for (const [name, type] of SCORE_COLUMNS) cols[`frag.score.${name}`] = new TYPES[type](frags);
  const names = [];
  const lists = { chords: [''], groove: [''] };
  const ids = { chords: new Map([['', 0]]), groove: new Map([['', 0]]) };
  const idOf = (kind, text = '') => {
    let id = ids[kind].get(text);
    if (id === undefined) { id = lists[kind].length; lists[kind].push(text); ids[kind].set(text, id); }
    return id;
  };
  const metas = [];
  let pi = 0, fi = 0, gi = 0, hi = 0, ei = 0, di = 0, ti = 0;
  for (const r of file.files) {
    const { parts: own = [], ...meta } = r;
    metas.push({ ...meta, searchScores: includeEvents || meta.searchScores !== false, partCount: own.length });
    for (const p of own) {
      for (const k of Object.keys(PART_COLUMNS)) cols[`part.${k}`][pi] = p[PART[k]] ?? 0;
      names.push(p[PART.name] ?? '');
      const list = p[PART.frags] ?? [];
      cols['part.fragCount'][pi++] = list.length;
      for (const f of list) {
        for (const k of Object.keys(FRAG_COLUMNS)) cols[`frag.${k}`][fi] = f[FRAG[k]] ?? 0;
        cols['frag.chords'][fi] = idOf('chords', f[FRAG.chords]);
        cols['frag.groove'][fi] = idOf('groove', f[FRAG.groove]);
        const grid = f[FRAG.grid];
        if (grid?.length) { cols['frag.gridLen'][fi] = grid.length; cols.grids.set(grid, gi); gi += grid.length; }
        if (f[FRAG.hits] && f[FRAG.hitSteps]) {
          const bytes = Math.ceil(f[FRAG.hitSteps] / 8);
          cols['frag.hitLen'][fi] = f[FRAG.hitSteps];
          cols.hits.set(f[FRAG.hits].subarray(0, bytes), hi);
          hi += bytes;
        }
        if (includeEvents) {
          const events = f[FRAG.events];
          cols['frag.eventCount'][fi] = (events?.length ?? 0) / 3;
          if (events?.length) {
            cols.noteEvents.set(events, ei);
            ei += events.length;
          }
          const controls = f[FRAG.controls];
          cols['frag.controlCount'][fi] = (controls?.length ?? 0) / 2;
          if (controls?.length) { cols.controlEvents.set(controls, di); di += controls.length; }
          const tempo = f[FRAG.tempo];
          cols['frag.tempoCount'][fi] = (tempo?.length ?? 0) / 2;
          if (tempo?.length) { cols.tempoEvents.set(tempo, ti); ti += tempo.length; }
        }
        const scoreCached = SCORE_COLUMNS.every(([, , index]) => Number.isFinite(f[index]));
        const scores = scoreCached ? null : fragmentGestureScores(f[FRAG.events], {
          ppq: r.ppq ?? 0,
          timeSig: r.ts,
          bars: f[FRAG.bars],
          drums: p[PART.role] === ROLES.indexOf('drums'),
        });
        for (const [name, , index] of SCORE_COLUMNS) {
          const value = f[index];
          cols[`frag.score.${name}`][fi] = Number.isFinite(value)
            ? value
            : name === 'snareRoll' ? scores.snareRoll
              : name === 'arpeggio' ? scores.arpeggio
                : Math.round(scores.drums[name] * 100);
        }
        fi++;
      }
    }
  }
  const utf8 = new TextEncoder();
  // `extra`: more JSON sections of the caller's ("extra.<name>"), as Favorites' collections; tools
  // that do not know them (MDIG Viewer) read the rest as any analysis.
  const json = { files: metas, names, progressions: lists.chords, grooves: lists.groove,
    ...Object.fromEntries(Object.entries(extra).map(([k, v]) => [`extra.${k}`, v])) };
  const sections = [];
  const chunks = [];
  let offset = 0;
  const add = (name, type, length, bytes) => {
    sections.push({ name, type, length, offset });
    chunks.push([offset, bytes]);
    offset += Math.ceil(bytes.byteLength / 8) * 8;
  };
  for (const [name, value] of Object.entries(json)) {
    const bytes = utf8.encode(JSON.stringify(value));
    add(name, 'json', bytes.byteLength, bytes);
  }
  for (const [name, col] of Object.entries(cols)) {
    const type = Object.keys(TYPES).find((t) => col instanceof TYPES[t]);
    add(name, type, col.length, new Uint8Array(col.buffer, col.byteOffset, col.byteLength));
  }
  const header = utf8.encode(JSON.stringify({
    app: file.app, v: file.v, saved: file.saved, root: file.root,
    model: { ...HARMONY_MODEL, stepsPerBeat: STEPS_PER_BEAT }, counts: { files: metas.length, parts, fragments: frags }, sections,
  }));
  const start = Math.ceil((12 + header.byteLength) / 8) * 8;
  const out = new Uint8Array(start + offset);
  out.set(utf8.encode(MAGIC), 0);
  new DataView(out.buffer).setUint32(8, header.byteLength, true);
  out.set(header, 12);
  for (const [at, bytes] of chunks) out.set(bytes, start + at);
  return out;
}

/** The bytes of a .mdig as the analysisFile they were made from. Throws, saying why, when they are not one. */
export function decodeAnalysis(bytes, { includeEvents = true } = {}) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const text = new TextDecoder();
  if (u8.length && u8[0] === 0x7b) throw new Error('That analysis was saved as .json by an earlier version of MIDI Digger: analyse the library again (Analyse) and save it anew.');
  if (u8.length < 12 || text.decode(u8.subarray(0, 8)) !== MAGIC) throw new Error('That file is not an analysis saved by MIDI Digger.');
  // On a buffer of its own from byte 0, so that the columns can be read in place.
  const own = u8.byteOffset % 8 === 0 ? u8 : u8.slice();
  const headerLen = new DataView(own.buffer, own.byteOffset, own.byteLength).getUint32(8, true);
  let header;
  try { header = JSON.parse(text.decode(own.subarray(12, 12 + headerLen))); } catch { throw new Error('That analysis file is damaged (its header cannot be read).'); }
  if (header?.app !== ANALYSIS_FILE || !Array.isArray(header.sections)) throw new Error('That file is not an analysis saved by MIDI Digger.');
  const start = Math.ceil((12 + headerLen) / 8) * 8;
  const section = (name) => {
    const s = header.sections.find((x) => x.name === name);
    if (!s) throw new Error(`That analysis file is damaged (it has no "${name}").`);
    const at = own.byteOffset + start + s.offset;
    const size = s.type === 'json' ? s.length : s.length * TYPES[s.type].BYTES_PER_ELEMENT;
    if (start + s.offset + size > own.byteLength) throw new Error('That analysis file is cut short: save it again.');
    return s.type === 'json' ? JSON.parse(text.decode(new Uint8Array(own.buffer, at, s.length))) : new TYPES[s.type](own.buffer, at, s.length);
  };
  const hasSection = (name) => header.sections.some((s) => s.name === name);
  const optionalSection = (name, type, length) => hasSection(name) ? section(name) : new TYPES[type](length);
  const metas = section('files');
  const names = section('names');
  const lists = { chords: section('progressions'), groove: section('grooves') };
  const part = Object.fromEntries(Object.keys(PART_COLUMNS).map((k) => [k, section(`part.${k}`)]));
  const frag = Object.fromEntries(Object.keys(FRAG_COLUMNS).map((k) => [k, section(`frag.${k}`)]));
  const score = Object.fromEntries(SCORE_COLUMNS.map(([name]) => [
    name, hasSection(`frag.score.${name}`) ? section(`frag.score.${name}`) : null,
  ]));
  const hasCachedScores = SCORE_COLUMNS.every(([name]) => score[name]);
  const eventCount = optionalSection('frag.eventCount', 'u32', header.counts.fragments);
  const fragCount = section('part.fragCount');
  const chords = section('frag.chords');
  const groove = section('frag.groove');
  const gridLen = section('frag.gridLen');
  const grids = section('grids');
  const hitLen = section('frag.hitLen');
  const hits = section('hits');
  const noteEvents = hasSection('noteEvents') ? section('noteEvents') : new Uint32Array();
  const controlCount = optionalSection('frag.controlCount', 'u32', header.counts.fragments);
  const controlEvents = hasSection('controlEvents') ? section('controlEvents') : new Uint32Array();
  const tempoCount = optionalSection('frag.tempoCount', 'u16', header.counts.fragments);
  const tempoEvents = hasSection('tempoEvents') ? section('tempoEvents') : new Uint32Array();
  let pi = 0, fi = 0, gi = 0, hi = 0, ei = 0, di = 0, ti = 0;
  const files = metas.map(({ partCount = 0, ...meta }) => {
    if (!meta.ok && !partCount) return meta;
    const parts = [];
    for (let k = 0; k < partCount; k++, pi++) {
      const p = [];
      for (const key of Object.keys(PART_COLUMNS)) p[PART[key]] = part[key][pi];
      p[PART.name] = names[pi];
      const list = [];
      for (let n = 0; n < fragCount[pi]; n++, fi++) {
        const f = [];
        for (const key of Object.keys(FRAG_COLUMNS)) f[FRAG[key]] = frag[key][fi];
        for (const [name, , index] of SCORE_COLUMNS) {
          if (score[name]) f[index] = score[name][fi];
        }
        f[FRAG.chords] = lists.chords[chords[fi]];
        f[FRAG.groove] = lists.groove[groove[fi]];
        // The small arrays kept in IndexedDB must own their buffers, not retain this whole file.
        f[FRAG.grid] = gridLen[fi] ? grids.slice(gi, gi + gridLen[fi]) : null;
        gi += gridLen[fi];
        const bytes = Math.ceil(hitLen[fi] / 8);
        f[FRAG.hits] = bytes ? hits.slice(hi, hi + bytes) : null;
        f[FRAG.hitSteps] = hitLen[fi];
        hi += bytes;
        const eventWords = eventCount[fi] * 3;
        const events = eventWords && (includeEvents || !hasCachedScores)
          ? noteEvents.subarray(ei, ei + eventWords)
          : null;
        if (includeEvents) f[FRAG.events] = events;
        else {
          f[FRAG.events] = null;
          if (events && !hasCachedScores) {
            const scores = fragmentGestureScores(events, {
              ppq: meta.ppq ?? 0,
              timeSig: meta.ts,
              bars: f[FRAG.bars],
              drums: p[PART.role] === ROLES.indexOf('drums'),
            });
            f[FRAG.scoreSnareRoll] = scores.snareRoll;
            f[FRAG.scoreArpeggio] = scores.arpeggio;
            DRUM_GESTURES.forEach((gesture, j) => {
              f[FRAG.gestureScores + j] = Math.round(scores.drums[gesture] * 100);
            });
          }
        }
        ei += eventWords;
        const controlWords = controlCount[fi] * 2;
        const tempoWords = tempoCount[fi] * 2;
        f[FRAG.controls] = includeEvents && controlWords ? controlEvents.subarray(di, di + controlWords) : null;
        f[FRAG.tempo] = includeEvents && tempoWords ? tempoEvents.subarray(ti, ti + tempoWords) : null;
        di += controlWords;
        ti += tempoWords;
        list.push(f);
      }
      p[PART.frags] = list;
      parts.push(p);
    }
    return { ...meta, parts };
  });
  const extra = Object.fromEntries(header.sections.filter((s) => s.name.startsWith('extra.')).map((s) => [s.name.slice(6), section(s.name)]));
  return { app: header.app, v: header.v, saved: header.saved, root: header.root, model: header.model, files, extra };
}

/** A .mdig's bytes, checked. Throws, saying why, when it cannot be restored here. */
export function readAnalysis(bytes, options) {
  const file = decodeAnalysis(bytes, options);
  if (file.v !== RECORD_VERSION) throw new Error('That analysis was saved by another version of MIDI Digger: analyse the library again (Analyse).');
  return file;
}

/**
 * Which records of `file` may be restored in the library listed as `paths`: `check` those in
 * both (their bytes still to compare), `gone` those of files no longer there, `unsaved` how
 * many files of the library the analysis lacks. Paths are compared without case (Windows).
 */
export function matchAnalysis(file, paths) {
  const here = new Map(paths.map((p) => [p.toLowerCase(), p]));
  const check = [];
  const gone = [];
  const saved = new Set();
  for (const r of file.files) {
    const path = here.get(String(r.path).toLowerCase());
    saved.add(String(r.path).toLowerCase());
    if (path && r.fp) check.push({ ...r, path });
    else gone.push(r.path);
  }
  const unsaved = paths.filter((p) => !saved.has(p.toLowerCase())).length;
  return { check, gone, unsaved };
}

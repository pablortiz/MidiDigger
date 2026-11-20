// The searchable catalogue of parts, in memory. Half a million parts are kept in typed
// columns (a few MB) so a search over all of them takes milliseconds.

import { ENERGIES, FRAG, PART, RECORD_VERSION, ROLES, SHAPES, keyClass } from '../midi/features.js';
import { GM_PROGRAMS } from '../midi/gm.js';
import {
  DRUM_GESTURES, DRUM_GESTURE_MIN_SCORE, DRUM_SOUND_GESTURES, fragmentGestureScores,
  parseMusicalQuery, SNARE_ROLL_MIN_SCORE,
} from '../midi/gestures.js';
import { unpackHits } from '../midi/rhythm.js';

const COLUMNS = {
  file: Uint32Array, ch: Uint8Array, program: Uint8Array, role: Uint8Array, notes: Uint32Array, bars: Uint16Array,
  density: Uint16Array, poly: Uint8Array, min: Uint8Array, max: Uint8Array,
  loopBars: Uint8Array, loopCount: Uint16Array, loopCov: Uint8Array, loopStart: Uint16Array,
  fragFirst: Uint32Array, fragTotal: Uint16Array,   // a part's fragments: where they start, how many
};
// Fragments, each part's in a row, as many as it has.
const FRAG_COLUMNS = {
  fragBars: Uint8Array, fragStart: Uint16Array, fragCount: Uint16Array, fragCov: Uint8Array, fragShape: Uint8Array, fragEnergy: Uint8Array,
  fragChords: Uint32Array,   // into `progressions`: few different ones, shared by many fragments
  fragGroove: Uint32Array,   // into `grooves` (midi/groove.js), the same way
  fragAt: Uint32Array, fragTicks: Uint32Array,   // exact, in the file's ticks
  fragVelocity: Uint8Array, fragVelocitySpread: Uint8Array,
  fragGridAt: Uint32Array, fragGridLen: Uint16Array,   // its notes as a grid (midi/harmony.js), in `grids`; length 0: none
  fragHitAt: Uint32Array, fragHitLen: Uint16Array,     // its strikes (midi/rhythm.js) as bits in `hitBytes`, and how many steps; 0: none
  fragSnareRoll: Float32Array,
  fragArpeggio: Float32Array,
  ...Object.fromEntries(DRUM_GESTURES.map((gesture) => [`fragGesture_${gesture}`, Uint8Array])),
};
// A result is a part index, plus this for each fragment after its first: a part's first
// fragment is just the part, and everything that takes a part takes a fragment.
const FRAG_ID = 2 ** 32;
const ARPEGGIO_MIN_SCORE = 0.82;

export function hasSearchScores(record) {
  if (record.searchScores === false) return false;
  if (record.searchScores === true) return true;
  return (record.parts ?? []).every((part) => (part[PART.frags] ?? []).every((fragment) => {
    if (!fragment[FRAG.bars] || !fragment[FRAG.ticks]) return true;
    const cached = Number.isFinite(fragment[FRAG.scoreSnareRoll])
      && Number.isFinite(fragment[FRAG.scoreArpeggio])
      && DRUM_GESTURES.every((_, k) => Number.isFinite(fragment[FRAG.gestureScores + k]));
    return cached || !!fragment[FRAG.events];
  }));
}

/**
 * The record's Search gesture scores worked out from its note events, and the events (with the
 * controls and tempo kept beside them) dropped, unless `keepEvents`: an analysis saved
 * "with MIDI events" keeps them for other tools.
 */
export function compactSearchScores(record, { keepEvents = false } = {}) {
  const parts = record.parts ?? [];
  let available = record.searchScores !== false;
  for (const part of parts) {
    for (const fragment of part[PART.frags] ?? []) {
      const events = fragment[FRAG.events];
      let scoresCached = record.searchScores !== false && Number.isFinite(fragment[FRAG.scoreSnareRoll])
        && Number.isFinite(fragment[FRAG.scoreArpeggio])
        && DRUM_GESTURES.every((_, k) => Number.isFinite(fragment[FRAG.gestureScores + k]));
      if (!scoresCached && events) {
        const scores = fragmentGestureScores(events, {
          ppq: record.ppq ?? 0,
          timeSig: record.ts,
          bars: fragment[FRAG.bars],
          drums: part[PART.role] === ROLES.indexOf('drums'),
        });
        fragment[FRAG.scoreSnareRoll] = scores.snareRoll;
        fragment[FRAG.scoreArpeggio] = scores.arpeggio;
        DRUM_GESTURES.forEach((gesture, k) => {
          fragment[FRAG.gestureScores + k] = Math.round(scores.drums[gesture] * 100);
        });
        scoresCached = true;
      }
      if (record.searchScores !== true && fragment[FRAG.bars] && fragment[FRAG.ticks] && !scoresCached) available = false;
      if (!keepEvents) {
        if (events) fragment[FRAG.events] = null;
        if (fragment[FRAG.controls] !== undefined) fragment[FRAG.controls] = null;
        if (fragment[FRAG.tempo] !== undefined) fragment[FRAG.tempo] = null;
      }
    }
  }
  record.searchScores = available;
  return record;
}

export class Catalog {
  constructor() {
    this.files = [];          // file records without their parts: { path, ok, dur, bpm, ts, key, ... }
    this.byPath = new Map();  // path -> file index
    this.lowerPath = [];      // for text search: path, title and author
    this.names = [];          // track name per part
    this.progressions = [''];              // the different chord progressions (midi/chords.js)
    this.progressionIds = new Map([['', 0]]);
    this.grooves = [''];                   // the different grooves (midi/groove.js)
    this.grooveIds = new Map([['', 0]]);
    this.size = 0;
    this.capacity = 0;
    this.fragSize = 0;
    this.fragCapacity = 0;
    this.grids = new Uint16Array(1 << 16);   // every fragment's grid, one after another
    this.gridSize = 0;
    this.hitBytes = new Uint8Array(1 << 16);   // every fragment's strikes, a bit a step, each from a byte of its own
    this.hitSize = 0;
    this.hitScratch = new Uint8Array(65536);   // the strikes last asked for, a byte a step
    this.cols = {};
    this.grow(1024);
    this.growFragments(4096);
  }

  growGrids(min) {
    if (min <= this.grids.length) return;
    const next = new Uint16Array(Math.max(min, this.grids.length * 2));
    next.set(this.grids.subarray(0, this.gridSize));
    this.grids = next;
  }

  growHits(min) {
    if (min <= this.hitBytes.length) return;
    const next = new Uint8Array(Math.max(min, this.hitBytes.length * 2));
    next.set(this.hitBytes.subarray(0, this.hitSize));
    this.hitBytes = next;
  }

  /**
   * A fragment's strikes (midi/rhythm.js), a byte a step, and the steps of one of its bars; null
   * with none. `hits` is only good until the next call (one buffer for all): use it at once.
   */
  hits(id) {
    const c = this.cols;
    const at = c.fragFirst[id % FRAG_ID] + Math.floor(id / FRAG_ID);
    const steps = c.fragHitLen[at];
    const stepsPerBar = steps / c.fragBars[at];
    if (!steps || !Number.isInteger(stepsPerBar)) return null;
    const from = c.fragHitAt[at];
    return { hits: unpackHits(this.hitBytes.subarray(from, from + Math.ceil(steps / 8)), steps, this.hitScratch).subarray(0, steps), steps, stepsPerBar };
  }

  /** A fragment's notes as a grid (midi/harmony.js) and the steps of one of its bars; null with none. */
  grid(id) {
    const c = this.cols;
    const at = c.fragFirst[id % FRAG_ID] + Math.floor(id / FRAG_ID);
    const len = c.fragGridLen[at];
    const stepsPerBar = len / c.fragBars[at];
    if (!len || !Number.isInteger(stepsPerBar)) return null;
    return { grid: this.grids.subarray(c.fragGridAt[at], c.fragGridAt[at] + len), stepsPerBar };
  }

  /** A precomputed musical-search score for one supported gesture. */
  gestureScore(id, gesture = 'snare-roll') {
    const c = this.cols;
    const at = c.fragFirst[id % FRAG_ID] + Math.floor(id / FRAG_ID);
    if (this.files[c.file[id % FRAG_ID]]?.searchScores === false) return null;
    if (gesture === 'snare-roll') return c.fragSnareRoll[at] ?? 0;
    if (gesture === 'arpeggio') return c.fragArpeggio[at] ?? 0;
    if (DRUM_GESTURES.includes(gesture)) return (c[`fragGesture_${gesture}`][at] ?? 0) / 100;
    return 0;
  }

  /** Does fragment `id` have `gesture`, as Search and Parts take it: its score over that gesture's threshold. */
  hasGesture(id, gesture) {
    const score = this.gestureScore(id, gesture);
    if (DRUM_SOUND_GESTURES.has(gesture)) return score > 0;
    const threshold = gesture === 'snare-roll' ? SNARE_ROLL_MIN_SCORE : gesture === 'arpeggio' ? ARPEGGIO_MIN_SCORE : DRUM_GESTURE_MIN_SCORE;
    return score >= threshold;
  }

  /**
   * What a search box asks, as Search and Parts read it: a gesture (chosen, or said in the text:
   * "snare roll", "piano arpeggio"…), the instrument it names, and the other words, without accents.
   */
  static searchWords(text = '', gesture = '') {
    const parsed = gesture ? { gesture, instrument: '', text } : parseMusicalQuery(text);
    const words = parsed.text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/\s+/).filter(Boolean);
    return { gesture: parsed.gesture, instrument: parsed.instrument, words };
  }

  /** Does part `i` pass what searchWords read (the gesture's kind of part, the instrument named, every word)? */
  partMatchesWords(i, { gesture, instrument, words }) {
    const c = this.cols;
    const file = this.files[c.file[i]];
    const partRole = c.role[i], program = c.program[i];
    if (gesture && (file.searchScores === false || (gesture === 'arpeggio' ? partRole === 0 : partRole !== 0))) return false;
    if (instrument === 'piano' && program > 7 || instrument === 'guitar' && (program < 24 || program > 31)
      || instrument === 'bass' && (program < 32 || program > 39)) return false;
    if (words.length) {
      const name = partRole === 0 ? 'drums bateria batería' : GM_PROGRAMS[program] ?? '';
      const hay = `${this.lowerPath[c.file[i]]} ${this.names[i]} ${name}`.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
      if (!words.every((word) => hay.includes(word))) return false;
    }
    return true;
  }

  grow(min) {
    if (min <= this.capacity) return;
    const cap = Math.max(min, this.capacity * 2);
    for (const [k, T] of Object.entries(COLUMNS)) {
      const next = new T(cap);
      if (this.cols[k]) next.set(this.cols[k].subarray(0, this.size));
      this.cols[k] = next;
    }
    this.capacity = cap;
  }

  growFragments(min) {
    if (min <= this.fragCapacity) return;
    const cap = Math.max(min, this.fragCapacity * 2);
    for (const [k, T] of Object.entries(FRAG_COLUMNS)) {
      const next = new T(cap);
      if (this.cols[k]) next.set(this.cols[k].subarray(0, this.fragSize));
      this.cols[k] = next;
    }
    this.fragCapacity = cap;
  }

  /** Empty again (another library), the columns kept for the next one. */
  clear() {
    this.files = [];
    this.byPath.clear();
    this.lowerPath = [];
    this.names = [];
    this.progressions = [''];
    this.progressionIds = new Map([['', 0]]);
    this.grooves = [''];
    this.grooveIds = new Map([['', 0]]);
    this.size = 0;
    this.fragSize = 0;
    this.gridSize = 0;
    this.hitSize = 0;
  }

  has(path) { return this.byPath.has(path); }

  /** Known and analysed with the current record fields (an older record is analysed again). */
  current(path) {
    const f = this.file(path);
    return !!f && (f.v ?? 1) >= RECORD_VERSION;
  }

  /** Title and author in lower case, for the file search ('' while not analysed). */
  metaText(path) {
    const f = this.file(path);
    return f?.ok ? `${f.title ?? ''} ${f.author ?? ''}`.toLowerCase() : '';
  }

  /** The file record (without parts) for a path, or undefined. */
  file(path) {
    const i = this.byPath.get(path);
    return i === undefined ? undefined : this.files[i];
  }

  /** Whether new scores correspond to the existing part and fragment positions. */
  matchesSearchParts(record) {
    const old = this.file(record.path);
    const parts = record.parts ?? [];
    if (!old || old.ok !== record.ok || old.partCount !== parts.length) return false;
    return parts.every((part, k) => {
      const i = old.partStart + k;
      const fragments = part[PART.frags] ?? [];
      if (this.cols.ch[i] !== part[PART.ch] || this.cols.fragTotal[i] !== fragments.length) return false;
      return fragments.every((fragment, n) => {
        const at = this.cols.fragFirst[i] + n;
        return this.cols.fragAt[at] === (fragment[FRAG.at] ?? 0)
          && this.cols.fragTicks[at] === (fragment[FRAG.ticks] ?? 0);
      });
    });
  }

  /**
   * Add a file record from the store or the indexer. A record already held is only replaced
   * by a newer version of it: its file fields, and its parts in the rows they already have
   * (the same channels, so the same count; otherwise the old parts stay).
   */
  addFile(record) {
    const { parts = [], ...file } = record;
    file.partCount = parts.length;
    const compacted = parts.some((part) => (part[PART.frags] ?? []).some((fragment) => !!fragment[FRAG.events]));
    compactSearchScores(record);
    file.searchScores = record.searchScores;
    const searchScores = record.searchScores;
    const lower = `${record.path} ${file.title ?? ''} ${file.author ?? ''}`.toLowerCase();
    const known = this.byPath.get(record.path);
    if (known !== undefined) {
      const old = this.files[known];
      const sameParts = parts.length === old.partCount
        && parts.every((part, k) => (part[PART.frags]?.length ?? 0) === this.cols.fragTotal[old.partStart + k]);
      if (searchScores && sameParts && old.searchScores === false && this.matchesSearchParts(record)) {
        parts.forEach((part, k) => {
          const first = this.cols.fragFirst[old.partStart + k];
          for (const [n, fragment] of (part[PART.frags] ?? []).entries()) {
            this.setGestureScores(first + n, fragment);
          }
        });
        old.searchScores = true;
      }
      if ((file.v ?? 1) > (old.v ?? 1) && file.ok === old.ok) {
        file.partStart = old.partStart;
        file.partCount = old.partCount;
        this.files[known] = file;
        this.lowerPath[known] = lower;
        if (sameParts) parts.forEach((p, k) => this.setPart(old.partStart + k, known, p));
      }
      return compacted;
    }
    const fi = this.files.length;
    file.partStart = this.size;
    this.files.push(file);
    this.byPath.set(record.path, fi);
    this.lowerPath.push(lower);
    if (!record.ok) return compacted;
    this.grow(this.size + parts.length);
    for (const p of parts) this.setPart(this.size++, fi, p);
    return compacted;
  }

  setGestureScores(at, fragment) {
    const c = this.cols;
    c.fragSnareRoll[at] = fragment[FRAG.scoreSnareRoll] ?? 0;
    c.fragArpeggio[at] = fragment[FRAG.scoreArpeggio] ?? 0;
    for (let k = 0; k < DRUM_GESTURES.length; k++) {
      c[`fragGesture_${DRUM_GESTURES[k]}`][at] = fragment[FRAG.gestureScores + k] ?? 0;
    }
  }

  /** Write one part tuple (see PART) into row i of the columns. */
  setPart(i, fi, p) {
    const c = this.cols;
    c.file[i] = fi;
    c.ch[i] = p[PART.ch];
    c.program[i] = p[PART.program];
    c.role[i] = p[PART.role];
    c.notes[i] = p[PART.notes];
    c.bars[i] = p[PART.bars];
    c.density[i] = p[PART.density];
    c.poly[i] = p[PART.poly];
    c.min[i] = p[PART.min];
    c.max[i] = p[PART.max];
    c.loopBars[i] = p[PART.loopBars];
    c.loopCount[i] = p[PART.loopCount];
    c.loopCov[i] = p[PART.loopCov];
    c.loopStart[i] = p[PART.loopStart];
    this.names[i] = p[PART.name] ?? '';
    const frags = p[PART.frags] ?? [[p[PART.loopBars], p[PART.loopStart], p[PART.loopCount], p[PART.loopCov], 0, 0]];
    // A record analysed again leaves its old fragments unused: they go with the next library.
    this.growFragments(this.fragSize + frags.length);
    c.fragFirst[i] = this.fragSize;
    c.fragTotal[i] = frags.length;
    for (const f of frags) {
      const at = this.fragSize++;
      const chords = f[FRAG.chords] ?? '';
      if (!this.progressionIds.has(chords)) {
        this.progressionIds.set(chords, this.progressions.length);
        this.progressions.push(chords);
      }
      c.fragChords[at] = this.progressionIds.get(chords);
      const groove = f[FRAG.groove] ?? '';
      if (!this.grooveIds.has(groove)) {
        this.grooveIds.set(groove, this.grooves.length);
        this.grooves.push(groove);
      }
      c.fragGroove[at] = this.grooveIds.get(groove);
      c.fragBars[at] = f[FRAG.bars];
      c.fragStart[at] = f[FRAG.start];
      c.fragCount[at] = f[FRAG.count];
      c.fragCov[at] = f[FRAG.cov];
      c.fragShape[at] = f[FRAG.shape];
      c.fragEnergy[at] = f[FRAG.energy];
      c.fragAt[at] = f[FRAG.at] ?? 0;
      c.fragTicks[at] = f[FRAG.ticks] ?? 0;
      c.fragVelocity[at] = f[FRAG.velocity] ?? 0;
      c.fragVelocitySpread[at] = f[FRAG.velocitySpread] ?? 0;
      const grid = f[FRAG.grid];
      const len = grid?.length > 0 && grid.length <= 65535 ? grid.length : 0;
      c.fragGridAt[at] = this.gridSize;
      c.fragGridLen[at] = len;
      if (len) {
        this.growGrids(this.gridSize + len);
        this.grids.set(grid, this.gridSize);
        this.gridSize += len;
      }
      const hits = f[FRAG.hits];
      const steps = hits?.length && f[FRAG.hitSteps] <= 65535 && hits.length >= Math.ceil(f[FRAG.hitSteps] / 8) ? f[FRAG.hitSteps] : 0;
      const bytes = Math.ceil(steps / 8);
      c.fragHitAt[at] = this.hitSize;
      c.fragHitLen[at] = steps;
      if (steps) {
        this.growHits(this.hitSize + bytes);
        this.hitBytes.set(hits.subarray(0, bytes), this.hitSize);
        this.hitSize += bytes;
      }
      c.fragSnareRoll[at] = f[FRAG.scoreSnareRoll] ?? 0;
      c.fragArpeggio[at] = f[FRAG.scoreArpeggio] ?? 0;
      for (let k = 0; k < DRUM_GESTURES.length; k++) {
        c[`fragGesture_${DRUM_GESTURES[k]}`][at] = f[FRAG.gestureScores + k] ?? 0;
      }
    }
  }

  /** The results for each fragment of part `i` (one when it has no loop). */
  fragmentIds(i) {
    return Array.from({ length: this.cols.fragTotal[i] }, (_, k) => i + k * FRAG_ID);
  }

  /** The fragments of a part in song order, left to right. */
  fragmentsInSong(i) {
    return this.fragmentIds(i).sort((a, b) => this.part(a).atTick - this.part(b).atTick);
  }

  /** The next fragment of the same part along the song, round to the first. */
  nextFragment(id) {
    const ids = this.fragmentsInSong(this.part(id).part);
    return ids[(ids.indexOf(id) + 1) % ids.length];
  }

  /** The fragment of the same part next to it in the song, `step` -1 before it, 1 after; null at its ends. */
  sideFragment(id, step) {
    const byTime = this.fragmentIds(this.part(id).part).map((f) => this.part(f)).filter((p) => p.ticks).sort((a, b) => a.atTick - b.atTick);
    const at = byTime.findIndex((p) => p.index === id);
    return at < 0 ? null : byTime[at + step]?.index ?? null;
  }

  /** One part or fragment as a plain object, for the results table: its loop is the fragment's. */
  part(id) {
    const c = this.cols;
    const i = id % FRAG_ID;
    const frag = Math.floor(id / FRAG_ID);
    const at = c.fragFirst[i] + frag;
    const file = this.files[c.file[i]];
    const role = ROLES[c.role[i]];
    return {
      index: id,
      part: i,
      frag,
      path: file.path,
      bpm: file.bpm,
      ppq: file.ppq ?? 0,
      ts: file.ts,
      key: file.key,
      ch: c.ch[i],
      program: c.program[i],
      role,
      instrument: role === 'drums' ? 'Drums' : GM_PROGRAMS[c.program[i]],
      notes: c.notes[i],
      bars: c.bars[i],
      density: c.density[i] / 10,
      loopBars: c.fragBars[at],
      loopCount: c.fragCount[at],
      loopCov: c.fragCov[at],
      loopStart: c.fragStart[at],
      atTick: c.fragAt[at],
      ticks: c.fragTicks[at],
      shape: SHAPES[c.fragShape[at]],
      energy: ENERGIES[c.fragEnergy[at]],
      chords: this.progressions[c.fragChords[at]],
      groove: this.grooves[c.fragGroove[at]],
      velocity: c.fragVelocity[at],
      velocitySpread: c.fragVelocitySpread[at],
      name: this.names[i],
    };
  }

  /**
   * The parts that match, each as its first fragment that does (see FRAG_ID). Filters: role
   * ('drums'...), family (0-15, program >> 3), text (words in the path, track name or
   * instrument), bpmMin/bpmMax, ts ('4/4'), key ('D menor'), minBars, and for the fragment:
   * loop ('any' or 1/2/4/8), shape and energy (as SHAPES and ENERGIES name them), limit.
   */
  query(f = {}) {
    const c = this.cols;
    const role = f.role ? ROLES.indexOf(f.role) : -1;
    const family = f.family === '' || f.family === undefined ? -1 : Number(f.family);
    // The text as Search reads it: a gesture said in it, an instrument, the other words.
    const asked = Catalog.searchWords(f.text ?? '', f.gesture ?? '');
    const gesture = asked.gesture;
    const bpmMin = Number(f.bpmMin) || 0;
    const bpmMax = Number(f.bpmMax) || Infinity;
    const minBars = Number(f.minBars) || 0;
    const loop = f.loop ?? '';
    const loopBars = loop && loop !== 'any' ? Number(loop) : 0;
    const limit = f.limit ?? Infinity;
    const key = f.key ? keyClass(f.key) : '';   // any spelling of the same key (Db = C#)
    const shape = f.shape ? SHAPES.indexOf(f.shape) : -1;
    const energy = f.energy ? ENERGIES.indexOf(f.energy) : -1;
    const fragment = (i) => {
      for (let k = 0; k < c.fragTotal[i]; k++) {
        const at = c.fragFirst[i] + k;
        if ((loop === 'any' || f.repeats) && c.fragCount[at] < 2) continue;   // a loop repeats
        if (loopBars && c.fragBars[at] !== loopBars) continue;
        if (shape >= 0 && c.fragShape[at] !== shape) continue;
        if (energy >= 0 && c.fragEnergy[at] !== energy) continue;
        if (gesture && (!c.fragBars[at] || !c.fragTicks[at] || !this.hasGesture(i + k * FRAG_ID, gesture))) continue;
        return k;
      }
      return -1;
    };
    const out = [];
    for (let i = 0; i < this.size && out.length < limit; i++) {
      if (role >= 0 && c.role[i] !== role) continue;
      if (family >= 0 && (c.role[i] === 0 || c.program[i] >> 3 !== family)) continue;
      if (minBars && c.bars[i] < minBars) continue;
      const frag = fragment(i);
      if (frag < 0) continue;
      const file = this.files[c.file[i]];
      if (file.bpm < bpmMin || file.bpm > bpmMax) continue;
      if (f.ts && file.ts !== f.ts) continue;
      if (key && keyClass(file.key) !== key) continue;
      if (!this.partMatchesWords(i, asked)) continue;
      out.push(i + frag * FRAG_ID);
    }
    return out;
  }

  /** Search all matching fragments independently from the ordinary text query used by Parts. */
  searchGesture(text, options = {}) {
    const parsed = parseMusicalQuery(text);
    if (!['snare-roll', 'arpeggio', ...DRUM_GESTURES].includes(parsed.gesture)) return [];
    const words = parsed.text.split(/\s+/).filter(Boolean);
    const hits = [];
    for (let i = 0; i < this.size; i++) {
      const role = this.cols.role[i];
      const program = this.cols.program[i];
      const drumGesture = parsed.gesture !== 'arpeggio';
      if (drumGesture && role !== ROLES.indexOf('drums')) continue;
      if (!drumGesture && role === ROLES.indexOf('drums')) continue;
      if (parsed.instrument === 'piano' && (program < 0 || program > 7)) continue;
      if (parsed.instrument === 'guitar' && (program < 24 || program > 31)) continue;
      if (parsed.instrument === 'bass' && (program < 32 || program > 39)) continue;
      const file = this.files[this.cols.file[i]];
      if (file.searchScores === false) continue;
      if (options.bpmMin && file.bpm < options.bpmMin || options.bpmMax && file.bpm > options.bpmMax) continue;
      const instrument = role === ROLES.indexOf('drums')
        ? 'drums bateria batería'
        : `${GM_PROGRAMS[program]} ${program < 8 ? 'piano teclado' : ''} ${program >= 24 && program < 32 ? 'guitar guitarra' : ''} ${program >= 32 && program < 40 ? 'bass bajo' : ''}`.toLowerCase();
      const hay = `${this.lowerPath[this.cols.file[i]]} ${this.names[i].toLowerCase()} ${instrument}`;
      if (!words.every((word) => hay.includes(word))) continue;
      for (let k = 0; k < this.cols.fragTotal[i]; k++) {
        const at = this.cols.fragFirst[i] + k;
        const score = parsed.gesture === 'snare-roll'
          ? this.cols.fragSnareRoll[at]
          : parsed.gesture === 'arpeggio'
            ? this.cols.fragArpeggio[at]
            : this.cols[`fragGesture_${parsed.gesture}`][at] / 100;
        const minScore = parsed.gesture === 'snare-roll' ? SNARE_ROLL_MIN_SCORE
          : parsed.gesture === 'arpeggio' ? ARPEGGIO_MIN_SCORE
            : DRUM_GESTURE_MIN_SCORE;
        const matches = DRUM_SOUND_GESTURES.has(parsed.gesture) ? score > 0 : score >= minScore;
        if (matches) hits.push({ id: i + k * FRAG_ID, score });
      }
    }
    hits.sort((a, b) => b.score - a.score);
    return hits.slice(0, options.limit ?? Infinity).map(({ id }) => id);
  }

  /** Browse each analysed fragment, with an optional musical gesture filter. */
  searchFragments(f = {}) {
    const c = this.cols;
    const asked = Catalog.searchWords(f.text ?? '', f.gesture ?? '');
    const gesture = asked.gesture;
    const role = f.role ? ROLES.indexOf(f.role) : -1;
    const family = f.family === '' || f.family === undefined ? -1 : Number(f.family);
    const energy = f.energy ? ENERGIES.indexOf(f.energy) : -1;
    const bars = Number(f.bars) || 0;
    const min = Number(f.bpmMin) || 0;
    const max = Number(f.bpmMax) || Infinity;
    const key = f.key ? keyClass(f.key) : '';
    const results = [];
    for (let i = 0; i < this.size; i++) {
      const file = this.files[c.file[i]];
      if (f.paths && !f.paths.has(file.path)) continue;
      const partRole = c.role[i], program = c.program[i];
      if (role >= 0 && partRole !== role) continue;
      if (family >= 0 && (partRole === 0 || program >> 3 !== family)) continue;
      if (f.ts && file.ts !== f.ts || key && keyClass(file.key) !== key) continue;
      if (file.bpm < min || file.bpm > max) continue;
      if (!this.partMatchesWords(i, asked)) continue;
      for (let n = 0; n < c.fragTotal[i]; n++) {
        const at = c.fragFirst[i] + n;
        if (!c.fragBars[at] || !c.fragTicks[at]) continue;
        if (bars && c.fragBars[at] !== bars || f.repeats && c.fragCount[at] < 2) continue;
        if (energy >= 0 && c.fragEnergy[at] !== energy) continue;
        const id = i + n * FRAG_ID;
        if (gesture && !this.hasGesture(id, gesture)) continue;
        results.push(id);
      }
    }
    const partOf = (id) => id % FRAG_ID;
    const fragOf = (id) => c.fragFirst[partOf(id)] + Math.floor(id / FRAG_ID);
    if (f.sort === 'random') {
      let seed = Number(f.seed) >>> 0;
      for (let i = results.length - 1; i > 0; i--) {
        seed = (Math.imul(seed ^ (seed >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0;
        const j = seed % (i + 1);
        [results[i], results[j]] = [results[j], results[i]];
      }
    } else if (f.sort === 'bpm') results.sort((a, b) => this.files[c.file[partOf(a)]].bpm - this.files[c.file[partOf(b)]].bpm);
    else if (f.sort === 'bars') results.sort((a, b) => c.fragBars[fragOf(b)] - c.fragBars[fragOf(a)]);
    else if (f.sort === 'busy') results.sort((a, b) => c.density[partOf(b)] - c.density[partOf(a)]);
    else if ((f.sort === 'score' || !f.sort) && gesture) results.sort((a, b) => this.gestureScore(b, gesture) - this.gestureScore(a, gesture));
    return results;
  }

  /**
   * Counts for the status line: of the whole catalogue, or with `paths` only of those files
   * (the folder in use; the catalogue keeps the files of folders scanned before).
   */
  stats(paths) {
    if (!paths) {
      let ok = 0;
      for (const f of this.files) if (f.ok) ok++;
      return { files: this.files.length, ok, bad: this.files.length - ok, parts: this.size };
    }
    let files = 0, ok = 0, parts = 0;
    for (const path of paths) {
      if (!this.current(path)) continue;
      const f = this.file(path);
      files++;
      if (f.ok) { ok++; parts += f.partCount; }
    }
    return { files, ok, bad: files - ok, parts };
  }

  searchScoreStats(paths = []) {
    let analysed = 0, ready = 0;
    for (const path of paths) {
      if (!this.current(path)) continue;
      analysed++;
      const file = this.file(path);
      if (!file.ok || file.searchScores !== false) ready++;
    }
    return { analysed, ready, total: paths.length };
  }
}

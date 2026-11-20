// The sound chosen for a loop row, tried in its dialog before applying it: a grid of every note the
// sound has (one row per octave, twelve notes across; a drum kit, one pad per sound), the loop's
// scale and the row's own notes marked, and phrases to hear it with: the tonic in every octave (one
// instrument can sound very different from one octave to the next), the scale in one octave or
// through all of them, and the row's own part alone. A pad clicked, or a computer key, plays its note.
// What sounds lights its pad.

import { GM_DRUMS } from '../midi/gm.js';
import { octaveHue } from './mini.js';
import { RowRoll } from './row-roll.js';

const NOTE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
// The scales the piano can mark and play (the loop's key chooses major or natural minor at first).
const SCALES = [
  ['major', 'major', [0, 2, 4, 5, 7, 9, 11]],
  ['minor', 'natural minor', [0, 2, 3, 5, 7, 8, 10]],
  ['harmonic', 'harmonic minor', [0, 2, 3, 5, 7, 8, 11]],
  ['melodic', 'melodic minor', [0, 2, 3, 5, 7, 9, 11]],
  ['dorian', 'dorian', [0, 2, 3, 5, 7, 9, 10]],
  ['phrygian', 'phrygian', [0, 1, 3, 5, 7, 8, 10]],
  ['lydian', 'lydian', [0, 2, 4, 6, 7, 9, 11]],
  ['mixolydian', 'mixolydian', [0, 2, 4, 5, 7, 9, 10]],
  ['locrian', 'locrian', [0, 1, 3, 5, 6, 8, 10]],
  ['majpent', 'major pentatonic', [0, 2, 4, 7, 9]],
  ['minpent', 'minor pentatonic', [0, 3, 5, 7, 10]],
  ['blues', 'blues', [0, 3, 5, 6, 7, 10]],
];
const GEN_ROOT_KEY = 58;
// Each GM family's usual range (MIDI notes), from the lowest instrument in it to the highest: where
// its presets sound like the instrument.
const FAMILY_RANGE = [
  [21, 108],   // piano A0–C8
  [48, 96],    // chromatic percussion C3–C7
  [36, 96],    // organ C2–C7
  [40, 88],    // guitar E2–E6
  [28, 67],    // bass E1–G4
  [28, 103],   // strings: contrabass to violin
  [36, 96],    // ensemble and choir
  [34, 84],    // brass
  [34, 91],    // reed
  [48, 108],   // pipe
  [36, 96],    // synth lead
  [36, 96],    // synth pad
  [36, 96],    // synth effects
  [48, 96],    // ethnic
  [36, 84],    // percussive
  [36, 96],    // sound effects
];
const LOWER = 'zsxdcvgbhnjm,l.;/';   // the computer's keys: two octaves, as most DAWs lay them out
const UPPER = 'q2w3er5t6y7ui9o0p';

export const noteName = (n) => `${NOTE[n % 12]}${Math.floor(n / 12) - 1}`;

/**
 * The keys a preset has samples on (a Uint8Array of 128, how many zones each) and the samples' roots:
 * its zones' key ranges, each inside the preset zone that holds its instrument.
 */
export function presetKeys(preset) {
  const keys = new Uint8Array(128);
  const roots = new Set();
  const range = (r) => (!r || r.min < 0 ? [0, 127] : [r.min, r.max]);
  for (const pz of preset?.zones ?? []) {
    const inst = pz.instrument;
    if (!inst) continue;
    const pk = range(pz.keyRange);
    for (const iz of inst.zones) {
      const ik = range(iz.keyRange);
      const lo = Math.max(pk[0], ik[0]), hi = Math.min(pk[1], ik[1]);
      if (lo > hi) continue;
      for (let n = lo; n <= hi; n++) keys[n]++;
      const rootGen = iz.getGenerator(GEN_ROOT_KEY, inst.globalZone.getGenerator(GEN_ROOT_KEY, -1));
      const root = rootGen >= 0 ? rootGen : iz.sample?.originalKey;
      if (root >= lo && root <= hi) roots.add(root);
    }
  }
  return { keys, roots };
}

/**
 * `el`: the box to fill. `connect(row, sound)` resolves to a voice for the sound chosen: { send(at,
 * bytes) (at: audio context time), now() and heard() (the context time, and the one being heard),
 * silence(), keys/roots (presetKeys, or null when the sound does not tell), drums } or throws why
 * not. `getSound()` the sound chosen in the dialog (undefined: none yet); `getKey()` the loop's key
 * as [pitch class, minor] or null; `getRowPart(row)` the row's notes alone { notes: [{ sec, len,
 * pitch, vel }], durationSec }; `beforeSound()` before anything sounds. The loop, if it plays,
 * goes on: what is tried sounds over it, on a channel of its own.
 */
export class SoundTester {
  constructor(el, { connect, getSound, getKey, getRowPart, beforeSound = () => {} }) {
    Object.assign(this, { el, connect, getSound, getKey, getRowPart, beforeSound });
    el.innerHTML = `
      <div class="st-tabs">
        <button type="button" data-tab="roll" class="on" title="The row's notes as the loop plays them, with this sound">Midigrid</button>
        <button type="button" data-tab="piano" title="Every note of the sound, to try one by one or in phrases">Piano</button>
        <label title="Loudness of the notes tried (the row's own scaled by it in Midigrid and ▶ Row)">Vel <input class="st-vel" type="range" min="1" max="127" value="100"></label>
        <label class="st-all-l" title="Every key the sound has, not only its instrument's usual range"><input class="st-all" type="checkbox"> All keys</label>
      </div>
      <div class="st-pane" data-pane="piano" hidden>
        <div class="st-bar">
          <span class="st-buttons"></span>
          <span class="st-scale-pick">
            <label title="Scale: the one marked on the keys and played by ▶ Scale, ▶ Full range and ▶ Octaves (the loop's key at first)">
              <select class="st-key" aria-label="Scale's tonic"></select><select class="st-mode" aria-label="Scale"></select></label>          </span>
        </div>
        <div class="st-scale-notes"></div>
        <div class="st-grid"></div>
      </div>
      <div class="st-pane" data-pane="roll"></div>
      <p class="st-hint"></p>`;
    this.roll = new RowRoll(el.querySelector('[data-pane="roll"]'), {
      getVoice: () => this.voice,
      getVel: () => Number(this.vel.value),
      onStart: () => this.stopPhrase(),
    });
    this.tab = 'roll';
    el.querySelector('.st-tabs').addEventListener('click', (e) => {
      const b = e.target.closest('[data-tab]');
      if (b) this.showTab(b.dataset.tab);
    });
    this.grid = el.querySelector('.st-grid');
    this.keySel = el.querySelector('.st-key');
    this.modeSel = el.querySelector('.st-mode');
    this.keySel.innerHTML = NOTE.map((s, k) => `<option value="${k}">${s === FLAT[k] ? s : `${s} / ${FLAT[k]}`}</option>`).join('');
    this.modeSel.innerHTML = SCALES.map(([id, name]) => `<option value="${id}">${name}</option>`).join('');
    const rescale = () => { this.stopPhrase(); this.paint(); };
    this.keySel.onchange = rescale;
    this.modeSel.onchange = rescale;    this.hint = el.querySelector('.st-hint');
    this.buttons = el.querySelector('.st-buttons');
    this.vel = el.querySelector('.st-vel');
    this.allKeys = el.querySelector('.st-all');
    this.allKeys.onchange = () => { this.stop(); this.paint(); };
    this.voice = null;
    this.lit = new Set();       // notes sounding, lit
    this.held = new Map();      // notes held by hand: note -> count
    this.timer = 0;
    this.buttons.onclick = (e) => { const b = e.target.closest('[data-play]'); if (b) void this.play(b.dataset.play); };
    this.grid.addEventListener('click', (e) => {
      const label = e.target.closest('[data-octave]');
      if (label) { this.octave = Number(label.dataset.octave); this.paint(); }
    });
    this.wirePads();
    this.keyDown = (e) => this.onKey(e, true);
    this.keyUp = (e) => this.onKey(e, false);
  }

  /** Piano (every note of the sound) or Midigrid (the row's notes): the other one stops. */
  showTab(tab) {
    this.tab = tab;
    for (const b of this.el.querySelectorAll('[data-tab]')) b.classList.toggle('on', b.dataset.tab === tab);
    for (const p of this.el.querySelectorAll('[data-pane]')) p.hidden = p.dataset.pane !== tab;
    this.el.querySelector('.st-all-l').hidden = tab !== 'piano';
    // The piano's notes (its scale, its keys) are not the Midigrid's: only a warning shows there.
    this.hint.hidden = tab === 'roll' && !!this.hint.dataset.auto;
    this.stop();
    if (tab === 'roll') this.roll.draw();
  }

  /** For `row`: drawn for the sound chosen now, listening to the computer's keys. */
  async open(row) {
    this.row = row;
    this.part = null;
    try { this.part = this.getRowPart(row); } catch { /* a row without notes: no part to hear */ }
    this.roll.setPart(this.part, !!row.drums);
    this.loopKey();
    this.showTab('roll');   // the row's own notes first: what it will play with the sound
    this.used = new Set((this.part?.notes ?? []).map((n) => n.pitch));
    const pitches = [...this.used];
    this.octave = pitches.length ? Math.floor((Math.min(...pitches) + Math.max(...pitches)) / 2 / 12) : 5;
    document.addEventListener('keydown', this.keyDown, true);
    document.addEventListener('keyup', this.keyUp, true);
    await this.update();
  }

  close() {
    this.stop();
    document.removeEventListener('keydown', this.keyDown, true);
    document.removeEventListener('keyup', this.keyUp, true);
    this.voice = null;
  }

  /**
   * The dialog's choice changed: the grid and the voice for it. A phrase (▶ Octaves, Scale…)
   * playing starts again from its first note with the new sound, to hear it whole; the Midigrid goes
   * on from where it is.
   */
  async update() {
    const turn = this.turn = (this.turn ?? 0) + 1;
    const phrase = this.playingPhrase();
    const rolling = this.roll.playing;
    if (!phrase && !rolling) this.stop();
    const sound = this.getSound();
    let voice = null;
    this.hint.textContent = '';
    delete this.hint.dataset.auto;
    this.hint.hidden = false;
    if (sound !== undefined) {
      try { voice = await this.connect(this.row, sound); }
      catch (error) { if (turn === this.turn) this.hint.textContent = error.message; }
    } else this.hint.textContent = 'Choose a sound in the list to try it.';
    if (turn !== this.turn) return;
    const old = this.voice;
    this.voice = voice;
    this.drums = voice?.drums ?? !!this.row?.drums;
    this.paint();
    if (phrase) {
      old?.silence();
      this.voice = old;
      this.stopPhrase();
      this.voice = voice;
      if (voice) void this.play(phrase.name);
    }
    if (rolling) { if (voice) this.roll.switchVoice(); else this.roll.stop(); }
  }

  /** The phrase sounding now, if one is: { notes, t0, end }. */
  playingPhrase() {
    const p = this.phrase;
    return p && this.voice && this.voice.now() < p.t0 + p.end ? p : null;
  }

  /**
   * The keys to try. Most banks stretch their samples over all 128 keys (GeneralUser's bass has a
   * waveform layer on every key), so what a preset covers does not say where it is the instrument:
   * its GM family's usual range does (a bass E1–G4, a guitar E2–E6), within the keys it has, and
   * always the row's own notes. "All keys": every key it has. A kit: every key with a sound. Without
   * samples to tell (the simple synth, a LUNA track): the family's range (a GM kit's keys).
   */
  range() {
    const keys = this.voice?.keys;
    let low = 128, high = -1;
    if (keys) for (let n = 0; n < 128; n++) if (keys[n]) { low = Math.min(low, n); high = n; }
    if (high < 0) [low, high] = this.drums ? [35, 81] : [0, 127];
    if (!this.drums && !this.allKeys.checked) {
      const [lo, hi] = FAMILY_RANGE[(this.voice?.program ?? 0) >> 3] ?? [21, 108];
      if (Math.max(low, lo) <= Math.min(high, hi)) { low = Math.max(low, lo); high = Math.min(high, hi); }
    }
    for (const n of this.used ?? []) { low = Math.min(low, n); high = Math.max(high, n); }
    return [low, high];
  }

  /** The selectors back to the loop's key (C major when it has none). */
  loopKey() {
    const key = this.getKey();
    this.keySel.value = String(key?.[0] ?? 0);
    this.modeSel.value = key?.[1] ? 'minor' : 'major';
  }

  /** The scale chosen: its tonic, its steps (pitch classes), its name and how its notes are spelled. */
  scale() {
    const tonic = Number(this.keySel.value) || 0;
    const [id, label, list] = SCALES.find((s) => s[0] === this.modeSel.value) ?? SCALES[0];
    const minor = list.includes(3) && !list.includes(4);
    // Flats for the keys written with them (F, Bb, Eb… and the minor keys that use them), else sharps.
    const flats = id === 'blues' || (minor ? [0, 2, 3, 5, 7, 8, 10].includes(tonic) : [1, 3, 5, 8, 10].includes(tonic));
    const names = flats ? FLAT : NOTE;
    const key = this.getKey();
    const isLoopKey = !!key && key[0] === tonic && (key[1] ? id === 'minor' : id === 'major');
    return { tonic, minor, list, steps: new Set(list.map((s) => (tonic + s) % 12)), isLoopKey,
      name: `${names[tonic]} ${label}`, spell: (n) => names[n % 12],
      notes: list.map((s) => names[(tonic + s) % 12]) };
  }

  paint() {
    const [low, high] = this.range();
    const keys = this.voice?.keys;
    const s = this.scale();
    const pad = (n, label, title, extra = '') => {
      const off = keys && !keys[n];
      const used = this.used.has(n);
      // A note the row plays that is not of the scale (a borrowed chord, a passing note): named, framed red.
      const out = used && !this.drums && !s.steps.has(n % 12);
      const cls = ['st-pad', off && 'off', used && 'used', out && 'out', !this.drums && s.steps.has(n % 12) && 'sc',
        !this.drums && n % 12 === s.tonic && 'tonic', this.lit.has(n) && 'on', extra].filter(Boolean).join(' ');
      // Its octave's colour, as its notes are drawn in the pads (ui/mini.js): the scale's marks, the
      // row's notes filled with it, sounding brighter.
      return `<button type="button" class="${cls}" data-n="${n}" style="--h:${octaveHue(n, this.drums)}" title="${title}${off ? ' · no sample' : ''}${used ? ' · the row plays it' : ''}${out ? `, out of ${s.name}` : ''}">${out ? s.spell(n) : label}</button>`;
    };
    this.el.querySelector('.st-scale-pick').hidden = this.drums;
    const notesLine = this.el.querySelector('.st-scale-notes');
    notesLine.hidden = this.drums;
    notesLine.innerHTML = `<b>${s.name}</b>: ${s.notes.join(' ')}${s.isLoopKey ? ' <span class="st-dim">(the loop\'s key)</span>' : this.getKey() ? '' : ' <span class="st-dim">(the loop has no key)</span>'}`;
    if (this.drums) {
      const list = [];
      for (let n = low; n <= high; n++) if (!keys || keys[n]) list.push(n);
      this.grid.className = 'st-grid kit';
      this.grid.innerHTML = list.map((n) => pad(n, GM_DRUMS[n] ?? noteName(n), `${GM_DRUMS[n] ?? ''} ${noteName(n)} (${n})`)).join('');
      this.buttons.innerHTML = '<button type="button" data-play="kit">▶ Kit</button>'
        + `<button type="button" data-play="row"${this.part?.notes.length ? '' : ' disabled'}>▶ Row</button><button type="button" data-play="stop">■</button>`;
    } else {
      const lowOct = Math.floor(low / 12), highOct = Math.floor(high / 12);
      if (this.octave < lowOct || this.octave > highOct) this.octave = Math.max(lowOct, Math.min(highOct, this.octave));
      const rowOctaves = new Set([...this.used].map((n) => Math.floor(n / 12)));
      const rows = [];
      for (let o = highOct; o >= lowOct; o--) {
        const cells = [];
        for (let pc = 0; pc < 12; pc++) {
          const n = o * 12 + pc;
          cells.push(n < low || n > high ? '<span class="st-pad none"></span>'
            : pad(n, s.steps.has(pc) ? s.spell(pc) : '', `${noteName(n)} (${n})`, NOTE[pc].length > 1 ? 'b' : ''));
        }
        rows.push(`<div class="st-oct${o === this.octave ? ' sel' : ''}${rowOctaves.has(o) ? ' row' : ''}" style="--h:${octaveHue(o * 12)}"><button type="button" class="st-olabel" data-octave="${o}" title="Octave ${o - 1}: ▶ Scale and the computer's keys play here${rowOctaves.has(o) ? ' · the row plays in it' : ''}">C${o - 1}</button>${cells.join('')}</div>`);
      }
      // The scale stands out: the keys out of it faded, its notes named, the tonic framed.
      this.grid.className = 'st-grid marks';
      this.grid.innerHTML = rows.join('');
      this.buttons.innerHTML = '<button type="button" data-play="octaves" title="The tonic in every octave, low to high">▶ Octaves</button>'
        + `<button type="button" data-play="scale" title="The scale's notes in the octave chosen (C${this.octave - 1}), up and down">▶ Scale</button>`
        + '<button type="button" data-play="full" title="The scale through every octave, low to high">▶ Full range</button>'
        + `<button type="button" data-play="row" title="The row's part alone, with this sound"${this.part?.notes.length ? '' : ' disabled'}>▶ Row</button>`
        + '<button type="button" data-play="stop" title="Stop">■</button>';
      if (!this.hint.textContent || this.hint.dataset.auto) {
        this.hint.dataset.auto = '1';
        const outs = [...new Set([...this.used].filter((n) => !s.steps.has(n % 12)).map((n) => s.spell(n)))];
        this.hint.textContent = `${outs.length ? `Framed red: notes the row plays out of ${s.name} (${outs.join(' ')}) · ` : ''}Framed: the row's octaves · click an octave's name to play there (C${this.octave - 1} now) · keys Z–M and Q–U play from it.`;
        this.hint.hidden = this.tab === 'roll';
      }
    }
  }

  /** A phrase on the voice: notes [{ at (s from now), len, n, v }]. */
  async play(name) {
    if (name === 'stop') { this.stop(); return; }
    if (!this.voice) return;
    this.stop();
    await this.beforeSound();
    this.roll.stop();
    const v = Number(this.vel.value);
    const [low, high] = this.range();
    const keys = this.voice.keys;
    const has = (n) => n >= low && n <= high && (!keys || keys[n] > 0);
    const s = this.scale();
    const notes = [];
    const step = 0.22;
    if (name === 'octaves') {
      let k = 0;
      for (let n = s.tonic; n <= 127; n += 12) if (has(n)) notes.push({ at: k++ * 0.7, len: 0.65, n, v });
    } else if (name === 'scale' || name === 'full') {
      // The scale's notes in the octave chosen (its row, C to B), up and down; or every note of the
      // scale the sound has, low to high.
      const from = name === 'scale' ? this.octave * 12 : low;
      const to = name === 'scale' ? from + 11 : high;
      const up = [];
      for (let n = from; n <= to; n++) if (s.steps.has(n % 12) && has(n)) up.push(n);
      const seq = name === 'scale' ? [...up, ...up.slice(0, -1).reverse()] : up;
      seq.forEach((n, k) => notes.push({ at: k * step, len: step * 0.95, n, v }));
    } else if (name === 'kit') {
      let k = 0;
      for (let n = low; n <= high; n++) if (has(n)) notes.push({ at: k++ * 0.25, len: 0.22, n, v });
    } else if (name === 'row') {
      for (const x of this.part?.notes ?? []) notes.push({ at: x.sec, len: x.len, n: x.pitch, v: Math.round(x.vel * v / 100) });
    }
    if (!notes.length) return;
    const voice = this.voice;
    const t0 = voice.now() + 0.06;
    for (const x of notes) {
      voice.send(t0 + x.at, [0x90 | voice.ch, x.n, Math.max(1, Math.min(127, x.v))]);
      voice.send(t0 + x.at + x.len, [0x80 | voice.ch, x.n, 0]);
    }
    const end = Math.max(...notes.map((x) => x.at + x.len));
    this.phrase = { notes, t0, end, name };
    this.timer = setInterval(() => {
      const now = (this.voice ?? voice).heard() - t0;
      const next = new Set(notes.filter((x) => x.at <= now && now < x.at + x.len).map((x) => x.n));
      this.light(next);
      if (now > end + 0.05) { clearInterval(this.timer); this.phrase = null; this.light(new Set()); }
    }, 25);
  }

  /** Everything tried stops: the phrases, the held keys, the Midigrid. */
  stop() {
    this.stopPhrase();
    this.roll?.stop();
  }

  stopPhrase() {
    clearInterval(this.timer);
    this.phrase = null;
    this.voice?.silence();
    this.held.clear();
    this.light(new Set());
  }

  light(next) {
    const all = new Set([...next, ...this.held.keys()]);
    for (const n of new Set([...this.lit, ...all])) {
      const on = all.has(n);
      if (on !== this.lit.has(n)) this.grid.querySelector(`[data-n="${n}"]`)?.classList.toggle('on', on);
    }
    this.lit = all;
  }

  async noteOn(n) {
    if (!this.voice || n < 0 || n > 127) return;
    await this.beforeSound();
    this.held.set(n, (this.held.get(n) ?? 0) + 1);
    this.voice.send(this.voice.now(), [0x90 | this.voice.ch, n, Number(this.vel.value)]);
    this.light(new Set(this.lit));
  }

  noteOff(n) {
    if (!this.held.has(n)) return;
    const left = this.held.get(n) - 1;
    if (left > 0) this.held.set(n, left);
    else {
      this.held.delete(n);
      this.voice?.send(this.voice.now(), [0x80 | this.voice.ch, n, 0]);
    }
    this.light(new Set([...this.lit].filter((x) => x !== n || this.held.has(x))));
  }

  wirePads() {
    let down = -1;
    this.grid.addEventListener('pointerdown', (e) => {
      const p = e.target.closest('.st-pad[data-n]');
      if (!p) return;
      e.preventDefault();
      this.grid.setPointerCapture(e.pointerId);
      down = Number(p.dataset.n);
      void this.noteOn(down);
    });
    this.grid.addEventListener('pointermove', (e) => {
      if (down < 0) return;
      const p = document.elementFromPoint(e.clientX, e.clientY)?.closest('.st-pad[data-n]');
      const n = p ? Number(p.dataset.n) : -1;
      if (n < 0 || n === down) return;
      this.noteOff(down);
      down = n;
      void this.noteOn(n);
    });
    const up = () => { if (down >= 0) this.noteOff(down); down = -1; };
    this.grid.addEventListener('pointerup', up);
    this.grid.addEventListener('pointercancel', up);
  }

  /** Z–M and Q–U from the octave chosen (not while typing in the search box). */
  onKey(e, isDown) {
    if (!this.el.isConnected || this.el.closest('dialog')?.open === false) return;
    if (e.target.matches?.('input[type=text], input[type=search], textarea') || e.ctrlKey || e.altKey || e.metaKey) return;
    // Space plays or stops the Midigrid (a button with the focus keeps its own Space).
    if (e.key === ' ' && this.tab === 'roll' && !e.target.matches?.('button, select, input')) {
      e.preventDefault();
      e.stopPropagation();
      if (isDown && !e.repeat) this.roll.toggle();
      return;
    }
    const k = e.key.toLowerCase();
    const lo = LOWER.indexOf(k), hi = UPPER.indexOf(k);
    if (lo < 0 && hi < 0) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.repeat) return;
    const n = (this.drums ? 36 : this.octave * 12) + (lo >= 0 ? lo : 12 + hi);
    if (isDown) void this.noteOn(n); else this.noteOff(n);
  }
}

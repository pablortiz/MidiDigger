// A loop row's notes as a piano roll in its sound dialog (the Midigrid tab of ui/sound-tester.js),
// played with the sound chosen in the dialog: its bars across with a ruler, its notes in their
// octave's colours (ui/mini.js), a red line where the sound is (as heard, not as scheduled). A click
// moves the line there; a drag selects bars (to the beat) and the selection plays round and round;
// "All bars" plays every bar of the row. A sound chosen while it plays goes on with the new one.

import { noteColor } from './mini.js';

const RULER = 18;          // px: the bar numbers' strip
const AHEAD = 0.3;         // s of notes handed to the voice ahead of time
const DRAG = 4;            // px a press must move to select instead of moving the line

export class RowRoll {
  /**
   * `box`: the element to fill. `getVoice()`: the voice to play on (see SoundTester), or null;
   * `getVel()`: 1–127, the notes' velocities scaled by it (100: as they are); `onStart()`: before
   * it sounds (the tester stops its phrases).
   */
  constructor(box, { getVoice, getVel, onStart = () => {} }) {
    Object.assign(this, { getVoice, getVel, onStart });
    box.innerHTML = `
      <div class="rr-bar">
        <button type="button" class="rr-play" title="Play / stop (Space)">▶</button>
        <button type="button" class="rr-all" title="Every bar of the row (clears the selection)">All bars</button>
        <label class="rr-loop-l" title="Round and round: the selection, or every bar"><input type="checkbox" class="rr-loop" checked> Loop</label>
        <span class="rr-info"></span>
      </div>
      <div class="rr-box"><canvas class="rr-notes"></canvas><canvas class="rr-head"></canvas></div>`;
    this.box = box.querySelector('.rr-box');
    this.cNotes = box.querySelector('.rr-notes');
    this.cHead = box.querySelector('.rr-head');
    this.playBtn = box.querySelector('.rr-play');
    this.loopBox = box.querySelector('.rr-loop');
    this.infoEl = box.querySelector('.rr-info');
    this.part = null;
    this.pos = 0;        // the line, in seconds of the row
    this.sel = null;     // { a, b }: the bars selected, in seconds
    this.m = null;       // playing: { voice, a, b, t0, from, done }
    this.playBtn.onclick = () => this.toggle();
    box.querySelector('.rr-all').onclick = () => { this.sel = null; this.restartIfPlaying(); this.info(); this.drawHead(); };
    this.loopBox.onchange = () => this.restartIfPlaying();
    this.wirePointer();
    new ResizeObserver(() => this.draw()).observe(this.box);
  }

  get playing() { return !!this.m; }
  get dur() { return this.part?.durationSec ?? 0; }

  /** The row's part: { notes: [{ sec, len, pitch, vel }], durationSec, secPerBar, beatsPerBar }. */
  setPart(part, drums) {
    this.stop();
    this.part = part;
    this.drums = drums;
    this.pos = 0;
    this.sel = null;
    this.draw();
    this.info();
  }

  region() { return this.sel ? [this.sel.a, this.sel.b] : [0, this.dur]; }

  toggle() { if (this.m) this.stop(); else this.play(); }

  restartIfPlaying() { if (this.m) this.play(this.posAt(this.m.voice.now())); }

  /** Play from `from` (the line by default) on the voice: what sounds there already, at once. */
  play(from = this.pos) {
    const voice = this.getVoice();
    const notes = this.part?.notes ?? [];
    if (!voice || !notes.length || !this.dur) return;
    this.onStart();
    this.halt();
    voice.silence();
    const [a, b] = this.region();
    if (!(from >= a && from < b)) from = a;
    const t0 = voice.now() + 0.05;
    this.m = { voice, a, b, t0, from, done: 0 };
    // Notes begun before `from` and still sounding there: heard from it, as when a song is entered mid-bar.
    for (const x of notes) {
      if (x.sec < a || x.sec >= from || x.sec + x.len <= from) continue;
      this.send(voice, t0, Math.min(x.sec + x.len, b) - from, x);
    }
    this.pump();
    this.timer = setInterval(() => this.pump(), 25);
    const frame = () => { this.drawHead(); if (this.m) this.raf = requestAnimationFrame(frame); };
    this.raf = requestAnimationFrame(frame);
    this.playBtn.textContent = '■';
    this.playBtn.classList.add('on');
  }

  send(voice, at, len, x) {
    const v = Math.max(1, Math.min(127, Math.round(x.vel * this.getVel() / 100)));
    voice.send(at, [0x90 | voice.ch, x.pitch, v]);
    voice.send(at + Math.max(0.01, len), [0x80 | voice.ch, x.pitch, 0]);
  }

  /** Hand the voice the notes of the next moments: every lap of the region from `from`. */
  pump() {
    const m = this.m;
    if (!m) return;
    const loop = this.loopBox.checked;
    const L = m.b - m.a;
    const offset = m.from - m.a;
    const horizon = m.voice.now() - m.t0 + AHEAD;
    if (!loop && m.voice.now() - m.t0 > L - offset + 0.15) { this.stop(); this.pos = m.a; this.drawHead(); return; }
    for (let k = Math.floor((m.done + offset) / L); k <= Math.floor((horizon + offset) / L); k++) {
      if (!loop && k > 0) break;
      for (const x of this.part.notes) {
        if (x.sec < m.a || x.sec >= m.b) continue;
        const u = k * L + (x.sec - m.a) - offset;
        if (u < m.done || u >= horizon) continue;
        this.send(m.voice, m.t0 + u, Math.min(x.len, m.b - x.sec), x);
      }
    }
    m.done = horizon;
  }

  /** Where the row is at context time t: in the region, round and round with Loop. */
  posAt(t) {
    const m = this.m;
    if (!m) return this.pos;
    const u = t - m.t0;
    if (u < 0) return m.from;
    const L = m.b - m.a;
    const p = m.from - m.a + u;
    return this.loopBox.checked ? m.a + (p % L) : Math.min(m.b, m.a + p);
  }

  /** Stop the scheduling (the voice keeps what it has). */
  halt() {
    clearInterval(this.timer);
    cancelAnimationFrame(this.raf);
  }

  stop() {
    const m = this.m;
    this.halt();
    if (m) {
      this.pos = this.posAt(m.voice.heard());
      this.m = null;
      m.voice.silence();
    }
    this.playBtn.textContent = '▶';
    this.playBtn.classList.remove('on');
    this.drawHead();
  }

  /** Another sound chosen while it plays: on with the new voice, from where it is. */
  switchVoice() {
    const m = this.m;
    if (!m) return;
    const at = this.posAt(m.voice.now());
    this.halt();
    m.voice.silence();
    this.m = null;
    this.play(at);
    if (!this.m) this.stop();
  }

  // ── drawing ───────────────────────────────────────────────────────────────────────────

  size(canvas) {
    const r = devicePixelRatio || 1;
    const w = Math.max(1, Math.round(canvas.clientWidth * r));
    const h = Math.max(1, Math.round(canvas.clientHeight * r));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    return { w, h, r };
  }

  /** The pitches shown: the row's, a note of room either way, an octave at least. */
  pitchRange() {
    const ps = (this.part?.notes ?? []).map((n) => n.pitch);
    let lo = ps.length ? Math.min(...ps) - 1 : 48, hi = ps.length ? Math.max(...ps) + 1 : 72;
    if (hi - lo < 12) { const mid = (lo + hi) / 2; lo = Math.floor(mid - 6); hi = lo + 12; }
    return [lo, hi];
  }

  draw() {
    const g = this.cNotes.getContext('2d');
    const { w, h, r } = this.size(this.cNotes);
    this.size(this.cHead);
    g.clearRect(0, 0, w, h);
    const dur = this.dur;
    if (!dur || !this.part) { this.drawHead(); return; }
    const top = RULER * r;
    const [lo, hi] = this.pitchRange();
    const rowH = (h - top) / (hi - lo + 1);
    const x = (sec) => (sec / dur) * w;
    const { secPerBar, beatsPerBar } = this.part;
    const bars = Math.round(dur / secPerBar);
    // Octaves (each C) and the beats and bars.
    g.fillStyle = '#151515';
    g.fillRect(0, top, w, h - top);
    for (let p = Math.ceil(lo / 12) * 12; p <= hi; p += 12) {
      g.fillStyle = '#222';
      g.fillRect(0, top + (hi - p) * rowH + rowH - 1, w, 1);
    }
    for (let b = 0; b <= bars; b++) {
      for (let k = 0; k < (b < bars ? beatsPerBar : 1); k++) {
        const sx = Math.round(x(b * secPerBar + (k * secPerBar) / beatsPerBar));
        g.fillStyle = k === 0 ? '#444' : '#262626';
        g.fillRect(sx, k === 0 ? 0 : top, 1, h);
      }
    }
    // The ruler: bar numbers, fewer when they would crowd.
    g.fillStyle = '#999';
    g.font = `${10 * r}px system-ui, sans-serif`;
    g.textBaseline = 'middle';
    const every = Math.max(1, Math.ceil((22 * r) / (w / Math.max(1, bars))));
    for (let b = 0; b < bars; b += every) g.fillText(String(b + 1), x(b * secPerBar) + 3 * r, top / 2);
    for (const n of this.part.notes) {
      g.fillStyle = noteColor(n.pitch, n.vel, this.drums);
      const nx = x(n.sec);
      g.fillRect(nx, top + (hi - n.pitch) * rowH + 1, Math.max(2 * r, x(n.sec + n.len) - nx - 1), Math.max(2, rowH - 2));
    }
    this.layoutCache = { w, h, r, top, lo, hi, rowH };
    this.drawHead();
  }

  /** The selection, the red line, and the notes sounding outlined. */
  drawHead() {
    const g = this.cHead.getContext('2d');
    const { w, h, r } = this.size(this.cHead);
    g.clearRect(0, 0, w, h);
    const dur = this.dur;
    const L = this.layoutCache;
    if (!dur || !L) return;
    const x = (sec) => (sec / dur) * w;
    if (this.sel) {
      g.fillStyle = 'rgba(240, 192, 96, 0.14)';
      g.fillRect(x(this.sel.a), 0, x(this.sel.b) - x(this.sel.a), h);
      g.fillStyle = 'rgba(240, 192, 96, 0.8)';
      g.fillRect(x(this.sel.a), 0, x(this.sel.b) - x(this.sel.a), L.top * 0.3);
    }
    const p = this.m ? this.posAt(this.m.voice.heard()) : this.pos;
    if (this.m) {
      g.strokeStyle = '#fff';
      g.lineWidth = 1.5 * r;
      for (const n of this.part.notes) {
        if (n.sec <= p && p < n.sec + n.len) {
          g.strokeRect(x(n.sec), L.top + (L.hi - n.pitch) * L.rowH + 1, Math.max(2 * r, x(n.sec + n.len) - x(n.sec) - 1), Math.max(2, L.rowH - 2));
        }
      }
    }
    g.fillStyle = '#ff3b3b';
    g.fillRect(Math.round(x(p)) - r, 0, 2 * r, h);
  }

  info() {
    const part = this.part;
    if (!part?.notes.length) { this.infoEl.textContent = 'This row has no notes to play.'; return; }
    // A beat as bar.beat (from 1); the selection's end as the last beat in it.
    const beatSec = part.secPerBar / part.beatsPerBar;
    const beatAt = (sec) => Math.round(sec / beatSec);
    const label = (beat) => `${Math.floor(beat / part.beatsPerBar) + 1}.${(beat % part.beatsPerBar) + 1}`;
    const bars = Math.round(this.dur / part.secPerBar);
    let text = `${bars} bar${bars === 1 ? '' : 's'} · click: move the line · drag: select bars to loop`;
    if (this.sel) {
      const a = beatAt(this.sel.a), b = beatAt(this.sel.b);
      const whole = a % part.beatsPerBar === 0 && b % part.beatsPerBar === 0;
      const from = whole ? a / part.beatsPerBar + 1 : label(a);
      const to = whole ? b / part.beatsPerBar : label(b - 1);
      text = `${whole ? (from === to ? 'Bar' : 'Bars') : 'Beats'} ${from === to ? from : `${from}–${to}`} selected · double-click or All bars for every bar`;
    }
    this.infoEl.textContent = text;
  }

  // ── the mouse ─────────────────────────────────────────────────────────────────────────

  wirePointer() {
    const c = this.cHead;
    const secAt = (e) => {
      const rect = c.getBoundingClientRect();
      return Math.max(0, Math.min(this.dur, ((e.clientX - rect.left) / rect.width) * this.dur));
    };
    let press = null;
    c.addEventListener('pointerdown', (e) => {
      if (!this.dur) return;
      c.setPointerCapture(e.pointerId);
      press = { x: e.clientX, sec: secAt(e), dragging: false };
    });
    c.addEventListener('pointermove', (e) => {
      if (!press) return;
      if (!press.dragging && Math.abs(e.clientX - press.x) < DRAG) return;
      press.dragging = true;
      // To the beat: the selection takes whole beats.
      const beat = this.part.secPerBar / this.part.beatsPerBar;
      const s = secAt(e);
      let a = Math.floor(Math.min(press.sec, s) / beat + 1e-9) * beat;
      let b = Math.ceil(Math.max(press.sec, s) / beat - 1e-9) * beat;
      if (b - a < beat) b = a + beat;
      b = Math.min(b, this.dur);
      a = Math.max(0, Math.min(a, b - beat));
      this.sel = { a, b };
      this.info();
      this.drawHead();
    });
    const up = (e) => {
      if (!press) return;
      const p = press;
      press = null;
      if (p.dragging) {
        if (this.m) this.play(this.sel.a);
        else { this.pos = this.sel.a; this.drawHead(); }
        return;
      }
      // A click: the line there (inside the selection, or the selection goes).
      const sec = secAt(e);
      if (this.sel && (sec < this.sel.a || sec >= this.sel.b)) { this.sel = null; this.info(); }
      if (this.m) this.play(sec);
      else { this.pos = sec; this.drawHead(); }
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', () => { press = null; });
    c.addEventListener('dblclick', () => { this.sel = null; this.info(); this.restartIfPlaying(); this.drawHead(); });
  }
}

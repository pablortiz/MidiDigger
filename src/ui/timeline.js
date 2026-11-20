// The selected file as a small arrangement: a loop lane and a bar ruler over one lane per
// channel, all on the same bars. It works like midiGrid's ruler (timeline-ruler.js):
//   loop lane   drag to create a region, which switches the loop on; drag its edges to resize
//               and its body to move it, heard live; click it to switch the loop on/off
//               (green/grey); double click to remove it.
//   ruler/lanes click to play from there; drag more than a few px to create a region.
//   snapping    to the 16th (midiGrid's grid square) when the zoom lets you aim at it, else the
//               beat, else the bar; Alt forces the beat.
//   lane labels click to mark a channel (heard and taken to LUNA); ▶ that channel alone;
//               ⟳ its main pattern (shaded amber in its lane).
//   Space       play/pause while the timeline has the focus (click it first).
//   scrolling   the loop lane and ruler stay on top and the labels on the left; moving the view
//               by hand pauses the playhead's follow for a while, so other bars can be browsed
//               while the region loops. A click on the region text above brings it back.

import { channelInstrument, extractNotes, formatPos, snapTick, tickAtBar } from '../midi/parts.js';
import { noteName } from '../midi/parser.js';
import { ROLE_NAMES } from '../midi/features.js';
import { GM_PROGRAMS } from '../midi/gm.js';
import { esc } from './dom.js';
import { fragmentHue, noteColor } from './mini.js';

const LOOP_H = 11;   // a quarter of the ruler; also in styles.css (.tl-corner span, .tl-region span)
const BAR_H = 33;    // three quarters: the bar numbers
const LANE_H = 40;
const EDGE_PX = 7;
const DRAG_PX = 5;
const MAX_W = 30000;
const MIN_FIT = 3;   // px a bar: Fit shows a whole long song too (as far as − zooms out)
const AIM_PX = 6;   // a grid unit narrower than this cannot be aimed at: use a coarser one
const TOP_H = LOOP_H + BAR_H;
const LABEL_W = 220;   // also in styles.css (.tl-corner, .tl-labels)
const FOLLOW_PAUSE_MS = 5000;

export class Timeline {
  /**
   * handlers:
   *   onRegion(range, { final, created })  range { startTick, endTick } changed (live while dragging)
   *   onToggleLoop()  onClearRegion()  onSeek(songSec)  onPlayPause()
   *   onPickToggle(ch)  onSolo(ch)  onFragments(ch)  the fragments picked on a lane changed
   *   onFragmentClick({ ch, n }, tick)  if given, a click on a fragment does this, it picks none
   *   onLaneClick(ch)  if given, a click elsewhere on a lane picks that channel
   *   showFragments  false: the lanes without their fragments' colours (a clean score), nor clicks on them
   *   fragmentToggle  show a checkbox for the fragment layer
   *   firstFragmentOnly  show and select only the first occurrence of each fragment
   *   regionLanes()  channels on which to display the selected region
   *   isPicked(ch)  isSounding(ch)  -> boolean
   *   laneH  a lane's height, if not LANE_H
   */
  constructor(root, handlers) {
    this.root = root;
    this.h = handlers;
    this.info = null;
    this.lanes = [];
    this.px = 20;
    this.fit = true;
    this.region = null;       // { a, b } ticks
    this.loopOn = false;
    root.tabIndex = 0;
    root.innerHTML = `
      <div class="tl-tools">
        <span class="tl-range"></span>
        ${handlers.fragmentToggle ? '<label class="tl-fragments" title="Show or hide fragment regions; when hidden, clicks seek instead of selecting a fragment"><input type="checkbox" checked> Fragments</label>' : ''}
        <button class="tl-zout" title="Zoom out">−</button><button class="tl-zin" title="Zoom in (also Ctrl + wheel): closer in, the edges snap to beats and 16ths">+</button><button class="tl-fit" title="Fit: the whole song in the width, from its first bar">Fit</button>
      </div>
      <div class="tl-body">
        <div class="tl-grid">
          <div class="tl-toprow">
            <div class="tl-corner"><span>loop</span><span>bar</span></div>
            <div class="tl-top tl-area"><canvas></canvas><div class="tl-region"><span></span></div><div class="tl-head"></div></div>
          </div>
          <div class="tl-rows">
            <div class="tl-labels"></div>
            <div class="tl-stack tl-area"><canvas></canvas><div class="tl-region"></div><div class="tl-head"></div></div>
          </div>
        </div>
      </div>`;
    // One scroll box for both directions: the top strip and the labels are sticky inside it.
    this.labels = root.querySelector('.tl-labels');
    this.scroll = root.querySelector('.tl-body');
    this.grid = root.querySelector('.tl-grid');
    this.top = root.querySelector('.tl-top');
    this.stack = root.querySelector('.tl-stack');
    this.topCanvas = this.top.querySelector('canvas');
    this.canvas = this.stack.querySelector('canvas');
    this.regionEls = [...root.querySelectorAll('.tl-region')];
    this.extraRegions = [];
    this.headEls = [...root.querySelectorAll('.tl-head')];
    this.rangeEl = root.querySelector('.tl-range');
    this.fragmentToggle = root.querySelector('.tl-fragments input');
    if (this.fragmentToggle) {
      this.fragmentToggle.checked = this.h.showFragments !== false;
      this.fragmentToggle.onchange = () => {
        this.h.showFragments = this.fragmentToggle.checked;
        this.draw();
      };
    }
    // Kept by reference so the file browser can hide them outside the Files tab.
    this.tools = root.querySelector('.tl-tools');
    this.tools.classList.add('off');
    root.querySelector('.tl-zin').onclick = () => this.zoom(1.5);
    root.querySelector('.tl-zout').onclick = () => this.zoom(1 / 1.5);
    // Fit: the whole song in the width, from its first bar.
    root.querySelector('.tl-fit').onclick = () => {
      this.fit = true;
      this.draw();
      this.userScrollAt = 0;
      this.scroll.scrollLeft = 0;
    };
    this.rangeEl.onclick = () => this.revealRegion();
    this.top.title = 'Drag here (or over the lanes) to pick a region and loop it.';
    this.scroll.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.ctrlKey) this.zoom(e.deltaY < 0 ? 1.25 : 0.8, e);
      else {
        this.scroll.scrollLeft += e.deltaX;
        this.scroll.scrollTop += e.deltaY;
      }
    }, { passive: false });
    // A horizontal move we did not make ourselves (following the playhead) is the user browsing.
    this.ownScrollLeft = 0;
    this.userScrollAt = 0;
    this.scroll.addEventListener('scroll', () => {
      if (Math.abs(this.scroll.scrollLeft - this.ownScrollLeft) > 1) this.userScrollAt = performance.now();
    });
    new ResizeObserver(() => { if (this.fit) this.draw(); }).observe(this.scroll);
    this.labels.addEventListener('click', (e) => {
      const row = e.target.closest('[data-ch]');
      if (!row) return;
      const ch = Number(row.dataset.ch);
      if (e.target.closest('.tl-solo')) this.h.onSolo(ch);
      else this.h.onPickToggle(ch);
    });
    // Space: play/pause, only while the timeline has the focus (elsewhere it stays LUNA's).
    root.addEventListener('keydown', (e) => {
      if (e.target === this.fragmentToggle) return;
      if (e.code === 'Space' && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); this.h.onPlayPause(); }
    });
    this.initPointer();
  }

  /** A lane's height: handlers.laneH, if it wants another. */
  get laneH() { return this.h?.laneH ?? LANE_H; }

  /** Bars drawn: the song's. */
  get bars() { return Math.max(1, Math.ceil(this.info?.bars ?? 1)); }

  xOf(tick) { return (this.info.barOfTick(tick) - 1) * this.px; }
  tickAtX(x) { return Math.max(0, Math.round(tickAtBar(this.info, Math.max(0, x) / this.px + 1))); }

  /** The grid the region snaps to at this zoom: 'step', 'beat' or 'bar' (Alt: beat). */
  snapUnit(e) {
    if (e?.altKey) return 'beat';
    const beatsPerBar = Math.max(1, (this.info.barStartTick(2) - this.info.barStartTick(1)) / this.info.ppq);
    if (this.px / (beatsPerBar * 4) >= AIM_PX) return 'step';
    if (this.px / beatsPerBar >= AIM_PX) return 'beat';
    return 'bar';
  }

  snap(x, e) {
    const end = this.info.barStartTick(this.bars + 1);
    return Math.min(end, snapTick(this.info, this.tickAtX(x), this.snapUnit(e)));
  }

  /** Smallest region length at a tick with this snapping. */
  unitTicks(e) {
    const u = this.snapUnit(e);
    return u === 'step' ? this.info.ppq / 4 : u === 'beat' ? this.info.ppq : this.info.barStartTick(2) - this.info.barStartTick(1);
  }

  /** The fragment chosen in Parts, { ch, n } (null: none), brighter in all its repeats. */
  setActiveFragment(active) {
    if (active?.ch === this.activeFragment?.ch && active?.n === this.activeFragment?.n) return;
    this.activeFragment = active;
    this.draw();
  }

  /** The fragments of a lane picked to play in a row, in song order. */
  pickedFragments(ch) {
    const picks = this.fragPicks.get(ch);
    const lane = this.lanes.find((l) => l.ch === ch);
    return lane && picks ? lane.fragments.filter((_, n) => picks.has(n)).sort((a, b) => a.at - b.at) : [];
  }

  /** The fragment under a point of the lanes: its lane and number there, or null. */
  fragmentAt(x, y) {
    const lane = this.laneAt(y);
    if (!lane || this.h?.showFragments === false) return null;   // not drawn: not there
    const tick = this.tickAtX(x);
    const n = lane.fragments.findIndex((f) => (this.h?.firstFragmentOnly ? f.ats.slice(0, 1) : f.ats)
      .some((at) => tick >= at && tick < at + f.ticks));
    return n < 0 ? null : { ch: lane.ch, n };
  }

  /** The lane under a point in the grid, or null above/below the channel rows. */
  laneAt(y) {
    if (y < TOP_H) return null;
    return this.lanes[Math.floor((y - TOP_H) / this.laneH)] ?? null;
  }

  /** Pick a fragment of a lane to play in a row, or leave it out. */
  toggleFragment(ch, n) {
    if (!this.fragPicks.has(ch)) this.fragPicks.set(ch, new Set());
    const picks = this.fragPicks.get(ch);
    if (!picks.delete(n)) picks.add(n);
    this.draw();
  }

  /** A song on the lanes: all its channels, or only channel `only`. */
  load(info, features, only = null) {
    this.info = info;
    this.fragPicks = new Map();   // ch -> numbers of the fragments picked
    this.activeFragment = null;
    this.region = null;
    this.loopOn = false;
    this.lanes = info.channels.filter((c) => only === null || c.channel === only).map((c) => {
      const f = features.get(c.channel);
      const instrument = c.channel === 10 ? 'Drums' : channelInstrument(c);
      // The label shows the first instrument and how many changes follow; the tooltip, all of them.
      const short = c.channel === 10 || c.programs.length <= 1 ? instrument : `${GM_PROGRAMS[c.programs[0]] ?? c.programs[0]} (+${c.programs.length - 1})`;
      const tip = [
        `Channel ${c.channel} · ${instrument}${f?.trackName ? ` “${f.trackName}”` : ''}`,
        `${ROLE_NAMES[f?.role ?? 'melody']} · ${c.notes} notes · ${noteName(c.min)}–${noteName(c.max)} · ${(f?.density ?? 0).toFixed(1)} notes/bar`,
        ...(f?.fragments ?? []).map((p) => `⟳ ${p.bars} bars ×${p.count} from bar ${p.startBar} (${Math.round(p.coverage * 100)} %)`),
        this.h?.regionLanes
          ? 'Click: select or deselect this track · ▶ select and play this track alone'
          : 'Click: mark it (heard and sent to LUNA) · ▶ this channel alone',
      ].join('\n');
      return {
        ch: c.channel,
        min: c.min,
        max: c.max,
        role: f?.role ?? 'melody',
        name: `${c.channel} · ${short}`,
        tip,
        fragments: f?.fragments ?? [],
        notes: extractNotes(info, `ch:${c.channel}`).notes.map((n) => ({ a: info.barOfTick(n.start) - 1, b: info.barOfTick(n.stop) - 1, pitch: n.pitch, vel: n.velocity })),
      };
    });
    this.fit = true;
    this.root.hidden = false;
    this.tools.classList.remove('off');
    this.draw();
  }

  saveState() {
    return {
      fit: this.fit,
      px: this.px,
      range: this.range,
      loopOn: this.loopOn,
      scrollLeft: this.scroll.scrollLeft,
      scrollTop: this.scroll.scrollTop,
      fragPicks: new Map([...this.fragPicks].map(([ch, picks]) => [ch, new Set(picks)])),
      activeFragment: this.activeFragment ? { ...this.activeFragment } : null,
    };
  }

  restoreState(state) {
    if (!state) return;
    this.fit = state.fit;
    this.px = state.px;
    this.fragPicks = new Map([...state.fragPicks].map(([ch, picks]) => [ch, new Set(picks)]));
    this.activeFragment = state.activeFragment ? { ...state.activeFragment } : null;
    this.draw();
    this.setRegion(state.range, state.loopOn);
    this.scroll.scrollLeft = state.scrollLeft;
    this.scroll.scrollTop = state.scrollTop;
  }

  clear() {
    this.info = null;
    this.root.hidden = true;
    this.tools.classList.add('off');
  }

  /** Width of the lanes in view (the labels cover the left of the scroll box). */
  get viewW() { return Math.max(1, this.scroll.clientWidth - LABEL_W); }

  zoom(factor, e) {
    if (!this.info) return;
    const at = e ? Math.max(0, e.clientX - this.scroll.getBoundingClientRect().left - LABEL_W) : this.viewW / 2;
    const anchorBar = (this.scroll.scrollLeft + at) / this.px;
    this.fit = false;
    this.px = Math.max(3, Math.min(160, MAX_W / this.bars, this.px * factor));
    this.draw();
    // The −/+ buttons keep the region in the middle; Ctrl + wheel zooms around the pointer.
    if (!e && this.region) this.revealRegion();
    else this.scroll.scrollLeft = anchorBar * this.px - at;
  }

  /** Scroll the region into view (centred when it fits). */
  revealRegion() {
    if (this.region) this.reveal(this.region.a, this.region.b);
  }

  /** Scroll ticks [a, b) into view, centred when they fit. */
  reveal(a, b) {
    if (!this.info) return;
    const xa = this.xOf(a);
    const xb = this.xOf(b);
    this.userScrollAt = 0;
    this.scroll.scrollLeft = Math.max(0, xb - xa < this.viewW ? (xa + xb - this.viewW) / 2 : xa - 20);
  }

  /** Redraw the lanes (after load, zoom, resize or a change of marked channels). */
  draw() {
    if (!this.info) return;
    if (this.fit) this.px = Math.min(MAX_W / this.bars, Math.max(MIN_FIT, (this.viewW - 2) / this.bars));
    const W = Math.ceil(this.bars * this.px);
    const H = this.lanes.length * this.laneH;
    this.topCanvas.width = W;
    this.topCanvas.height = TOP_H;
    this.canvas.width = W;
    this.canvas.height = H;
    this.grid.style.width = `${LABEL_W + W}px`;
    const gt = this.topCanvas.getContext('2d');
    gt.fillStyle = '#121212';
    gt.fillRect(0, 0, W, TOP_H);
    gt.fillStyle = '#1b2a1f';
    gt.fillRect(0, 0, W, LOOP_H);
    const g = this.canvas.getContext('2d');
    g.fillStyle = '#121212';
    g.fillRect(0, 0, W, H);

    // Lanes first: alternate backgrounds and a separator, so each channel reads as a row.
    const anyPicked = this.lanes.some((l) => this.h.isPicked(l.ch));
    this.lanes.forEach((lane, k) => {
      const top = k * this.laneH;
      const dim = anyPicked && !this.h.isPicked(lane.ch);
      g.fillStyle = dim ? '#141414' : k % 2 ? '#1f1f1f' : '#1a1a1a';
      g.fillRect(0, top, W, this.laneH);
      g.fillStyle = '#2c2c2c';
      g.fillRect(0, top + this.laneH - 1, W, 1);
      if (this.h?.showFragments !== false) {
        // A tone per fragment, so the same pattern reads as the same; brighter the one chosen
        // in Parts, green those picked to play in a row (its ▶).
        lane.fragments.forEach((f, n) => {
          const on = this.fragPicks.get(lane.ch)?.has(n);
          const now = this.activeFragment?.ch === lane.ch && this.activeFragment.n === n;
          const hue = fragmentHue(n);
          const edge = on || now ? 2 : 1;
          const ats = this.h?.firstFragmentOnly ? f.ats.slice(0, 1) : f.ats;
          for (const at of ats) {
            const x = this.xOf(at);
            const w = Math.max(2, this.xOf(at + f.ticks) - x);
            g.fillStyle = on ? 'rgba(80, 190, 120, 0.28)' : `hsl(${hue} 70% 60% / ${now ? 0.38 : 0.13})`;
            g.fillRect(x, top, w, this.laneH - 1);
            g.fillStyle = on ? '#3fae6a' : now ? '#fff' : `hsl(${hue} 70% 60% / 0.5)`;
            g.fillRect(x, top, edge, this.laneH - 1);
            g.fillRect(x + w - edge, top, edge, this.laneH - 1);
            if (this.h?.firstFragmentOnly && f.count > 1 && w >= 26) {
              g.fillStyle = on || now ? '#fff' : `hsl(${hue} 70% 78%)`;
              g.font = '10px Segoe UI, sans-serif';
              g.textBaseline = 'bottom';
              g.fillText(`×${f.count}`, x + 3, top + this.laneH - 3, w - 6);
            }
          }
        });
      }
    });

    // Ruler: a line per bar (stronger every 4), beat lines when they fit, numbers as often as they fit.
    const every = [1, 2, 4, 8, 16, 32].find((n) => n * this.px >= 26) ?? 64;
    const beatPx = this.px / Math.max(1, (this.info.barStartTick(2) - this.info.barStartTick(1)) / this.info.ppq);
    gt.font = '13px Segoe UI, sans-serif';
    gt.textBaseline = 'middle';
    for (let bar = 0; bar <= this.bars; bar++) {
      const x = Math.round(bar * this.px) + 0.5;
      if (beatPx >= 8 && bar < this.bars) {
        g.fillStyle = 'rgba(255,255,255,0.04)';
        for (let b = 1; b * beatPx < this.px - 1; b++) g.fillRect(Math.round(x + b * beatPx), 0, 1, H);
      }
      const line = bar % 4 === 0 ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.09)';
      g.fillStyle = line;
      g.fillRect(x, 0, 1, H);
      gt.fillStyle = line;
      gt.fillRect(x, LOOP_H, 1, BAR_H);
      if (bar % every === 0 && bar < this.bars) {
        gt.fillStyle = '#b5b5b5';
        gt.fillText(String(bar + 1), x + 3, LOOP_H + BAR_H / 2);
      }
    }
    gt.fillStyle = '#3a3a3a';
    gt.fillRect(0, TOP_H - 1, W, 1);

    // Notes by octave as in Parts' thumbnails, drums amber; dimmed when other channels are marked and this one is not.
    this.lanes.forEach((lane, k) => {
      const { notes, min, max } = lane;
      const top = k * this.laneH;
      const drums = lane.role === 'drums';
      const alpha = anyPicked && !this.h.isPicked(lane.ch) ? 0.22 : 1;
      const span = max - min + 1;
      const inner = this.laneH - 8;
      const rowH = Math.max(2, Math.min(6, inner / span));
      for (const n of notes) {
        g.fillStyle = noteColor(n.pitch, n.vel, drums, alpha);
        const y = top + 4 + (inner - rowH) * (1 - (n.pitch - min) / Math.max(1, span - 1));
        g.fillRect(n.a * this.px, y, Math.max(2, (n.b - n.a) * this.px - 1), rowH);
      }
    });

    this.labels.innerHTML = this.lanes.map((l) => `
      <div data-ch="${l.ch}" title="${esc(l.tip)}" style="height:${this.laneH}px">
        <button class="tl-solo" title="Listen to this channel alone">▶</button>
        <i class="dot role-${l.role}"></i><span class="tl-name">${esc(l.name)}</span>
      </div>`).join('');
    this.updateLabels();
    this.showRegion();
  }

  /** Marked and sounding state of the lane labels: no redraw. */
  updateLabels() {
    for (const row of this.labels.querySelectorAll('[data-ch]')) {
      const ch = Number(row.dataset.ch);
      row.classList.toggle('on', this.h.isPicked(ch));
      const sounding = this.h.isSounding(ch);
      row.classList.toggle('sounding', sounding);
      row.querySelector('.tl-solo').textContent = sounding ? '⏸' : '▶';
    }
  }

  /** Bring a channel's lane into view and flash its label (a search result picked it). */
  focusLane(ch) {
    const row = this.labels.querySelector(`[data-ch="${ch}"]`);
    if (!row) return;
    row.scrollIntoView({ block: 'nearest' });
    row.classList.add('flash');
    setTimeout(() => row.classList.remove('flash'), 1200);
  }

  // ── region and playhead ───────────────────────────────────────────────────────────────

  /** Set the region { startTick, endTick } (or null) and whether its loop is on. */
  setRegion(range, loopOn = this.loopOn) {
    this.region = range ? { a: range.startTick, b: Math.max(range.startTick + 1, range.endTick) } : null;
    this.loopOn = !!range && loopOn;
    this.showRegion();
  }

  /** Loop on or off: a region is the loop, so switching it off takes the region away. */
  setLoopOn(on) {
    if (!on) this.region = null;
    this.loopOn = !!this.region && on;
    this.showRegion();
  }

  get range() { return this.region ? { startTick: this.region.a, endTick: this.region.b } : null; }

  /** "9 → 12.3" and its length in bars. */
  describe() {
    const r = this.region;
    if (!r) return null;
    const bars = this.info.barOfTick(r.b) - this.info.barOfTick(r.a);
    const len = Math.abs(bars - Math.round(bars)) < 1e-6 ? String(Math.round(bars)) : bars.toFixed(2).replace(/0$/, '');
    const secs = this.info.tickToSec(r.b) - this.info.tickToSec(r.a);
    return { from: formatPos(this.info, r.a), to: formatPos(this.info, r.b), len, secs };
  }

  showRegion() {
    const r = this.region;
    for (const el of [...this.regionEls, ...(this.extraRegions ?? [])]) el.hidden = !r || !this.info;
    if (!r || !this.info) {
      // No region: nothing to say here (how to make one is the loop strip's tooltip).
      this.rangeEl.textContent = '';
      this.rangeEl.className = 'tl-range';
      this.rangeEl.title = '';
      return;
    }
    const xa = this.xOf(r.a);
    const xb = this.xOf(r.b);
    const selected = this.h?.regionLanes?.();
    const lanes = selected == null ? null : this.lanes.map((lane, i) => selected.has(lane.ch) ? i : -1).filter((i) => i >= 0);
    if (lanes) {
      this.extraRegions ??= [];
      while (this.extraRegions.length < Math.max(0, lanes.length - 1)) {
        const el = this.root.ownerDocument.createElement('div');
        el.className = 'tl-region';
        this.stack.insertBefore(el, this.stack.querySelector('.tl-head'));
        this.extraRegions.push(el);
      }
      while (this.extraRegions.length > Math.max(0, lanes.length - 1)) this.extraRegions.pop().remove();
    }
    for (const [i, el] of this.regionEls.entries()) {
      el.style.left = `${xa}px`;
      el.style.width = `${Math.max(2, xb - xa)}px`;
      el.classList.toggle('on', this.loopOn);
      if (i === 1) {
        const ch = this.h?.regionLane?.();
        const lane = lanes ? (lanes[0] ?? -1) : ch == null ? -1 : this.lanes.findIndex((item) => item.ch === ch);
        if (lanes) el.hidden = lanes.length === 0;
        if (lane >= 0) {
          el.style.top = `${lane * this.laneH}px`;
          el.style.height = `${this.laneH}px`;
          el.style.bottom = 'auto';
        } else {
          el.style.top = '';
          el.style.height = '';
          el.style.bottom = '';
        }
      }
      if (lanes) this.extraRegions.forEach((el, i) => {
        el.hidden = false;
        el.style.left = `${xa}px`;
        el.style.width = `${Math.max(2, xb - xa)}px`;
        el.style.top = `${lanes[i + 1] * this.laneH}px`;
        el.style.height = `${this.laneH}px`;
        el.style.bottom = 'auto';
        el.classList.toggle('on', this.loopOn);
      });
    }
    const d = this.describe();
    // Its length on the region itself, and nothing more in the tools: the region says it.
    this.regionEls[0].firstElementChild.textContent = `⟳ ${d.len} bars`;
    this.rangeEl.textContent = '';
    this.rangeEl.className = 'tl-range';
    this.rangeEl.title = '';
  }

  /** Move the playhead to a song second; keep it in view while playing. */
  setPlayhead(sec, playing) {
    if (!this.info) return;
    const x = this.xOf(this.info.secToTick(sec));
    for (const el of this.headEls) {
      el.hidden = !playing && sec <= 0;
      el.style.left = `${x}px`;
    }
    const browsing = performance.now() - this.userScrollAt < FOLLOW_PAUSE_MS;
    if (playing && !this.dragging && !browsing) {
      const view = this.scroll;
      if (x < view.scrollLeft || x > view.scrollLeft + this.viewW - 20) {
        view.scrollLeft = Math.max(0, x - 40);
        this.ownScrollLeft = view.scrollLeft;
      }
    }
  }

  // ── pointer gestures (after midiGrid's timeline-ruler.js) ─────────────────────────────

  initPointer() {
    // Both strips share x; y counts from the top of the loop lane, as if they were one.
    const pos = (e) => {
      const el = e.currentTarget;
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top + (el === this.stack ? TOP_H : 0) };
    };
    const hit = (x) => {
      const r = this.region;
      if (!r) return null;
      const xa = this.xOf(r.a);
      const xb = this.xOf(r.b);
      const tol = Math.min(EDGE_PX, (xb - xa) / 4);   // a narrow region keeps a body to click
      if (Math.abs(x - xa) <= tol) return 'start';
      if (Math.abs(x - xb) <= tol) return 'end';
      if (x > xa && x < xb) return 'body';
      return null;
    };
    let drag = null;

    const down = (e) => {
      if (!this.info || e.button !== 0) return;
      e.preventDefault();
      this.root.focus({ preventScroll: true });
      e.currentTarget.setPointerCapture(e.pointerId);
      const { x, y } = pos(e);
      const orig = this.region ? { ...this.region } : null;
      if (y < LOOP_H) {
        const h = hit(x);
        if (h === 'start' || h === 'end') drag = { mode: h, orig, moved: false };
        else if (h === 'body') drag = { mode: 'move', grabTick: this.tickAtX(x) - orig.a, orig, moved: false };
        else drag = { mode: 'create', anchor: this.snap(x, e), orig, moved: false };
      } else {
        drag = { mode: 'scrub', x, clientX: e.clientX, orig, moved: false };
      }
      this.dragging = true;
    };

    const move = (e) => {
      const { x, y } = pos(e);
      if (!drag) {
        const h = y < LOOP_H ? hit(x) : null;
        e.currentTarget.style.cursor = h === 'start' || h === 'end' ? 'ew-resize' : h === 'body' ? 'grab' : y < LOOP_H ? 'copy' : 'pointer';
        return;
      }
      if (drag.mode === 'scrub') {
        if (Math.abs(e.clientX - drag.clientX) < DRAG_PX) return;
        drag = { mode: 'create', anchor: this.snap(drag.x, e), orig: drag.orig, moved: false };
      }
      const unit = this.unitTicks(e);
      const end = this.info.barStartTick(this.bars + 1);
      let a;
      let b;
      if (drag.mode === 'create') {
        const s = this.snap(x, e);
        if (s === drag.anchor && !drag.moved) return;
        a = Math.min(drag.anchor, s);
        b = Math.max(drag.anchor, s);
        if (b - a < unit) b = Math.min(end, a + unit);
      } else if (drag.mode === 'move') {
        const len = drag.orig.b - drag.orig.a;
        a = snapTick(this.info, Math.max(0, this.tickAtX(x) - drag.grabTick), this.snapUnit(e));
        a = Math.max(0, Math.min(end - len, a));
        b = a + len;
      } else if (drag.mode === 'start') {
        a = Math.min(this.snap(x, e), drag.orig.b - unit);
        b = drag.orig.b;
      } else {
        a = drag.orig.a;
        b = Math.max(this.snap(x, e), drag.orig.a + unit);
      }
      if (this.region && a === this.region.a && b === this.region.b) return;
      drag.moved = true;
      if (drag.mode === 'create') this.loopOn = true;   // creating a region switches the loop on
      this.region = { a, b };
      this.showRegion();
      this.h.onRegion(this.range, { final: false, created: drag.mode === 'create' });   // heard live
    };

    const end = (e) => {
      if (!drag) return;
      const d = drag;
      drag = null;
      this.dragging = false;
      if (d.mode === 'scrub') {
        // A click on a fragment picks it; anywhere else, the song goes there.
        const { x, y } = pos(e);
        const frag = this.fragmentAt(x, y);
        if (frag && this.h.onFragmentClick) this.h.onFragmentClick(frag, this.tickAtX(x));
        else if (frag) {
          this.toggleFragment(frag.ch, frag.n);
          this.h.onFragments(frag.ch);
        } else {
          const lane = this.laneAt(y);
          if (lane) this.h.onLaneClick?.(lane.ch);
          this.h.onSeek(this.info.tickToSec(this.tickAtX(x)));
        }
        return;
      }
      if (!d.moved) {
        if (d.mode === 'move') this.h.onToggleLoop();
        return;
      }
      this.h.onRegion(this.range, { final: true, created: d.mode === 'create' });
    };
    const dblclick = (e) => {
      const { x, y } = pos(e);
      if (y < LOOP_H && hit(x) === 'body') {
        this.region = null;
        this.loopOn = false;
        this.showRegion();
        this.h.onClearRegion();
      }
    };

    for (const el of [this.top, this.stack]) {
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', () => { drag = null; this.dragging = false; });
      el.addEventListener('dblclick', dblclick);
    }
  }
}

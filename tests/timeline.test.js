import { describe, expect, it, vi } from 'vitest';
import { Timeline } from '../src/ui/timeline.js';
import { fragmentHue, noteColor, rulerStep } from '../src/ui/mini.js';
import { FAMILY_ICONS, ROLE_ICONS } from '../src/ui/family-icons.js';
import { ROLES } from '../src/midi/features.js';
import { GM_FAMILIES } from '../src/midi/gm.js';

// The timeline without its page: its buttons are plain objects, only what it sets is checked.
function timeline() {
  const t = Object.create(Timeline.prototype);
  Object.assign(t, {
    info: { barOfTick: (tick) => tick / 100 + 1 },
    draw() {},
  });
  return t;
}

describe('timeline', () => {
  it('toggles the fragment layer without changing the selected region and allows Space on the checkbox', () => {
    const element = () => ({
      classList: { add() {} },
      scrollLeft: 0, scrollTop: 0,
      addEventListener(type, handler) { this.listeners ??= {}; this.listeners[type] = handler; },
      querySelector() { return {}; },
    });
    const checkbox = { checked: true };
    const nodes = {
      '.tl-labels': element(), '.tl-body': element(), '.tl-grid': element(),
      '.tl-top': element(), '.tl-stack': element(), '.tl-range': element(),
      '.tl-tools': element(), '.tl-zin': element(), '.tl-zout': element(),
      '.tl-fit': element(), '.tl-fragments input': checkbox,
    };
    const listeners = {};
    const root = {
      querySelector: (selector) => nodes[selector],
      querySelectorAll: () => [],
      addEventListener: (type, handler) => { listeners[type] = handler; },
    };
    vi.stubGlobal('ResizeObserver', class { observe() {} });
    try {
      const onPlayPause = vi.fn();
      const t = new Timeline(root, { fragmentToggle: true, onPlayPause });
      t.draw = vi.fn();
      Object.assign(t, {
        region: { a: 10, b: 30 }, px: 10, tickAtX: (x) => x * 10,
        lanes: [{ ch: 5, fragments: [{ at: 0, ticks: 100, ats: [0] }] }],
      });
      expect(t.fragmentAt(5, 60)).toEqual({ ch: 5, n: 0 });
      checkbox.checked = false;
      checkbox.onchange();
      expect(t.fragmentAt(5, 60)).toBeNull();
      expect(t.region).toEqual({ a: 10, b: 30 });
      expect(t.draw).toHaveBeenCalledTimes(1);
      const preventDefault = vi.fn();
      listeners.keydown({ target: checkbox, code: 'Space', preventDefault });
      expect(preventDefault).not.toHaveBeenCalled();
      expect(onPlayPause).not.toHaveBeenCalled();
      const wheel = nodes['.tl-body'].listeners.wheel;
      const wheelEvent = { ctrlKey: false, deltaX: 12, deltaY: 48, preventDefault: vi.fn() };
      wheel(wheelEvent);
      expect(nodes['.tl-body']).toMatchObject({ scrollLeft: 12, scrollTop: 48 });
      expect(wheelEvent.preventDefault).toHaveBeenCalledOnce();
      checkbox.checked = true;
      checkbox.onchange();
      expect(t.fragmentAt(5, 60)).toEqual({ ch: 5, n: 0 });
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('draws notes but not fragment shading when fragments are hidden', () => {
    const fills = [];
    const context = () => ({
      fillStyle: '',
      fillRect(...rect) { fills.push({ color: this.fillStyle, rect }); },
      fillText() {},
    });
    const g = context();
    const t = timeline();
    Object.assign(t, {
      draw: Timeline.prototype.draw,
      info: { bars: 4, ppq: 25, barOfTick: (tick) => tick / 100 + 1, barStartTick: (bar) => (bar - 1) * 100 },
      h: { isPicked: () => false, showFragments: true },
      fit: false, px: 20, fragPicks: new Map(),
      lanes: [{ ch: 5, min: 60, max: 60, role: 'melody', fragments: [{ at: 100, ticks: 100, ats: [100] }], notes: [{ a: 1, b: 1.5, pitch: 60, vel: 100 }] }],
      topCanvas: { getContext: () => context() }, canvas: { getContext: () => g },
      grid: { style: {} }, labels: {}, updateLabels() {}, showRegion() {},
    });
    t.draw();
    const fragmentColor = `hsl(${fragmentHue(0)} 70% 60% / 0.13)`;
    expect(fills.some((fill) => fill.color === fragmentColor)).toBe(true);
    fills.length = 0;
    t.h.showFragments = false;
    t.draw();
    expect(fills.some((fill) => fill.color === fragmentColor)).toBe(false);
    expect(fills.some((fill) => fill.color === noteColor(60, 100, false, 1))).toBe(true);
  });

  it('picks the fragments of a lane by clicking them, in song order', () => {
    const t = timeline();
    Object.assign(t, {
      px: 10,
      fragPicks: new Map(),
      tickAtX: (x) => x * 10,
      lanes: [{ ch: 5, fragments: [{ at: 1000, ticks: 200, ats: [1000, 1500] }, { at: 0, ticks: 400, ats: [0] }] }],
    });
    const top = 60;   // inside the first lane, under the ruler
    expect(t.fragmentAt(5, top)).toEqual({ ch: 5, n: 1 });
    expect(t.fragmentAt(105, top)).toEqual({ ch: 5, n: 0 });
    expect(t.fragmentAt(155, top)).toEqual({ ch: 5, n: 0 });   // a repeat of it
    expect(t.fragmentAt(60, top)).toBe(null);   // between them
    expect(t.fragmentAt(5, 2)).toBe(null);      // on the ruler
    t.toggleFragment(5, 0);
    t.toggleFragment(5, 1);
    expect(t.pickedFragments(5).map((f) => f.at)).toEqual([0, 1000]);
    t.toggleFragment(5, 1);
    expect(t.pickedFragments(5).map((f) => f.at)).toEqual([1000]);
    expect(t.pickedFragments(6)).toEqual([]);
  });

  it('only exposes the first occurrence when configured for fragment overview', () => {
    const t = timeline();
    Object.assign(t, {
      px: 10,
      fragPicks: new Map(),
      tickAtX: (x) => x * 10,
      h: { firstFragmentOnly: true },
      lanes: [{ ch: 5, fragments: [{ at: 1000, ticks: 200, ats: [1000, 1500], count: 2 }] }],
    });
    expect(t.fragmentAt(105, 60)).toEqual({ ch: 5, n: 0 });
    expect(t.fragmentAt(155, 60)).toBeNull();
  });

  it('finds the channel lane across the grid, but not the ruler or space below it', () => {
    const t = timeline();
    Object.assign(t, {
      h: { laneH: 40 },
      lanes: [{ ch: 2 }, { ch: 5 }],
    });
    expect(t.laneAt(43)).toBeNull();
    expect(t.laneAt(44)).toEqual({ ch: 2 });
    expect(t.laneAt(83)).toEqual({ ch: 2 });
    expect(t.laneAt(84)).toEqual({ ch: 5 });
    expect(t.laneAt(124)).toBeNull();
  });

  it('rules the thumbnails every 4 bars, or wider on a long song', () => {
    expect(rulerStep(100, 790)).toBe(4);
    expect(rulerStep(300, 790)).toBe(4);   // 10 px apart
    expect(rulerStep(600, 790)).toBe(8);
    expect(rulerStep(1600, 790)).toBe(16);
  });

  it('has a drawing for every instrument family', () => {
    expect(new Set(FAMILY_ICONS).size).toBe(GM_FAMILIES.length);
  });

  it('has a drawing for every role', () => {
    expect(ROLE_ICONS.map((r) => r.value)).toEqual(ROLES);
  });

  it('can show only one channel of a song', () => {
    const t = timeline();
    Object.assign(t, { root: {}, tools: { classList: { remove() {} } } });
    const channel = (channel) => ({ channel, min: 60, max: 60, notes: 0, programs: [] });
    const info = { channels: [channel(2), channel(5)], events: [], barOfTick: () => 1, tickToSec: () => 0, ppq: 96, tracks: [] };
    t.load(info, new Map(), 5);
    expect(t.lanes.map((l) => l.ch)).toEqual([5]);
    t.load(info, new Map());
    expect(t.lanes.map((l) => l.ch)).toEqual([2, 5]);
  });

  it('gives each fragment of a lane its own tone', () => {
    const hues = Array.from({ length: 8 }, (_, n) => fragmentHue(n));
    expect(new Set(hues).size).toBe(8);
    hues.forEach((h, n) => { if (n) expect(Math.abs(h - hues[n - 1])).toBeGreaterThan(30); });
  });

  it('takes the region away with the loop: selected or nothing', () => {
    const t = timeline();
    Object.assign(t, { region: { a: 0, b: 100 }, loopOn: true, showRegion() {} });
    t.setLoopOn(false);
    expect([t.region, t.loopOn]).toEqual([null, false]);
  });

  it('limits the region overlay to the active lane when requested', () => {
    const region = () => ({
      style: {},
      classList: { toggle() {} },
      firstElementChild: { textContent: '' },
    });
    const t = timeline();
    Object.assign(t, {
      info: {},
      region: { a: 10, b: 30 },
      loopOn: true,
      regionEls: [region(), region()],
      rangeEl: { textContent: '', className: '', title: '' },
      lanes: [{ ch: 1 }, { ch: 7 }, { ch: 9 }],
      h: { laneH: 44, regionLane: () => 7 },
      xOf: (tick) => tick,
      describe: () => ({ len: '2' }),
    });

    t.showRegion();

    expect(t.regionEls[0].style).toMatchObject({ left: '10px', width: '20px' });
    expect(t.regionEls[1].style).toMatchObject({ left: '10px', width: '20px', top: '44px', height: '44px', bottom: 'auto' });
  });

  it('shows the common region only on selected lanes, including nonadjacent ones', () => {
    const region = () => ({ style: {}, classList: { toggle() {} }, firstElementChild: { textContent: '' }, remove() {} });
    const t = timeline();
    const selected = new Set([1, 9]);
    Object.assign(t, {
      info: {}, region: { a: 10, b: 30 }, loopOn: true,
      regionEls: [region(), region()], extraRegions: [],
      root: { ownerDocument: { createElement: region } },
      stack: { insertBefore() {}, querySelector() {} },
      rangeEl: { textContent: '', className: '', title: '' },
      lanes: [{ ch: 1 }, { ch: 7 }, { ch: 9 }],
      h: { laneH: 44, regionLanes: () => selected },
      xOf: (tick) => tick, describe: () => ({ len: '2' }),
    });
    t.showRegion();
    expect(t.regionEls[1].style).toMatchObject({ left: '10px', width: '20px', top: '0px', height: '44px' });
    expect(t.extraRegions[0].style).toMatchObject({ left: '10px', width: '20px', top: '88px', height: '44px' });
    selected.clear();
    t.showRegion();
    expect(t.regionEls[1].hidden).toBe(true);
    expect(t.extraRegions).toHaveLength(0);
  });
});

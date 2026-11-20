import { describe, expect, it, vi } from 'vitest';
import { Catalog } from '../src/library/catalog.js';
import { DataViewer, matches } from '../src/ui/data-viewer.js';

// A viewer without its dialog: its elements are plain objects, only the data is checked.
function viewer(catalog, tab) {
  const els = {};
  const v = Object.create(DataViewer.prototype);
  v.catalog = catalog;
  v.tab = tab;
  v.q = (sel) => (els[sel] ??= { value: '', textContent: '', innerHTML: '', scrollTop: 0 });
  v.reset();
  return v;
}

function library() {
  const c = new Catalog();
  // Part tuples as fileRecord makes them: ch, program, role, notes, bars, density, poly, min, max, loopBars, loopCount, loopCov, loopStart, name.
  c.addFile({ path: 'D:/a.mid', v: 4, ok: true, bpm: 120, ts: '4/4', key: 'C', parts: [[10, 0, 0, 100, 8, 50, 10, 35, 50, 1, 8, 100, 1, 'Drums'], [2, 33, 1, 40, 8, 20, 0, 30, 40, 2, 4, 100, 1, 'Bass']] });
  c.addFile({ path: 'D:/b.mid', v: 4, ok: true, bpm: 90, ts: '3/4', key: 'D', parts: [[1, 0, 3, 80, 4, 30, 50, 60, 72, 0, 0, 0, 0, 'Piano']] });
  return c;
}

describe('analysed data viewer', () => {
  it('shows the file records with their own fields, not where their parts are kept', () => {
    const v = viewer(library(), 'files');
    expect(v.total).toBe(2);
    expect(v.columns).toEqual(expect.arrayContaining(['index', 'path', 'bpm', 'ts', 'key', 'partCount']));
    expect(v.columns).not.toContain('partStart');
    expect(v.q('tbody').innerHTML).toContain('D:/a.mid');
  });

  it('shows every part as stored, filters by text and sorts by a column', () => {
    const v = viewer(library(), 'parts');
    expect(v.total).toBe(3);
    expect([v.value(0, 'role'), v.value(1, 'program'), v.value(2, 'file')]).toEqual(['drums', 33, 'D:/b.mid']);
    v.q('.dv-filter').value = 'bass';
    v.refilter();
    expect(v.rows).toEqual([1]);
    v.q('.dv-filter').value = '';
    v.refilter();
    v.sortCol = 'notes';
    v.sortDir = -1;
    v.sort();
    expect(v.rows).toEqual([0, 2, 1]);
  });

  it('previews and plays the row picked, as a fragment of its part', async () => {
    const c = new Catalog();
    c.addFile({ path: 'D:/x/a.mid', v: 5, ok: true, bpm: 120, ts: '4/4', key: 'C', parts: [[1, 0, 3, 80, 8, 30, 0, 60, 72, 2, 4, 50, 1, 'Lead', [[2, 1, 4, 50, 1, 1], [4, 9, 2, 50, 4, 2]]]] });
    const v = viewer(c, 'fragments');
    const played = [];
    v.q('tr.picked').classList = { remove() {} };
    v.q('.dv-mini').replaceChildren = () => {};
    let sounding = false;
    v.preview = { draw: async () => 'canvas', play: (id) => played.push(id), playing: () => false, sounding: () => sounding };
    const row = (i) => ({ dataset: { i: String(i) }, classList: { add() {} } });
    v.pick(row(1));
    expect(played).toEqual([]);   // silent: only selected
    expect(v.q('.dv-preview').hidden).toBe(false);
    expect(v.q('.dv-what').textContent).toBe('Acoustic Grand Piano · a.mid · ch 1 · 4 bars from bar 9');
    v.play();
    expect(c.part(played[0])).toMatchObject({ frag: 1, loopStart: 9 });
    // Listening: another row takes over; the same row again changes nothing.
    sounding = true;
    v.pick(row(0));
    v.pick(row(0));
    await new Promise((r) => { setTimeout(r, 200); });
    expect(played.length).toBe(2);
    expect(c.part(played[1]).frag).toBe(0);
  });

  it('starts a fragment on a thumbnail double click without stopping it or replaying a pending switch', () => {
    vi.useFakeTimers();
    try {
      const c = new Catalog();
      c.addFile({ path: 'D:/a.mid', v: 5, ok: true, parts: [[1, 0, 3, 80, 8, 30, 0, 60, 72, 2, 4, 50, 1, 'Lead', [[2, 1, 4, 50, 1, 1], [4, 9, 2, 50, 4, 2]]]] });
      const nodes = {};
      const dialog = {
        querySelector: (sel) => (nodes[sel] ??= { classList: { remove() {} }, replaceChildren() {} }),
        querySelectorAll: () => [],
        addEventListener() {},
      };
      let sounding = -1;
      const play = vi.fn((id) => { sounding = id; });
      const stop = vi.fn();
      const v = new DataViewer(dialog, c, {
        draw: async () => null,
        play,
        playing: (id) => sounding === id,
        sounding: () => true,
        stop,
      });
      v.tab = 'fragments';
      v.fragments = c.fragmentIds(0);
      v.picked = null;
      v.pick({ dataset: { i: '1' }, classList: { add() {} } });
      const mini = nodes['.dv-mini-box'];
      mini.onclick({});
      expect(play).not.toHaveBeenCalled();
      mini.ondblclick();
      expect(play).toHaveBeenCalledExactlyOnceWith(v.fragments[1], false);
      vi.runAllTimers();
      mini.ondblclick();
      expect(play).toHaveBeenCalledOnce();
      expect(stop).not.toHaveBeenCalled();
      v.tab = 'parts';
      mini.ondblclick();
      expect(play).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it('moves the selection with the arrows, turning the page, and only the last row sounds', async () => {
    const c = new Catalog();
    const parts = Array.from({ length: 150 }, (_, k) => [k % 16, 0, 3, 80, 8, 30, 0, 60, 72, 2, 4, 50, 1, `P${k}`]);
    c.addFile({ path: 'D:/a.mid', v: 5, ok: true, bpm: 120, ts: '4/4', key: 'C', parts });
    const v = viewer(c, 'parts');
    const played = [];
    v.q('tr.picked').classList = { remove() {} };
    v.q('.dv-mini').replaceChildren = () => {};
    v.preview = { draw: async () => null, play: (id) => played.push(id), playing: () => false, sounding: () => true };
    const q = v.q;
    v.q = (sel) => {
      const i = /tr\[data-i="(\d+)"\]/.exec(sel)?.[1];
      return i === undefined ? q(sel) : { dataset: { i }, classList: { add() {} }, scrollIntoView() {} };
    };
    v.move(1);
    v.move(1);
    expect(v.picked).toBe(1);
    // Past the first page: the next one, then back.
    v.picked = 99;
    v.move(1);
    expect(v.picked).toBe(100);
    expect(v.page).toBe(1);
    expect(v.q('.dv-count').textContent).toBe('Rows 101–150 of 150');
    v.move(-1);
    expect(v.picked).toBe(99);
    expect(v.page).toBe(0);
    await new Promise((r) => { setTimeout(r, 200); });
    expect(played).toEqual([99]);
  });

  it('filters by column: text, or numbers with > < =', () => {
    const v = viewer(library(), 'parts');
    v.colFilters = { role: 'BAS' };
    v.refilter();
    expect(v.rows).toEqual([1]);
    v.colFilters = { notes: '>=80' };
    v.refilter();
    expect(v.rows).toEqual([0, 2]);
    v.colFilters = { notes: '>=80', file: 'b.mid' };
    v.refilter();
    expect(v.rows).toEqual([2]);
    expect(matches('', '>0')).toBe(false);
    expect(matches(16, '=16')).toBe(true);
    expect(matches(160, '16')).toBe(true);   // no sign: text
  });

  it('moves through the files with the arrows too', () => {
    const v = viewer(library(), 'files');
    v.q('tr.picked').classList = { remove() {} };
    v.q('.dv-mini').replaceChildren = () => {};
    v.preview = { drawFile: async () => null, playingFile: () => false, sounding: () => false };
    const q = v.q;
    v.q = (sel) => {
      const i = /tr\[data-i="(\d+)"\]/.exec(sel)?.[1];
      return i === undefined ? q(sel) : { dataset: { i }, classList: { add() {} }, scrollIntoView() {} };
    };
    v.move(1);
    v.move(1);
    expect(v.picked).toBe(1);
  });

  it('starts the selected file on Enter and cancels a pending automatic switch', () => {
    vi.useFakeTimers();
    try {
      const nodes = {};
      const listeners = {};
      const element = () => ({
        classList: { add() {}, remove() {} },
        replaceChildren() {},
        matches() { return false; },
        closest() { return null; },
      });
      const dialog = {
        querySelector: (sel) => {
          const i = /tr\[data-i="(\d+)"\]/.exec(sel)?.[1];
          if (i !== undefined) return { ...element(), dataset: { i }, scrollIntoView() {} };
          return (nodes[sel] ??= element());
        },
        querySelectorAll: () => [],
        addEventListener: (type, listener) => { listeners[type] = listener; },
      };
      let sounding = 'D:/a.mid';
      const playFile = vi.fn((path) => { sounding = path; });
      const v = new DataViewer(dialog, library(), {
        drawFile: async () => null,
        playFile,
        playingFile: (path) => sounding === path,
        sounding: () => !!sounding,
      });
      v.rows = [0, 1];
      v.page = 0;
      v.picked = 0;
      const key = (name, target = element()) => {
        const event = { key: name, target, preventDefault: vi.fn(), stopPropagation: vi.fn() };
        listeners.keydown(event);
        return event;
      };
      key('ArrowDown');
      expect(v.picked).toBe(1);
      key('Enter');
      expect(playFile).toHaveBeenCalledOnce();
      expect(playFile).toHaveBeenCalledWith('D:/b.mid');
      vi.runAllTimers();
      expect(playFile).toHaveBeenCalledOnce();
      key('Enter');
      expect(playFile).toHaveBeenCalledOnce();
      const input = { ...element(), closest: () => ({}) };
      expect(key('Enter', input).preventDefault).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('takes a row of Parts as its whole channel, a Fragment as its loop', async () => {
    const c = new Catalog();
    c.addFile({ path: 'D:/x/a.mid', v: 5, ok: true, bpm: 120, ts: '4/4', key: 'C', parts: [[1, 0, 3, 80, 8, 30, 0, 60, 72, 2, 4, 50, 1, 'Lead']] });
    const v = viewer(c, 'parts');
    const calls = [];
    v.q('tr.picked').classList = { remove() {} };
    v.q('.dv-mini').replaceChildren = () => {};
    v.preview = { draw: async (id, w, h, whole) => calls.push(['draw', whole]), play: (id, whole) => calls.push(['play', whole]), playing: () => false, sounding: () => false };
    v.pick({ dataset: { i: '0' }, classList: { add() {} } });
    v.play();
    expect(v.q('.dv-what').textContent).toBe('Acoustic Grand Piano · a.mid · ch 1 · the whole channel');
    expect(calls).toEqual([['draw', true], ['play', true]]);
  });

  it('previews a file whole, all its tracks; ▶ plays it, ■ while it sounds stops it', () => {
    const v = viewer(library(), 'files');
    v.q('tr.picked').classList = { remove() {} };
    v.q('.dv-mini').replaceChildren = () => {};
    let playing = false;
    const calls = [];
    v.preview = {
      drawFile: async (path) => calls.push(['draw', path]),
      playFile: (path) => { calls.push(['play', path]); playing = true; },
      playingFile: () => playing,
      stop: () => { calls.push(['stop']); playing = false; },
      sounding: () => playing,
    };
    v.pick({ dataset: { i: '0' }, classList: { add() {} } });
    expect(v.q('.dv-what').textContent).toBe('a.mid · all its tracks');
    v.play();
    expect(v.q('.dv-play').textContent).toBe('■');
    v.play();
    expect(v.q('.dv-play').textContent).toBe('▶');
    expect(calls).toEqual([['draw', 'D:/a.mid'], ['play', 'D:/a.mid'], ['stop']]);
  });

  it('opens the selected file location in the Files tab', () => {
    const v = viewer(library(), 'files');
    const paths = [];
    v.preview = {
      revealFile: (path) => paths.push(path),
      playingFile: () => false,
      drawFile: async () => null,
      sounding: () => false,
    };
    const row = { dataset: { i: '1' }, classList: { add() {} } };
    v.q('tr.picked').classList = { remove() {} };
    v.q('.dv-mini').replaceChildren = () => {};
    v.pick(row);
    expect(v.q('.dv-open-folder').hidden).toBe(false);
    v.openContainingFolder();
    expect(paths).toEqual(['D:/b.mid']);
  });

  it('maps the selected file, part or fragment to the main track area', () => {
    const c = new Catalog();
    c.addFile({
      path: 'D:/x/a.mid', v: 5, ok: true, bpm: 120, ts: '4/4', key: 'C',
      parts: [[1, 0, 3, 80, 8, 30, 0, 60, 72, 2, 4, 50, 1, 'Lead', [[2, 9, 2, 50, 1, 1]]]],
    });

    const files = viewer(c, 'files');
    files.picked = 0;
    expect(files.trackSelection()).toEqual({ kind: 'file', path: 'D:/x/a.mid' });

    const parts = viewer(c, 'parts');
    parts.picked = 0;
    expect(parts.trackSelection()).toMatchObject({ kind: 'part', path: 'D:/x/a.mid', ch: 1 });

    const fragments = viewer(c, 'fragments');
    fragments.picked = 0;
    const fragment = c.part(fragments.rowId(0));
    expect(fragments.trackSelection()).toMatchObject({
      kind: 'fragment', path: 'D:/x/a.mid', ch: 1,
      atTick: fragment.atTick, ticks: fragment.ticks, frag: fragment.frag,
    });
  });

  it('shows one row per fragment', () => {
    const c = new Catalog();
    c.addFile({ path: 'D:/a.mid', v: 5, ok: true, bpm: 120, ts: '4/4', key: 'C', parts: [[1, 0, 3, 80, 8, 30, 0, 60, 72, 2, 4, 50, 1, 'Lead', [[2, 1, 4, 50, 1, 1], [4, 9, 2, 50, 4, 2]]]] });
    const v = viewer(c, 'fragments');
    expect(v.total).toBe(2);
    expect([v.value(1, 'frag'), v.value(1, 'loopBars'), v.value(1, 'loopStart'), v.value(1, 'shape'), v.value(1, 'energy')]).toEqual([1, 4, 9, 'wave', 'busy']);
  });

  it('groups fragments by file and orders each song left to right by loopStart', () => {
    const c = new Catalog();
    c.addFile({
      path: 'D:/z-song.mid', v: 5, ok: true, bpm: 120, ts: '4/4', key: 'C',
      parts: [[1, 0, 3, 80, 8, 30, 0, 60, 72, 2, 4, 50, 1, 'Lead', [
        [2, 8, 1, 50, 1, 1], [2, 2, 1, 50, 1, 1],
      ]]],
    });
    c.addFile({
      path: 'D:/a-song.mid', v: 5, ok: true, bpm: 120, ts: '4/4', key: 'C',
      parts: [[1, 0, 3, 80, 8, 30, 0, 60, 72, 2, 4, 50, 1, 'Lead', [
        [2, 4, 1, 50, 1, 1], [2, 1, 1, 50, 1, 1],
      ]]],
    });
    const v = viewer(c, 'fragments');

    expect(v.rows.map((i) => [v.value(i, 'file'), v.value(i, 'loopStart')])).toEqual([
      ['D:/a-song.mid', 1], ['D:/a-song.mid', 4],
      ['D:/z-song.mid', 2], ['D:/z-song.mid', 8],
    ]);
  });

  it('orders a song\'s fragments track by track, each track left to right', () => {
    const c = new Catalog();
    const part = (ch, name, starts) => [ch, 0, 3, 80, 8, 30, 0, 60, 72, 2, 4, 50, starts[0], name, starts.map((s) => [2, s, 1, 50, 1, 1])];
    // The channels in the file out of order, and their fragments too.
    c.addFile({ path: 'D:/song.mid', v: 5, ok: true, bpm: 120, ts: '4/4', key: 'C', parts: [part(3, 'Pad', [9, 1]), part(1, 'Lead', [5, 3]), part(2, 'Bass', [7, 2])] });
    const v = viewer(c, 'fragments');
    expect(v.rows.map((i) => [v.value(i, 'ch'), v.value(i, 'loopStart')])).toEqual([
      [1, 3], [1, 5],
      [2, 2], [2, 7],
      [3, 1], [3, 9],
    ]);
  });

  it('offers unique dropdown values for the requested categorical columns', () => {
    const c = new Catalog();
    c.addFile({ path: 'D:/a.mid', v: 5, ok: true, bpm: 120, ts: '4/4', key: 'C', parts: [[1, 0, 3, 80, 8, 30, 0, 60, 72, 2, 4, 50, 1, 'Lead', [[2, 1, 4, 50, 1, 1], [4, 9, 2, 50, 4, 2]]]] });
    c.addFile({ path: 'D:/b.mid', v: 5, ok: false, bpm: 0, ts: '', key: '', parts: [[1, 0, 3, 80, 8, 30, 0, 60, 72, 2, 4, 50, 1, 'Lead', [[2, 1, 4, 50, 1, 1]]]] });

    const fragments = viewer(c, 'fragments');
    expect(fragments.filterOptions().get('instrument')).toEqual(['Acoustic Grand Piano']);
    expect(fragments.filterOptions().get('shape')).toEqual(['rising', 'wave']);
    expect(fragments.filterOptions().get('energy')).toEqual(['busy', 'medium']);
    expect(fragments.q('thead').innerHTML).toContain('data-filter="instrument"');
    expect(fragments.q('thead').innerHTML).toContain('data-filter="shape"');
    expect(fragments.q('thead').innerHTML).toContain('data-filter="energy"');
    const parts = viewer(c, 'parts');
    expect(parts.filterOptions().get('role')).toEqual(['melody']);
    expect(parts.q('thead').innerHTML).toContain('data-filter="role"');
    const files = viewer(c, 'files');
    expect(files.filterOptions().get('ok')).toEqual([false, true]);
    expect(files.q('thead').innerHTML).toContain('data-filter="ok"');
  });

  it('pads numeric table values to at least three integer digits', () => {
    const v = viewer(library(), 'parts');
    expect(v.q('tbody').innerHTML).toContain('<td title="000">000</td>');
    expect(v.q('tbody').innerHTML).toContain('<td title="033">033</td>');
  });
});

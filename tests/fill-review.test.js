import { describe, expect, it } from 'vitest';
import { closeGroupedFillReview, fillChainPass, fillReviewGroups, fillReviewRow, fillTablesNeedRefresh, nextFillChainIndex, playableFillGroups, rememberFillReviewRows, restoreFillReviewRows, stepFillChainIndex, wirePlaylistControls } from '../src/ui/fill-review.js';

describe('Fill review rows', () => {
  it('does not associate a deleted result with another surviving row of the same instrument', () => {
    const first = { program: 48, drums: false }, second = { program: 48, drums: false };
    const a = { row: first, index: 0 }, b = { row: second, index: 1 };
    const rowOf = (group, rows) => fillReviewRow(group, rows, [a, b], () => []);
    expect(rowOf(a, [first, second])).toBe(first);
    expect(rowOf(a, [second])).toBeNull();
    expect(rowOf(b, [second])).toBe(second);
    const restored = [{ ...first }, { ...second }];
    expect(rowOf(a, restored)).toBe(restored[0]);
    expect(rowOf(b, restored)).toBe(restored[1]);
  });

  it('refreshes only when a grouped result or instrument changes its List/Add action', () => {
    const row = { program: 24 };
    const group = { row };
    const multi = { instruments: [] };
    const inst = { program: 24 };
    let rows = [row];
    const result = (index, list) => ({ dataset: { fillResult: String(index) }, querySelector: () => list ? {} : null });
    const instrument = (list) => ({ dataset: { fillInstrument: '0' }, querySelector: () => list ? {} : null });
    let results = [result(0, true), result(1, true)];
    let instruments = [instrument(true)];
    const body = { querySelectorAll: (selector) => selector === '[data-fill-result]' ? results : instruments };
    const stale = () => fillTablesNeedRefresh(body, [group, multi], [{ inst }],
      (g) => rows.includes(g.row) ? g.row : null, (i) => rows.some((r) => r.program === i.program));

    expect(stale()).toBe(false);
    rows = [];
    expect(stale()).toBe(true);
    results = [result(0, false), result(1, true)];
    instruments = [instrument(false)];
    expect(stale()).toBe(false);
    rows = [row];
    expect(stale()).toBe(true);
  });

  it('closes grouped results and their playlists without removing individual results', () => {
    const first = {}, second = {}, individual = {};
    const tab = { fillReview: [first, second], fillReviewTabs: [{ group: individual }] };
    const active = new Map([[first, {}], [individual, {}]]);
    const completed = new Map([[second, {}], [individual, {}]]);
    closeGroupedFillReview(tab, (group) => {
      active.delete(group);
      completed.set(group, {});
    }, completed);
    expect(tab.fillReview).toBeNull();
    expect(fillReviewGroups(tab)).toEqual([individual]);
    expect([...active.keys()]).toEqual([individual]);
    expect([...completed.keys()]).toEqual([individual]);
  });

  it('selects the latest playable result per row, leaving active playlists alone', () => {
    const drums = {}, bass = {};
    const rows = [drums, bass];
    const rowOf = (g) => (rows.includes(g.row) ? g.row : null);
    const old = { row: drums, order: [1, 2] };
    const latest = { row: drums, order: [1, 2, 3] };
    const single = { row: drums, order: [1] };
    const bassGroup = { row: bass, order: [1, 2] };
    const groups = [old, latest, single, bassGroup];
    expect(playableFillGroups(groups, rowOf, new Map([[bassGroup, { row: bass }]]), (g) => g.order)).toEqual([latest]);
    expect(playableFillGroups(groups, rowOf, new Map([[old, { row: drums }]]), (g) => g.order)).toEqual([bassGroup]);
  });

  it('leaves out results whose row was deleted: ▶▶ never puts instruments back', () => {
    const drums = {}, removed = {};
    const rows = [drums];
    const rowOf = (g) => (rows.includes(g.row) ? g.row : null);
    const kept = { row: drums, order: [1, 2] };
    const gone = { row: removed, order: [1, 2, 3] };
    const lost = { row: null, order: [1, 2] };
    expect(playableFillGroups([kept, gone, lost], rowOf, new Map(), (g) => g.order)).toEqual([kept]);
  });

  it('cycles each playlist independently after its last proposal', () => {
    expect(nextFillChainIndex({ index: 9 }, 11)).toBe(10);
    expect(nextFillChainIndex({ index: 10 }, 11)).toBe(0);
    expect(nextFillChainIndex({ index: 10 }, 23)).toBe(11);
    expect(nextFillChainIndex({ index: 22 }, 23)).toBe(0);
  });

  it('ends each playlist pass at the next loop boundary, even when started mid-loop', () => {
    expect([0, 1, 3, 4, 7, 8].map((start) => start + fillChainPass(4, start))).toEqual([4, 4, 4, 8, 8, 12]);
    expect(11 + fillChainPass(16, 11)).toBe(16);
  });

  it('steps by hand round the list: after the last the first, before the first the last', () => {
    expect(stepFillChainIndex(1, 1, 7)).toBe(2);
    expect(stepFillChainIndex(6, 1, 7)).toBe(0);    // 7/7 → 1/7, not 7/7 again
    expect(stepFillChainIndex(2, 1, 3)).toBe(0);
    expect(stepFillChainIndex(0, -1, 3)).toBe(2);
    expect(stepFillChainIndex(0, 1, 1)).toBe(0);
    expect(stepFillChainIndex(0, 1, 0)).toBe(0);
  });

  it('continues after a chorus, including when its resume point is past the end', () => {
    expect(nextFillChainIndex({ index: 4, resume: 8 }, 11)).toBe(8);
    expect(nextFillChainIndex({ index: 10, resume: 11 }, 11)).toBe(0);
    expect(nextFillChainIndex({ index: 4, resume: 0 }, 11)).toBe(0);
  });

  it('restores individual and grouped results to their own rows after reloading a loop', () => {
    const drums = {}, guitar = {};
    const first = { row: drums };
    const second = { row: guitar };
    const tab = { fillReview: [first], fillReviewTabs: [{ group: second }] };
    const completed = new Map([[second, { row: guitar }]]);
    expect(fillReviewGroups(tab)).toEqual([first, second]);
    rememberFillReviewRows(tab, [drums, guitar]);
    const next = [{}, {}];
    restoreFillReviewRows(tab, next, completed);
    expect(first.row).toBe(next[0]);
    expect(second.row).toBe(next[1]);
    expect(completed.get(second).row).toBe(next[1]);
  });

  describe('playlist controls', () => {
    it('routes each row controls to its own playlist', () => {
      const drums = {}, guitar = {};
      let focused;
      const calls = [];
      const focus = (group) => { focused = group; };
      const make = (group) => {
        const buttons = ['next', 'stop'].map((action) => ({ dataset: { chainAct: action } }));
        const row = { querySelectorAll: () => buttons };
        wirePlaylistControls(row, group, focus, {
          next: () => calls.push(['next', focused]),
          stop: () => calls.push(['stop', focused]),
        });
        return buttons;
      };
      const drumButtons = make(drums);
      const guitarButtons = make(guitar);
      guitarButtons[0].onclick();
      drumButtons[1].onclick();
      expect(calls).toEqual([['next', guitar], ['stop', drums]]);
    });
  });

  it('does not attach a removed row to another instrument', () => {
    const removed = {};
    const group = { row: removed };
    const tab = { fillReview: null, fillReviewTabs: [{ group }] };
    rememberFillReviewRows(tab, [{}]);
    restoreFillReviewRows(tab, [{}], new Map());
    expect(group.row).toBeNull();
  });
});

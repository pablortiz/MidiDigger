import { describe, expect, it } from 'vitest';
import { LoopPanel } from '../src/ui/loop-panel.js';

describe('loop playlist indicators', () => {
  it('tracks the active playlists independently as rows change', () => {
    const drums = {};
    const guitar = {};
    const bass = {};
    const active = new Set([drums, guitar]);
    const markers = [{ hidden: false }, { hidden: false }, { hidden: false }];
    const names = markers.map((marker, row) => ({
      dataset: { row: String(row) },
      querySelector: () => marker,
    }));
    const panel = Object.create(LoopPanel.prototype);
    Object.assign(panel, {
      loop: { rows: [drums, guitar, bass] },
      grid: { querySelectorAll: () => names },
      playlistActive: (row) => active.has(row),
    });

    panel.paintPlaylists();
    expect(markers.map((marker) => marker.hidden)).toEqual([false, false, true]);
    active.delete(guitar);
    panel.paintPlaylists();
    expect(markers.map((marker) => marker.hidden)).toEqual([false, true, true]);
  });
});

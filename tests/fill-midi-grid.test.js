import { describe, expect, it } from 'vitest';
import { LAYER_COLORS, fillMidiGrid, loopMidiGrid } from '../src/ui/fill-midi-grid.js';

describe('Fill MIDI grid', () => {
  it('draws auditioned pitches, note lengths and bar positions, clipping the end', () => {
    const clip = { notes: [
      { beat: 0, len: 1, pitch: 60, vel: 100 },
      { beat: 7.5, len: 2, pitch: 64, vel: 90 },
      { beat: 8, len: 1, pitch: 67, vel: 90 },
    ] };
    const svg = fillMidiGrid(clip, { bars: 2, beats: 4, transpose: 2 });
    expect(svg.match(/class="note"/g)).toHaveLength(2);
    expect(svg).toContain('D4 · velocity 100');
    expect(svg).toContain('F#4 · velocity 90');
    expect(svg).toContain('x="371.50"');
    expect(svg).toContain('width="22.50"');
    expect(svg.match(/class="bar"/g)).toHaveLength(2);
  });

  it('keeps drum pitches untransposed and rejects unavailable or invalid notes', () => {
    const clip = { notes: [{ beat: 0, len: 0.5, pitch: 36, vel: 80 }] };
    expect(fillMidiGrid(clip, { bars: 1, beats: 3.5, transpose: 5, drums: true })).toContain('C2 · velocity 80');
    expect(() => fillMidiGrid({ notes: [] }, { bars: 1, beats: 4 })).toThrow(/no notes/);
    expect(() => fillMidiGrid({ notes: [{ beat: 0, len: NaN, pitch: 60, vel: 90 }] }, { bars: 1, beats: 4 })).toThrow(/Invalid MIDI note/);
  });

  it('fits a box given in pixels whole: as wide as it, no taller', () => {
    const notes = Array.from({ length: 16 }, (_, bar) => ({ beat: bar * 4, len: 1, pitch: 30 + bar * 4, vel: 90 }));
    const svg = fillMidiGrid({ notes }, { bars: 16, beats: 4, width: 600, height: 150 });
    const [, w, h] = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/).map(Number);
    expect(w).toBeLessThanOrEqual(600);
    expect(w).toBeGreaterThan(590);
    expect(h).toBeLessThanOrEqual(150);
  });

  it('draws several rows each in its colour, the drums in a grid of their own', () => {
    const html = loopMidiGrid([
      { name: 'Piano', notes: [{ beat: 0, len: 1, pitch: 60, vel: 90 }] },
      { name: 'Muted', notes: [] },
      { name: 'Drums', drums: true, notes: [{ beat: 1, len: 0.25, pitch: 36, vel: 100 }] },
    ], { bars: 1, beats: 4, width: 400, height: 200 });
    expect(html.match(/<svg/g)).toHaveLength(2);
    expect(html).toContain('Piano · C4');
    expect(html).toContain(`fill="${LAYER_COLORS[0]}"`);
    expect(html).toContain('Drums · C2');
    expect(html).not.toContain('Muted');
  });
});

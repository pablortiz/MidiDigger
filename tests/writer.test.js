import { describe, expect, it } from 'vitest';
import { smfOf } from '../src/midi/writer.js';
import { parseMidi } from '../src/midi/parser.js';
import { extractNotes } from '../src/midi/parts.js';
import { addRow, loopSong, loopTrackNames, newLoop, placeClip } from '../src/midi/loop.js';

describe('MIDI file export', () => {
  it('writes what the loop plays as a file any DAW opens: a track per instrument, its tempo and meter', () => {
    const loop = { ...newLoop(), bpm: 100, timeSig: '3/4', length: 2 };
    const bass = addRow(loop, { program: 33, drums: false, name: 'Bass' });
    const drums = addRow(loop, { program: 0, drums: true, name: 'Drums' });
    placeClip(bass, 0, { name: 'b', key: '', bars: 1, notes: [{ beat: 0, len: 1, pitch: 40, vel: 90 }, { beat: 2, len: 1, pitch: 43, vel: 90 }] });
    placeClip(drums, 1, { name: 'd', key: '', bars: 1, notes: [{ beat: 0, len: 0.25, pitch: 36, vel: 110 }] });
    const bytes = smfOf(loopSong(loop), { bpm: 100, timeSig: '3/4', title: 'Loop', names: loopTrackNames(loop) });
    const info = parseMidi(bytes);
    expect(info.format).toBe(1);
    expect(Math.round(info.bpm)).toBe(100);
    expect(info.timeSig).toBe('3/4');
    expect(info.tracks.map((t) => t.name)).toEqual(['Loop', 'Bass', 'Drums']);
    const bassNotes = extractNotes(info, 'ch:1').notes;
    expect(bassNotes.map((n) => [n.pitch, n.start / info.ppq, (n.stop - n.start) / info.ppq])).toEqual([[40, 0, 1], [43, 2, 1]]);
    expect(info.channels.find((c) => c.channel === 1).programs).toEqual([33]);
    // The drums on channel 10, in the second bar (3 beats in).
    expect(extractNotes(info, 'ch:10').notes.map((n) => [n.pitch, n.start / info.ppq])).toEqual([[36, 3]]);
  });

  it('leaves out the channels not asked for, and those with no note', () => {
    const song = { events: [
      { sec: 0, type: 'pc', ch: 0, a: 5 }, { sec: 0, type: 'on', ch: 0, a: 60, b: 80 }, { sec: 0.5, type: 'off', ch: 0, a: 60 },
      { sec: 0, type: 'pc', ch: 1, a: 7 },
      { sec: 0, type: 'on', ch: 2, a: 64, b: 80 }, { sec: 0.5, type: 'off', ch: 2, a: 64 },
    ] };
    const info = parseMidi(smfOf(song, { bpm: 120, channels: new Set([0, 1]) }));
    expect(info.channels.map((c) => c.channel)).toEqual([1]);
  });
});

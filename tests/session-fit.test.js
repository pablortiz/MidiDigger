import { describe, expect, it } from 'vitest';
import { sessionTarget } from '../src/midi/session-fit.js';

// Notes of a bar: [beat, len, pitch] from the bar's start, `bar` (from 0) times 4 quarter notes on.
const notesOf = (bars) => bars.flatMap((bar, k) => bar.map(([beat, len, pitch]) => ({ beat: k * 4 + beat, len, pitch, vel: 100 })));
const chord = (pitches) => pitches.map((p) => [0, 4, p]);   // held the whole bar

describe('the LUNA session as Parts\' target', () => {
  it('reads the chords, the key and the grooves of the session\'s MIDI tracks', () => {
    // A minor, F, C, G: a piano holding the chords, a bass on each bar's beats 1 and 3, drums with
    // the kick on 1 and 3 and the snare on 2 and 4.
    const piano = notesOf([chord([57, 60, 64]), chord([53, 57, 60]), chord([48, 52, 55]), chord([55, 59, 62])]);
    const roots = [45, 41, 36, 43];
    const bass = notesOf(roots.map((r) => [[0, 1, r], [2, 1, r]]));
    const drums = notesOf(Array(4).fill([[0, 0.2, 36], [1, 0.2, 38], [2, 0.2, 36], [3, 0.2, 38], [0.5, 0.1, 42], [1.5, 0.1, 42]]));
    const got = sessionTarget([
      { name: 'Keys', drums: false, notes: piano },
      { name: 'Bass', drums: false, notes: bass },
      { name: 'Kit', drums: true, notes: drums },
    ], { perBar: 4, bars: 4 });
    expect(got.chordText).toBe('Am F C G');
    // A minor and C major share their notes: either may be found (progressionFit takes a
    // progression to the relative key), and the progression follows the key found.
    expect(['9 menor', '0 mayor']).toContain(got.key);
    expect(got.target.chords).toBe(got.key === '0 mayor' ? 'M 9m*4 5*4 0*4 7*4' : 'm 0m*4 8*4 3*4 10*4');
    expect(got.roles.map((r) => `${r.name}:${r.role}`)).toEqual(['Keys:harmony', 'Bass:bass', 'Kit:drums']);
    expect(got.target.drums).toBeTruthy();
    expect(got.target.bass).toBeTruthy();
  });

  it('says nothing for a stretch where no MIDI plays', () => {
    expect(sessionTarget([{ name: 'Empty', drums: false, notes: [] }])).toBe(null);
  });

  it('takes the lowest track as the bass only when it sits low', () => {
    const high = notesOf([chord([72, 76, 79])]);
    const got = sessionTarget([{ name: 'Lead', drums: false, notes: high }], { bars: 1 });
    expect(got.roles).toEqual([{ name: 'Lead', role: 'harmony', audio: false }]);
    expect(got.target.bass).toBe('');
  });

  it('takes the groove of an audio drum track, its hits on the bars (no chords from audio)', () => {
    // Kick and snare on every beat of 4 bars, as audio-onsets.js finds them (beats).
    const onsets = Array.from({ length: 16 }, (_, k) => k);
    const got = sessionTarget([{ name: 'Drums audio', audio: true, role: 'drums', onsets }], { perBar: 4, bars: 4 });
    expect(got.target.drums).toBeTruthy();
    expect([got.target.chords, got.key, got.chordText]).toEqual(['', '', '']);
    expect(got.roles).toEqual([{ name: 'Drums audio', role: 'drums', audio: true }]);
    // The same groove a MIDI drum track striking there gives.
    const midi = sessionTarget([{ name: 'Kit', drums: true, notes: onsets.map((beat) => ({ beat, len: 0.2, pitch: 36, vel: 100 })) }], { perBar: 4, bars: 4 });
    expect(got.target.drums).toBe(midi.target.drums);
  });
});

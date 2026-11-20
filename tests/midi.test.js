import { describe, expect, it } from 'vitest';
import { parseMidi, formatTime, formatDuration, keyName, noteName } from '../src/midi/parser.js';
import { extractNotes, fragmentSequence, sliceBars, sliceTicks, snapTick, tickAtBar, formatPos, channelInstrument, lunaNotes, lanesSong, arrangement, gridPlan, transposeBetween, lanePlacements, planBars, songPlace } from '../src/midi/parts.js';
import { detectPatterns, partFeatures, fileRecord, fileMeta, analyseFile, estimateKey, keyClass, loopSections, findFragments, feelOf, songKeyOf, channelFragments, riffBlocks, SHAPES, ENERGIES, PART, ROLES, RECORD_VERSION } from '../src/midi/features.js';
import { progressionFit, progressionIn, romanProgression, songChords } from '../src/midi/chords.js';
import { smf, meta, str, noteEvents } from './smf.js';

// Conductor: 120 BPM, 3/4, D minor, then 60 BPM at tick 960. Bass: GM 33 on channel 2,
// notes with running status and a velocity-0 note-off.
const file = smf(1, 480, [
  [
    [0, ...meta(0x03, str('Tempo'))],
    [0, ...meta(0x51, [0x07, 0xa1, 0x20])],
    [0, ...meta(0x58, [3, 2, 24, 8])],
    [0, ...meta(0x59, [0xff, 1])],
    [960, ...meta(0x51, [0x0f, 0x42, 0x40])],
  ],
  [
    [0, ...meta(0x03, str('Bass'))],
    [0, 0xb1, 0, 0],
    [0, 0xc1, 33],
    [0, 0x91, 40, 100],
    [480, 40, 0],         // running status, velocity 0 = note off
    [0, 43, 90],
    [1440, 0x81, 43, 0],  // ends at tick 1920
  ],
]);

describe('parseMidi', () => {
  it('reads header, tempo map, meter and key', () => {
    const info = parseMidi(file);
    expect(info).toMatchObject({ format: 1, trackCount: 2, ppq: 480, timeSig: '3/4', key: 'D menor', tempoChanges: 1, notes: 2, lastTick: 1920 });
    expect(info.bpm).toBeCloseTo(120);
    expect(info.bpmMin).toBeCloseTo(60);
    // 960 ticks (2 beats) at 120 BPM = 1 s, then 960 ticks at 60 BPM = 2 s.
    expect(info.durationSec).toBeCloseTo(3);
    expect(info.events.find((e) => e.type === 'off' && e.a === 43).sec).toBeCloseTo(3);
    expect(info.events.find((e) => e.type === 'on' && e.a === 43).sec).toBeCloseTo(0.5);
  });

  it('maps bars through the meter: 3/4 bars of 1440 ticks', () => {
    const info = parseMidi(file);
    expect(info.barStartTick(1)).toBe(0);
    expect(info.barStartTick(2)).toBe(1440);
    expect(info.barOfTick(2160)).toBeCloseTo(2.5);
    expect(info.bars).toBeCloseTo(1920 / 1440);
    // Seconds back to ticks, across the tempo change at tick 960 (1 s).
    expect(info.secToTick(0.5)).toBeCloseTo(480);
    expect(info.secToTick(2)).toBeCloseTo(1440);
  });

  it('follows a meter change: 2 bars of 4/4, then 3/4', () => {
    const f = smf(0, 96, [[[0, ...meta(0x58, [4, 2, 24, 8])], [768, ...meta(0x58, [3, 2, 24, 8])], [0, 0x90, 60, 100], [96, 0x80, 60, 0]]]);
    const info = parseMidi(f);
    expect(info.barStartTick(3)).toBe(768);
    expect(info.barStartTick(4)).toBe(768 + 288);
    expect(info.timeSigChanges).toBe(1);
  });

  it('summarizes tracks and channels', () => {
    const info = parseMidi(file);
    expect(info.tracks.map((t) => [t.name, t.notes, t.channels])).toEqual([['Tempo', 0, []], ['Bass', 2, [2]]]);
    expect(info.channels).toEqual([{ channel: 2, notes: 2, min: 40, max: 43, programs: [33], bankMsb: 0, bankLsb: null, tracks: [2] }]);
    expect(channelInstrument(info.channels[0])).toBe('Fingered Bass');
  });

  it('detects GS and rejects non-MIDI', () => {
    const gs = smf(0, 96, [[[0, 0xf0, 10, 0x41, 0x10, 0x42, 0x12, 0x40, 0x00, 0x7f, 0x00, 0x41, 0xf7]]]);
    expect(parseMidi(gs).standard).toBe('GS');
    expect(() => parseMidi(new Uint8Array(new TextEncoder().encode('<HTML>404 File Not Found</HTML>')))).toThrow(/MThd/);
  });

  it('formats times, keys and notes', () => {
    expect(formatTime(187.9)).toBe('3:07');
    expect(formatDuration(302)).toBe('5 min 02 s');
    expect(formatDuration(48.4)).toBe('48 s');
    expect(keyName(2, false)).toBe('D mayor');
    expect(noteName(61)).toBe('C#4');
  });
});

describe('parts', () => {
  it('extracts one part as paired notes, by channel or by track', () => {
    const info = parseMidi(file);
    const bass = extractNotes(info, 'ch:2');
    expect(bass.notes.map((n) => [n.pitch, n.start, n.stop, n.velocity])).toEqual([[40, 0, 480, 100], [43, 480, 1920, 90]]);
    expect(bass).toMatchObject({ channels: [2], program: 33, drums: false });
    expect(extractNotes(info, 'tr:2').notes).toHaveLength(2);
    expect(extractNotes(info, 'tr:1').notes).toHaveLength(0);
  });

  it('cuts a bar range, relative to its first bar', () => {
    // 4/4, one note per bar at its downbeat, 4 bars.
    const f = smf(0, 96, [noteEvents(0, [[0, 60, 96], [384, 62, 96], [768, 64, 500], [1152, 65, 96]])]);
    const info = parseMidi(f);
    const { notes } = extractNotes(info, 'ch:1');
    const s = sliceBars(info, notes, 2, 3);
    expect(s.notes.map((n) => [n.pitch, n.start, n.stop])).toEqual([[62, 0, 96], [64, 384, 768]]); // 64 cut at the end of bar 3
    expect(s.lengthTicks).toBe(768);
  });

  it('flags what matters for LUNA', () => {
    const notes = lunaNotes(parseMidi(file));
    expect(notes.some((n) => n.includes('without notes'))).toBe(true);
    // Tempo changes are already in the Tempo line above the notes: not repeated.
    expect(notes.some((n) => /tempo variable|BPM/i.test(n))).toBe(false);
    const f0 = parseMidi(smf(0, 96, [[[0, 0x90, 60, 100], [96, 0x99, 36, 100], [0, 0x80, 60, 0]]]));
    expect(lunaNotes(f0)[0]).toMatch(/^Format 0/);
    expect(lunaNotes(f0).some((n) => n.includes('No Program Change'))).toBe(true);
  });

  it('builds the Loop kit cycle: each lane repeats its own bars until the cycle is full', () => {
    // 4/4 at 96 PPQ (a bar is 384 ticks). Channel 1: one note a bar, bars 1-4 with programs.
    // Channel 10: a 2-bar drum pattern from bar 3.
    const melody = [[0, 0xc0, 40], ...noteEvents(0, [[0, 60, 96], [384, 62, 96], [768, 64, 96], [1152, 65, 96]])];
    const drums = noteEvents(9, [[768, 36, 24], [1152, 38, 24]]);
    const info = parseMidi(smf(1, 96, [melody, drums]));
    const song = lanesSong(info, [
      { ch: 1, startTick: info.barStartTick(2), endTick: info.barStartTick(3) },   // 1 bar: D
      { ch: 10, startTick: info.barStartTick(3), endTick: info.barStartTick(5) },  // 2 bars
    ]);
    expect(song.cycleBars).toBe(2);
    expect(song.durationSec).toBeCloseTo(4, 5);   // 2 bars at 120 BPM
    const ons = song.events.filter((e) => e.type === 'on').map((e) => [e.ch + 1, e.a, e.tick]);
    expect(ons).toEqual([[1, 62, 0], [10, 36, 0], [1, 62, 384], [10, 38, 384]]);
    expect(song.events.some((e) => e.type === 'pc' && e.a === 40 && e.sec === 0)).toBe(true);   // its program from before the range
    expect(song.channels.map((c) => c.channel)).toEqual([1, 10]);
    expect(lanesSong(info, [])).toBeNull();

    // As an arrangement: section 1 the drums alone, section 2 both, 2 bars each.
    const piece = lanesSong(info, [
      { ch: 1, startTick: info.barStartTick(2), endTick: info.barStartTick(3) },
      { ch: 10, startTick: info.barStartTick(3), endTick: info.barStartTick(5) },
    ], { sectionBars: 2, sections: [{ channels: [10] }, { channels: [10, 1] }] });
    expect(piece.durationSec).toBeCloseTo(8, 5);   // 4 bars at 120 BPM
    const placed = piece.events.filter((e) => e.type === 'on').map((e) => [e.ch + 1, e.tick]);
    expect(placed).toEqual([[10, 0], [10, 384], [1, 768], [10, 768], [1, 1152], [10, 1152]]);
  });

  it('finds every different fragment a part repeats, each worth hearing', () => {
    // Drums: verse groove on the hi-hat (bars 1-8), chorus groove on the ride (bars 9-16).
    const hats = (bar) => Array.from({ length: 8 }, (_, k) => [bar * 384 + k * 48, 42, 12]);
    const ride = (bar) => Array.from({ length: 8 }, (_, k) => [bar * 384 + k * 48, 51, 12]);
    const drumBar = (bar, extra) => [[bar * 384, 36, 24], [bar * 384 + 96, 38, 24], [bar * 384 + 192, 36, 24], [bar * 384 + 288, 38, 24], ...extra];
    const verse = Array.from({ length: 8 }, (_, b) => drumBar(b, hats(b))).flat();
    const chorus = Array.from({ length: 8 }, (_, b) => drumBar(b + 8, ride(b + 8))).flat();
    const info = parseMidi(smf(0, 96, [noteEvents(9, [...verse, ...chorus])]));
    const frags = findFragments(info, extractNotes(info, 'ch:10').notes);
    const ones = frags.filter((f) => f.bars === 1);
    expect(ones.map((f) => f.startBar).sort((a, b) => a - b)).toEqual([1, 9]);   // the two grooves, once each
    expect(frags.some((f) => f.bars === 2 && f.startBar === 1)).toBe(false);   // the verse groove twice is not another fragment
  });

  it('transposes a borrowed part to the kit key by the shortest way, relative keys across modes', () => {
    expect(transposeBetween(keyClass('D mayor'), keyClass('C mayor'))).toBe(-2);
    expect(transposeBetween(keyClass('F# mayor'), keyClass('C mayor'))).toBe(-6);
    expect(transposeBetween(keyClass('A menor'), keyClass('C mayor'))).toBe(0);   // relative minor: same notes
    expect(transposeBetween(keyClass('E menor'), keyClass('C mayor'))).toBe(5);   // to A minor
    expect(transposeBetween('', keyClass('C mayor'))).toBe(0);
  });

  it('keeps the tempo map, in seconds, for the tempo heard where the playhead is', () => {
    // 120 BPM for a bar (2 s at 96 PPQ), then 60 BPM.
    const info = parseMidi(smf(0, 96, [[[0, ...meta(0x51, [0x07, 0xa1, 0x20])], ...noteEvents(0, [[0, 60, 96]]), [288, ...meta(0x51, [0x0f, 0x42, 0x40])], ...noteEvents(0, [[0, 62, 96]])]]));
    expect(info.tempoMap.map((t) => [t.sec, Math.round(t.bpm)])).toEqual([[0, 120], [2, 60]]);
    // And the meter map: 3/4 from the start (a 3/4 bar is 288 ticks), 4/4 from bar 2.
    const waltz = parseMidi(smf(0, 96, [[[0, ...meta(0x58, [3, 2, 24, 8])], ...noteEvents(0, [[0, 60, 96]]), [192, ...meta(0x58, [4, 2, 24, 8])], ...noteEvents(0, [[0, 62, 96]])]]));
    expect(waltz.meterMap.map((m) => [m.sec, m.ts])).toEqual([[0, '3/4'], [1.5, '4/4']]);
  });

  it('never leaves a note or the sustain pedal hanging when a loop repeats', () => {
    // A trumpet's repeated C: struck again before it ends, the second running past the bar,
    // and a sustain pedal pressed and never lifted inside the loop.
    const notes = noteEvents(0, [[0, 60, 200], [96, 60, 400]]);
    const info = parseMidi(smf(0, 96, [[[0, 0xb0, 64, 127], ...notes, [384, 0x90, 64, 1], [96, 0x80, 64, 0]]]));
    const song = lanesSong(info, [{ ch: 1, startTick: 0, endTick: 384 }]);
    const count = (type) => song.events.filter((e) => e.type === type && e.a === 60).length;
    expect(count('on')).toBe(2);
    expect(count('off')).toBe(2);   // both offs: the one inside the bar and one at its end
    const pedal = song.events.filter((e) => e.type === 'cc' && e.a === 64);
    expect(pedal.at(-1).b).toBe(0);   // lifted at the loop's end
  });

  it('plays a lane borrowed from another file on its lane channel, transposed', () => {
    const own = parseMidi(smf(0, 96, [noteEvents(0, [[0, 60, 96], [384, 62, 96]])]));
    const other = parseMidi(smf(0, 480, [[[0, 0xc3, 33], ...noteEvents(3, [[0, 40, 480], [1920, 43, 480]])]]));   // another PPQ, channel 4
    const song = lanesSong(own, [
      { ch: 1, startTick: 0, endTick: own.barStartTick(2) },
      { ch: 2, info: other, srcCh: 4, transpose: 2, startTick: 0, endTick: other.barStartTick(2) },
    ]);
    const borrowed = song.events.filter((e) => e.ch === 1 && e.type === 'on').map((e) => [e.a, +e.sec.toFixed(3)]);
    expect(borrowed).toEqual([[42, 0]]);   // E2 + 2 semitones, on channel 2 (index 1), at 0 s
    expect(song.events.some((e) => e.ch === 1 && e.type === 'pc' && e.a === 33)).toBe(true);
    expect(song.durationSec).toBeCloseTo(2, 5);   // 1 bar at 120 BPM, whatever its PPQ
  });

  it('keeps only sections that sound different, not the same patterns further on', () => {
    // The bass plays one 2-bar pattern all through: every window has the same content.
    const patternsOf = new Map([[2, [{ bars: 2, coverage: 1, starts: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23] }]]]);
    expect(loopSections(patternsOf, () => true, { bars: 8, lastBar: 24 })).toHaveLength(1);
  });

  it('lays a Loop kit out with the longest loop once and the others coming in and out', () => {
    const lanes = [{ ch: 10, role: 'drums', bars: 1 }, { ch: 2, role: 'bass', bars: 2 }, { ch: 1, role: 'melody', bars: 4 }, { ch: 5, role: 'chords', bars: 4 }];
    const blocks = (plan) => plan.sections.map((s) => `${s.channels.join(',')}/${s.bars}`);
    // 4-bar loops at most: an 8-bar piece, entries a bar apart; the chords are the anchor.
    expect(blocks(arrangement(lanes, 'loops'))).toEqual(['5,1/1', '2,5,1/1', '10,2,5,1/4', '2,5,1/1', '5,1/1']);
    expect(blocks(arrangement(lanes, 'build'))).toEqual(['10,5/2', '10,2,5/2', '10,2,5,1/4']);
    expect(blocks(arrangement(lanes, 'breakdown'))).toEqual(['10,5/1', '10,2,5/1', '10,2,5,1/2', '5,1/1', '10,2,5,1/1', '10,2,5/1', '10,5/1']);
    // Arranger styles, on blocks of the shortest loop (1 bar here), 8 bars.
    expect(blocks(arrangement(lanes, 'fill'))).toEqual(['10,2,5,1/3', '10/1', '10,2,5,1/3', '10/1']);
    expect(blocks(arrangement(lanes, 'stop'))).toEqual(['10,2,5,1/1', '10/1', '10,2,5,1/1', '10/1', '10,2,5,1/1', '10/1', '10,2,5,1/1', '10/1']);
    // Build-down, build's mirror: all together, then out the other way round.
    expect(blocks(arrangement(lanes, 'builddown'))).toEqual(['10,2,5,1/4', '10,2,5/2', '10,5/2']);
  });

  it('reads pads back as a plan: runs of bars with the same lanes on (an old Loop kit opened)', () => {
    const on = (s) => [...s].map((c) => c === '1');
    const grid = { unit: 1, cols: 8, rows: new Map([[5, on('11111111')], [10, on('11111111')], [2, on('00111111')]]) };
    const plan = gridPlan(grid, [2, 5, 10]);
    expect(plan.sections.map((s) => `${s.channels.join(',')}/${s.bars}`)).toEqual(['5,10/2', '2,5,10/6']);
    grid.rows.get(5)[0] = false;
    grid.rows.get(10)[0] = false;
    expect(gridPlan(grid, [2, 5, 10]).sections[0]).toEqual({ channels: [], bars: 1 });
    expect(planBars(gridPlan(grid, [2, 5, 10]))).toBe(8);
  });

  it('lays the arc out as its pyramid, a role a step, a long loop heard in part', () => {
    const lanes = [{ ch: 10, role: 'drums', bars: 1 }, { ch: 2, role: 'bass', bars: 2 }, { ch: 1, role: 'melody', bars: 16 }, { ch: 5, role: 'chords', bars: 4 }];
    const song = arrangement(lanes, 'song');
    expect(planBars(song)).toBe(16);
    // Drums all through, then bass, chords and the melody at the top, out the way they came;
    // no gap at the top: every bar of it plays.
    expect(song.sections.map((s) => `${s.channels.join(',')}/${s.bars}`)).toEqual(['10/2', '10,2/2', '10,2,5/2', '10,2,5,1/4', '10,2,5/2', '10,2/2', '10/2']);
    // The melody at the top: its first four bars, in one go.
    expect(lanePlacements(song, 1, 16)).toEqual([{ at: 6, from: 0, bars: 4 }]);
    // However many instruments, the pyramid fits: two of a role step in together.
    const seven = [...lanes, { ch: 3, role: 'chords', bars: 4 }, { ch: 4, role: 'melody', bars: 4 }, { ch: 6, role: 'melody', bars: 8 }];
    const wide = arrangement(seven, 'song', 8);
    const count = wide.sections.flatMap((s) => Array(s.bars).fill(s.channels.length));
    expect(count).toEqual([1, 2, 4, 7, 7, 4, 2, 1]);   // up, the top, down
    // Drums and six melodies (two roles only), 16 bars: the melodies in three steps of two.
    const band = [{ ch: 10, role: 'drums', bars: 1 }, ...[2, 3, 4, 5, 6, 7].map((ch) => ({ ch, role: 'melody', bars: 4 }))];
    const counts = (plan) => plan.sections.flatMap((s) => Array(s.bars).fill(s.channels.length));
    expect(counts(arrangement(band, 'song', 16))).toEqual([1, 1, 3, 3, 5, 5, 7, 7, 7, 7, 5, 5, 3, 3, 1, 1]);
    // All of one role: the first lane the base, the other five in steps of 2, 1 and 2.
    expect(counts(arrangement(band.slice(1), 'song', 8))).toEqual([1, 3, 4, 6, 6, 4, 3, 1]);
    // Out a whole block (the calm part), a lane starts its loop again: the melody, were it out.
    const calmOut = { sectionBars: 8, continuous: true, sections: [{ channels: [1] }, { channels: [] }, { channels: [1] }] };
    expect(lanePlacements(calmOut, 1, 16)).toEqual([{ at: 0, from: 0, bars: 8 }, { at: 16, from: 0, bars: 8 }]);
    // Without `continuous` each section starts the loop again.
    expect(lanePlacements({ sectionBars: 8, sections: [{ channels: [1] }, { channels: [1] }] }, 1, 16)).toEqual([{ at: 0, from: 0, bars: 8 }, { at: 8, from: 0, bars: 8 }]);
  });

  it('takes the Loop kit from the section where most channels repeat together', () => {
    // Bass repeats 2 bars at bars 1-8 and again at 17-24; drums repeat 1 bar only at 17-24;
    // the pad plays at 17-24 without a pattern. The kit should come from bars 17-24.
    const patternsOf = new Map([
      [2, [{ bars: 2, coverage: 0.9, starts: [1, 3, 5, 7, 17, 19, 21, 23] }]],
      [10, [{ bars: 1, coverage: 0.5, starts: [17, 18, 19, 20, 21, 22, 23, 24] }]],
      [5, []],
    ]);
    const activeIn = (ch, from, to) => (ch === 5 ? from < 25 && to > 17 : true);
    const [best] = loopSections(patternsOf, activeIn, { bars: 8, lastBar: 32 });
    expect(best.startBar).toBe(17);
    expect([...best.loops]).toEqual([[2, { startBar: 17, bars: 2 }], [10, { startBar: 17, bars: 1 }]]);
    expect(best.others).toEqual([5]);
  });

  it('cuts any tick range, not only whole bars', () => {
    const f = smf(0, 96, [noteEvents(0, [[0, 60, 96], [384, 62, 96], [480, 64, 96], [768, 65, 96]])]);
    const info = parseMidi(f);
    const { notes } = extractNotes(info, 'ch:1');
    // From bar 2 beat 2 (tick 480) to bar 3 (tick 768).
    const s = sliceTicks(info, notes, 480, 768);
    expect(s.notes.map((n) => [n.pitch, n.start, n.stop])).toEqual([[64, 0, 96]]);
    expect(s.lengthTicks).toBe(288);
  });

  it('snaps to the 16th, the beat or the bar, like midiGrid', () => {
    const info = parseMidi(smf(0, 96, [noteEvents(0, [[0, 60, 96], [1500, 62, 96]])]));   // 4/4, 384 ticks a bar
    expect(snapTick(info, 410, 'step')).toBe(408);    // 16ths of 24 ticks
    expect(snapTick(info, 410, 'beat')).toBe(384);
    expect(snapTick(info, 450, 'beat')).toBe(480);
    expect(snapTick(info, 600, 'bar')).toBe(768);
    expect(snapTick(info, 500, 'bar')).toBe(384);
    expect(tickAtBar(info, 2.25)).toBe(480);
  });

  it('writes positions as bar.beat.16th', () => {
    const info = parseMidi(smf(0, 96, [noteEvents(0, [[0, 60, 96], [1500, 62, 96]])]));
    expect(formatPos(info, 384)).toBe('2');
    expect(formatPos(info, 480)).toBe('2.2');
    expect(formatPos(info, 504)).toBe('2.2.2');
  });
});

describe('where a collage plays in its song', () => {
  const pieces = [
    { startSec: 0, endSec: 2, fromSec: 10, toSec: 12 },
    { startSec: 2, endSec: 6, fromSec: 30, toSec: 32 },   // at another tempo: twice as long here
  ];

  it('follows each piece at its own pace, and round again', () => {
    expect(songPlace(pieces, 1)).toBe(11);
    expect(songPlace(pieces, 2)).toBe(30);
    expect(songPlace(pieces, 4)).toBe(31);
    expect(songPlace(pieces, 7)).toBe(11);
  });
});

describe('fragments in a row', () => {
  // 120 BPM, 96 ticks a beat: a 4/4 bar is 384 ticks, 2 seconds. Notes all through.
  const line = Array.from({ length: 32 }, (_, k) => [k * 96, 60 + (k % 12), 48]);
  const info = parseMidi(smf(0, 96, [noteEvents(0, line)]));

  it('keeps every fragment on its beat of the bar, and on whole bars', () => {
    // One in bar 2 from its third beat, 1.5 beats long; one from the first beat of bar 6.
    const song = fragmentSequence(info, 1, [
      { at: 384 + 192, ticks: 144, startBar: 2, bars: 1 },
      { at: 1920, ticks: 480, startBar: 6, bars: 2 },
    ]);
    const on = song.events.filter((e) => e.type === 'on').map((e) => e.tick);
    expect(on.slice(0, 2)).toEqual([192, 288]);   // beats 3 and 4 of the first bar
    expect(on.slice(2)).toEqual([384, 480, 576, 672, 768]);   // on the bar line, the next bar
    expect(song.places.map((p) => [p.startSec, p.endSec])).toEqual([[0, 2], [2, 6]]);
    expect(song.durationSec).toBe(6);
  });

  it('plays only the notes of the fragment, not those around it in its bars', () => {
    const song = fragmentSequence(info, 1, [{ at: 96, ticks: 96, startBar: 1, bars: 1 }]);
    expect(song.events.filter((e) => e.type === 'on').map((e) => [e.tick, e.a])).toEqual([[96, 61]]);
  });
});

describe('feel of a fragment', () => {
  const line = (pitches) => pitches.map((pitch, i) => ({ pitch, start: i * 120 }));

  it('names how the notes move', () => {
    expect(SHAPES[feelOf(line([60, 62, 64, 65, 67, 69, 71, 72]), 1).shape]).toBe('rising');
    expect(SHAPES[feelOf(line([72, 71, 69, 67, 65, 64, 62, 60]), 1).shape]).toBe('falling');
    expect(SHAPES[feelOf(line([60, 60, 61, 60, 60, 60, 61, 60]), 1).shape]).toBe('flat');
    expect(SHAPES[feelOf(line([60, 67, 72, 67, 60, 67, 72, 67, 60]), 1).shape]).toBe('wave');
    expect(feelOf(line([36, 50, 40, 60]), 1, true).shape).toBe(0);   // drums
  });

  it('names how many notes it plays', () => {
    const notes = line(new Array(16).fill(60));
    expect(ENERGIES[feelOf(notes, 8).energy]).toBe('sparse');
    expect(ENERGIES[feelOf(notes, 2).energy]).toBe('medium');
    expect(ENERGIES[feelOf(notes, 1).energy]).toBe('busy');
  });
});

describe('chords', () => {
  // Quarter notes on channel 1: each chord as an arpeggio, as a single line.
  const song = (chords) => {
    const events = chords.flatMap((notes) => notes.flatMap((n) => [[0, 0x90, n, 90], [480, 0x80, n, 0]]));
    return parseMidi(smf(0, 480, [[[0, ...meta(0x58, [4, 2, 24, 8])], ...events]]));
  };
  const C = [60, 64, 67, 72], G = [55, 59, 62, 67], Am = [57, 60, 64, 69], F = [53, 57, 60, 65];

  it('hears the chords across beats, even in a single line', () => {
    const info = song([C, G, Am, F]);
    expect(romanProgression(progressionIn(songChords(info), 480, 0, 16 * 480, '0 mayor'))).toBe('I:4 V:4 vi:4 IV:4');
  });

  it('is relative to the key', () => {
    const chords = songChords(song([C, G]));
    expect(progressionIn(chords, 480, 0, 8 * 480, '0 mayor')).toBe('M 0*4 7*4');
    expect(progressionIn(chords, 480, 0, 8 * 480, '7 mayor')).toBe('M 5*4 0*4');
    expect(progressionIn(chords, 480, 0, 8 * 480, '')).toBe('');
  });

  it('scores how well two progressions go together', () => {
    expect(progressionFit('M 0*4 7*4', 'M 0*4 7*4')).toBe(1);
    expect(progressionFit('M 0*2 7*2', 'M 0*4 7*4')).toBe(0.5);       // goes round: half the beats clash
    expect(progressionFit('M 0*4', 'M 6*4')).toBe(0);
    expect(progressionFit('M 9m*4', 'm 0m*4')).toBe(1);               // A minor in C major is the tonic of its relative
    expect(progressionFit('M 0*4', 'm 0m*4')).toBe(0.75);             // C major and A minor share two notes
    expect(progressionFit('', 'M 0*4')).toBe(0);
  });
});

describe('features', () => {
  // A drum bar: kick on 1 and 3, snare on 2 and 4 (16th grid at 96 PPQ = 24 ticks).
  const drumBar = (bar, extra = []) => [[bar * 384, 36, 24], [bar * 384 + 96, 38, 24], [bar * 384 + 192, 36, 24], [bar * 384 + 288, 38, 24], ...extra];

  it('skips quadratic pattern matching when a part spans too many distinct bars', () => {
    const info = {
      ppq: 96,
      smpte: false,
      barOfTick: (tick) => tick / 384 + 1,
      barStartTick: (bar) => (bar - 1) * 384,
    };
    const notes = Array.from({ length: 513 }, (_, bar) => ({
      start: bar * 384 + (bar % 16) * 24,
      stop: bar * 384 + (bar % 16) * 24 + 12,
      pitch: Math.floor(bar / 16),
    }));
    expect(detectPatterns(info, notes)).toEqual([]);
  });

  it('keeps metadata and basic parts for songs too long for safe detail analysis', () => {
    const info = {
      bars: 2049, tracks: [{ name: 'Long song' }], copyright: '', texts: [],
      channels: [{ channel: 1, programs: [40], max: 80, min: 40, notes: 100, tracks: [1] }],
      durationSec: 3600, bpm: 120, timeSig: '4/4', format: 0, trackCount: 1,
    };
    const record = fileRecord('long.mid', info);
    expect(record).toMatchObject({ ok: true, limited: expect.any(String), bars: 65535 });
    expect(record.parts[0]).toMatchObject({ 0: 1, 3: 100, 9: 0, 10: 0 });
  });

  it('finds the other riffs of a part, not pieces of the first, and no silence in a loop', () => {
    // A (2 bars) twice, 4 bars of silence, B (1 bar) four times, 4 of silence; all of it twice.
    const A = (bar) => [[bar * 384, 60, 96], [bar * 384 + 96, 64, 96], [(bar + 1) * 384, 67, 96], [(bar + 1) * 384 + 192, 72, 96]];
    const B = (bar) => [[bar * 384, 40, 48], [bar * 384 + 192, 43, 48], [bar * 384 + 288, 45, 48]];
    const round = (at) => [...A(at), ...A(at + 2), ...[8, 9, 10, 11].flatMap((k) => B(at + k))];
    const info = parseMidi(smf(0, 96, [noteEvents(0, [...round(0), ...round(16)])]));
    const p = detectPatterns(info, extractNotes(info, 'ch:1').notes);
    expect(p.map((x) => [x.bars, x.startBar])).toEqual([[1, 9], [2, 1]]);   // as much of each: the shorter first
  });

  it('takes a riff heard once, on each channel, whatever the others do', () => {
    // Two channels with the same 3 bars, once; one bar alone later on the first.
    const riff = Array.from({ length: 3 }, (_, b) => [[b * 384, 60 + b, 180], [b * 384 + 192, 64 + b, 180]]).flat();
    const lone = [[20 * 384, 72, 96]];
    const info = parseMidi(smf(1, 96, [noteEvents(0, [...riff, ...lone]), noteEvents(1, riff)]));
    for (const ch of [1, 2]) {
      const notes = extractNotes(info, `ch:${ch}`).notes;
      expect(detectPatterns(info, notes)).toEqual([]);
      expect(channelFragments(info, notes)).toEqual([expect.objectContaining({ bars: 3, startBar: 1, count: 1, starts: [1] })]);
    }
    const [part] = fileRecord('x', info).parts;
    expect(part.slice(PART.loopBars, PART.loopStart + 1)).toEqual([3, 1, expect.any(Number), 1]);
  });

  it('never lets the fragments of a part share a bar, in any repeat', () => {
    // A (4 bars) and B (4 bars) and a stretch that starts inside A: A B A B C-with-A's-end.
    const bar = (k, base) => [[k * 384, base, 96], [k * 384 + 96, base + 2, 96], [k * 384 + 192, base + 4, 96], [k * 384 + 288, base + 7, 96]];
    const A = (at) => [0, 1, 2, 3].flatMap((k) => bar(at + k, 60 + k));
    const B = (at) => [0, 1, 2, 3].flatMap((k) => bar(at + k, 40 + k * 2));
    const info = parseMidi(smf(0, 96, [noteEvents(0, [...A(0), ...B(4), ...A(8), ...B(12), ...A(16), ...B(20), ...A(24), ...B(28)])]));
    const p = detectPatterns(info, extractNotes(info, 'ch:1').notes);
    const played = new Set();
    for (const f of p) for (const s of f.starts) for (let k = 0; k < f.bars; k++) {
      expect(played.has(s + k)).toBe(false);
      played.add(s + k);
    }
  });

  it('makes each group of notes between silences a fragment, exact, wherever it starts', () => {
    // A riff in the middle of bar 2, the same in bar 6, another in bar 10, then two lone notes.
    const riff = (at, base) => [[at, base, 48], [at + 96, base + 3, 48], [at + 192, base + 5, 48], [at + 288, base + 7, 48]];
    const line = [...riff(576, 60), ...riff(2112, 60), ...riff(3456, 40), [5000, 72, 48], [5100, 74, 48]];
    const info = parseMidi(smf(0, 96, [noteEvents(0, line)]));
    const list = channelFragments(info, extractNotes(info, 'ch:1').notes);
    expect(list.map((f) => [f.at, f.ticks, f.count, f.ats])).toEqual([[576, 336, 2, [576, 2112]], [3456, 336, 1, [3456]]]);
    expect(list[0]).toMatchObject({ startBar: 2, starts: [2, 6] });
  });

  it('splits by a silence inside a bar, not on the bar line', () => {
    // Two riffs in one bar and the next, with a beat of silence between them.
    const a = [[0, 60, 48], [96, 62, 48], [192, 64, 48]];
    const b = [[384 + 96, 70, 48], [384 + 192, 72, 48], [384 + 288, 74, 48]];
    const info = parseMidi(smf(0, 96, [noteEvents(0, [...a, ...b])]));
    expect(channelFragments(info, extractNotes(info, 'ch:1').notes).map((f) => f.at).sort((x, y) => x - y)).toEqual([0, 480]);
  });

  it('finds the riffs a long group repeats inside it', () => {
    const riff = (bar) => [0, 96, 192, 288].map((k, n) => [bar * 384 + k, 60 + n, 80]);
    const line = Array.from({ length: 8 }, (_, b) => riff(b)).flat();
    const info = parseMidi(smf(0, 96, [noteEvents(0, line)]));
    const [f] = channelFragments(info, extractNotes(info, 'ch:1').notes);
    expect([f.bars, f.count]).toEqual([1, 8]);
  });

  it('takes a riff that changes each time it comes, beside the loop', () => {
    // A loop of 2 bars, four times; then 4 bars of something else, different each time, twice.
    const A = (at) => [[at * 384, 60, 180], [at * 384 + 192, 64, 180], [(at + 1) * 384, 67, 280], [(at + 1) * 384 + 288, 72, 90]];
    const other = (at, base) => Array.from({ length: 16 }, (_, k) => [at * 384 + k * 96, base + (k * 7) % 12, 48]);
    const line = [...A(0), ...A(2), ...other(4, 40), ...A(8), ...A(10), ...other(12, 76)];
    const info = parseMidi(smf(0, 96, [noteEvents(0, line)]));
    const list = channelFragments(info, extractNotes(info, 'ch:1').notes);
    expect(list.map((f) => [f.bars, f.startBar, f.count])).toEqual([[2, 1, 4], [4, 5, 1], [4, 13, 1]]);
  });

  it('takes one bar every other for a 2-bar pattern, and keeps what plays around it', () => {
    // Bars 3 to 10 alternate A, b, A, c…: A every other bar, the others all different; then
    // 2 bars of something else, far from it.
    const A = (at) => [[at * 384, 60, 96], [at * 384 + 192, 64, 96]];
    const other = (at, base) => [[at * 384, base, 96], [at * 384 + 96, base + 3, 96], [at * 384 + 288, base + 8, 96]];
    const line = [...A(2), ...other(3, 40), ...A(4), ...other(5, 48), ...A(6), ...other(7, 70), ...A(8), ...other(9, 80), ...other(20, 30), ...other(21, 33)];
    const info = parseMidi(smf(0, 96, [noteEvents(0, line)]));
    const notes = extractNotes(info, 'ch:1').notes;
    expect(detectPatterns(info, notes).some((p) => p.bars === 1)).toBe(false);
    expect(channelFragments(info, notes).map((f) => f.startBar)).toContain(21);   // bars 21-22, short as they are
  });

  it('ends a block where its notes end', () => {
    const line = (from, bars) => Array.from({ length: bars }, (_, b) => [(from + b) * 384, 60 + b, 300]);
    const info = parseMidi(smf(0, 96, [noteEvents(0, [...line(0, 5), ...line(6, 2)])]));
    expect(riffBlocks(info, extractNotes(info, 'ch:1').notes).map((b) => [b.bars, b.startBar])).toEqual([[5, 1], [2, 7]]);
  });

  it('keeps long blocks in 16 bars and no one-bar ones', () => {
    const line = Array.from({ length: 20 }, (_, b) => [b * 384, 60 + (b * 5) % 12, 300]);
    const info = parseMidi(smf(0, 96, [noteEvents(0, line)]));
    expect(riffBlocks(info, extractNotes(info, 'ch:1').notes).map((b) => [b.bars, b.startBar])).toEqual([[16, 1], [4, 17]]);
    const lone = parseMidi(smf(0, 96, [noteEvents(0, [[0, 60, 96]])]));
    expect(riffBlocks(lone, extractNotes(lone, 'ch:1').notes)).toEqual([]);
  });

  it('finds a 1-bar drum loop', () => {
    const notes = Array.from({ length: 8 }, (_, b) => drumBar(b)).flat();
    const info = parseMidi(smf(0, 96, [noteEvents(9, notes)]));
    const p = detectPatterns(info, extractNotes(info, 'ch:10').notes);
    expect(p[0]).toMatchObject({ bars: 1, startBar: 1, count: 8, coverage: 1 });
    expect(p.some((x) => x.bars === 2 || x.bars === 4)).toBe(false);   // multiples of the 1-bar loop are dropped
  });

  it('finds a 2-bar riff and not its 4-bar double', () => {
    const riff = (bar) => (bar % 2 === 0 ? [[bar * 384, 40, 96], [bar * 384 + 192, 43, 96]] : [[bar * 384, 45, 96], [bar * 384 + 96, 47, 96]]);
    const notes = Array.from({ length: 8 }, (_, b) => riff(b)).flat();
    const info = parseMidi(smf(0, 96, [[[0, 0xc0, 33], ...noteEvents(0, notes)]]));
    const p = detectPatterns(info, extractNotes(info, 'ch:1').notes);
    expect(p[0]).toMatchObject({ bars: 2, startBar: 1, count: 4 });
    expect(p.some((x) => x.bars === 4)).toBe(false);
  });

  it('keeps a loop through a fill: bars that are nearly the same still match', () => {
    const hats = (bar) => Array.from({ length: 8 }, (_, k) => [bar * 384 + k * 48, 42, 12]);
    const crash = (bar) => (bar % 4 === 3 ? [[bar * 384 + 336, 49, 24]] : []);
    const notes = Array.from({ length: 8 }, (_, b) => drumBar(b, [...hats(b), ...crash(b)])).flat();
    const info = parseMidi(smf(0, 96, [noteEvents(9, notes)]));
    expect(detectPatterns(info, extractNotes(info, 'ch:10').notes)[0]).toMatchObject({ bars: 1, startBar: 1, count: 8 });
  });

  it('finds a riff that starts on any bar', () => {
    const riff = (bar) => (bar % 2 === 1 ? [[bar * 384, 40, 96], [bar * 384 + 192, 43, 96]] : [[bar * 384, 45, 96], [bar * 384 + 96, 47, 96]]);
    const notes = [[0, 30, 96], ...Array.from({ length: 8 }, (_, b) => riff(b + 1)).flat()];   // a pick-up bar first
    const info = parseMidi(smf(0, 96, [noteEvents(0, notes)]));
    expect(detectPatterns(info, extractNotes(info, 'ch:1').notes)[0]).toMatchObject({ bars: 2, startBar: 2, count: 4 });
  });

  it('estimates the key from the notes, and matches any spelling of a key', () => {
    // A I-IV-V-I cadence in C, then the same shape in A minor (i-iv-V-i with G#).
    const chords = (list) => list.flatMap((pitches, k) => pitches.map((p) => [k * 384, p, 384]));
    const c = parseMidi(smf(0, 96, [noteEvents(0, chords([[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67], [60, 64, 67, 48]]))]));
    expect(estimateKey(c)).toBe('C mayor');
    const a = parseMidi(smf(0, 96, [noteEvents(0, chords([[57, 60, 64], [62, 65, 69], [64, 68, 71], [57, 60, 64], [57, 60, 64, 45]]))]));
    expect(estimateKey(a)).toBe('A menor');
    expect(keyClass('Db mayor')).toBe(keyClass('C# mayor'));
    // A written C major is what sequencers leave: the notes say. Any other written key stands.
    expect(songKeyOf({ ...a, key: 'C mayor' })).toBe('A menor');
    expect(songKeyOf({ ...a, key: 'D mayor' })).toBe('D mayor');
    expect(songKeyOf({ ...c, key: '' })).toBe('C mayor');
    expect(keyClass('Db mayor')).not.toBe(keyClass('Db menor'));
    expect(keyClass('')).toBe('');
  });

  it('leaves out a pattern that covers little of the part', () => {
    // 80 bars, all different but for bars 9-16 repeating bars 1-8: 16 of 80 bars, 20 %.
    const notes = Array.from({ length: 80 }, (_, b) => [[b * 384, 20 + (b >= 8 && b < 16 ? b - 8 : b), 96], [b * 384 + 192, 21 + (b >= 8 && b < 16 ? b - 8 : b), 96]]).flat();
    const info = parseMidi(smf(0, 96, [noteEvents(0, notes)]));
    expect(detectPatterns(info, extractNotes(info, 'ch:1').notes)).toEqual([]);
  });

  it('classifies roles', () => {
    const drums = parseMidi(smf(0, 96, [noteEvents(9, drumBar(0))]));
    expect(partFeatures(drums, 10).role).toBe('drums');
    const bass = parseMidi(file);
    expect(partFeatures(bass, 2)).toMatchObject({ role: 'bass', program: 33, trackName: 'Bass' });
    const chords = parseMidi(smf(0, 96, [[[0, 0xc0, 0], ...noteEvents(0, [[0, 60, 96], [0, 64, 96], [0, 67, 96], [96, 62, 96], [96, 65, 96], [96, 69, 96]])]]));
    expect(partFeatures(chords, 1).role).toBe('chords');
    const melody = parseMidi(smf(0, 96, [[[0, 0xc0, 73], ...noteEvents(0, [[0, 72, 48], [48, 74, 48], [96, 76, 48]])]]));
    expect(partFeatures(melody, 1).role).toBe('melody');
  });

  it('turns a file into a compact record, and a broken one into ok: false', () => {
    const notes = Array.from({ length: 8 }, (_, b) => drumBar(b)).flat();
    const r = fileRecord('D:\\x.mid', parseMidi(smf(0, 96, [noteEvents(9, notes)])));
    expect(r).toMatchObject({ path: 'D:\\x.mid', ok: true, ts: '4/4', bars: 8 });
    const p = r.parts[0];
    expect([p[PART.ch], ROLES[p[PART.role]], p[PART.notes], p[PART.loopBars], p[PART.loopCount], p[PART.loopStart]]).toEqual([10, 'drums', 32, 1, 8, 1]);
    expect(analyseFile('D:\\bad.mid', new Uint8Array([1, 2, 3, 4, 5]))).toEqual({ path: 'D:\\bad.mid', v: RECORD_VERSION, ok: false });
  });

  it('reads title and author, leaving out placeholders, software credits and garbled text', () => {
    const file = (name, ...texts) => parseMidi(smf(1, 96, [[[0, ...meta(0x03, str(name))], ...texts.map(([type, s]) => [0, ...meta(type, str(s))])], noteEvents(0, [[0, 60, 96]])]));
    expect(fileMeta(file('Penny Lane', [0x02, '(C)1997 by J. Smith']))).toEqual({ title: 'Penny Lane', author: '(C)1997 by J. Smith' });
    expect(fileMeta(file('Untitled', [0x01, 'Generated by NoteWorthy Composer'], [0x01, 'Sequenced by Eleanor Adams']))).toEqual({ title: '', author: 'Sequenced by Eleanor Adams' });
    expect(fileMeta(file('Seq-1', [0x02, 'Copyright \u00a9 1996 by \u00b3\u00af\u00a5@\u00b5\u00d3']))).toEqual({ title: '', author: '' });
    expect(fileRecord('D:\\x.mid', file('Wonderwall', [0x02, 'Me']))).toMatchObject({ v: RECORD_VERSION, title: 'Wonderwall', author: '' });
  });
});

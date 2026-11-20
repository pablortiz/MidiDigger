import { describe, expect, it } from 'vitest';
import { parseMidi } from '../src/midi/parser.js';
import { CONTROL_BEND, FRAG, PART, fileRecord } from '../src/midi/features.js';
import { DRUM_GESTURES } from '../src/midi/gestures.js';
import { analysisFile, encodeAnalysis, readAnalysis } from '../src/library/backup.js';
import { compactSearchScores } from '../src/library/catalog.js';
import { meta, smf } from './smf.js';

const BAR = 384;   // 4/4 at 96 ticks a quarter note

/** One track from events at absolute ticks: [tick, ...bytes]. */
const track = (events) => {
  let last = 0;
  return [...events].sort((a, b) => a[0] - b[0]).map(([tick, ...bytes]) => { const d = tick - last; last = tick; return [d, ...bytes]; });
};

// A two-bar riff played four times on channel 1, with: base volume 99 and expression 127 set at
// the start, the sustain pedal down from tick 10 and up halfway through bar 3, a pitch bend in
// bar 3 back to rest in bar 4, and the tempo going from 120 to 100 BPM at bar 5.
const riff = (bar) => [[0, 60], [96, 64], [192, 67], [288, 72], [384, 67], [480, 64], [576, 62], [672, 60]]
  .flatMap(([t, p]) => [[bar * BAR + t, 0x90, p, 100], [bar * BAR + t + 90, 0x80, p, 0]]);
const song = () => parseMidi(smf(0, 96, [track([
  [0, ...meta(0x51, [0x07, 0xa1, 0x20])],            // 120 BPM
  [4 * BAR, ...meta(0x51, [0x09, 0x27, 0xc0])],      // 100 BPM
  [0, 0xb0, 7, 99], [0, 0xb0, 11, 127],
  [10, 0xb0, 64, 127], [2 * BAR + 192, 0xb0, 64, 0],
  [2 * BAR + 96, 0xe0, 0x00, 0x50],                  // 0x50 << 7 = 10240
  [3 * BAR, 0xe0, 0x00, 0x40],                       // 8192: at rest
  ...[0, 2, 4, 6].flatMap(riff),
])]));

const part = (r) => r.parts.find((p) => p[PART.ch] === 1);
const pairs = (a) => (a ? [...a].reduce((out, x, k) => (k % 2 ? [...out.slice(0, -1), [out.at(-1), x]] : [...out, x]), []) : null);
const control = (n, v) => n | (v << 8);

describe('the controls and tempo kept with a fragment for an analysis saved with MIDI events', () => {
  it('reads pitch bend apart from the events the add-on plays', () => {
    const info = song();
    expect(info.bends).toEqual([{ tick: 2 * BAR + 96, ch: 0, value: 10240 }, { tick: 3 * BAR, ch: 0, value: 8192 }]);
    expect(info.events.some((e) => e.type === 'pb' || e.type === 'bend')).toBe(false);
    expect(info.tempos).toEqual([{ tick: 0, uspq: 500000 }, { tick: 4 * BAR, uspq: 600000 }]);
  });

  it('gives each fragment the controls as they stand when it starts, then those inside it, and its tempo', () => {
    const info = song();
    const frags = part(fileRecord('D:\\midi\\x.mid', info))[PART.frags];
    expect(frags.length).toBeGreaterThan(0);
    for (const f of frags) {
      const from = info.barStartTick(f[FRAG.start]);
      const until = info.barStartTick(f[FRAG.start] + f[FRAG.bars]);
      const got = pairs(f[FRAG.controls]);
      // The base volume and expression are always there, at tick 0.
      expect(got).toContainEqual([0, control(7, 99)]);
      expect(got).toContainEqual([0, control(11, 127)]);
      for (const [tick] of got) expect(tick).toBeLessThan(until - from);
      const tempo = pairs(f[FRAG.tempo]);
      expect(tempo[0]).toEqual([0, from >= 4 * BAR ? 600000 : 500000]);
      if (from < 4 * BAR && until > 4 * BAR) expect(tempo[1]).toEqual([4 * BAR - from, 600000]);
    }
    // The fragment from bar 1: the pedal goes down inside it at tick 10.
    const first = frags.find((f) => f[FRAG.start] === 1);
    expect(pairs(first[FRAG.controls])).toContainEqual([10, control(64, 127)]);
  });

  it('puts a pedal held and a bend not at rest at the start of a fragment that begins under them, and a tempo change inside it', () => {
    // The riff from bar 3 only; before it, the pedal goes down and the pitch is bent. Inside it the
    // bend comes back to rest and the tempo changes, at the riff's second bar.
    const info = parseMidi(smf(0, 96, [track([
      [0, ...meta(0x51, [0x07, 0xa1, 0x20])], [3 * BAR, ...meta(0x51, [0x09, 0x27, 0xc0])],
      [0, 0xb0, 7, 90], [10, 0xb0, 64, 127], [100, 0xe0, 0x00, 0x50],
      [2 * BAR + 48, 0xe0, 0x00, 0x40],
      ...[2, 4, 6, 8].flatMap(riff),
    ])]));
    const f = part(fileRecord('D:\\midi\\y.mid', info))[PART.frags].find((x) => x[FRAG.start] === 3);
    expect(f).toBeDefined();
    expect(pairs(f[FRAG.controls])).toEqual([
      [0, control(7, 90)], [0, control(64, 127)], [0, control(CONTROL_BEND, 10240)],   // as they stand at bar 3
      [48, control(CONTROL_BEND, 8192)],                                                // inside: back to rest
    ]);
    expect(pairs(f[FRAG.tempo])).toEqual([[0, 500000], [BAR, 600000]]);
  });

  it('leaves out a bend at rest when the fragment starts', () => {
    const f = part(fileRecord('D:\\midi\\x.mid', song()))[PART.frags][0];
    expect(pairs(f[FRAG.controls]).some(([t, w]) => t === 0 && (w & 0xff) === CONTROL_BEND)).toBe(false);
  });

  it('keeps nothing of it when the analysis is not for Search or export', () => {
    const plain = part(fileRecord('D:\\midi\\x.mid', song(), { includeSearchScores: false }))[PART.frags][0];
    expect(plain[FRAG.controls]).toBeUndefined();
    expect(plain[FRAG.tempo]).toBeUndefined();
  });

  it('sits after the gesture scores', () => {
    expect(FRAG.controls).toBe(FRAG.gestureScores + DRUM_GESTURES.length);
    expect(FRAG.tempo).toBe(FRAG.controls + 1);
  });

  it('is saved and read back with MIDI events, and dropped from the compact analysis', () => {
    const record = { ...fileRecord('D:\\midi\\x.mid', song()), fp: '1:00000001' };
    compactSearchScores(record, { keepEvents: true });
    const f0 = part(record)[PART.frags][0];
    expect(f0[FRAG.events]).toBeInstanceOf(Uint32Array);
    const bytes = encodeAnalysis(analysisFile('D:\\midi', [record]), { includeEvents: true });
    const header = JSON.parse(new TextDecoder().decode(bytes.subarray(12, 12 + new DataView(bytes.buffer).getUint32(8, true))));
    for (const name of ['noteEvents', 'controlEvents', 'tempoEvents', 'frag.controlCount', 'frag.tempoCount']) expect(header.sections.some((s) => s.name === name)).toBe(true);
    const back = part(readAnalysis(bytes, { includeEvents: true }).files[0])[PART.frags];
    part(record)[PART.frags].forEach((f, k) => {
      expect(back[k][FRAG.events]).toEqual(f[FRAG.events]);
      expect(back[k][FRAG.controls]).toEqual(f[FRAG.controls]);
      expect(back[k][FRAG.tempo]).toEqual(f[FRAG.tempo]);
    });
    const restored = part(readAnalysis(bytes, { includeEvents: false }).files[0])[PART.frags][0];
    expect([restored[FRAG.events], restored[FRAG.controls], restored[FRAG.tempo]]).toEqual([null, null, null]);

    const compact = { ...fileRecord('D:\\midi\\x.mid', song()), fp: '1:00000001' };
    compactSearchScores(compact);
    const c0 = part(compact)[PART.frags][0];
    expect([c0[FRAG.events], c0[FRAG.controls], c0[FRAG.tempo]]).toEqual([null, null, null]);
    const plainBytes = encodeAnalysis(analysisFile('D:\\midi', [compact]));
    const plainHeader = JSON.parse(new TextDecoder().decode(plainBytes.subarray(12, 12 + new DataView(plainBytes.buffer).getUint32(8, true))));
    expect(plainHeader.sections.some((s) => s.name === 'controlEvents' || s.name === 'tempoEvents')).toBe(false);
  });
});

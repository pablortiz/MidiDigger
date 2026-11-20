import { describe, expect, it } from 'vitest';
import { analysisFile, decodeAnalysis, encodeAnalysis, fingerprint, matchAnalysis, readAnalysis } from '../src/library/backup.js';
import { FRAG, PART, RECORD_VERSION } from '../src/midi/features.js';
import { Catalog } from '../src/library/catalog.js';

const records = () => [
  {
    path: 'D:\\midi\\a.mid', v: RECORD_VERSION, ok: true, fp: '3:0000abcd', title: 'Canción', author: '', form: [3, 7], turns: [0, 1],
    dur: 12.5, bpm: 120, ts: '4/4', key: 'A menor', keyEst: true, fmt: 1, tracks: 3, bars: 8,
    parts: [
      [1, 0, 3, 80, 8, 30, 0, 60, 72, 2, 4, 50, 1, 'Lead', [
        [2, 1, 4, 50, 1, 1, 'm 0m*8', 0, 3840, '16:5555', 90, 12, new Uint16Array([1, 1, 16, 16, 128, 128, 0, 0, 1, 1, 16, 16, 128, 128, 0, 2048]), new Uint8Array([1, 16, 0, 1, 16, 0, 1, 16, 0, 1, 16, 0]), 96, new Uint32Array([0, 96, 60 | (90 << 8)])],
        [300, 9, 2, 50, 4, 2, '', 15360, 70000, '', 64, 0, null, null, 0, null],
      ]],
      [10, 0, 0, 100, 8, 50, 10, 35, 50, 1, 8, 100, 1, 'Batería', [[1, 1, 8, 100, 0, 1, '', 0, 1920, '16:1111', 100, 0, null, new Uint8Array([1, 16, 0, 1, 16, 0]), 48, new Uint32Array([0, 24, 36 | (100 << 8)])]]],
    ],
  },
  { path: 'D:\\midi\\bad.mid', v: RECORD_VERSION, ok: false, fp: '1:00000001' },
  {
    path: 'D:\\midi\\b.mid', v: RECORD_VERSION, ok: true, fp: '9:00000002', title: '', author: 'x', form: [], turns: [], dur: 3, bpm: 90.5, ts: '3/4', key: '', keyEst: false, fmt: 0, tracks: 1, bars: 4,
    parts: [[2, 33, 1, 40, 4, 20, 0, 30, 40, 4, 1, 100, 1, 'Bass', [[4, 1, 1, 100, 3, 0, 'm 0m*8', 0, 5760, '12:111', 80, 5, new Uint16Array(24).fill(4), new Uint8Array(18).fill(1), 144, null]]]],
  },
];

function legacyV23Bytes() {
  const file = analysisFile('D:\\midi', records());
  const current = encodeAnalysis(file);
  const headerLength = new DataView(current.buffer).getUint32(8, true);
  const header = JSON.parse(new TextDecoder().decode(current.subarray(12, 12 + headerLength)));
  const eventCounts = [];
  const eventWords = [];
  for (const r of file.files) for (const p of r.parts ?? []) for (const f of p[PART.frags] ?? []) {
    const events = f[FRAG.events];
    eventCounts.push(events?.length / 3 || 0);
    if (events?.length) eventWords.push(...events);
  }
  const additions = [
    { name: 'frag.eventCount', type: 'u32', length: eventCounts.length, bytes: new Uint8Array(new Uint32Array(eventCounts).buffer) },
    { name: 'noteEvents', type: 'u32', length: eventWords.length, bytes: new Uint8Array(new Uint32Array(eventWords).buffer) },
  ];
  const dataStart = Math.ceil((12 + headerLength) / 8) * 8;
  const sections = header.sections.filter((s) => !s.name.startsWith('frag.score.'));
  const chunks = sections.map((s) => ({
    section: { ...s },
    bytes: current.subarray(dataStart + s.offset, dataStart + s.offset + s.length * ({ json: 1, u8: 1, u16: 2, u32: 4, f32: 4 }[s.type])),
  })).concat(additions.map(({ name, type, length, bytes }) => ({ section: { name, type, length }, bytes })));
  let offset = 0;
  for (const chunk of chunks) {
    chunk.section.offset = offset;
    offset += Math.ceil(chunk.bytes.length / 8) * 8;
  }
  header.sections = chunks.map((chunk) => chunk.section);
  const encodedHeader = new TextEncoder().encode(JSON.stringify(header));
  const newDataStart = Math.ceil((12 + encodedHeader.length) / 8) * 8;
  const legacy = new Uint8Array(newDataStart + offset);
  legacy.set(current.subarray(0, 8), 0);
  new DataView(legacy.buffer).setUint32(8, encodedHeader.length, true);
  legacy.set(encodedHeader, 12);
  for (const chunk of chunks) legacy.set(chunk.bytes, newDataStart + chunk.section.offset);
  return legacy;
}

describe('saved analysis', () => {
  it('fingerprints bytes by length and contents', () => {
    const a = fingerprint(new Uint8Array([1, 2, 3]));
    expect(a).toMatch(/^3:[0-9a-f]{8}$/);
    expect(fingerprint(new Uint8Array([1, 2, 3]))).toBe(a);
    expect(fingerprint(new Uint8Array([1, 2, 4]))).not.toBe(a);
  });

  it('reads back compact records with Search scores and no note-event stream', () => {
    const file = analysisFile('D:\\midi', records());
    const bytes = encodeAnalysis(file);
    expect(new TextDecoder().decode(bytes.subarray(0, 8))).toBe('MDIGGER1');
    const headerLength = new DataView(bytes.buffer).getUint32(8, true);
    const header = JSON.parse(new TextDecoder().decode(bytes.subarray(12, 12 + headerLength)));
    expect(header.sections.some((s) => s.name === 'noteEvents')).toBe(false);
    const back = readAnalysis(bytes);
    expect(back.root).toBe('D:\\midi');
    expect(back.model.stepsPerBeat).toBeGreaterThan(0);
    expect(back.files.map((r) => r.path)).toEqual(file.files.map((r) => r.path));
    expect(back.files[0].parts[0][PART.frags][0][FRAG.events]).toBeNull();
    expect(back.files[0].parts[1][PART.frags][0][FRAG.events]).toBeNull();
    expect(back.files[0].parts[0][PART.frags][0][FRAG.grid]).toBeInstanceOf(Uint16Array);
    expect(back.files[0].parts[1][PART.frags][0][FRAG.gestureScores]).toBe(50);
  });

  it('keeps missing Search scores marked as unavailable in an event-free export', () => {
    const file = analysisFile('D:\\midi', [{
      path: 'D:\\midi\\a.mid', v: RECORD_VERSION, ok: true, searchScores: false, parts: [],
    }]);
    const [record] = readAnalysis(encodeAnalysis(file)).files;
    expect(record.searchScores).toBe(false);
    const catalog = new Catalog();
    catalog.addFile(record);
    expect(catalog.file(record.path).searchScores).toBe(false);
  });

  it('exports note events on request and restores the compact scores without retaining them', () => {
    const bytes = encodeAnalysis(analysisFile('D:\\midi', records()), { includeEvents: true });
    const headerLength = new DataView(bytes.buffer).getUint32(8, true);
    const header = JSON.parse(new TextDecoder().decode(bytes.subarray(12, 12 + headerLength)));
    expect(header.sections.some((s) => s.name === 'noteEvents')).toBe(true);

    const compact = readAnalysis(bytes, { includeEvents: false });
    expect(compact.files[0].parts[0][PART.frags][0][FRAG.events]).toBeNull();
    expect(compact.files[0].parts[1][PART.frags][0][FRAG.events]).toBeNull();
    const catalog = new Catalog();
    compact.files.forEach((r) => catalog.addFile(r));
    expect(catalog.gestureScore(catalog.query({ role: 'drums' })[0], 'kick')).toBe(0.5);

    const complete = readAnalysis(bytes, { includeEvents: true });
    expect(complete.files[0].parts[0][PART.frags][0][FRAG.events]).toEqual(records()[0].parts[0][PART.frags][0][FRAG.events]);
  });

  it('reads the same from bytes that do not start on a multiple of 8 (a file read into a shared buffer)', () => {
    const bytes = encodeAnalysis(analysisFile('D:\\midi', records()));
    const shifted = new Uint8Array(bytes.length + 3);
    shifted.set(bytes, 3);
    expect(decodeAnalysis(shifted.subarray(3)).files).toHaveLength(3);
  });

  it('gives every grid a buffer of its own: a record copied into the store does not take the whole file with it', () => {
    const bytes = encodeAnalysis(analysisFile('D:\\midi', records()));
    const grid = readAnalysis(bytes).files[0].parts[0][14][0][12];
    expect(grid.buffer.byteLength).toBe(grid.byteLength);
    expect(structuredClone(grid).buffer.byteLength).toBe(32);
  });

  it('fills a catalogue with the grids it kept', () => {
    const c = new Catalog();
    for (const r of readAnalysis(encodeAnalysis(analysisFile('D:\\midi', records()))).files) c.addFile(r);
    const [lead] = c.query({ role: 'melody' });
    expect(c.grid(lead)).toEqual({ grid: new Uint16Array([1, 1, 16, 16, 128, 128, 0, 0, 1, 1, 16, 16, 128, 128, 0, 2048]), stepsPerBar: 8 });
    expect(c.gestureScore(lead, 'arpeggio')).toBe(0);
    expect(c.gestureScore(c.query({ role: 'drums' })[0], 'kick')).toBe(0.5);
    expect(c.grid(c.query({ role: 'drums' })[0])).toBeNull();
    expect(c.grid(c.query({ role: 'bass' })[0]).stepsPerBar).toBe(6);
  });

  it('reads an existing v23 event stream, derives scores, and drops the stream from the record', () => {
    const [r] = readAnalysis(legacyV23Bytes()).files;
    const drumFragment = r.parts[1][PART.frags][0];
    expect(drumFragment[FRAG.events]).toBeInstanceOf(Uint32Array);
    const c = new Catalog();
    expect(c.addFile(r)).toBe(true);
    expect(drumFragment[FRAG.events]).toBeNull();
    expect(c.gestureScore(c.query({ role: 'drums' })[0], 'kick')).toBe(0.5);
  });

  it('skips an existing v23 event stream while restoring its compact gesture scores', () => {
    const [r] = readAnalysis(legacyV23Bytes(), { includeEvents: false }).files;
    expect(r.parts[1][PART.frags][0][FRAG.events]).toBeNull();
    const c = new Catalog();
    c.addFile(r);
    expect(c.gestureScore(c.query({ role: 'drums' })[0], 'kick')).toBe(0.5);
  });

  it('refuses anything else, saying why', () => {
    const file = analysisFile('D:\\midi', records());
    expect(() => readAnalysis(new TextEncoder().encode('{"app":"MIDI Digger analysis"}'))).toThrow(/\.json by an earlier version/);
    expect(() => readAnalysis(new Uint8Array([1, 2, 3]))).toThrow(/not an analysis/);
    expect(() => readAnalysis(encodeAnalysis({ ...file, v: RECORD_VERSION - 1 }))).toThrow(/another version/);
    const bytes = encodeAnalysis(file);
    expect(() => readAnalysis(bytes.subarray(0, bytes.length - 40))).toThrow(/cut short/);
  });

  it('matches its files against the library, case ignored', () => {
    const file = analysisFile('D:\\midi', [
      { path: 'D:\\MIDI\\a.mid', fp: '1:a' },
      { path: 'D:\\midi\\gone.mid', fp: '1:b' },
    ]);
    const { check, gone, unsaved } = matchAnalysis(file, ['D:\\midi\\a.mid', 'D:\\midi\\new.mid']);
    expect(check.map((r) => r.path)).toEqual(['D:\\midi\\a.mid']);   // the library's spelling
    expect(gone).toEqual(['D:\\midi\\gone.mid']);
    expect(unsaved).toBe(1);
  });
});

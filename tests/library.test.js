import { describe, expect, it } from 'vitest';
import { findMidiFiles, fileRows, filterRows, fitStart } from '../src/library/scanner.js';
import { createReader, fileUrl, NoAccess, relativeParts, verifyDirectory } from '../src/library/reader.js';
import { fingerprint } from '../src/library/backup.js';
import { Catalog, compactSearchScores } from '../src/library/catalog.js';
import { Indexer } from '../src/library/indexer.js';
import { analyseFile, fileRecord, FRAG, PART } from '../src/midi/features.js';
import { parseMidi } from '../src/midi/parser.js';
import { smf, noteEvents } from './smf.js';

const tree = {
  'D:\\midi': [
    { name: 'A', path: 'D:\\midi\\A', isDirectory: true },
    { name: 'song.mid', path: 'D:\\midi\\song.mid', isDirectory: false },
    { name: 'notes.txt', path: 'D:\\midi\\notes.txt', isDirectory: false },
    { name: 'Locked', path: 'D:\\midi\\Locked', isDirectory: true },
  ],
  'D:\\midi\\A': [{ name: 'other.MIDI', path: 'D:\\midi\\A\\other.MIDI', isDirectory: false }],
};
const gui = {
  async listFiles(path) {
    if (!tree[path]) throw Object.assign(new Error('nope'), { code: 'uasrv.filesystem_error' });
    return tree[path];
  },
};

describe('fragments', () => {
  const song = (parts) => {
    const c = new Catalog();
    c.addFile({ path: 'x.mid', v: 5, ok: true, bpm: 120, ts: '4/4', key: 'C mayor', parts });
    return c;
  };
  // Two channels: the first with a 2-bar and a 4-bar fragment.
  const twoFrags = [[1, 0, 3, 80, 8, 30, 0, 60, 72, 2, 4, 50, 1, 'Lead', [[2, 1, 4, 50, 3, 0], [4, 9, 2, 50, 1, 2]]],
    [2, 33, 1, 40, 8, 20, 0, 30, 40, 1, 8, 100, 1, 'Bass', [[1, 1, 8, 100, 3, 0]]]];

  it('finds a part by any of its fragments, as that fragment', () => {
    const c = song(twoFrags);
    const [id] = c.query({ loop: 4 });
    expect(c.part(id)).toMatchObject({ part: 0, frag: 1, loopBars: 4, loopStart: 9, shape: 'rising', energy: 'busy' });
    expect(c.query({ energy: 'sparse' }).map((i) => c.part(i).frag)).toEqual([0, 0]);
    expect(c.query({ shape: 'rising', energy: 'sparse' })).toEqual([]);   // both in the same fragment
  });

  it('keeps the plain part index for a first fragment, and lists the fragments of a part', () => {
    const c = song(twoFrags);
    expect(c.query({ loop: 2 })).toEqual([0]);
    expect(c.fragmentIds(0).map((id) => c.part(id).loopBars)).toEqual([2, 4]);
    expect(c.fragmentIds(1)).toEqual([1]);
  });

  it('goes through the fragments of a part and back to its first', () => {
    const c = song(twoFrags);
    const [a, b] = c.fragmentIds(0);
    expect(c.nextFragment(a)).toBe(b);
    expect(c.nextFragment(b)).toBe(a);
    expect(c.nextFragment(1)).toBe(1);   // only one
  });

  it('finds the fragment beside another by where it plays, not by its number', () => {
    const c = song([[1, 0, 3, 80, 8, 30, 0, 60, 72, 2, 4, 50, 1, 'Lead', [
      [2, 9, 4, 50, 0, 0, '', 1000, 100], [2, 1, 2, 50, 0, 0, '', 0, 100], [2, 5, 1, 50, 0, 0, '', 500, 100],
    ]]]);
    const [late, early, middle] = c.fragmentIds(0);
    expect(c.sideFragment(early, 1)).toBe(middle);
    expect(c.sideFragment(middle, 1)).toBe(late);
    expect(c.sideFragment(middle, -1)).toBe(early);
    expect(c.fragmentsInSong(0)).toEqual([early, middle, late]);
    expect(c.nextFragment(early)).toBe(middle);
    expect(c.nextFragment(middle)).toBe(late);
    expect(c.nextFragment(late)).toBe(early);     // round to the first
    expect(c.sideFragment(late, 1)).toBe(null);   // the end of the song
    expect(c.sideFragment(early, -1)).toBe(null);
  });

  it('still reads tuples with no fragments', () => {
    const c = song([[1, 0, 3, 80, 8, 30, 0, 60, 72, 2, 4, 50, 1, 'Lead']]);
    expect(c.part(0)).toMatchObject({ loopBars: 2, loopStart: 1, shape: '', energy: 'sparse' });
  });
});

describe('scanner', () => {
  it('walks folders for .mid and .midi files, and reports unreadable ones', async () => {
    const r = await findMidiFiles(gui, 'D:\\midi');
    expect(r.files.map((f) => f.name)).toEqual(['song.mid', 'other.MIDI']);
    expect(r.folders).toBe(3);
    expect(r.errors).toEqual([{ path: 'D:\\midi\\Locked', code: 'uasrv.filesystem_error' }]);
    const rows = fileRows(r.files, 'D:\\midi\\');
    expect(rows.map((x) => [x.name, x.folder, x.dir])).toEqual([['song.mid', '', 'D:\\midi'], ['other.MIDI', 'A', 'D:\\midi\\A']]);
    expect(fitStart('D:\\midi\\_MIDI Database\\Trance', 18)).toBe('…I Database\\Trance');   // 18 characters
    expect(fitStart('D:\\midi', 18)).toBe('D:\\midi');
    expect(filterRows(rows, 'a OTHER').map((x) => x.name)).toEqual(['other.MIDI']);
  });

  it('retries a folder after a dropped connection', async () => {
    let drops = 1;
    const flaky = { listFiles: async (p) => { if (p === 'D:\\midi\\A' && drops-- > 0) throw Object.assign(new Error('gone'), { code: 'disconnected' }); return gui.listFiles(p); } };
    const r = await findMidiFiles(flaky, 'D:\\midi', { retry: async (e) => e.code === 'disconnected' });
    expect(r.files).toHaveLength(2);
    expect(r.errors).toHaveLength(1);
  });
});

describe('reader', () => {
  const missing = () => Object.assign(new Error('missing'), { name: 'NotFoundError' });
  const folder = (name, children) => ({
    name,
    async getDirectoryHandle(key) {
      if (!children[key]?.getDirectoryHandle) throw missing();
      return children[key];
    },
    async getFileHandle(key) {
      if (!(children[key] instanceof Uint8Array)) throw missing();
      return { getFile: async () => ({ arrayBuffer: async () => children[key].buffer }) };
    },
  });

  it('builds file URLs Windows paths can be fetched with', () => {
    expect(fileUrl('D:\\midi\\_MIDI Database\\Trance\\All_Around.mid')).toBe('file:///D:/midi/_MIDI%20Database/Trance/All_Around.mid');
  });

  it('uses file:// when it works, the helper server when not, and says when neither does', async () => {
    const ok = (bytes) => ({ ok: true, arrayBuffer: async () => bytes.buffer });
    const viaFile = createReader({ fetchImpl: async () => ok(new Uint8Array([1, 2])) });
    expect([...(await viaFile.read('D:\\a.mid'))]).toEqual([1, 2]);
    expect(viaFile.access).toBe('file');

    const viaServer = createReader({ fetchImpl: async (url) => { if (url.startsWith('file:')) throw new TypeError('blocked'); return ok(new Uint8Array([3])); } });
    expect([...(await viaServer.read('D:\\a.mid'))]).toEqual([3]);
    expect(viaServer.access).toBe('server');

    const none = createReader({ fetchImpl: async () => { throw new TypeError('blocked'); } });
    await expect(none.read('D:\\a.mid')).rejects.toBeInstanceOf(NoAccess);
    expect(none.usable).toBe(false);

    // file:// works, one file does not (an accented name LUNA gave as "?"): only that one fails.
    const one = createReader({ fetchImpl: async (url) => { if (url.includes('%3F') || url.startsWith('http')) throw new TypeError('not found'); return ok(new Uint8Array([4])); } });
    await one.read('D:\\a.mid');
    const err = await one.read('D:\\Alb?niz\\b.mid').catch((e) => e);
    expect(err).not.toBeInstanceOf(NoAccess);
    expect(err.message).toContain('accent');
    expect([one.access, one.usable]).toEqual(['file', true]);
    expect([...(await one.read('D:\\c.mid'))]).toEqual([4]);   // the next one reads as before
  });

  it('reads nested library files via a granted handle, even after falling back to the server', async () => {
    const calls = [];
    const handle = folder('midi', { A: folder('A', { 'song.mid': new Uint8Array([5, 6]) }) });
    const reader = createReader({ fetchImpl: async (url) => {
      calls.push(url);
      if (url.startsWith('file:')) throw new TypeError('blocked');
      return { ok: true, arrayBuffer: async () => new Uint8Array([3]).buffer };
    } });
    await reader.read('D:\\external.sf2');
    reader.setDirectory('D:\\midi', handle, 'granted');
    expect([...(await reader.read('D:\\midi\\A\\song.mid'))]).toEqual([5, 6]);
    expect([...(await reader.read('D:\\midi-other\\song.mid'))]).toEqual([3]);
    expect(calls).toHaveLength(3);
    await expect(reader.read('D:\\midi\\missing.mid')).rejects.toThrow('Cannot find');
  });

  it('checks root boundaries and refuses traversal', () => {
    expect(relativeParts('D:\\MIDI\\', 'd:\\midi\\A\\song.mid')).toEqual(['A', 'song.mid']);
    expect(relativeParts('D:\\midi', 'D:\\midi-other\\song.mid')).toBeNull();
    expect(() => relativeParts('D:\\midi', 'D:\\midi\\..\\secret.mid')).toThrow('Invalid path');
    expect(relativeParts('/midi', '/MIDI/song.mid')).toBeNull();
  });

  it('checks the folder name and saved fingerprints before associating a handle', async () => {
    const bytes = new Uint8Array([1, 2]);
    const handle = folder('midi', { A: folder('A', { 'song.mid': bytes }) });
    const sample = { path: 'D:\\midi\\A\\song.mid', fp: fingerprint(bytes) };
    expect(await verifyDirectory('D:\\midi', handle, [sample], fingerprint)).toEqual({ matched: 1, changed: 0 });
    await expect(verifyDirectory('D:\\other', handle, [], fingerprint)).rejects.toThrow('does not match');
    await expect(verifyDirectory('D:\\midi', handle, [{ ...sample, fp: 'wrong' }], fingerprint)).rejects.toThrow('does not match the saved analysis');
    await expect(verifyDirectory('D:\\midi', handle, [{ ...sample, path: 'D:\\midi\\missing.mid' }], fingerprint)).rejects.toThrow('does not match the saved analysis');
    expect(await verifyDirectory('D:\\midi', handle, [], fingerprint)).toEqual({ matched: 0, changed: 0 });
  });

  it('retries after permission is granted and reports a later permission loss', async () => {
    const handle = folder('midi', { 'song.mid': new Uint8Array([7]) });
    const reader = createReader({ fetchImpl: async () => { throw new TypeError('blocked'); } });
    reader.setDirectory('D:\\midi', handle, 'prompt');
    await expect(reader.read('D:\\midi\\song.mid')).rejects.toBeInstanceOf(NoAccess);
    expect(reader.usable).toBe(false);
    reader.setDirectory('D:\\midi', handle, 'granted');
    expect(reader.usable).toBe(true);
    expect([...(await reader.read('D:\\midi\\song.mid'))]).toEqual([7]);
    handle.getFileHandle = async () => { throw Object.assign(new Error('denied'), { name: 'NotAllowedError' }); };
    await expect(reader.read('D:\\midi\\song.mid')).rejects.toThrow('grant it again');
    expect(reader.directory.permission).toBe('prompt');
  });
});

// Two files: a drum loop at 120 BPM in 4/4, and a bass line at 90 BPM.
const drumLoop = () => {
  const notes = [];
  for (let b = 0; b < 8; b++) notes.push([b * 384, 36, 24], [b * 384 + 96, 38, 24], [b * 384 + 192, 36, 24], [b * 384 + 288, 38, 24]);
  return smf(0, 96, [noteEvents(9, notes)]);
};
const bassLine = () => smf(0, 96, [[[0, 0xff, 0x51, 3, 0x0a, 0x2c, 0x2a], [0, 0xc0, 33], ...noteEvents(0, [[0, 40, 96], [96, 43, 96], [192, 45, 96]])]]);

describe('catalog', () => {
  const catalog = new Catalog();
  catalog.addFile(fileRecord('D:\\midi\\Rock\\beat.mid', parseMidi(drumLoop())));
  catalog.addFile(fileRecord('D:\\midi\\Jazz\\walk.mid', parseMidi(bassLine())));
  catalog.addFile({ path: 'D:\\midi\\bad.mid', ok: false });

  it('keeps files and parts', () => {
    expect(catalog.stats()).toEqual({ files: 3, ok: 2, bad: 1, parts: 2 });
    expect(catalog.file('D:\\midi\\Jazz\\walk.mid')).toMatchObject({ ok: true, bpm: 90, partCount: 1 });
    expect(catalog.part(0)).toMatchObject({ role: 'drums', instrument: 'Drums', ch: 10, loopBars: 1, loopCount: 8, loopStart: 1 });
  });

  it('searches by role, family, tempo, text and loops', () => {
    const names = (q) => catalog.query(q).map((i) => catalog.part(i).path.split('\\').pop());
    expect(names({ role: 'bass' })).toEqual(['walk.mid']);
    expect(names({ family: '4' })).toEqual(['walk.mid']);     // Bajos
    expect(names({ bpmMin: 100 })).toEqual(['beat.mid']);
    expect(names({ text: 'rock' })).toEqual(['beat.mid']);
    expect(names({ text: 'fingered' })).toEqual(['walk.mid']);
    expect(names({ loop: 'any' })).toEqual(['beat.mid']);
    expect(names({ loop: '2' })).toEqual([]);
    expect(names({ ts: '4/4', minBars: 4 })).toEqual(['beat.mid']);
  });

  it('searches snare-roll fragments, in Spanish and English; Parts reads the same text, a row per part', () => {
    const c = new Catalog();
    const fragment = (starts, start) => [2, start, 1, 100, 0, 1, '', 0, 768, '', 100, 0, null, null, 0,
      new Uint32Array(starts.flatMap((tick) => [tick, 12, 38 | (100 << 8)]))];
    const makePart = (name, starts) => [
      10, 0, 0, starts.length, 2, 0, 0, 35, 50, 2, 1, 100, 1, name,
      [fragment(starts, 1)],
    ];
    const fast = makePart('Fast snare', [0, 24, 48, 72, 96, 120]);
    fast[14].push(fragment([0, 48, 96, 144], 5));
    c.addFile({
      path: 'D:\\midi\\Artist\\kit.mid', v: 23, ok: true, ppq: 96, bpm: 120, ts: '4/4', key: '',
      parts: [fast, makePart('Loose snare', [0, 48, 96, 144])],
    });
    // Parts: each part once, on its first fragment with the gesture; the same with the gesture chosen.
    expect(c.query({ text: 'redoble de caja' }).map((id) => c.part(id).name)).toEqual(['Fast snare', 'Loose snare']);
    expect(c.query({ gesture: 'snare-roll' })).toEqual(c.query({ text: 'redoble de caja' }));
    expect(c.query({ text: 'redoble de caja loose' }).map((id) => c.part(id).name)).toEqual(['Loose snare']);
    const results = (text) => c.searchGesture(text).map((id) => c.part(id).name);
    expect(results('REDÓBLE de caja')).toEqual(['Fast snare', 'Fast snare', 'Loose snare']);
    expect(results('snare drum roll artist')).toEqual(['Fast snare', 'Fast snare', 'Loose snare']);
    expect(results('snare roll missing')).toEqual([]);
  });

  it('defers gesture scores until a scored analysis is restored', () => {
    const info = parseMidi(drumLoop());
    const basic = fileRecord('D:\\midi\\beat.mid', info, { includeSearchScores: false });
    const scored = () => fileRecord('D:\\midi\\beat.mid', info, { includeSearchScores: true });
    const fragment = (record) => record.parts[0][PART.frags][0];
    expect(basic.searchScores).toBe(false);
    expect(fragment(basic)[FRAG.events]).toBeNull();
    expect(fragment(scored())[FRAG.events]).toBeInstanceOf(Uint32Array);

    const expected = new Catalog();
    const prepared = compactSearchScores(scored());
    expect(fragment(prepared)[FRAG.events]).toBeNull();
    expect(prepared.searchScores).toBe(true);
    const searchOnly = compactSearchScores(fileRecord('D:\\midi\\beat.mid', info, { includePlaybackEvents: false }));
    expect(fragment(searchOnly)[FRAG.controls]).toBeUndefined();
    expect(fragment(searchOnly)[FRAG.tempo]).toBeUndefined();
    expect(fragment(searchOnly)[FRAG.scoreSnareRoll]).toBe(fragment(prepared)[FRAG.scoreSnareRoll]);
    expect(fragment(searchOnly)[FRAG.gestureScores]).toBe(fragment(prepared)[FRAG.gestureScores]);
    expected.addFile(prepared);
    const catalog = new Catalog();
    catalog.addFile(basic);
    expect(catalog.searchScoreStats(['D:\\midi\\beat.mid'])).toMatchObject({ analysed: 1, ready: 0 });
    expect(catalog.gestureScore(catalog.query({ role: 'drums' })[0], 'kick')).toBeNull();
    catalog.addFile(scored());
    expect(catalog.searchScoreStats(['D:\\midi\\beat.mid'])).toMatchObject({ analysed: 1, ready: 1 });
    expect(catalog.searchGesture('kick')).toEqual(expected.searchGesture('kick'));
  });

  it('searches GM drum sounds and rhythm patterns as separate drum fragments', () => {
    const c = new Catalog();
    const fragment = (events) => [2, 1, 1, 100, 0, 1, '', 0, 768, '', 100, 0, null, null, 0,
      new Uint32Array(events.flatMap(([tick, pitch]) => [tick, 12, pitch | (100 << 8)]))];
    const part = (name, events) => [
      10, 0, 0, events.length, 2, 0, 0, 35, 50, 2, 1, 100, 1, name, [fragment(events)],
    ];
    c.addFile({
      path: 'D:\\midi\\Rock\\drum-kit.mid', v: 23, ok: true, ppq: 96, bpm: 120, ts: '4/4', key: '',
      parts: [
        part('Four floor', [[0, 36], [96, 36], [192, 36], [288, 36], [96, 38], [288, 38]]),
        part('Tom fill', [[0, 45], [24, 47], [48, 48], [72, 50]]),
      ],
    });
    const names = (text) => c.searchGesture(text).map((id) => c.part(id).name);
    expect(names('bombo')).toEqual(['Four floor']);
    expect(names('four on the floor')).toEqual(['Four floor']);
    expect(names('caja en 2 y 4')).toEqual(['Four floor']);
    expect(names('tom fill')).toEqual(['Tom fill']);
    expect(c.query({ text: 'four on the floor' }).map((id) => c.part(id).name)).toEqual(['Four floor']);
    expect(c.query({ gesture: 'tom-fill' }).map((id) => c.part(id).name)).toEqual(['Tom fill']);
  });

  it('searches arpeggios across instruments and applies optional instrument filters', () => {
    const c = new Catalog();
    const arpFragment = () => [2, 1, 1, 100, 0, 1, '', 0, 768, '', 100, 0, null, null, 0,
      new Uint32Array([[0, 60], [24, 64], [48, 67], [72, 72]].flatMap(([tick, pitch]) => [tick, 48, pitch | (100 << 8)]))];
    const makePart = (program, name) => [
      1, program, 3, 4, 2, 0, 0, 60, 72, 2, 1, 100, 1, name, [arpFragment()],
    ];
    c.addFile({
      path: 'D:\\midi\\Artist\\arpeggios.mid', v: 23, ok: true, ppq: 96, bpm: 120, ts: '4/4', key: '',
      parts: [makePart(0, 'Keys'), makePart(24, 'Electric Guitar')],
    });
    const names = (text) => c.searchGesture(text).map((id) => c.part(id).name);
    expect(names('arpegio')).toEqual(['Keys', 'Electric Guitar']);
    expect(names('arpeggio piano')).toEqual(['Keys']);
    expect(names('arpegio de guitarra')).toEqual(['Electric Guitar']);
  });

  it('browses every fragment without gesture scores and combines viewer-style filters', () => {
    const c = new Catalog();
    const frag = (bars, start, count, energy, at) => [bars, start, count, 80, 0, energy, '', at, bars * 384];
    c.addFile({
      path: 'D:\\midi\\Canción.mid', v: 23, ok: true, bpm: 120, ts: '4/4', key: 'C mayor', searchScores: false,
      parts: [[1, 0, 3, 10, 4, 20, 0, 60, 72, 1, 1, 80, 1, 'Piano', [frag(1, 1, 1, 0, 0), frag(2, 2, 3, 2, 384)]]],
    });
    c.addFile({
      path: 'D:\\midi\\drums.mid', v: 23, ok: true, bpm: 90, ts: '3/4', key: 'D menor', searchScores: false,
      parts: [[10, 0, 0, 10, 4, 40, 0, 36, 38, 1, 1, 80, 1, 'Kit', [frag(1, 1, 2, 1, 0)]]],
    });
    expect(c.searchFragments()).toHaveLength(3);
    expect(c.searchFragments({ paths: new Set(['D:\\midi\\drums.mid']) }).map((id) => c.part(id).path)).toEqual(['D:\\midi\\drums.mid']);
    expect(c.searchFragments({ paths: new Set() })).toEqual([]);
    expect(c.searchFragments({ text: 'cancion', family: '0' }).map((id) => c.part(id).loopStart)).toEqual([1, 2]);
    expect(c.searchFragments({ role: 'melody', bars: 2, energy: 'busy', repeats: true, ts: '4/4', key: 'C mayor', bpmMin: 110, bpmMax: 130 }).map((id) => c.part(id).loopStart)).toEqual([2]);
    expect(c.searchFragments({ role: 'drums', bpmMax: 100 })).toHaveLength(1);
    expect(c.searchFragments({ gesture: 'kick' })).toEqual([]);
    expect(c.searchFragments({ sort: 'bars' }).map((id) => c.part(id).loopBars)).toEqual([2, 1, 1]);
  });

  it('applies a gesture to individual fragments while keeping ordinary text filters', () => {
    const c = new Catalog();
    const events = new Uint32Array([0, 12, 36 | (100 << 8), 96, 12, 36 | (100 << 8)]);
    const fragment = [1, 1, 2, 100, 0, 1, '', 0, 384, '', 100, 0, null, null, 0, events];
    c.addFile({ path: 'D:\\midi\\Rock\\beat.mid', v: 23, ok: true, ppq: 96, bpm: 120, ts: '4/4', key: '', parts: [[10, 0, 0, 2, 1, 20, 0, 36, 36, 1, 2, 100, 1, 'Kit', [fragment]]] });
    expect(c.searchFragments({ gesture: 'kick', text: 'rock' })).toHaveLength(1);
    expect(c.searchFragments({ text: 'bombo rock' })).toHaveLength(1);
    expect(c.searchFragments({ gesture: 'snare', text: 'rock' })).toHaveLength(0);
    expect(c.searchFragments({ gesture: 'kick', text: 'other' })).toHaveLength(0);
  });

  it('takes title and author from a newer record of a file it holds, and searches them', () => {
    const c = new Catalog();
    const rec = fileRecord('D:\\midi\\x.mid', parseMidi(drumLoop()));
    c.addFile({ ...rec, v: 1, title: undefined, author: undefined });
    expect(c.current('D:\\midi\\x.mid')).toBe(false);
    c.addFile({ ...rec, title: 'Penny Lane', author: 'Sequenced by Eleanor' });
    expect(c.current('D:\\midi\\x.mid')).toBe(true);
    expect(c.stats().parts).toBe(1);   // the parts are not added twice
    expect(c.query({ text: 'penny' })).toHaveLength(1);
    const rows = fileRows([{ path: 'D:\\midi\\x.mid', name: 'x.mid' }, { path: 'D:\\midi\\y.mid', name: 'y.mid' }], 'D:\\midi');
    expect(filterRows(rows, 'eleanor x', (r) => c.metaText(r.path)).map((r) => r.name)).toEqual(['x.mid']);
  });

  it('grows past its first capacity', () => {
    const big = new Catalog();
    const rec = fileRecord('x', parseMidi(drumLoop()));
    for (let i = 0; i < 3000; i++) big.addFile({ ...rec, path: `D:\\f${i}.mid` });
    expect(big.size).toBe(3000);
    expect(big.query({ role: 'drums' })).toHaveLength(3000);
  });

  it('counts only the folder in use, and empties for another one', () => {
    const c = new Catalog();
    const rec = fileRecord('x', parseMidi(drumLoop()));
    c.addFile({ ...rec, path: 'D:\\old\\a.mid' });
    c.addFile({ ...rec, path: 'D:\\new\\b.mid' });
    expect(c.stats(['D:\\new\\b.mid', 'D:\\new\\c.mid'])).toMatchObject({ files: 1, parts: 1 });
    c.clear();
    expect(c.stats()).toMatchObject({ files: 0, parts: 0 });
    expect(c.query({})).toEqual([]);
    c.addFile({ ...rec, path: 'D:\\new\\b.mid' });
    expect(c.part(0).path).toBe('D:\\new\\b.mid');
  });
});

describe('indexer', () => {
  it('analyses what the catalogue lacks, saves it, and stops on no access', async () => {
    const options = [];
    const workerFactory = () => ({
      postMessage({ id, path, bytes, includeSearchScores }) {
        options.push(includeSearchScores);
        queueMicrotask(() => this.onmessage({ data: { id, record: { ...analyseFile(path, bytes, { includeSearchScores }), fp: 'test' } } }));
      },
      terminate() {},
    });
    const bytes = { 'D:\\a.mid': drumLoop(), 'D:\\b.mid': bassLine(), 'D:\\c.mid': new Uint8Array([60, 72, 84]) };
    const saved = [];
    const store = { putFiles: async (rows) => { saved.push(...rows); } };
    const catalog = new Catalog();
    const reader = { read: async (p) => bytes[p], usable: true };
    let stop;
    const indexer = new Indexer({ store, catalog, reader, workerFactory, onStop: (reason) => { stop = reason; } });
    await indexer.start(Object.keys(bytes));
    expect(stop).toBe('fin');
    expect(options).toEqual([true, true, true]);
    expect(catalog.stats()).toMatchObject({ files: 3, ok: 2, bad: 1 });
    expect(catalog.file('D:\\a.mid').searchScores).toBe(true);
    expect(saved.map((r) => r.path).sort()).toEqual(['D:\\a.mid', 'D:\\b.mid', 'D:\\c.mid']);

    const blocked = new Indexer({ store, catalog: new Catalog(), reader: { read: async () => { throw new NoAccess('no'); } }, workerFactory, onStop: (reason) => { stop = reason; } });
    await blocked.start(['D:\\a.mid']);
    expect(stop).toBe('no');
  });

  it('adds Search results as new and previously analysed files are processed', async () => {
    const bytes = drumLoop();
    const oldPath = 'D:\\old.mid', newPath = 'D:\\new.mid';
    const old = { ...fileRecord(oldPath, parseMidi(bytes), { includeSearchScores: false }), fp: fingerprint(bytes) };
    const catalog = new Catalog();
    catalog.addFile(old);
    const saved = [];
    const snapshots = [];
    const indexer = new Indexer({
      catalog,
      store: { putFiles: async (records) => saved.push(...records) },
      reader: { read: async (path) => {
        if (path === newPath) snapshots.push(catalog.searchGesture('kick').map((id) => catalog.part(id).path));
        return bytes.slice();
      } },
      workerFactory: () => ({
        postMessage({ id, path, bytes: input, includeSearchScores }) {
          queueMicrotask(() => this.onmessage({ data: { id, record: { ...analyseFile(path, input, { includeSearchScores }), fp: fingerprint(input) } } }));
        },
        terminate() {},
      }),
    });
    await indexer.start([oldPath, newPath]);
    expect(snapshots).toEqual([[oldPath]]);
    expect(catalog.searchGesture('kick').map((id) => catalog.part(id).path).sort()).toEqual([newPath, oldPath].sort());
    expect(saved).toHaveLength(2);
    expect(saved.every((record) => record.searchScores && record.parts[0][PART.frags][0][FRAG.events] === null)).toBe(true);
    expect(indexer.needsAnalysis(oldPath)).toBe(false);
  });

  it('keeps the existing analysis when a file changed or cannot be read', async () => {
    const bytes = drumLoop();
    const changed = 'D:\\changed.mid', unreadable = 'D:\\unreadable.mid';
    const catalog = new Catalog();
    for (const path of [changed, unreadable]) {
      catalog.addFile({ ...fileRecord(path, parseMidi(bytes), { includeSearchScores: false }), fp: 'old-fingerprint' });
    }
    const saved = [], warnings = [];
    const indexer = new Indexer({
      catalog,
      store: { putFiles: async (records) => saved.push(...records) },
      reader: { read: async (path) => {
        if (path === unreadable) throw new Error('File unavailable');
        return bytes.slice();
      } },
      workerFactory: () => ({
        postMessage({ id, path, bytes: input, includeSearchScores }) {
          queueMicrotask(() => this.onmessage({ data: { id, record: { ...analyseFile(path, input, { includeSearchScores }), fp: fingerprint(input) } } }));
        },
        terminate() {},
      }),
      onWarning: (warning) => warnings.push(warning),
    });
    await indexer.start([changed, unreadable]);
    expect(saved).toEqual([]);
    expect(warnings.map((w) => w.limited)).toEqual([
      expect.stringContaining('no longer matches'),
      expect.stringContaining('File unavailable'),
    ]);
    expect(catalog.stats()).toMatchObject({ files: 2, ok: 2 });
    expect(catalog.file(changed).searchScores).toBe(false);
    expect(catalog.file(unreadable).searchScores).toBe(false);
  });

  it('warns when upgrading an analysis without a fingerprint and checks fragment positions', async () => {
    const bytes = drumLoop();
    const same = 'D:\\same.mid', different = 'D:\\different.mid';
    const catalog = new Catalog();
    for (const path of [same, different]) {
      catalog.addFile(fileRecord(path, parseMidi(bytes), { includeSearchScores: false }));
    }
    const saved = [], warnings = [];
    const indexer = new Indexer({
      catalog,
      store: { putFiles: async (records) => saved.push(...records) },
      reader: { read: async (path) => path === same ? bytes.slice() : bassLine() },
      workerFactory: () => ({
        postMessage({ id, path, bytes: input, includeSearchScores }) {
          queueMicrotask(() => this.onmessage({ data: { id, record: { ...analyseFile(path, input, { includeSearchScores }), fp: fingerprint(input) } } }));
        },
        terminate() {},
      }),
      onWarning: (warning) => warnings.push(warning.limited),
    });
    await indexer.start([same, different]);
    expect(saved.map((record) => record.path)).toEqual([same]);
    expect(catalog.file(same).searchScores).toBe(true);
    expect(catalog.file(different).searchScores).toBe(false);
    expect(warnings).toEqual([expect.stringContaining('no fingerprint'), expect.stringContaining('no longer matches')]);
  });

  it('terminates in-flight analysis on pause and resumes it in a fresh worker', async () => {
    let workers = 0;
    let terminated = false;
    const workerFactory = () => {
      const run = ++workers;
      return {
        postMessage({ id, path, bytes }) {
          if (run === 1) return;
          queueMicrotask(() => this.onmessage({ data: { id, record: { ...analyseFile(path, bytes), fp: 'test' } } }));
        },
        terminate() { if (run === 1) terminated = true; },
      };
    };
    const catalog = new Catalog();
    const stopped = [];
    const indexer = new Indexer({
      store: { putFiles: async () => {} },
      catalog,
      reader: { read: async () => drumLoop() },
      workerFactory,
      onStop: (reason) => stopped.push(reason),
    });

    const firstRun = indexer.start(['D:\\a.mid']);
    await new Promise((resolve) => setTimeout(resolve, 0));
    indexer.pause();
    await firstRun;
    expect(terminated).toBe(true);
    expect(stopped).toEqual(['pausa']);
    expect(catalog.stats().files).toBe(0);

    await indexer.start(['D:\\a.mid']);
    expect(stopped).toEqual(['pausa', 'fin']);
    expect(catalog.file('D:\\a.mid')).toMatchObject({ ok: true, fp: 'test' });
  });

  it('processes one file at a time to keep analysis memory bounded', async () => {
    const workers = [];
    const workerFactory = () => {
      const worker = {
        messages: [],
        postMessage(message) {
          this.messages.push(message);
          queueMicrotask(() => this.onmessage({ data: { id: message.id, record: { ...analyseFile(message.path, message.bytes), fp: 'test' } } }));
        },
        terminate() { this.terminated = true; },
      };
      workers.push(worker);
      return worker;
    };
    const catalog = new Catalog();
    const stopped = [];
    const indexer = new Indexer({
      store: { putFiles: async () => {} },
      catalog,
      reader: { read: async () => drumLoop() },
      workerFactory,
      onStop: (reason) => stopped.push(reason),
    });

    await indexer.start(['D:\\a.mid', 'D:\\b.mid', 'D:\\c.mid', 'D:\\d.mid']);
    expect(workers).toHaveLength(1);
    expect(workers[0].messages.map(({ path }) => path)).toEqual(['D:\\a.mid', 'D:\\b.mid', 'D:\\c.mid', 'D:\\d.mid']);
    expect(catalog.stats()).toMatchObject({ files: 4, ok: 4 });
    expect(stopped).toEqual(['fin']);
  });

  it('restarts its worker periodically to release temporary analysis memory', async () => {
    const workers = [];
    const workerFactory = () => {
      const worker = {
        messages: [],
        postMessage(message) {
          this.messages.push(message);
          queueMicrotask(() => this.onmessage({ data: { id: message.id, record: { path: message.path, ok: true, v: 20, parts: [], fp: 'test' } } }));
        },
        terminate() { this.terminated = true; },
      };
      workers.push(worker);
      return worker;
    };
    const paths = Array.from({ length: 205 }, (_, i) => `D:\\${i}.mid`);
    const catalog = new Catalog();
    const indexer = new Indexer({
      store: { putFiles: async () => {} },
      catalog,
      reader: { read: async () => new Uint8Array() },
      workerFactory,
    });

    await indexer.start(paths);
    expect(workers.map((worker) => worker.messages.length)).toEqual([100, 100, 5]);
    expect(workers.map((worker) => worker.terminated)).toEqual([true, true, undefined]);
    expect(catalog.stats()).toMatchObject({ files: 205, ok: 205 });
  });

  it('drops what was being read when the library is replaced', async () => {
    const catalog = new Catalog();
    let release;
    const reader = { read: () => new Promise((r) => { release = () => r(drumLoop()); }) };
    const indexer = new Indexer({ store: { putFiles: async () => {} }, catalog, reader });
    const late = indexer.analyseOne('D:\\old\\a.mid');
    indexer.reset();
    release();
    await late;
    expect(catalog.stats().files).toBe(0);
  });
});

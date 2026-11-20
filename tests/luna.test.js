// LUNA side, against Luna.MockEngine: no LUNA needed.
import { describe, expect, it } from 'vitest';
import { addParts, addStems, placedNotes, partName, waitForTrack, tableRow, SEND_HEAD, channelWhat, programAt } from '../src/luna/bridge.js';
import { parseMidi } from '../src/midi/parser.js';
import { smf, noteEvents } from './smf.js';

async function connected() {
  const engine = new Luna.MockEngine();
  engine.addSession('abc', { name: 'Demo', tracks: ['Vocal'] });
  await engine.settled();
  const luna = await Luna.connect({ port_: engine.port() });
  const session = await luna.session();
  return { engine, luna, session };
}

// A bass part, one note per bar for 4 bars, GM 33, at 96 PPQ.
const bass = parseMidi(smf(0, 96, [[[0, 0xc1, 33], ...noteEvents(1, [[0, 40, 96], [384, 43, 96], [768, 45, 96], [1152, 47, 96]])]]));
const silentLog = { ok() {}, warn() {}, log() {} };

describe('instrument names', () => {
  it('names a channel by the instrument where its loop starts, the one heard there', () => {
    // Channel 2: Clean Guitar (27) for a bar, then Overdriven Guitar (29) from bar 2 (tick 384).
    const [on1, off1, on2, off2] = noteEvents(1, [[0, 52, 96], [384, 52, 96]]);
    const song = parseMidi(smf(0, 96, [[[0, 0xc1, 27], on1, off1, [287, 0xc1, 29], [1, ...on2.slice(1)], off2]]));
    expect([channelWhat(song, 2), channelWhat(song, 2, 384)]).toEqual(['Clean Guitar', 'Overdriven Guitar']);
    expect(programAt(song, 2, 383)).toBe(29);   // set at 383: it counts from there
    expect(programAt(song, 2, 382)).toBe(27);
  });
});

describe('bridge', () => {
  it('logs what goes to LUNA as a table: every column starts at the same place', () => {
    const rows = [SEND_HEAD, tableRow(['Fretless Bass', '21-25', 'audio', '8.0 s, loops']), tableRow(['A Very Long Instrument Name Indeed', '11-27', 'MIDI', '120 notes'])];
    const starts = (r) => [r.indexOf('21-25') >= 0 ? r.indexOf('21-25') : r.indexOf('Bars') >= 0 ? r.indexOf('Bars') : r.indexOf('11-27')];
    expect(new Set(rows.map((r) => starts(r)[0])).size).toBe(1);   // the Bars column lines up
    expect(rows[2]).toContain('…');   // a long name is cut, not pushing the columns
    expect(rows[1].indexOf('audio')).toBe(rows[0].indexOf('Type'));
  });

  it('places a region repeated', () => {
    // Bars 2-3 (ticks 384-1152), twice.
    const { notes } = placedNotes(bass, 'ch:2', { startTick: 384, endTick: 1152, repeat: 2 });
    expect(notes.map((n) => [n.pitch, n.start])).toEqual([[43, 0], [45, 384], [43, 768], [45, 1152]]);
    expect(placedNotes(bass, 'ch:2', null).notes).toHaveLength(4);
  });

  it('names tracks after the file, the instrument and the region', () => {
    const { part } = placedNotes(bass, 'ch:2', null);
    expect(partName('D:\\midi\\Funk\\groove.mid', bass, 'ch:2', part, { startTick: 384, endTick: 1152, repeat: 4, label: '2-4' })).toBe('groove · Fingered Bass · bars 2-4 ×4');
  });

  it('finds a new track once the engine lists it', async () => {
    const { session, luna } = await connected();
    await session.newTrack({ name: 'Prueba GM', trackType: 'instrument', stemFormat: 'stereo' });
    const track = await waitForTrack(session, (t) => t.name.value === 'Prueba GM', 'new track');
    expect(track.name.value).toBe('Prueba GM');
    await luna.close();
  });

  it('cuts a stem in a clip per pad, one source for all, from its first sound', async () => {
    const { session, luna } = await connected();
    const placed = [];
    session.uploadFile = async () => ({ id: 'new', name: { value: 'stem' } });
    session.insertClip = async (clip) => { placed.push(clip); };
    // At 96 ticks a beat: the audio starts on tick 96, 1 s a bar, with a tail to tick 1248.
    const render = async () => ({ wav: new Uint8Array(1), clipStartTicks: 96, clipEndTicks: 1248, clipSeconds: 1152 / 384 });
    const spans = [{ startTick: 0, endTick: 384 }, { startTick: 768, endTick: 1152 }];
    await addStems(session, bass, 'Loop', [2], { at: 0, spansOf: () => spans, render, log: silentLog });
    const B = Luna.TICKS_PER_BEAT;
    expect(placed.map((c) => [c.startTick, c.stopTick])).toEqual([[B, 4 * B], [8 * B, 12 * B]]);
    expect(placed.map((c) => [c.sourceStartNs, c.sourceStopNs])).toEqual([[0, 0.75e9], [1.75e9, 2.75e9]]);
    expect(new Set(placed.map((c) => c.sourceUid))).toEqual(new Set(['new']));
    await luna.close();
  });

  it('cuts a part by pad, the notes of the silence left out', async () => {
    const { session, luna } = await connected();
    const at = session.musical.timeline.tickAt({ bar: 1 });
    const spans = [{ startTick: 0, endTick: 384 }, { startTick: 768, endTick: 1152 }];
    const [track] = await addParts(session, bass, 'D:\\midi\\groove.mid', ['ch:2'], { at, spansOf: () => spans, log: silentLog });
    await session.playlists.load();
    const lane = session.playlistFor(track);
    await lane.clips.load();
    // The mock writes on the first MIDI clip of a lane, so here it is one: the notes are what is checked.
    const { midi } = lane.clips.items[0];
    await midi.ready();
    expect(midi.notes.items.map((n) => n.pitch)).toEqual([40, 45]);
    await luna.close();
  });

  it('adds a part as a new instrument track with its notes', async () => {
    const { session, luna } = await connected();
    const at = session.musical.timeline.tickAt({ bar: 1 });
    const made = await addParts(session, bass, 'D:\\midi\\groove.mid', ['ch:2'], { at, range: { startTick: 0, endTick: 768, repeat: 2, label: '1-3' }, log: silentLog });
    expect(made).toHaveLength(1);
    expect(made[0].name.value).toBe('groove · Fingered Bass · bars 1-3 ×2');
    await session.playlists.load();
    const clip = session.playlistFor(made[0]).clips.items[0];
    await clip.midi.ready();
    expect(clip.midi.notes.items.map((n) => n.pitch)).toEqual([40, 43, 40, 43]);
    await luna.close();
  });
});

// Everything that talks to LUNA: a part's notes or its audio (whole or a region) on new tracks
// or on the track selected in LUNA.
// `Luna` is the global from vendor/luna.global.js.

import { GM_PROGRAMS } from '../midi/gm.js';
import { extractNotes, sliceTicks } from '../midi/parts.js';
import { baseName } from '../library/scanner.js';

/** Find a track, re-reading the track list until it shows up. */
export async function waitForTrack(session, match, what) {
  let found;
  await Luna.settle(() => (found = session.tracks.items.find(match)) !== undefined, what, {
    refresh: () => session.tracks.reload(),
    timeoutMs: 8000,
  });
  await session.tracks.membersReady();
  return found;
}

/** Make an instrument track and wait for it and its playlist. */
export async function newInstrumentTrack(session, name) {
  const before = new Set(session.tracks.items.map((t) => t.id));
  const reply = await session.newTrack({ name, trackType: 'instrument', stemFormat: 'stereo', makeNameUnique: true });
  const uid = reply?.track_uid ?? reply?.uid;
  const track = await waitForTrack(session, (t) => t.id === uid || !before.has(t.id), `track ${name}`);
  let lane;
  await Luna.settle(() => (lane = session.playlistFor(track)) !== undefined, `playlist ${name}`, { refresh: () => session.playlists.reload() });
  await lane.clips.load();
  return { track, lane };
}

/** What a part is called: its track's name, or its instrument ("Fingered Bass", "Drums"). */
function partWhat(info, pick, part) {
  const [kind, n] = pick.split(':');
  if (kind === 'tr' && info.tracks[Number(n) - 1]?.name) return info.tracks[Number(n) - 1].name;
  if (part.drums) return 'Drums';
  return part.program === undefined ? 'Piano' : GM_PROGRAMS[part.program];
}

/**
 * A channel's GM program where `tick` is, as a loop from there sounds (the last Program Change
 * up to and including it, as lanesSong sets it up; before any, its first). Undefined: none.
 */
export function programAt(info, ch, tick = 0) {
  let program = extractNotes(info, `ch:${ch}`).program;
  for (const e of info.events) {
    if (e.tick > tick) break;
    if (e.type === 'pc' && e.ch === ch - 1) program = e.a;
  }
  return program;
}

/** A channel's instrument where `tick` is, as its LUNA tracks are named: "Drums", "Fingered Bass". */
export function channelWhat(info, ch, tick = 0) {
  if (extractNotes(info, `ch:${ch}`).drums) return 'Drums';
  const program = programAt(info, ch, tick);
  return program === undefined ? 'Piano' : GM_PROGRAMS[program];
}

/** "Tainted_Love · Fingered Bass · bars 9-12.3 ×4" */
export function partName(path, info, pick, part, range) {
  const base = baseName(path).replace(/\.midi?$/i, '');
  const bars = range ? ` · bars ${range.label}${range.repeat > 1 ? ` ×${range.repeat}` : ''}` : '';
  return `${base} · ${partWhat(info, pick, part)}${bars}`;
}

// What goes to LUNA is logged as a table (the log is monospaced): a row per track under
// SEND_HEAD, so the columns read at a glance.
const COLUMNS = [26, 15, 6];   // Track, Bars, Type; Result takes the rest

/** One row of the send table (or of another, with its `widths`); a cell too long for its column is cut with "…". */
export function tableRow(cells, widths = COLUMNS) {
  return cells.map((c, k) => {
    const s = String(c);
    if (k >= widths.length) return s;
    return (s.length >= widths[k] ? `${s.slice(0, widths[k] - 2)}…` : s).padEnd(widths[k]);
  }).join('');
}

export const SEND_HEAD = tableRow(['Track', 'Bars', 'Type', 'Result']);

const barsCell = (range) => (range ? range.label : 'whole');

/**
 * Notes for LUNA from one part: the whole part, or the region [startTick, endTick) repeated
 * `repeat` times, in MIDI ticks from the start of what is placed.
 */
export function placedNotes(info, pick, range) {
  const part = extractNotes(info, pick);
  if (!range) return { part, notes: part.notes, offset: 0 };
  const slice = sliceTicks(info, part.notes, range.startTick, range.endTick);
  const notes = [];
  for (let r = 0; r < Math.max(1, range.repeat); r++) {
    for (const n of slice.notes) notes.push({ ...n, start: n.start + r * slice.lengthTicks, stop: n.stop + r * slice.lengthTicks });
  }
  return { part, notes, offset: 0 };
}

/**
 * Each pick ("ch:N" or "tr:N") becomes a new instrument track holding its notes, with the
 * part's Program Change at the clip start. `at` is a LUNA tick; `range` optional. `spansOf(pick)`,
 * when given, cuts it in a clip per span ({ startTick, endTick }): what starts there, stopping at its end.
 * `tracks` (a Map kept by the caller), when given: a pick goes on the track it went on last time
 * (same channel, same instrument) while that track is still in the session, and is noted there.
 */
export async function addParts(session, info, path, picks, { at, range = null, transpose = 0, spansOf = null, tracks = null, log }) {
  const B = Luna.TICKS_PER_BEAT;
  const toLuna = (t) => Math.round(at + (t / info.ppq) * B);
  const made = [];
  const bounded = { warned: false };   // a clip LUNA would not trim: said once
  for (const pick of picks) {
    const { part, notes } = placedNotes(info, pick, range);
    if (!notes.length) { log.warn(`${pick}: no notes${range ? ' in those bars' : ''}.`); continue; }
    const name = partName(path, info, pick, part, range);
    const key = `midi|${pick}|${partWhat(info, pick, part)}`;
    const again = tracks && trackById(session, tracks.get(key));
    const { track, lane } = again ? { track: again, lane: await playlistOf(session, again, name) } : await newInstrumentTrack(session, name);
    tracks?.set(key, track.id);
    const shift = part.drums ? 0 : transpose;   // a part borrowed in another key; drums never
    // Each clip with its bounds: its span, or all of what goes (from the range's start, or the
    // song's). LUNA makes a clip from its first note to its last; it is then set to these, so it
    // sits on its bar lines, silence and all, as the audio's do, and moves in LUNA bar by bar.
    const whole = range ? (range.endTick - range.startTick) * Math.max(1, range.repeat) : Math.max(...notes.map((n) => n.stop));
    const clips = !spansOf ? [{ held: notes, from: 0, to: whole }] : spansOf(pick)
      .map((s) => ({ held: notes.filter((n) => n.start >= s.startTick && n.start < s.endTick).map((n) => ({ ...n, stop: Math.min(n.stop, s.endTick) })), from: s.startTick, to: s.endTick }))
      .filter((c) => c.held.length);
    for (const { held, from, to } of clips) {
      const { clip } = await lane.createNotes(held.map((n) => ({
        pitch: Math.max(0, Math.min(127, n.pitch + shift)),
        startTick: toLuna(n.start),
        stopTick: Math.max(toLuna(n.stop), toLuna(n.start) + 1),
        velocity: Math.max(1, Math.min(127, n.velocity)),
      })));
      // Not tried again once LUNA has refused one: each refusal waits a few seconds to be sure.
      if (!bounded.warned) {
        try {
          await clip.trim(toLuna(from), toLuna(to), {});
        } catch (e) {
          log.warn(`  LUNA did not take the MIDI clips' bounds (${e.code ?? e.message}): they start at their first note.`);
          bounded.warned = true;
        }
      }
      // At the clip's start, now its bar line.
      if (part.program !== undefined && !part.drums) await clip.addMidi([{ tick: 0, status: 0xc0, data1: part.program, data2: 0 }]);
    }
    log.ok(tableRow([partWhat(info, pick, part), barsCell(range), 'MIDI', `${notes.length} notes${spansOf ? `, ${clips.length} clips` : ''}${part.program !== undefined && !part.drums ? `, program ${part.program}` : ''}`]));
    if (part.drums) log.warn('  Drums: the notes go to channel 1. If the track’s instrument plays them as a melody, choose its drum kit.');
    made.push(track);
  }
  return made;
}

/** "Tainted_Love · 3 channels · bars 9-12.3": the name of several channels mixed into one clip. */
export function mixName(path, channels, range) {
  const base = baseName(path).replace(/\.midi?$/i, '');
  return `${base} · ${channels.length} channels${range ? ` · bars ${range.label}` : ''}`;
}

/**
 * Render (`render()` resolves to { wav, clipStartTicks, clipEndTicks, clipSeconds }, or null
 * when nothing sounds) and upload it as a new source. LUNA answers an upload it takes for a
 * copy with the existing source: check it is new, and if not, render again (a new unique
 * mark) and retry once. Null when there was nothing to render.
 */
async function uploadRendered(session, name, render, { log, onStep }) {
  await session.sources.load();
  const known = new Set(session.sources.items.map((s) => s.id));
  for (let attempt = 1; ; attempt++) {
    onStep(`Rendering ${name}…`);
    const clip = await render();
    if (!clip) return null;
    const mb = (clip.wav.length / 1048576).toFixed(1);
    const upload = () => session.uploadFile({ bytes: clip.wav, name: `${name.replace(/[\\/:*?"<>|]/g, '_')}.wav` });
    let source;
    onStep(`Uploading ${name} (${mb} MB)…`);
    try {
      source = await upload();
    } catch (e) {
      // A long song's stem is a big upload (about 10 MB a second); one that times out or loses
      // the connection is tried once more before giving up on this stem.
      log.warn(`Upload of ${name} failed (${e.code ?? e.message}); trying again.`);
      await new Promise((r) => setTimeout(r, 2000));
      onStep(`Uploading ${name} again (${mb} MB)…`);
      source = await upload();
    }
    if (!known.has(source.id)) return { source, clip };
    if (attempt >= 2) throw new Error(`LUNA took the audio of ${name} for one it already had ("${source.name.value}"). It is not placed, so as not to put the wrong sound.`);
    log.warn(`LUNA took the audio of ${name} for "${source.name.value}"; rendering it again.`);
  }
}

/**
 * Place an uploaded render on a track at LUNA tick `at`. The clip covers the audio exactly:
 * from its first sound to the range end (a region, whose tail was folded onto its start so it
 * loops seamlessly) or past the end with the tail.
 */
async function placeAudio(session, info, track, { source, clip }, { at, range, name, what, log }) {
  const B = Luna.TICKS_PER_BEAT;
  await session.insertClip({
    trackUid: track.id,
    sourceUid: source.id,
    startTick: Math.round(at + (clip.clipStartTicks / info.ppq) * B),
    stopTick: Math.round(at + (clip.clipEndTicks / info.ppq) * B),
    sourceStartNs: 0,
    sourceStopNs: Math.round(clip.clipSeconds * 1e9),
    name,
  });
  const lead = clip.clipStartTicks / info.ppq;
  log.ok(tableRow([what, barsCell(range), 'audio', `${clip.clipSeconds.toFixed(1)} s${range ? ', loops' : ''}${lead > 0.01 ? `, starts ${lead.toFixed(1)} beats in` : ''}`]));
}

/**
 * An uploaded render as a clip per span ({ startTick, endTick }), all of one source: each shows
 * its stretch of the audio, and what rings past its end is still there to pull out in LUNA.
 */
async function placeSpans(session, info, track, { source, clip }, spans, { at, name, what, log }) {
  const toLuna = (t) => Math.round(at + (t / info.ppq) * Luna.TICKS_PER_BEAT);
  const { clipStartTicks: c0, clipEndTicks: c1, clipSeconds } = clip;
  const secPerTick = clipSeconds / (c1 - c0);
  const cuts = spans.map((s) => ({ lo: Math.max(s.startTick, c0), hi: Math.min(s.endTick, c1) })).filter((c) => c.hi > c.lo);
  for (const { lo, hi } of cuts) {
    await session.insertClip({
      trackUid: track.id,
      sourceUid: source.id,
      startTick: toLuna(lo),
      stopTick: toLuna(hi),
      sourceStartNs: Math.round((lo - c0) * secPerTick * 1e9),
      sourceStopNs: Math.round((hi - c0) * secPerTick * 1e9),
      name,
    });
  }
  log.ok(tableRow([what, '', 'audio', `${cuts.length} clips`]));
}

/**
 * Each channel as a stem: rendered to WAV with the preview's soundfont (`render(ch)`),
 * uploaded to the session and placed on a new stereo audio track at LUNA tick `at`. A stem
 * that fails is logged and the others still go; the error at the end names the ones missing.
 * `rangeOf(ch)`, when given, is each channel's own range instead of `range`;
 * `spansOf(pick)` cuts a stem in a clip per span, as placeSpans does. `tracks`: as addParts'.
 */
export async function addStems(session, info, path, channels, { at, range: shared, rangeOf = () => shared, spansOf = null, tracks = null, render, log, onStep = () => {} }) {
  const made = [];
  const failed = [];
  for (const [k, ch] of channels.entries()) {
    const range = rangeOf(ch);
    const part = extractNotes(info, `ch:${ch}`);
    const name = `${partName(path, info, `ch:${ch}`, part, range)} · audio`;
    const step = (text) => onStep(`${k + 1}/${channels.length} · ${text}`);
    try {
      const up = await uploadRendered(session, name, () => render(ch), { log, onStep: step });
      if (!up) { log.warn(`${name}: no notes${range ? ' in the region' : ''}, not created.`); continue; }
      const what = partWhat(info, `ch:${ch}`, part);
      const key = `audio|${ch}|${what}`;
      const track = (tracks && trackById(session, tracks.get(key))) || await newAudioTrack(session, name);
      tracks?.set(key, track.id);
      if (spansOf) await placeSpans(session, info, track, up, spansOf(`ch:${ch}`), { at, name, what, log });
      else await placeAudio(session, info, track, up, { at, range, name, what, log });
      made.push(track);
    } catch (e) {
      failed.push(ch);
      log.fail(`${name}: ${e.code ? `[${e.code}] ` : ''}${e.message}`);
    }
  }
  if (failed.length) throw new Error(`${made.length} of ${channels.length} stems sent; channel ${failed.join(', ')} failed (see above). Mark those channels and send them again.`);
  return made;
}

/** A track of the session by id, or undefined when it is gone (deleted, another session). */
const trackById = (session, id) => (id ? session.tracks.items.find((t) => t.id === id) : undefined);

/** An instrument track's playlist, its clips loaded, to add notes to it. */
async function playlistOf(session, track, name) {
  let playlist;
  await Luna.settle(() => (playlist = session.playlistFor(track)) !== undefined, `playlist ${name}`, { refresh: () => session.playlists.reload() });
  await playlist.clips.load();
  return playlist;
}

/** A new stereo audio track. */
async function newAudioTrack(session, name) {
  const before = new Set(session.tracks.items.map((t) => t.id));
  const reply = await session.newTrack({ name, trackType: 'audio', stemFormat: 'stereo', makeNameUnique: true });
  const uid = reply?.track_uid ?? reply?.uid;
  return waitForTrack(session, (t) => t.id === uid || !before.has(t.id), `track ${name}`);
}

/** The channels mixed into one audio clip (`render()`) on an existing audio track, at `at`. */
export async function addMixToTrack(session, info, path, track, channels, { at, range, render, log, onStep = () => {} }) {
  const name = channels.length === 1
    ? `${partName(path, info, `ch:${channels[0]}`, extractNotes(info, `ch:${channels[0]}`), range)} · audio`
    : `${mixName(path, channels, range)} · audio`;
  const up = await uploadRendered(session, name, render, { log, onStep });
  if (!up) throw new Error(`No notes${range ? ' in the region' : ''}: nothing to send.`);
  await placeAudio(session, info, track, up, { at, range, name, what: `→ ${track.name.value}`, log });
}

/**
 * The channels' notes merged into one clip on an existing instrument track, at `at`. A single
 * melodic channel brings its Program Change; a mix keeps whatever instrument the track has.
 */
export async function addNotesToTrack(session, info, path, track, channels, { at, range, log }) {
  const B = Luna.TICKS_PER_BEAT;
  const toLuna = (t) => Math.round(at + (t / info.ppq) * B);
  const placed = channels.map((ch) => placedNotes(info, `ch:${ch}`, range));
  const notes = placed.flatMap((p) => p.notes).sort((a, b) => a.start - b.start);
  if (!notes.length) throw new Error(`No notes${range ? ' in the region' : ''}: nothing to send.`);
  let lane;
  await Luna.settle(() => (lane = session.playlistFor(track)) !== undefined, `playlist ${track.name.value}`, { refresh: () => session.playlists.reload() });
  await lane.clips.load();
  const { clip } = await lane.createNotes(notes.map((n) => ({
    pitch: n.pitch,
    startTick: toLuna(n.start),
    stopTick: Math.max(toLuna(n.stop), toLuna(n.start) + 1),
    velocity: Math.max(1, Math.min(127, n.velocity)),
  })));
  const part = placed.length === 1 ? placed[0].part : null;
  if (part && part.program !== undefined && !part.drums) await clip.addMidi([{ tick: 0, status: 0xc0, data1: part.program, data2: 0 }]);
  log.ok(tableRow([`→ ${track.name.value}`, barsCell(range), 'MIDI', `${notes.length} notes from ${channels.length === 1 ? `channel ${channels[0]}` : `${channels.length} channels`}`]));
}

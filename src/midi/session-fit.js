// What a stretch of the LUNA session plays, as Parts measures parts against it: its chords
// (progression in its key), its key, and the grooves of its drums and its bass. Its MIDI tracks
// are made into a MIDI file in memory and read as any song of the library is (chords.js,
// features.js, groove.js), so the session is measured exactly as the parts were.

import { smfOf } from './writer.js';
import { parseMidi } from './parser.js';
import { barChordText, progressionIn, songChords } from './chords.js';
import { keyClass, songKeyOf } from './features.js';
import { grooveNote, grooveOf, grooveUnion } from './groove.js';
import { STEPS_PER_BEAT, noteGrid, sounds } from './harmony.js';
import { HITS_PER_BEAT, hitGrid, strikes } from './rhythm.js';

const BASS_MAX = 52;   // a track whose notes sit mostly below E3 is the bass (MIDI note numbers)

/** The middle of a track's pitches. */
const medianPitch = (notes) => {
  const p = notes.map((n) => n.pitch).sort((a, b) => a - b);
  return p[Math.floor(p.length / 2)];
};

/**
 * `tracks`: the MIDI ones [{ name, drums, notes: [{ beat, len, pitch, vel }] }] and the audio
 * ones [{ name, audio: true, role: 'drums' | 'bass', onsets: [beat…] }] (their hits, audio-onsets.js:
 * groove only, no chords), beats (quarter notes) from the stretch's first bar line; `perBar`
 * quarter notes a bar, `bars` bars. Returns { target: { chords, drums, bass } (as Parts' fitOf
 * takes it), key, chordText ("Am F C G", a bar each, '' for none), roles: [{ name, role, audio }] },
 * or null when nothing in it plays.
 */
export function sessionTarget(tracks, { perBar = 4, bars = 8 } = {}) {
  const sounding = tracks.filter((t) => (t.audio ? t.onsets.length : t.notes.length));
  if (!sounding.length) return null;
  const playing = sounding.filter((t) => !t.audio);   // MIDI: notes, chords and groove
  // Roles: drums as the caller says (a drum track, or notes on channel 10); of the others, the
  // lowest that sits under BASS_MAX the bass (unless an audio track is the bass); the rest harmony.
  const pitched = playing.filter((t) => !t.drums).sort((a, b) => medianPitch(a.notes) - medianPitch(b.notes));
  const bass = pitched.find((t) => medianPitch(t.notes) < BASS_MAX) ?? null;
  const roleOf = (t) => (t.audio ? t.role : t.drums ? 'drums' : t === bass ? 'bass' : 'harmony');
  // The pitched tracks as a song (each on a channel of its own; channel 10 for the drums), read
  // back as the library's files are.
  const events = [];
  let next = 0;
  for (const t of playing) {
    if (!t.drums && next === 9) next++;            // channel 10 is the drums'
    const ch = t.drums ? 9 : Math.min(15, next++); // more than 15 pitched tracks share the last
    for (const n of t.notes) {
      const a = Math.max(0, Math.min(127, n.pitch));
      events.push({ sec: n.beat / 2, rank: 1, type: 'on', ch, a, b: Math.max(1, Math.min(127, n.vel ?? 100)) });
      events.push({ sec: (n.beat + Math.max(0.01, n.len)) / 2, rank: 0, type: 'off', ch, a, b: 0 });
    }
  }
  // No MIDI: no chords or key, the audio's groove alone.
  let key = '';
  let chords = '';
  let chordText = '';
  if (events.length) {
    const info = parseMidi(smfOf({ events }, { bpm: 120, timeSig: `${perBar}/4` }));
    key = keyClass(songKeyOf(info));
    const beats = songChords(info);
    chords = progressionIn(beats, info.ppq, 0, bars * perBar * info.ppq, key);
    chordText = Array.from({ length: bars }, (_, b) => barChordText([...beats.slice(b * perBar, (b + 1) * perBar)])).join(' ').replace(/\s+/g, ' ').trim();
  }
  // Grooves: where the drums (kick, snare) and the bass strike, as the parts' were measured; an
  // audio track's strong hits stand for its kick and snare.
  const grooveOfRole = (role) => grooveUnion(sounding.filter((t) => roleOf(t) === role).map((t) => {
    const onsets = t.audio ? t.onsets : t.notes.filter((n) => grooveNote(n.pitch, t.drums)).map((n) => n.beat);
    return grooveOf(onsets, perBar, bars);
  }));
  // The pitched tracks' notes as a grid (harmony.js): parts are measured against it note by note.
  const stepsPerBar = perBar * STEPS_PER_BEAT;
  const grid = key && Number.isInteger(stepsPerBar)
    ? noteGrid(playing.filter((t) => !t.drums).flatMap((t) => t.notes.map((n) => ({ at: Math.max(0, n.beat) * STEPS_PER_BEAT, len: n.len * STEPS_PER_BEAT, pitch: n.pitch }))), bars * stepsPerBar)
    : null;
  // Where everything strikes (rhythm.js): the MIDI tracks' notes, drums too, and the audio tracks' hits.
  const hitsPerBar = perBar * HITS_PER_BEAT;
  const hits = Number.isInteger(hitsPerBar)
    ? hitGrid(sounding.flatMap((t) => (t.audio ? t.onsets : t.notes.map((n) => n.beat))).filter((beat) => beat >= 0), bars * hitsPerBar)
    : null;
  return {
    target: { chords, drums: grooveOfRole('drums'), bass: grooveOfRole('bass'), ...(sounds(grid) ? { grid, stepsPerBar, key } : {}), ...(strikes(hits) ? { hits, hitsPerBar } : {}) },
    key,
    chordText,
    roles: sounding.map((t) => ({ name: t.name, role: roleOf(t), audio: !!t.audio })),
  };
}

const MUSICAL_ALIASES = [
  ...[
    'redobles de caja', 'redoble de caja', 'redoble caja', 'roll de caja',
    'snare drum roll', 'drum snare roll', 'snare roll', 'drum roll', 'roll de snare',
    'redobles', 'redoble',
  ].map((phrase) => ({ phrase, gesture: 'snare-roll', instrument: '' })),
  ...[
    ['arpegio de piano', 'piano'], ['arpegio piano', 'piano'], ['piano arpegio', 'piano'],
    ['arpeggio de piano', 'piano'], ['arpeggio piano', 'piano'], ['piano arpeggio', 'piano'],
    ['arpegio de guitarra', 'guitar'], ['arpegio guitarra', 'guitar'], ['guitar arpeggio', 'guitar'],
    ['arpeggio de guitarra', 'guitar'], ['arpeggio guitarra', 'guitar'],
    ['arpegio de bajo', 'bass'], ['arpegio bajo', 'bass'], ['bass arpeggio', 'bass'], ['arpeggio bass', 'bass'],
    ['arpegio', ''], ['arpeggio', ''],
  ].map(([phrase, instrument]) => ({ phrase, gesture: 'arpeggio', instrument })),
  ...[
    ['redoble de toms', 'tom-fill'], ['tom fill', 'tom-fill'], ['fill de toms', 'tom-fill'],
    ['four on the floor', 'four-floor'], ['four to the floor', 'four-floor'],
    ['bombo a negras', 'four-floor'], ['cuatro al piso', 'four-floor'],
    ['caja en 2 y 4', 'backbeat'], ['snare on two and four', 'backbeat'], ['backbeat', 'backbeat'],
    ['hi hat abierto', 'open-hihat'], ['open hi hat', 'open-hihat'], ['open hihat', 'open-hihat'],
    ['hi hat cerrado', 'closed-hihat'], ['closed hi hat', 'closed-hihat'], ['closed hihat', 'closed-hihat'],
    ['hi hat', 'hihat'], ['hihat', 'hihat'], ['charles', 'hihat'],
    ['bombo', 'kick'], ['kick drum', 'kick'], ['kick', 'kick'],
    ['caja', 'snare'], ['snare drum', 'snare'], ['snare', 'snare'],
    ['shuffle', 'shuffle'], ['shuffle feel', 'shuffle'],
    ['tom', 'toms'], ['toms', 'toms'],
  ].map(([phrase, gesture]) => ({ phrase, gesture, instrument: '' })),
].map(({ phrase, ...intent }) => ({ ...intent, words: phrase.split(' ') }))
  .sort((a, b) => b.words.length - a.words.length);

export const SNARE_ROLL_MIN_SCORE = 0.3;
export const DRUM_GESTURE_MIN_SCORE = 0.25;
export const DRUM_GESTURES = ['kick', 'snare', 'hihat', 'closed-hihat', 'open-hihat', 'toms', 'tom-fill', 'shuffle', 'four-floor', 'backbeat'];
export const DRUM_SOUND_GESTURES = new Set(['kick', 'snare', 'hihat', 'closed-hihat', 'open-hihat', 'toms']);
const SNARE_ROLL_NOTES = new Set([38, 40]);

const normalize = (text) => String(text)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

/** Separate a supported musical intent from any remaining ordinary search words. */
export function parseMusicalQuery(text) {
  const words = normalize(text).split(/\s+/).filter(Boolean);
  for (const { words: alias, gesture, instrument } of MUSICAL_ALIASES) {
    const at = words.findIndex((_, i) => alias.every((word, k) => words[i + k] === word));
    if (at >= 0) {
      words.splice(at, alias.length);
      return { gesture, instrument, text: words.filter((word) => !['de', 'del'].includes(word)).join(' ') };
    }
  }
  return { gesture: '', instrument: '', text: words.join(' ') };
}

/**
 * Rank a drum fragment's snare rolls from packed [onset, duration, pitch|velocity<<8] events.
 * The score rewards several snare strikes close together; MIDI note durations are not used.
 */
export function snareRollScore(events, ppq) {
  if (!events || !Number.isInteger(ppq) || ppq <= 0) return 0;
  const starts = [];
  for (let i = 0; i + 2 < events.length; i += 3) {
    const pitch = events[i + 2] & 0xff;
    if (SNARE_ROLL_NOTES.has(pitch)) starts.push(events[i]);
  }
  starts.sort((a, b) => a - b);
  if (starts.length < 3) return 0;

  let best = 0;
  for (let from = 0; from < starts.length - 2; from++) {
    let to = from + 1;
    while (to < starts.length && starts[to] - starts[to - 1] <= ppq * 0.75 && starts[to] - starts[from] <= ppq * 2) {
      to++;
    }
    const count = to - from;
    if (count < 3) continue;
    const averageGap = (starts[to - 1] - starts[from]) / (count - 1) / ppq;
    const quantity = Math.min(1, (count - 2) / 4);
    const speed = Math.min(1, 0.5 / averageGap);
    best = Math.max(best, quantity * speed);
  }
  return best;
}

const DRUM_NOTES = {
  kick: new Set([35, 36]),
  snare: new Set([37, 38, 40]),
  hihat: new Set([42, 44, 46]),
  'closed-hihat': new Set([42, 44]),
  'open-hihat': new Set([46]),
  toms: new Set([41, 43, 45, 47, 48, 50]),
};

const readDrumEvents = (events) => {
  const notes = [];
  if (!events) return notes;
  for (let i = 0; i + 2 < events.length; i += 3) {
    notes.push({ tick: events[i], pitch: events[i + 2] & 0xff });
  }
  return notes;
};

function drumPitchDensity(notes, pitches, bars, perBar) {
  if (!bars || !pitches) return 0;
  const count = notes.filter((note) => pitches.has(note.pitch)).length;
  return Math.min(1, count / (bars * perBar));
}

function beatCoverage(onQuarter, pitches, bars, beats, beatIndexes) {
  if (!bars || !beatIndexes.length) return 0;
  const expected = bars * beatIndexes.length;
  let hits = 0;
  for (let bar = 0; bar < bars; bar++) {
    for (const beat of beatIndexes) {
      const target = (bar * beats + beat) * 128;
      for (const pitch of pitches) {
        if (onQuarter.has(target + pitch)) { hits++; break; }
      }
    }
  }
  return hits / expected;
}

function shuffleScore(notes, ppq, bars) {
  if (!ppq || !bars) return 0;
  const hats = notes.filter((note) => DRUM_NOTES.hihat.has(note.pitch));
  if (hats.length < 4) return 0;
  let tripletOffbeats = 0;
  for (const note of hats) {
    const phase = ((note.tick / ppq) % 1 + 1) % 1;
    if (Math.min(Math.abs(phase - 1 / 3), Math.abs(phase - 2 / 3)) < 0.06) {
      tripletOffbeats++;
    }
  }
  const matchRatio = tripletOffbeats / hats.length;
  const evidence = Math.min(1, tripletOffbeats / Math.max(2, bars * 2));
  return matchRatio * evidence;
}

function tomFillScore(notes, ppq) {
  if (!ppq) return 0;
  const starts = notes.filter((note) => DRUM_NOTES.toms.has(note.pitch)).sort((a, b) => a.tick - b.tick);
  let best = 0;
  for (let from = 0; from < starts.length - 2; from++) {
    const group = [starts[from]];
    for (let to = from + 1; to < starts.length && to < from + 8; to++) {
      if (starts[to].tick - starts[to - 1].tick > ppq * 0.75 || starts[to].tick - starts[from].tick > ppq * 2) break;
      group.push(starts[to]);
      if (group.length < 3) continue;
      const varied = new Set(group.map((note) => note.pitch)).size;
      if (varied < 2) continue;
      const count = Math.min(1, (group.length - 2) / 3);
      const speed = Math.min(1, 0.5 / ((group[group.length - 1].tick - group[0].tick) / ppq / (group.length - 1)));
      best = Math.max(best, count * speed);
    }
  }
  return best;
}

/** Score a drum fragment for its sound categories and rhythmic patterns (0–1 each). */
export function drumGestureScores(events, ppq, timeSig, bars) {
  const scores = Object.fromEntries(DRUM_GESTURES.map((gesture) => [gesture, 0]));
  if (!events || !bars) return scores;
  const notes = readDrumEvents(events);
  scores.kick = drumPitchDensity(notes, DRUM_NOTES.kick, bars, 2);
  scores.snare = drumPitchDensity(notes, DRUM_NOTES.snare, bars, 2);
  scores.hihat = drumPitchDensity(notes, DRUM_NOTES.hihat, bars, 4);
  scores['closed-hihat'] = drumPitchDensity(notes, DRUM_NOTES['closed-hihat'], bars, 4);
  scores['open-hihat'] = drumPitchDensity(notes, DRUM_NOTES['open-hihat'], bars, 1);
  scores.toms = drumPitchDensity(notes, DRUM_NOTES.toms, bars, 1);
  scores['tom-fill'] = tomFillScore(notes, ppq);
  scores.shuffle = shuffleScore(notes, ppq, bars);
  const onQuarter = new Set();
  if (ppq) for (const note of notes) {
    const beat = Math.round(note.tick / ppq);
    if (Math.abs(note.tick - beat * ppq) <= ppq * 0.08) onQuarter.add(beat * 128 + note.pitch);
  }
  const meter = /^(\d+)\/(\d+)$/.exec(timeSig ?? '');
  if (meter && Number(meter[1]) === 4 && Number(meter[2]) === 4) {
    scores['four-floor'] = beatCoverage(onQuarter, DRUM_NOTES.kick, bars, 4, [0, 1, 2, 3]);
    scores.backbeat = beatCoverage(onQuarter, DRUM_NOTES.snare, bars, 4, [1, 3]);
  }
  return scores;
}

export const drumGestureScore = (gesture, events, ppq, timeSig, bars) =>
  drumGestureScores(events, ppq, timeSig, bars)[gesture] ?? 0;

/** Compact derived search scores kept with a fragment after its temporary note events are dropped. */
export function fragmentGestureScores(events, { ppq, timeSig, bars, drums }) {
  return {
    snareRoll: snareRollScore(events, ppq),
    arpeggio: drums ? 0 : arpeggioScore(events, ppq),
    drums: drumGestureScores(events, ppq, timeSig, bars),
  };
}

/** Whether a note should be emphasized in a fragment preview for this drum search. */
export function isDrumGestureNote(gesture, pitch) {
  const notes = gesture === 'four-floor' ? DRUM_NOTES.kick
    : gesture === 'snare-roll' ? SNARE_ROLL_NOTES
      : gesture === 'backbeat' ? DRUM_NOTES.snare
      : gesture === 'shuffle' || gesture === 'hihat' ? DRUM_NOTES.hihat
        : gesture === 'tom-fill' ? DRUM_NOTES.toms
        : DRUM_NOTES[gesture];
  return notes?.has(pitch) ?? false;
}

const CHORD_SHAPES = [
  [0, 3, 6], [0, 3, 7], [0, 3, 7, 10], [0, 3, 7, 11],
  [0, 4, 7], [0, 4, 7, 10], [0, 4, 7, 11], [0, 4, 8],
  [0, 5, 7], [0, 5, 9],
];

function chordToneRatio(pitches) {
  const pitchClasses = [...new Set(pitches.map((pitch) => pitch % 12))];
  let best = 0;
  for (let root = 0; root < 12; root++) {
    for (const shape of CHORD_SHAPES) {
      const chord = new Set(shape.map((interval) => (root + interval) % 12));
      const matched = pitchClasses.filter((pitch) => chord.has(pitch)).length;
      best = Math.max(best, matched / pitchClasses.length);
    }
  }
  return best;
}

/** Rank compact, sequential runs whose pitches form a chord rather than a simultaneous block. */
export function arpeggioScore(events, ppq) {
  if (!events || !Number.isInteger(ppq) || ppq <= 0) return 0;
  const notes = [];
  for (let i = 0; i + 2 < events.length; i += 3) {
    const pitch = events[i + 2] & 0xff;
    if (pitch < 128) notes.push({ start: events[i], pitch });
  }
  notes.sort((a, b) => a.start - b.start || a.pitch - b.pitch);
  if (notes.length < 4) return 0;

  let best = 0;
  for (let from = 0; from < notes.length - 3; from++) {
    const pitches = [];
    for (let to = from; to < notes.length && to < from + 8; to++) {
      if (to > from && (notes[to].start - notes[to - 1].start > ppq || notes[to].start - notes[from].start > ppq * 4)) break;
      if (to > from && notes[to].start === notes[to - 1].start) continue;
      pitches.push(notes[to].pitch);
      if (pitches.length < 4) continue;

      const unique = new Set(pitches);
      const pitchClasses = new Set(pitches.map((pitch) => pitch % 12));
      if (pitchClasses.size < 3 || Math.max(...pitches) - Math.min(...pitches) > 24) continue;

      const chordFit = chordToneRatio(pitches);
      const distinct = unique.size / pitches.length;
      const durationBeats = (notes[to].start - notes[from].start) / ppq;
      const spacing = Math.max(0, 1 - Math.abs(durationBeats / (pitches.length - 1) - 0.5));
      best = Math.max(best, chordFit * 0.75 + distinct * 0.15 + spacing * 0.1);
    }
  }
  return best;
}

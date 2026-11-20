import { describe, expect, it } from 'vitest';
import { STEPS_PER_BEAT, harmonyFeatures, noteGrid } from '../src/midi/harmony.js';
import { adaptNotes, scaleMask } from '../src/midi/adapt.js';
import { adaptRow, addRow, newLoop, placeClip } from '../src/midi/loop.js';

const SPB = 4 * STEPS_PER_BEAT;
/** Bars of held chords as a context grid. */
const ctxOf = (...chords) => noteGrid(chords.flatMap((pitches, b) => pitches.map((pitch) => ({ at: b * SPB, len: SPB, pitch }))), chords.length * SPB);
const C = [48, 52, 55], F = [53, 57, 60], G = [55, 59, 62];
const note = (beat, pitch, len = 1) => ({ beat, len, pitch, vel: 90 });
const gridOf = (notes, bars) => noteGrid(notes.map((n) => ({ at: n.beat * STEPS_PER_BEAT, len: n.len * STEPS_PER_BEAT, pitch: n.pitch })), bars * SPB);

describe('a key as its notes', () => {
  it('is seven pitch classes in major, and in minor the raised seventh too', () => {
    expect(scaleMask('0 mayor')).toBe(0b101010110101);
    expect(scaleMask('9 menor') & (1 << 8)).toBeTruthy();   // G# in A minor
    expect(scaleMask('9 menor') & (1 << 10)).toBeFalsy();   // no Bb
    expect(scaleMask('')).toBe(0xfff);
  });
});

describe('a fragment made to go with the notes that play', () => {
  it('leaves alone what already goes: notes of the chord and of the key', () => {
    const notes = [note(0, 60), note(1, 62), note(2, 64), note(3, 69)];   // C D E A over C: D and A are a tone from the chord's notes
    const got = adaptNotes(notes, ctxOf(C), { key: '0 mayor' });
    expect(got.moved).toBe(0);
    expect(got.notes).toBe(notes);
  });

  it('moves a note a semitone from the chord to the nearest note that is not, the chord\'s first', () => {
    // Over C (C E G): F is a semitone from E, B from C, C# from C.
    const got = adaptNotes([note(0, 65), note(1, 71), note(2, 61), note(3, 67)], ctxOf(C), { key: '0 mayor' });
    expect(got.notes.map((n) => n.pitch)).toEqual([64, 72, 60, 67]);
    expect(got.moved).toBe(3);
    expect(got.notes[0]).toMatchObject({ beat: 0, len: 1, vel: 90 });   // only its pitch
  });

  it('follows the chords bar by bar: the same note is right in one and wrong in the next', () => {
    // E over C stays; E over F (F A C) is a semitone from F: down to... D is free of clashes and in the key; F is the chord's.
    const got = adaptNotes([note(0, 64, 4), note(4, 64, 4)], ctxOf(C, F), { key: '0 mayor' });
    expect(got.notes[0].pitch).toBe(64);
    expect(got.notes[1].pitch).toBe(65);
    expect(got.moved).toBe(1);
  });

  it('counts the note as it sounds, moved to the loop\'s key', () => {
    // Written E, sounding F (shift 1) over C: wrong; written D# sounds E.
    const got = adaptNotes([note(0, 64)], ctxOf(C), { key: '0 mayor', shift: 1 });
    expect(got.notes[0].pitch).toBe(63);
  });

  it('brings a stranger to the key back, when no instrument plays it in that bar', () => {
    // F# over G (G B D) in C major: a semitone from G. Bb over F: not in C major, a semitone from A.
    expect(adaptNotes([note(0, 66)], ctxOf(G), { key: '0 mayor' }).notes[0].pitch).toBe(67);
    // Eb over a lone C: no clash (a third), but outside C major and nobody plays it: to D or E, a note of the key.
    const lone = noteGrid([{ at: 0, len: SPB, pitch: 48 }], SPB);
    expect([62, 64]).toContain(adaptNotes([note(0, 63)], lone, { key: '0 mayor' }).notes[0].pitch);
    // The same Eb when the others play it (a C minor chord in a loop said to be in C major): it stays.
    expect(adaptNotes([note(0, 63)], ctxOf([48, 51, 55]), { key: '0 mayor' }).moved).toBe(0);
  });

  it('touches nothing where nothing plays, and joins two notes brought to the same pitch', () => {
    const silent = new Uint16Array(SPB);
    const notes = [note(0, 61)];
    expect(adaptNotes(notes, silent, { key: '0 mayor' }).notes).toBe(notes);
    const got = adaptNotes([note(0, 64), note(0, 65)], ctxOf(C), { key: '0 mayor' });
    expect(got.notes.map((n) => n.pitch)).toEqual([64]);
  });

  it('leaves no semitone against the context, whatever the fragment', () => {
    const ctx = ctxOf(C, F, G, C);
    let seed = 7;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const notes = Array.from({ length: 64 }, (_, k) => note(k / 4, 55 + Math.floor(rnd() * 24), 0.25));
    const before = harmonyFeatures(ctx, gridOf(notes, 4), 0, SPB);
    const got = adaptNotes(notes, ctx, { key: '0 mayor' });
    const after = harmonyFeatures(ctx, gridOf(got.notes, 4), 0, SPB);
    expect(before.clash).toBeGreaterThan(0.2);
    expect(after.clash).toBe(0);
    expect(after.chroma).toBeGreaterThan(before.chroma);
    expect(got.notes.every((n, k) => Math.abs(n.pitch - notes.find((o) => o.beat === n.beat).pitch) <= 2)).toBe(true);
  });
});

describe('in a loop', () => {
  it('adapts the fragments Fill and Arrange brought (marked adapt) to the other rows, and no others', () => {
    const loop = { ...newLoop(), length: 2, key: '0 mayor' };
    const keys = addRow(loop, { program: 0, drums: false, name: 'Piano' });
    placeClip(keys, 0, { name: 'c', key: '0 mayor', bars: 2, transpose: 0, notes: [...C.map((p) => note(0, p, 4)), ...F.map((p) => note(4, p, 4))] });
    const lead = addRow(loop, { program: 80, drums: false, name: 'Lead' });
    const mine = { name: 'm', key: '0 mayor', bars: 2, transpose: 0, notes: [note(0, 65, 2), note(4, 64, 2)] };
    placeClip(lead, 0, mine);
    expect(adaptRow(loop, lead)).toBe(0);   // the user's own: as it is
    placeClip(lead, 0, { ...mine, adapt: true });
    expect(adaptRow(loop, lead, 2, 4)).toBe(0);   // bars it does not take: nothing
    expect(adaptRow(loop, lead, 1, 2)).toBe(2);   // a clip in the bars asked for: all of it
    expect(lead.clips.get(0).notes.map((n) => n.pitch)).toEqual([64, 65]);
    expect(adaptRow(loop, lead)).toBe(0);   // done: again changes nothing
    expect(mine.notes.map((n) => n.pitch)).toEqual([65, 64]);   // the clip it came from, untouched
  });
});

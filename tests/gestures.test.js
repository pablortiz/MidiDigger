import { describe, expect, it } from 'vitest';
import { arpeggioScore, drumGestureScore, parseMusicalQuery, snareRollScore } from '../src/midi/gestures.js';

describe('musical search phrases', () => {
  it('recognizes Spanish and English snare-roll phrases with accents and extra text', () => {
    expect(parseMusicalQuery('REDÓBLE de caja')).toEqual({ gesture: 'snare-roll', instrument: '', text: '' });
    expect(parseMusicalQuery('artist snare drum roll')).toEqual({ gesture: 'snare-roll', instrument: '', text: 'artist' });
    expect(parseMusicalQuery('a drum roll in a song')).toEqual({ gesture: 'snare-roll', instrument: '', text: 'a in a song' });
    expect(parseMusicalQuery('steel guitar')).toEqual({ gesture: '', instrument: '', text: 'steel guitar' });
  });

  it('recognizes arpeggios in Spanish and English, with optional instrument filters', () => {
    expect(parseMusicalQuery('ARPEGÍO de guitarra')).toEqual({ gesture: 'arpeggio', instrument: 'guitar', text: '' });
    expect(parseMusicalQuery('piano arpeggio')).toEqual({ gesture: 'arpeggio', instrument: 'piano', text: '' });
    expect(parseMusicalQuery('arpeggio artist')).toEqual({ gesture: 'arpeggio', instrument: '', text: 'artist' });
  });

  it('recognizes drum sounds and patterns in Spanish and English', () => {
    expect(parseMusicalQuery('bombo')).toMatchObject({ gesture: 'kick' });
    expect(parseMusicalQuery('open hi-hat')).toMatchObject({ gesture: 'open-hihat' });
    expect(parseMusicalQuery('bombo a negras')).toMatchObject({ gesture: 'four-floor' });
    expect(parseMusicalQuery('caja en 2 y 4')).toMatchObject({ gesture: 'backbeat' });
    expect(parseMusicalQuery('redoble de toms')).toMatchObject({ gesture: 'tom-fill' });
  });

  describe('arpeggio descriptor', () => {
    const events = (notes) => new Uint32Array(notes.flatMap(([start, pitch]) => [start, 48, pitch | (100 << 8)]));

    it('prefers sequential chord tones over scalar runs and simultaneous chords', () => {
      const arp = events([[0, 60], [24, 64], [48, 67], [72, 72]]);
      const scale = events([[0, 60], [24, 62], [48, 64], [72, 65]]);
      const chord = events([[0, 60], [0, 64], [0, 67], [0, 72]]);
      expect(arpeggioScore(arp, 96)).toBeGreaterThanOrEqual(0.9);
      expect(arpeggioScore(scale, 96)).toBeLessThan(0.82);
      expect(arpeggioScore(chord, 96)).toBe(0);
      expect(arpeggioScore(arp, 0)).toBe(0);
    });
  });
});

describe('drum descriptors', () => {
  const events = (notes) => new Uint32Array(notes.flatMap(([start, pitch]) => [start, 12, pitch | (100 << 8)]));

  it('scores GM drum sounds, four-on-the-floor, backbeat, shuffle and tom fills', () => {
    const kick = events([[0, 36], [96, 36], [192, 36], [288, 36]]);
    const backbeat = events([[96, 38], [288, 38], [480, 38], [672, 38]]);
    const shuffle = events([[0, 42], [32, 42], [64, 42], [96, 42], [128, 42], [160, 42]]);
    const tomFill = events([[0, 45], [24, 47], [48, 48], [72, 50]]);
    expect(drumGestureScore('kick', kick, 96, '4/4', 1)).toBe(1);
    expect(drumGestureScore('four-floor', kick, 96, '4/4', 1)).toBe(1);
    expect(drumGestureScore('backbeat', backbeat, 96, '4/4', 2)).toBe(1);
    expect(drumGestureScore('shuffle', shuffle, 96, '4/4', 1)).toBeGreaterThan(0.5);
    expect(drumGestureScore('tom-fill', tomFill, 96, '4/4', 1)).toBeGreaterThan(0.6);
    expect(drumGestureScore('four-floor', kick, 96, '3/4', 1)).toBe(0);
  });
});

describe('snare-roll descriptor', () => {
  const events = (notes) => new Uint32Array(notes.flatMap(([start, pitch]) => [start, 12, pitch | (100 << 8)]));

  it('scores dense snare bursts above ordinary backbeats and ignores non-snare drum notes', () => {
    const roll = events([[0, 38], [24, 38], [48, 40], [72, 38], [96, 40], [120, 38]]);
    const backbeat = events([[0, 36], [0, 38], [96, 36], [96, 38], [192, 36], [192, 38]]);
    expect(snareRollScore(roll, 96)).toBeGreaterThan(0.9);
    expect(snareRollScore(backbeat, 96)).toBe(0);
    expect(snareRollScore(roll, 0)).toBe(0);
  });
});

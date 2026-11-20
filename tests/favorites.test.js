import { describe, expect, it } from 'vitest';
import {
  addCollection, addFavorite, collectionsWith, decodeFavorites, emptyFavorites, encodeFavorites,
  favoriteSig, mergeFavorites, moveCollection, removeCollection, removeFavorite, renameCollection,
} from '../src/library/favorites.js';
import { decodeAnalysis } from '../src/library/backup.js';

const fav = (over = {}) => ({
  name: 'Kick & hats', instrument: 'Drums', role: 'drums', program: 0, drums: true, bpm: 128, ts: '4/4',
  path: 'D:\\midi\\techno\\a.mid', ch: 10, startBar: 9, bars: 2,
  clip: { name: 'Drums', key: '', beats: 4, bars: 2, chords: [-1, -1, -1, -1, -1, -1, -1, -1],
    notes: [{ beat: 0, len: 0.25, pitch: 36, vel: 110 }, { beat: 1, len: 0.25, pitch: 38, vel: 100 }, { beat: 4.5, len: 0.25, pitch: 42, vel: 70 }] },
  grid: [], hits: [1, 0, 0, 0, 1, 0, 0, 0],
  ...over,
});

describe('favourites', () => {
  it('keeps collections and their fragments, a fragment once however many hold it', () => {
    const favs = emptyFavorites();
    const techno = addCollection(favs, 'Techno drums');
    const intro = addCollection(favs, '  ');
    expect(intro.name).toBe('Favorites');
    renameCollection(favs, intro.id, 'Intros');
    const a = addFavorite(favs, techno.id, fav());
    expect(a.added).toBe(true);
    expect(addFavorite(favs, techno.id, fav()).added).toBe(false);   // already in it
    const b = addFavorite(favs, intro.id, fav());
    expect(b.id).toBe(a.id);                                         // the same favourite, in two collections
    expect(Object.keys(favs.items)).toHaveLength(1);
    expect(collectionsWith(favs, favoriteSig(fav())).map((c) => c.name)).toEqual(['Techno drums', 'Intros']);
    // Out of one collection it stays; out of both it goes.
    removeFavorite(favs, techno.id, a.id);
    expect(Object.keys(favs.items)).toHaveLength(1);
    expect(moveCollection(favs, intro.id, -1)).toBe(true);
    expect(favs.collections.map((c) => c.name)).toEqual(['Intros', 'Techno drums']);
    removeCollection(favs, intro.id);
    expect(Object.keys(favs.items)).toHaveLength(0);
  });

  it('saves them all as one .mdig and reads them back, notes, rhythm and collections', () => {
    const favs = emptyFavorites();
    const techno = addCollection(favs, 'Techno drums');
    const celtic = addCollection(favs, 'Celtic');
    addFavorite(favs, techno.id, fav());
    addFavorite(favs, celtic.id, fav({ name: 'Whistle', instrument: 'Tin Whistle', role: 'melody', drums: false, program: 78, ch: 3, startBar: 1, bars: 1,
      clip: { name: 'Tin Whistle', key: '2 mayor', beats: 4, bars: 1, chords: [4, 4, 14, 14], notes: [{ beat: 0, len: 1.5, pitch: 74, vel: 90 }] }, hits: [] }));
    const bytes = encodeFavorites(favs);
    // An analysis as any: one record per favourite, its notes as events (MDIG Viewer reads it).
    const plain = decodeAnalysis(bytes);
    expect(plain.files).toHaveLength(2);
    expect(plain.files[0].path).toBe('D:\\midi\\techno\\a.mid#10@9');
    const back = decodeFavorites(bytes);
    expect(back.collections.map((c) => [c.name, c.items.length])).toEqual([['Techno drums', 1], ['Celtic', 1]]);
    const drums = Object.values(back.items).find((x) => x.role === 'drums');
    expect(drums.clip.notes).toEqual(fav().clip.notes);
    expect(drums.hits).toEqual(fav().hits);
    expect(drums.bpm).toBe(128);
    const whistle = Object.values(back.items).find((x) => x.role === 'melody');
    expect(whistle.clip.key).toBe('2 mayor');
    expect(whistle.clip.chords).toEqual([4, 4, 14, 14]);
  });

  it('restores into what is there: same-named collections together, no fragment twice', () => {
    const here = emptyFavorites();
    const mine = addCollection(here, 'Techno drums');
    addFavorite(here, mine.id, fav());
    const there = emptyFavorites();
    const theirs = addCollection(there, 'Techno drums');
    addFavorite(there, theirs.id, fav());
    addFavorite(there, theirs.id, fav({ startBar: 17 }));
    const other = addCollection(there, 'Celtic');
    addFavorite(there, other.id, fav({ startBar: 33 }));
    expect(mergeFavorites(here, decodeFavorites(encodeFavorites(there)))).toBe(2);
    expect(here.collections.map((c) => [c.name, c.items.length])).toEqual([['Techno drums', 2], ['Celtic', 1]]);
    expect(Object.keys(here.items)).toHaveLength(3);
  });

  it('says so when a .mdig holds no favourites', () => {
    const favs = emptyFavorites();
    addFavorite(favs, addCollection(favs, 'x').id, fav());
    const bytes = encodeFavorites(favs);
    expect(() => decodeFavorites(bytes.slice(0, 12))).toThrow();
  });
});

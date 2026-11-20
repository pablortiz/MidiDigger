// Favorites: fragments kept in collections of the user's ("Techno drums", "Celtic"), to use later.
// Each favourite is whole in itself, never a pointer into the library: the clip it plays (as a loop
// pad holds it: notes in beats, its chords and key), its instrument and where it came from (for
// reference only), and its harmonic and rhythmic summary (grid, hits) for fit marks. So it plays
// and goes into a loop with its MIDI file moved, renamed or gone, and in another library.
//
// Kept as { items: { id: favourite }, collections: [{ id, name, open, items: [id] }] }: a favourite
// is kept once however many collections hold it. Saved (and shared) as one .mdig: each favourite a
// file record of one part and one fragment "with MIDI events" (so MDIG Viewer reads it too), the
// collections and the rest of each favourite in an "extra.favorites" section.

import { decodeAnalysis, encodeAnalysis } from './backup.js';
import { FRAG, PART, RECORD_VERSION, ROLES } from '../midi/features.js';
import { packHits, unpackHits } from '../midi/rhythm.js';

export const FAVORITES_ROOT = 'MIDI Digger favorites';
const PPQ = 480;
const KEY_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export const emptyFavorites = () => ({ items: {}, collections: [] });

let counter = 0;
const newId = (prefix) => `${prefix}${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** A favourite's identity: the same fragment of the same song is the same favourite. */
export const favoriteSig = ({ path, ch, startBar, bars }) => `${String(path).toLowerCase()}|${ch}|${startBar}|${bars}`;

export function addCollection(favs, name) {
  const collection = { id: newId('c'), name: String(name ?? '').trim() || 'Favorites', open: true, items: [] };
  favs.collections.push(collection);
  return collection;
}

const collection = (favs, id) => {
  const c = favs.collections.find((x) => x.id === id);
  if (!c) throw new Error('That collection is no longer there.');
  return c;
};

export function renameCollection(favs, id, name) {
  const clean = String(name ?? '').trim();
  if (clean) collection(favs, id).name = clean;
}

/** A collection taken away; its favourites that no other collection holds go with it. */
export function removeCollection(favs, id) {
  favs.collections = favs.collections.filter((c) => c.id !== id);
  prune(favs);
}

/** A collection one place up (-1) or down (1). */
export function moveCollection(favs, id, step) {
  const i = favs.collections.findIndex((c) => c.id === id);
  const j = i + step;
  if (i < 0 || j < 0 || j >= favs.collections.length) return false;
  [favs.collections[i], favs.collections[j]] = [favs.collections[j], favs.collections[i]];
  return true;
}

/**
 * A fragment into a collection: kept once (a favourite already held, by favoriteSig, is reused).
 * { added, id }: added false when that collection had it already.
 */
export function addFavorite(favs, collectionId, item) {
  const c = collection(favs, collectionId);
  const sig = item.sig ?? favoriteSig(item);
  const held = Object.values(favs.items).find((x) => x.sig === sig);
  const id = held?.id ?? newId('f');
  if (!held) favs.items[id] = { ...item, sig, id, addedAt: item.addedAt ?? new Date().toISOString() };
  if (c.items.includes(id)) return { added: false, id };
  c.items.push(id);
  return { added: true, id };
}

/** A favourite out of a collection (gone altogether when no other holds it). */
export function removeFavorite(favs, collectionId, id) {
  const c = collection(favs, collectionId);
  c.items = c.items.filter((x) => x !== id);
  prune(favs);
}

/** The collections a fragment is in (by its signature). */
export function collectionsWith(favs, sig) {
  const item = Object.values(favs.items).find((x) => x.sig === sig);
  return item ? favs.collections.filter((c) => c.items.includes(item.id)) : [];
}

function prune(favs) {
  const used = new Set(favs.collections.flatMap((c) => c.items));
  for (const id of Object.keys(favs.items)) if (!used.has(id)) delete favs.items[id];
}

/**
 * Favourites from elsewhere (a file restored) added to these: collections of the same name come
 * together, the same fragment is kept once. Returns how many fragments came in new to a collection.
 */
export function mergeFavorites(into, from) {
  let added = 0;
  for (const c of from.collections) {
    const target = into.collections.find((x) => x.name === c.name) ?? addCollection(into, c.name);
    for (const id of c.items) {
      const item = from.items[id];
      if (!item) continue;
      const { id: _id, ...rest } = item;
      if (addFavorite(into, target.id, rest).added) added++;
    }
  }
  return added;
}

/** "7 mayor" (as a clip keeps a key) as the catalogue names it, "G mayor"; '' as it is. */
const keyNameOf = (key) => {
  const m = /^(\d+) (mayor|menor)$/.exec(key ?? '');
  return m ? `${KEY_NAMES[Number(m[1])]} ${m[2]}` : (key ?? '');
};

/** One favourite as an analysis record: one part, one fragment, its notes as MIDI events. */
function recordOf(item) {
  const beats = item.clip.beats ?? 4;
  const notes = item.clip.notes;
  const events = new Uint32Array(notes.length * 3);
  notes.forEach((n, k) => {
    events[k * 3] = Math.max(0, Math.round(n.beat * PPQ));
    events[k * 3 + 1] = Math.max(1, Math.round(n.len * PPQ));
    events[k * 3 + 2] = (n.pitch & 127) | ((Math.max(1, Math.min(127, Math.round(n.vel))) & 127) << 8);
  });
  const pitches = notes.map((n) => n.pitch);
  const bars = item.clip.bars ?? item.bars ?? 1;
  const f = [];
  f[FRAG.bars] = bars;
  f[FRAG.start] = item.startBar ?? 1;
  f[FRAG.count] = 1;
  f[FRAG.cov] = 100;
  f[FRAG.shape] = 0;
  f[FRAG.energy] = 1;
  f[FRAG.chords] = '';
  f[FRAG.at] = 0;
  f[FRAG.ticks] = Math.round(bars * beats * PPQ);
  f[FRAG.groove] = '';
  f[FRAG.velocity] = notes.length ? Math.round(notes.reduce((s, n) => s + n.vel, 0) / notes.length) : 0;
  f[FRAG.velocitySpread] = 0;
  f[FRAG.grid] = item.grid?.length ? Uint16Array.from(item.grid) : null;
  // (Kept a byte a step in a favourite; packed, a bit a step, in the file as the analysis keeps them.)
  f[FRAG.hits] = item.hits?.length ? packHits(Uint8Array.from(item.hits)) : null;
  f[FRAG.hitSteps] = item.hits?.length ? item.hits.length : 0;
  f[FRAG.events] = events;
  f[FRAG.controls] = null;
  f[FRAG.tempo] = Uint32Array.from([0, Math.round(60e6 / (item.bpm || 120))]);
  const p = [];
  p[PART.ch] = item.ch ?? 1;
  p[PART.program] = item.program ?? 0;
  p[PART.role] = Math.max(0, ROLES.indexOf(item.role));
  p[PART.notes] = notes.length;
  p[PART.bars] = bars;
  p[PART.density] = Math.round((notes.length / bars) * 10);
  p[PART.poly] = 0;
  p[PART.min] = pitches.length ? Math.min(...pitches) : 0;
  p[PART.max] = pitches.length ? Math.max(...pitches) : 0;
  p[PART.loopBars] = bars;
  p[PART.loopCount] = 1;
  p[PART.loopCov] = 100;
  p[PART.loopStart] = item.startBar ?? 1;
  p[PART.name] = item.name ?? '';
  p[PART.frags] = [f];
  return {
    // A path of its own per favourite (one song can give several): where it came from, and its place.
    path: `${item.path}#${item.ch}@${item.startBar}`, v: RECORD_VERSION, ok: true, title: item.name ?? '', author: '',
    dur: (bars * beats * 60) / (item.bpm || 120), bpm: item.bpm || 120, ppq: PPQ, ts: item.ts || '4/4',
    key: keyNameOf(item.clip.key), keyEst: false, fp: '', parts: [p],
  };
}

/** All the favourites and their collections as the bytes of one .mdig. */
export function encodeFavorites(favs) {
  const ids = Object.keys(favs.items);
  const files = ids.map((id) => recordOf(favs.items[id]));
  // The rest of each favourite (its clip but its notes, which are the events), in the same order.
  const items = ids.map((id) => {
    const { clip, grid: _g, hits: _h, ...rest } = favs.items[id];
    const { notes: _n, ...clipRest } = clip;
    return { ...rest, clip: clipRest };
  });
  const file = { app: 'MIDI Digger analysis', v: RECORD_VERSION, saved: new Date().toISOString(), root: FAVORITES_ROOT, files };
  return encodeAnalysis(file, { includeEvents: true, extra: { favorites: { v: 1, collections: favs.collections, items } } });
}

/** The favourites of a .mdig saved by encodeFavorites. Throws, saying why, when it is not one. */
export function decodeFavorites(bytes) {
  const file = decodeAnalysis(bytes, { includeEvents: true });
  const meta = file.extra?.favorites;
  if (!meta?.items || !meta.collections) throw new Error('That .mdig holds no favourites: save them with "⤓ Save favorites".');
  const favs = emptyFavorites();
  meta.items.forEach((m, k) => {
    const f = file.files[k]?.parts?.[0]?.[PART.frags]?.[0];
    if (!f) return;
    const events = f[FRAG.events] ?? [];
    const notes = [];
    for (let i = 0; i < events.length; i += 3) {
      notes.push({ beat: events[i] / PPQ, len: events[i + 1] / PPQ, pitch: events[i + 2] & 127, vel: (events[i + 2] >> 8) & 127 });
    }
    favs.items[m.id] = {
      ...m,
      clip: { ...m.clip, notes },
      ...(f[FRAG.grid] ? { grid: [...f[FRAG.grid]] } : {}),
      ...(f[FRAG.hits] && f[FRAG.hitSteps] ? { hits: [...unpackHits(f[FRAG.hits], f[FRAG.hitSteps])] } : {}),
    };
  });
  favs.collections = meta.collections.map((c) => ({ ...c, items: c.items.filter((id) => favs.items[id]) }));
  return favs;
}

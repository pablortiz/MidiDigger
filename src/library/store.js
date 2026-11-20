// The add-on's persistent storage: IndexedDB, named after the add-on id so it never mixes
// with another add-on's data (on Windows every add-on page shares the file:// origin). The
// name is still the prototype's id (com.pablo.midiprueba) so catalogues built before the
// rename to MIDI Digger carry over.
//   kv     settings and the scan index { root, paths, at, unread }
//   files  one record per analysed file (see midi/features.js fileRecord), keyed by path

const req = (r) => new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
const done = (tx) => new Promise((resolve, reject) => { tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });

export function createStore(name = 'com.pablo.midiprueba', idb = globalThis.indexedDB) {
  let handle = null;
  const open = () => {
    handle ??= new Promise((resolve, reject) => {
      const r = idb.open(name, 1);
      r.onupgradeneeded = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
        if (!db.objectStoreNames.contains('files')) db.createObjectStore('files', { keyPath: 'path' });
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    return handle;
  };

  return {
    async get(key) {
      const db = await open();
      return req(db.transaction('kv').objectStore('kv').get(key));
    },
    async set(key, value) {
      const db = await open();
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(value, key);
      return done(tx);
    },
    async putFiles(records) {
      if (!records.length) return;
      const db = await open();
      const tx = db.transaction('files', 'readwrite');
      const os = tx.objectStore('files');
      for (const r of records) os.put(r);
      return done(tx);
    },
    async fileKeys() {
      const db = await open();
      return req(db.transaction('files').objectStore('files').getAllKeys());
    },
    /** Every file record, in chunks, so a large library loads without one huge array. */
    async forEachFile(fn, chunk = 4000, onProgress = () => {}) {
      const db = await open();
      let after = null;
      let loaded = 0;
      for (;;) {
        const range = after === null ? null : IDBKeyRange.lowerBound(after, true);
        const rows = await req(db.transaction('files').objectStore('files').getAll(range, chunk));
        for (const r of rows) {
          const result = fn(r);
          if (result && typeof result.then === 'function') await result;
        }
        loaded += rows.length;
        if (rows.length) {
          onProgress(loaded);
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
        if (rows.length < chunk) return;
        after = rows[rows.length - 1].path;
      }
    },
    async clearFiles() {
      const db = await open();
      const tx = db.transaction('files', 'readwrite');
      tx.objectStore('files').clear();
      return done(tx);
    },
  };
}

/** The scan index saved by the first prototype (database "prueba-midi"), if any. */
export async function readLegacyIndex(idb = globalThis.indexedDB) {
  try {
    const db = await new Promise((resolve, reject) => {
      const r = idb.open('prueba-midi');
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    if (!db.objectStoreNames.contains('kv')) { db.close(); return null; }
    const index = await req(db.transaction('kv').objectStore('kv').get('index'));
    db.close();
    return index ?? null;
  } catch {
    return null;
  }
}

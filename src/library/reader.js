// LUNA's listFiles gives paths, not contents. A directory handle can read library files;
// file:// and the optional local helper remain available for other paths.

export class NoAccess extends Error {}

export function fileUrl(path) {
  return `file:///${path.replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/').replace(/^([A-Za-z])%3A/, '$1:')}`;
}

function pathParts(path) {
  const parts = path.replace(/\\/g, '/').split('/').filter(Boolean);
  if (parts.some((part) => part === '.' || part === '..')) throw new Error('Invalid path containing . or ...');
  return parts;
}

export function sameRoot(a, b) {
  const normalize = (s) => s.replace(/\\/g, '/').replace(/\/+$/, '');
  const left = normalize(a), right = normalize(b);
  return /^[A-Za-z]:|^\/\//.test(left) ? left.toLowerCase() === right.toLowerCase() : left === right;
}

/** Components under root, or null for a path outside it. */
export function relativeParts(root, path) {
  const base = pathParts(root), parts = pathParts(path);
  const windows = /^[A-Za-z]:[\\/]|^\\\\/.test(root);
  const normal = (s) => windows ? s.toLowerCase() : s;
  if (parts.length <= base.length || !base.every((part, i) => normal(part) === normal(parts[i]))) return null;
  // Do not match absolute and relative paths, or UNC and local paths.
  if (/^[\\/]/.test(root) !== /^[\\/]/.test(path) || /^\\\\/.test(root) !== /^\\\\/.test(path)) return null;
  return parts.slice(base.length);
}

export async function readDirectory(root, handle, path) {
  const parts = relativeParts(root, path);
  if (!parts) throw new Error('The file is outside the authorised library folder.');
  let dir = handle;
  for (const name of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(name);
  const file = await (await dir.getFileHandle(parts[parts.length - 1])).getFile();
  return new Uint8Array(await file.arrayBuffer());
}

/** Check the selected name and available saved fingerprints without changing the catalogue. */
export async function verifyDirectory(root, handle, samples, fingerprint) {
  const parts = pathParts(root);
  const name = parts[parts.length - 1];
  if (name && !/^[A-Za-z]:$/.test(name) && name.toLocaleLowerCase() !== handle.name.toLocaleLowerCase()) {
    throw new Error(`Selected folder "${handle.name}" does not match "${name}". Choose the library folder shown in Files.`);
  }
  let matched = 0, changed = 0;
  for (const sample of samples.slice(0, 12)) {
    try {
      if (fingerprint(await readDirectory(root, handle, sample.path)) === sample.fp) matched++;
      else changed++;
    } catch (e) {
      if (e.name !== 'NotFoundError') throw e;
      changed++;
    }
    if (matched >= 3) break;
  }
  if (samples.length && !matched) throw new Error('The selected folder does not match the saved analysis, or the checked MIDI files have changed. The library was not changed.');
  return { matched, changed };
}

/** A reader that remembers which route works. `onAccess(route)` hears about changes. */
export function createReader({ serverUrl = 'http://127.0.0.1:8795', onAccess = () => {}, onDirectory = () => {}, fetchImpl = (...a) => fetch(...a) } = {}) {
  let access = '';   // 'file' | 'server' | ''
  let failedAt = 0;
  let directory = null;
  const set = (route) => { if (route !== access) { access = route; onAccess(route); } };

  async function read(path) {
    if (directory && relativeParts(directory.root, path) && directory.permission === 'granted') {
      try {
        return await readDirectory(directory.root, directory.handle, path);
      } catch (e) {
        if (e.name === 'NotAllowedError' || e.name === 'SecurityError') {
          directory.permission = 'prompt';
          onDirectory();
          throw new NoAccess('Access to the MIDI library has expired. Press "Allow MIDI access" to grant it again.');
        }
        if (e.name === 'NotFoundError') throw new Error(`Cannot find "${path}" in the authorised library. It may have moved or been renamed.`);
        throw e;
      }
    }
    // file:// has worked for other files: when this one fails, it is this file (LUNA gives names
    // with accented letters as "?", which no route can read), not the page; the rest go on.
    const fileWorks = access === 'file';
    if (access !== 'server') {
      try {
        const res = await fetchImpl(fileUrl(path));
        const bytes = new Uint8Array(await res.arrayBuffer());
        if (bytes.length) { set('file'); return bytes; }
      } catch { /* file:// not allowed here: try the server */ }
    }
    try {
      const res = await fetchImpl(`${serverUrl}/midi?path=${encodeURIComponent(path)}`);
      if (!res.ok) throw new Error(`servidor: ${res.status} ${await res.text()}`);
      set('server');
      return new Uint8Array(await res.arrayBuffer());
    } catch (e) {
      if (e.message.startsWith('servidor:')) throw e;
      if (fileWorks) {
        set('file');   // still the route that works
        throw new Error(path.includes('?')
          ? 'Cannot read it: LUNA gives its name with "?" in place of a letter with an accent (é, ñ…). Renaming it, or its folder, without accents fixes it.'
          : 'Cannot read it (moved, renamed or locked since the folder was scanned?).');
      }
      failedAt = Date.now();
      set('');
      throw new NoAccess('The page cannot read the file: file:// is blocked and the local helper server does not answer. Press "Allow MIDI access" for the library, or start the helper server.');
    }
  }

  return {
    read,
    setDirectory(root, handle, permission) {
      directory = { root, handle, permission };
      if (permission === 'granted') failedAt = 0;
      onDirectory();
    },
    clearDirectory() { directory = null; onDirectory(); },
    get directory() { return directory; },
    get access() { return access; },
    /** False for a while after both routes failed, so background work backs off. */
    get usable() { return directory?.permission === 'granted' || access !== '' || Date.now() - failedAt > 15000; },
  };
}

// Walking the library folder with LUNA's luna.gui.listFiles (one level per call), and the
// rows of the file table.

/**
 * Walk a folder with luna.gui.listFiles, collecting .mid/.midi files. `retry(error, dir)`
 * may wait (for a reconnect, say) and answer true to try the folder again, up to 3 times.
 */
export async function findMidiFiles(gui, root, { limit = 500000, maxFolders = 50000, onProgress, retry } = {}) {
  const files = [];
  const queue = [root];
  let folders = 0;
  const errors = [];
  while (queue.length && files.length < limit && folders < maxFolders) {
    const dir = queue.shift();
    folders++;
    let entries = null;
    for (let tries = 0; ; tries++) {
      try {
        entries = await gui.listFiles(dir);
        break;
      } catch (e) {
        if (retry && tries < 3 && (await retry(e, dir))) continue;
        errors.push({ path: dir, code: e.code ?? e.message });
        break;
      }
    }
    if (!entries) continue;
    for (const entry of entries) {
      if (entry.isDirectory) queue.push(entry.path);
      else if (/\.midi?$/i.test(entry.name)) files.push(entry);
    }
    if (onProgress && folders % 25 === 0) onProgress(folders, files.length, queue.length);
  }
  return { files: files.slice(0, limit), folders, truncated: queue.length > 0 || files.length >= limit, errors };
}

/**
 * One table row per file: its name, the folder it sits in relative to the root (empty for a
 * file in the root itself), and that folder's full path.
 */
export function fileRows(files, root) {
  const base = root.replace(/[\\/]+$/, '');
  return files.map((f) => {
    const rel = f.path.startsWith(base) ? f.path.slice(base.length).replace(/^[\\/]/, '') : f.path;
    const cut = Math.max(rel.lastIndexOf('\\'), rel.lastIndexOf('/'));
    const dirCut = Math.max(f.path.lastIndexOf('\\'), f.path.lastIndexOf('/'));
    return { name: f.name, folder: cut >= 0 ? rel.slice(0, cut) : '', dir: f.path.slice(0, Math.max(0, dirCut)), path: f.path, key: f.path.toLowerCase() };
  });
}

/** Keep the end of a path, which is what tells folders apart: "…\Artist\Album". */
export function fitStart(text, chars) {
  if (text.length <= chars) return text;
  return `…${text.slice(-(Math.max(4, chars) - 1))}`;
}

/**
 * Rows where every word of the query is in the path or in `extra(row)` (lower-case text such
 * as the file's title and author), case ignored.
 */
export function filterRows(rows, query, extra = () => '') {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return rows;
  return rows.filter((r) => {
    if (words.every((w) => r.key.includes(w))) return true;
    const more = extra(r);
    return !!more && words.every((w) => r.key.includes(w) || more.includes(w));
  });
}

export const baseName = (path) => path.split(/[\\/]/).pop();

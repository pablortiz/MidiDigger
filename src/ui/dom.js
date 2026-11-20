// Small DOM helpers shared by the panels: element lookup, escaping, the log, and running an
// action from a button with its errors logged.

export const $ = (id) => document.getElementById(id);

export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/**
 * The log panel: log / ok / warn / fail, newest at the bottom. `onLine(text, kind)` hears each
 * line. It follows the newest line while the reader is at the bottom; scrolled up to read an
 * older one, it stays there until they scroll back down.
 */
export function createLog(el, onLine = () => {}) {
  const atBottom = () => el.scrollHeight - el.scrollTop - el.clientHeight < 24;
  const stamped = (text, kind = '') => {
    const div = document.createElement('div');
    div.className = kind;
    div.textContent = `${new Date().toLocaleTimeString()}  ${text}`;
    return div;
  };
  const add = (div, text, kind) => {
    const follow = atBottom() || !el.clientHeight;   // a folded log follows (it opens at the end)
    el.append(div);
    while (el.childElementCount > 2000) el.firstElementChild.remove();
    if (follow) el.scrollTop = el.scrollHeight;
    onLine(text, kind);
  };
  const line = (kind) => (text) => add(stamped(text, kind), text, kind);
  /**
   * A line and, under it, a table in aligned columns: `columns` [{ label, num, width }] (num:
   * aligned right; width in characters, the same in every table so they line up one under another),
   * `rows` [{ cells: [text…], dim }] (dim: greyed). A long cell is cut, whole in its tooltip.
   */
  const table = (text, columns, rows) => {
    const div = stamped(text);
    const t = document.createElement('table');
    t.className = 'log-table';
    const tr = (cells, tag, dim = false) => {
      const r = document.createElement('tr');
      if (dim) r.className = 'dim';
      cells.forEach((cell, k) => {
        const td = document.createElement(tag);
        if (columns[k]?.num) td.className = 'num';
        const span = document.createElement('span');
        if (columns[k]?.width) span.style.width = span.style.maxWidth = `${columns[k].width}ch`;
        span.textContent = cell;
        if (tag === 'td') span.title = cell;
        td.append(span);
        r.append(td);
      });
      return r;
    };
    t.append(tr(columns.map((c) => c.label), 'th'));
    for (const row of rows) t.append(tr(row.cells, 'td', row.dim));
    div.append(t);
    add(div, [text, ...rows.map((row) => row.cells.join('  '))].join('\n'), '');
  };
  return {
    log: line(''),
    head: line('head'),
    ok: line('ok'),
    warn: line('warn'),
    fail: line('err'),
    table,
  };
}

/**
 * Run `fn` from a button: disabled meanwhile, errors logged with their code. Actions that
 * change the session pass needsSession; browsing and listening work with none open.
 */
export function makeAct(log, getSession) {
  return async (button, name, fn, needsSession = true) => {
    if (button) button.disabled = true;
    // Listening (▶ Listen, ▶ Explore…) is too frequent to head the log; its errors still show with its name.
    if (!name.startsWith('▶ ')) log.head(`── ${name}`);
    try {
      if (needsSession && !getSession()) throw new Error('No session is open in LUNA.');
      await fn();
    } catch (e) {
      log.fail(`${name}: ${e.code ? `[${e.code}] ` : ''}${e.message}`);
    } finally {
      if (button) button.disabled = false;
    }
  };
}

/** Copy text, falling back to a hidden textarea where the clipboard API is refused. */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = Object.assign(document.createElement('textarea'), { value: text });
    document.body.append(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
}

/** localStorage that never throws (it can be unavailable in some webviews). */
export const prefs = {
  get(key) { try { return localStorage.getItem(`midi-library.${key}`); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(`midi-library.${key}`, value); } catch { /* ignore */ } },
  remove(key) { try { localStorage.removeItem(`midi-library.${key}`); } catch { /* ignore */ } },
};

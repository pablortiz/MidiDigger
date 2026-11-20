// The analysed catalogue as it is stored, raw: its file records, its parts and its fragments,
// filtered by text and sorted by any column, a page at a time. To see what the analysis found.
// Half a million fragments: nothing here makes an object or compares a text per row unless a
// filter or a sort asks for it.

import { ENERGIES, ROLES, SHAPES } from '../midi/features.js';
import { romanProgression } from '../midi/chords.js';
import { GM_PROGRAMS } from '../midi/gm.js';

const PAGE = 100;
const SWITCH_MS = 150;

// The part columns as catalog.js keeps them (density ×10, poly and loopCov in %).
const PART_COLUMNS = ['index', 'file', 'ch', 'program', 'role', 'notes', 'bars', 'density', 'poly', 'min', 'max', 'loopBars', 'loopCount', 'loopCov', 'loopStart', 'name'];
const FRAGMENT_COLUMNS = ['id', 'file', 'ch', 'instrument', 'frag', 'loopBars', 'loopStart', 'atTick', 'ticks', 'loopCount', 'loopCov', 'shape', 'energy', 'chords'];
// File fields that only say where its parts are in the columns.
const HIDDEN_FILE_FIELDS = new Set(['partStart']);

const collator = new Intl.Collator(undefined, { numeric: true });   // one for every comparison: localeCompare makes its own each time
const show = (v) => (v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const formatCell = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return show(value);
  const text = String(value);
  const sign = text.startsWith('-') ? '-' : '';
  const unsigned = sign ? text.slice(1) : text;
  const [whole, fraction] = unsigned.split('.');
  return `${sign}${whole.padStart(3, '0')}${fraction === undefined ? '' : `.${fraction}`}`;
};

function unique(values) {
  return [...new Set(values)].filter((value) => value !== '' && value !== undefined && value !== null)
    .sort((a, b) => collator.compare(show(a), show(b)));
}

/** A cell against a column's filter: ">4", "<=8" or "=16" compare numbers, anything else is text it contains. */
export function matches(value, filter) {
  const f = filter.trim();
  const n = /^(>=|<=|>|<|=)\s*(-?\d+(?:\.\d+)?)$/.exec(f);
  if (!n) return show(value).toLowerCase().includes(f.toLowerCase());
  const v = Number(value);
  if (value === '' || value === undefined || value === null || Number.isNaN(v)) return false;
  const x = Number(n[2]);
  return n[1] === '>' ? v > x : n[1] === '<' ? v < x : n[1] === '>=' ? v >= x : n[1] === '<=' ? v <= x : v === x;
}

export class DataViewer {
  /**
   * `dialog`: the <dialog> to fill; `catalog`: the Catalog (library/catalog.js). `preview`, for a
   * row of Parts or Fragments: draw(id, width, height, whole) gives its thumbnail, play(id, whole)
   * plays or pauses it, playing(id, whole) says if it sounds now, sounding() if anything does.
   * `whole`: the whole channel (Parts), not the loop (Fragments). `backup`: save(status) and
   * restore(status) the analysis as a .mdig (library/backup.js), `status(text)` telling how it goes.
   */
  constructor(dialog, catalog, preview = null, backup = null) {
    this.dlg = dialog;
    this.catalog = catalog;
    this.preview = preview;
    this.hasBackup = !!backup;
    this.tab = 'files';
    dialog.innerHTML = `
      <div class="dv-head">
        <h3>Analysed data</h3>
        <div class="seg dv-tabs" role="radiogroup" aria-label="Table">
          <label><input type="radio" name="dvTab" value="files" checked>Files</label>
          <label><input type="radio" name="dvTab" value="parts">Parts</label>
          <label><input type="radio" name="dvTab" value="fragments">Fragments</label>
        </div>
        <input class="dv-filter grow" type="search" placeholder="filter: rows with this text in any column">
        <button class="dv-help help-btn" title="What does Analyse do?">?</button>
        <label class="dv-search-option" title="Re-read every MIDI file and include each fragment's MIDI events (notes, volume, pan, expression, sustain pedal, pitch bend and tempo) for other tools to play without the MIDI files. Takes longer and makes the file about four times larger. Available Search scores are already saved in the compact analysis."><input class="dv-search-scores" type="checkbox">Include MIDI events</label>
        <button class="dv-save" title="Save the library analysis as a compact .mdig file, to restore it without analysing again (LUNA forgets it when it restarts)">⤓ Save analysis</button>
        <button class="dv-restore" title="Restore matching files and Search gesture scores from a saved .mdig.">⤒ Restore…</button>
        <button class="dv-licence" hidden title="MIDI Digger's licence on this computer: who it is licensed to, its number">✓ Licence…</button>
        <button class="dv-close" title="Close">✕</button>
      </div>
      <div class="dv-scroll"><table class="dv-table"><thead></thead><tbody></tbody></table></div>
      <div class="dv-preview" hidden>
        <button class="dv-play" title="Listen to the selected row, as ▶ in Parts">▶</button>
        <span class="dv-what"></span>
        <div class="dv-mini-box"><div class="dv-mini"></div><i class="dv-playhead" hidden></i></div>
        <button class="dv-open-folder" title="Open the selected file's folder in Explorer">📂 Folder</button>
        <button class="dv-open-tracks" title="Close Data and show the selected file, track or fragment in the track area">↗ Tracks</button>
        <button class="dv-send" title="Send the selected row to LUNA at its cursor, at the session's tempo, as Sound and / or MIDI (the boxes under the song): a fragment its bars, a part its whole channel, a file all its tracks">➜ LUNA</button>
      </div>
      <div class="dv-foot">
        <span class="dv-count"></span>
        <span class="grow"></span>
        <span class="dv-pager">
          <button data-go="first" title="First page">⏮</button><button data-go="prev" title="Previous page">◀</button>
          page <input class="dv-page" type="number" min="1"> / <span class="dv-pages"></span>
          <button data-go="next" title="Next page">▶</button><button data-go="last" title="Last page">⏭</button>
        </span>
        <span class="dv-status"></span>
      </div>`;
    this.q = (sel) => dialog.querySelector(sel);
    // Another table: what its selected row played stops (it is no longer in sight).
    for (const r of dialog.querySelectorAll('input[name="dvTab"]')) {
      r.onchange = () => {
        if (this.pickedPlays()) this.preview.stop();
        this.tab = r.value;
        this.reset();
      };
    }
    // A click on the thumbnail of a file or a part (the whole song): it plays from that point.
    this.q('.dv-mini-box').onclick = (e) => {
      if (this.picked === null || this.tab === 'fragments') return;
      const box = e.currentTarget.getBoundingClientRect();
      const at = Math.max(0, Math.min(1, (e.clientX - box.left) / Math.max(1, box.width)));
      if (this.tab === 'files') this.preview.seek(at, null, this.catalog.files[this.picked].path);
      else this.preview.seek(at, this.picked, this.catalog.part(this.picked).path);
    };
    this.q('.dv-mini-box').ondblclick = () => {
      if (this.tab !== 'fragments' || this.picked === null) return;
      clearTimeout(this.switching);
      this.switching = 0;
      if (!this.pickedPlays()) this.play();
    };
    let wait = 0;
    this.q('.dv-filter').oninput = () => { clearTimeout(wait); wait = setTimeout(() => this.refilter(), 250); };
    this.q('.dv-close').onclick = () => dialog.close();
    // Save and Restore: one at a time, the buttons off meanwhile; restored, the table again.
    const status = (text) => { this.q('.dv-status').textContent = text; };
    const run = async (job) => {
      const buttons = [this.q('.dv-save'), this.q('.dv-restore')];
      for (const b of buttons) b.disabled = true;
      try { await job(status); } catch (e) { status(e.message); } finally { for (const b of buttons) b.disabled = false; }
      this.reset();
    };
    this.q('.dv-save').hidden = this.q('.dv-restore').hidden = !backup;
    this.q('.dv-save').onclick = () => run((status) => backup.save(status, { includeSearchScores: this.q('.dv-search-scores').checked, includeEvents: this.q('.dv-search-scores').checked }));
    this.q('.dv-restore').onclick = () => run((status) => backup.restore(status));
    const rowOf = (e) => e.target.closest('tr[data-i]');
    this.q('tbody').onclick = (e) => { const tr = rowOf(e); if (tr) this.pick(tr); };
    // Its clicks may have started it already: a double click never pauses.
    this.q('tbody').ondblclick = (e) => { if (rowOf(e) && this.picked !== null && !this.preview.sounding()) this.play(); };
    this.q('.dv-play').onclick = () => this.play();
    this.q('.dv-open-folder').onclick = () => this.openContainingFolder();
    this.q('.dv-open-tracks').onclick = () => {
      const selection = this.trackSelection();
      if (!selection || !this.preview?.openInTracks) return;
      dialog.close();
      this.preview.openInTracks(selection);
    };
    this.q('.dv-send').onclick = () => {
      if (this.picked === null) return;
      if (this.tab === 'files') this.preview.sendFile(this.catalog.files[this.picked].path);
      else if (this.rowId(this.picked) !== null) this.preview.send(this.rowId(this.picked), this.tab === 'parts');
    };
    // Captured: arrows on the tabs would change the table. In a text box they stay its own.
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.tab === 'files' && this.picked !== null
          && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey
          && !e.target.closest('button, select, textarea, input:not([type=radio]), [contenteditable="true"]')) {
        e.preventDefault();
        e.stopPropagation();
        clearTimeout(this.switching);
        this.switching = 0;
        if (!this.pickedPlays()) this.play();
        return;
      }
      if ((e.key !== 'ArrowDown' && e.key !== 'ArrowUp') || e.target.matches('input[type=search], input[type=number]')) return;
      e.preventDefault();
      e.stopPropagation();
      this.move(e.key === 'ArrowDown' ? 1 : -1);
    }, true);
    const filterColumn = (e) => {
      if (!e.target.dataset.filter) return;
      this.colFilters[e.target.dataset.filter] = e.target.value;
      clearTimeout(wait);
      wait = setTimeout(() => this.refilter(), 250);
    };
    this.q('thead').oninput = filterColumn;
    this.q('thead').onchange = filterColumn;
    this.q('thead').onclick = (e) => {
      if (e.target.closest('.dv-filter-select')) return;
      const th = e.target.closest('th[data-col]');
      if (!th) return;
      const col = th.dataset.col;
      this.sortDir = this.sortCol === col ? -this.sortDir : 1;
      this.sortCol = col;
      this.sort();
      this.page = 0;
      this.render();
    };
    this.q('.dv-foot').onclick = (e) => {
      const go = e.target.closest('[data-go]')?.dataset.go;
      if (!go) return;
      const last = this.pages() - 1;
      this.page = { first: 0, prev: Math.max(0, this.page - 1), next: Math.min(last, this.page + 1), last }[go];
      this.render();
    };
    this.q('.dv-page').onchange = (e) => {
      this.page = Math.max(0, Math.min(this.pages() - 1, (Number(e.target.value) || 1) - 1));
      this.render();
    };
  }

  open() {
    this.reset();
    this.q('.dv-status').textContent = '';
    this.dlg.showModal();
    // ▶ / ■ follows the player while it is open (a file can take a while to load before it
    // sounds), and the red line over the thumbnail what is heard, every frame.
    clearInterval(this.watch);
    this.watch = setInterval(() => {
      if (this.dlg.open) this.paintPlay();
      else clearInterval(this.watch);
    }, 200);
    const frame = () => {
      if (!this.dlg.open) return;
      this.paintHead();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /** The red line over the thumbnail, where the selected row is heard now; hidden when it is not. */
  paintHead() {
    const head = this.q('.dv-playhead');
    let at = null;
    if (this.picked !== null) {
      const id = this.rowId(this.picked);
      at = this.tab === 'files' ? this.preview.positionFile(this.catalog.files[this.picked].path)
        : id === null ? null : this.preview.position(id, this.tab === 'parts');
    }
    head.hidden = at === null || at === undefined;
    if (!head.hidden) head.style.left = `${(at * 100).toFixed(2)}%`;
  }

  /** Another table, or opened again: its columns, no filter, default fragment order by file and bar. */
  reset() {
    const c = this.catalog;
    if (this.tab === 'files') {
      const keys = new Set(['index']);
      for (const f of c.files) for (const k of Object.keys(f)) if (!HIDDEN_FILE_FIELDS.has(k)) keys.add(k);
      this.columns = [...keys];
      this.total = c.files.length;
    } else if (this.tab === 'fragments') {
      this.columns = FRAGMENT_COLUMNS;
      this.fragments = [];
      for (let i = 0; i < c.size; i++) for (const id of c.fragmentIds(i)) this.fragments.push(id);
      this.total = this.fragments.length;
    } else {
      this.columns = PART_COLUMNS;
      this.total = c.size;
    }
    this.sortCol = this.tab === 'fragments' ? 'file' : null;
    this.sortDir = 1;
    this.picked = null;
    // Another table, other columns: their widths measured again on its first draw.
    this.fixed = false;
    const table = this.q('.dv-table');
    table.querySelector?.('colgroup')?.remove();
    if (table.style) { table.style.width = ''; table.style.tableLayout = ''; }
    this.colFilters = {};
    this.q('.dv-preview').hidden = true;
    this.q('.dv-filter').value = '';
    this.q('.dv-search-option').hidden = !this.hasBackup;
    const dropdowns = this.filterOptions();
    // Built once per table: the render below must not take the focus from a filter being typed in.
    this.q('thead').innerHTML = `<tr>${this.columns.map((col) => `<th data-col="${esc(col)}" title="Sort by ${esc(col)}">${esc(col)}</th>`).join('')}</tr>
      <tr class="dv-col-filters">${this.columns.map((col) => {
        const values = dropdowns.get(col);
        if (values) return `<th><select class="dv-filter-select" data-filter="${esc(col)}" title="Filter ${esc(col)}"><option value="">All</option>${values.map((v) => `<option value="${esc(show(v))}">${esc(show(v))}</option>`).join('')}</select></th>`;
        return `<th><input type="search" data-filter="${esc(col)}" title="Filter ${esc(col)}: text it contains, or a number with > < =, like >4" placeholder="filter"></th>`;
      }).join('')}</tr>`;
    this.refilter();
  }

  /** Unique values for the requested direct-selection filters, without walking every fragment row. */
  filterOptions() {
    const c = this.catalog;
    const options = new Map();
    if (this.tab === 'fragments') {
      const instruments = new Set();
      for (let i = 0; i < c.size; i++) {
        instruments.add(c.cols.role[i] === ROLES.indexOf('drums') ? 'Drums' : GM_PROGRAMS[c.cols.program[i]]);
      }
      options.set('instrument', unique(instruments));
      options.set('shape', unique([...new Set(c.cols.fragShape.subarray(0, c.fragSize))].map((v) => SHAPES[v])));
      options.set('energy', unique([...new Set(c.cols.fragEnergy.subarray(0, c.fragSize))].map((v) => ENERGIES[v])));
    } else if (this.tab === 'parts') {
      options.set('role', unique([...new Set(c.cols.role.subarray(0, c.size))].map((v) => ROLES[v])));
    } else {
      options.set('ok', unique(c.files.map((file) => file.ok)));
    }
    return options;
  }

  /** The part or fragment of row `i` (null for a file). */
  rowId(i) {
    if (this.tab === 'parts') return i;
    return this.tab === 'fragments' ? this.fragments[i] : null;
  }

  /** A row clicked: selected, and what it is shown under the table (a file: the whole song, all its tracks on one strip). */
  pick(tr) {
    const i = Number(tr.dataset.i);
    const file = this.tab === 'files';
    const id = this.rowId(i);
    if ((id === null && !file) || !this.preview || i === this.picked) return;
    const readable = file ? !!this.catalog.files[i]?.ok : id !== null;
    this.q('tr.picked')?.classList.remove('picked');
    tr.classList.add('picked');
    this.picked = i;
    let what;
    if (file) {
      const f = this.catalog.files[i];
      what = `${f.path.split(/[\\/]/).pop()} · ${readable ? 'all its tracks' : 'cannot preview this file'}`;
    } else {
      const p = this.catalog.part(id);
      const whole = this.tab === 'parts';   // a row of Parts is its whole channel, a Fragment its loop
      what = `${p.instrument} · ${p.path.split(/[\\/]/).pop()} · ch ${p.ch} · ${whole ? 'the whole channel' : p.loopBars ? `${p.loopBars} bar${p.loopBars > 1 ? 's' : ''} from bar ${p.loopStart}` : 'the whole part'}`;
    }
    this.q('.dv-what').textContent = what;
    this.q('.dv-what').title = what;   // the box has a fixed width: a long name is cut
    this.q('.dv-mini').replaceChildren();
    this.q('.dv-preview').hidden = false;
    this.q('.dv-play').hidden = !readable;
    this.q('.dv-mini-box').hidden = !readable;
    this.q('.dv-mini-box').title = this.tab === 'fragments' ? 'Double-click to play this fragment' : 'Click to play from this point';
    this.q('.dv-send').hidden = !readable;
    this.q('.dv-open-tracks').hidden = !readable || !this.preview?.openInTracks;
    this.q('.dv-open-folder').hidden = !file;
    if (!readable) return;
    this.paintPlay();
    // Drawn at the size it is shown, not stretched: the whole song, sharp.
    const box = this.q('.dv-mini');
    const scale = globalThis.devicePixelRatio || 1;
    const [w, h] = [Math.round(box.clientWidth * scale), Math.round(box.clientHeight * scale)];
    (file ? this.preview.drawFile(this.catalog.files[i].path, w, h) : this.preview.draw(id, w, h, this.tab === 'parts'))
      .then((canvas) => { if (this.picked === i) box.replaceChildren(canvas); }).catch(() => {});
    // Listening goes on with the row picked; after a moment, so that holding an arrow down
    // does not start every row it passes.
    if (this.preview.sounding() || this.switching) {
      clearTimeout(this.switching);
      this.switching = setTimeout(() => { this.switching = 0; this.play(); }, SWITCH_MS);
    }
  }

  /** Open the containing folder of the selected file in the Files table. */
  openContainingFolder() {
    if (this.tab !== 'files' || this.picked === null || !this.preview?.revealFile) return;
    return this.preview.revealFile(this.catalog.files[this.picked].path);
  }

  /** The selected catalogue row, ready to show in the main track area. */
  trackSelection() {
    if (this.picked === null) return null;
    if (this.tab === 'files') return { kind: 'file', path: this.catalog.files[this.picked].path };
    const id = this.rowId(this.picked);
    if (id === null) return null;
    const part = this.catalog.part(id);
    return {
      kind: this.tab === 'parts' ? 'part' : 'fragment',
      path: part.path,
      partId: id,
      ch: part.ch,
      atTick: part.atTick,
      ticks: part.ticks,
      frag: part.frag,
    };
  }

  /** The row `step` places on from the selected one, turning the page when needed. */
  move(step) {
    if ((this.rowId(0) === null && this.tab !== 'files') || !this.rows.length) return;
    const at = this.picked === null ? (step > 0 ? -1 : this.rows.length) : this.rows.indexOf(this.picked);
    const next = Math.max(0, Math.min(this.rows.length - 1, at + step));
    const page = Math.floor(next / PAGE);
    if (page !== this.page) { this.page = page; this.render(); }
    const tr = this.q(`tr[data-i="${this.rows[next]}"]`);
    if (!tr) return;
    tr.scrollIntoView?.({ block: 'nearest' });
    this.pick(tr);
  }

  /** Is the selected row the one sounding? */
  pickedPlays() {
    if (this.picked === null) return false;
    if (this.tab === 'files') return this.preview.playingFile(this.catalog.files[this.picked].path);
    const id = this.rowId(this.picked);
    return id !== null && this.preview.playing(id, this.tab === 'parts');
  }

  /** ▶ plays the selected row; ■, while it sounds, stops it. */
  play() {
    if (this.picked === null) return;
    if (this.tab === 'files' && !this.catalog.files[this.picked]?.ok) return;
    if (this.tab !== 'files' && this.rowId(this.picked) === null) return;
    if (this.pickedPlays()) this.preview.stop();
    else if (this.tab === 'files') this.preview.playFile(this.catalog.files[this.picked].path);
    else this.preview.play(this.rowId(this.picked), this.tab === 'parts');
    this.paintPlay();   // a stop shows at once; a start when it sounds (open())
  }

  paintPlay() {
    if (this.picked === null) return;
    const plays = this.pickedPlays();
    const btn = this.q('.dv-play');
    if (btn.textContent !== (plays ? '■' : '▶')) {
      btn.textContent = plays ? '■' : '▶';
      btn.title = plays ? 'Stop' : 'Listen to the selected row, as ▶ in Parts';
    }
  }

  /** A cell's value, as stored: row `i` of the files, the parts or the fragments. */
  value(i, col) {
    const c = this.catalog;
    if (col === 'index') return i;
    if (this.tab === 'files') return c.files[i][col];
    if (this.tab === 'fragments') {
      if (col === 'id') return i;
      // Row after row asks for every column of the same fragment: its object made once.
      if (this.seen?.i !== i || this.seen.id !== this.fragments[i]) this.seen = { i, id: this.fragments[i], part: c.part(this.fragments[i]) };
      const p = this.seen.part;
      if (col === 'chords') return romanProgression(p.chords);
      return col === 'file' ? p.path : p[col];
    }
    const k = c.cols;
    if (col === 'file') return c.files[k.file[i]].path;
    if (col === 'role') return ROLES[k.role[i]];
    if (col === 'name') return c.names[i];
    return k[col][i];
  }

  refilter() {
    this.seen = null;
    const words = this.q('.dv-filter').value.toLowerCase().split(/\s+/).filter(Boolean);
    const rows = [];
    const filters = Object.entries(this.colFilters).filter(([, f]) => f.trim());
    for (let i = 0; i < this.total; i++) {
      if (!filters.every(([col, f]) => matches(this.value(i, col), f))) continue;
      if (words.length) {
        const text = this.columns.map((col) => show(this.value(i, col))).join(' ').toLowerCase();
        if (!words.every((w) => text.includes(w))) continue;
      }
      rows.push(i);
    }
    this.rows = rows;
    this.sort();
    this.page = 0;
    this.render();
  }

  /**
   * Fragments by file, then track (channel), then where they start (loopStart, then tick): going
   * down the table runs through each track of a song left to right. Straight from the columns:
   * the files ranked by name once, then only numbers are compared.
   */
  sortByFile() {
    const c = this.catalog;
    const k = c.cols;
    const rank = new Uint32Array(c.files.length);
    c.files.map((f, i) => i).sort((a, b) => collator.compare(c.files[a].path, c.files[b].path) || a - b).forEach((f, at) => { rank[f] = at; });
    const n = this.fragments.length;
    const [file, start, ch, tick] = [new Uint32Array(n), new Uint16Array(n), new Uint8Array(n), new Uint32Array(n)];
    for (const i of this.rows) {
      const id = this.fragments[i];
      const part = id % 2 ** 32;   // a fragment's id: its part, and which of its fragments above 2^32 (catalog.js)
      const at = k.fragFirst[part] + Math.floor(id / 2 ** 32);
      file[i] = rank[k.file[part]];
      start[i] = k.fragStart[at];
      ch[i] = k.ch[part];
      tick[i] = k.fragAt[at];
    }
    const d = this.sortDir;
    this.rows.sort((a, b) => d * (file[a] - file[b] || ch[a] - ch[b] || start[a] - start[b] || tick[a] - tick[b] || a - b));
  }

  sort() {
    const col = this.sortCol;
    if (!col) return;
    if (this.tab === 'fragments' && col === 'file') return this.sortByFile();
    const d = this.sortDir;
    const key = new Array(this.total);
    let numbers = true;
    for (const i of this.rows) {
      key[i] = this.value(i, col);
      if (typeof key[i] !== 'number') numbers = false;
    }
    // Texts: the different ones put in order once (few, repeated in many rows), each row its place.
    if (!numbers) {
      const texts = new Map();
      for (const i of this.rows) texts.set(key[i] = show(key[i]), 0);
      [...texts.keys()].sort(collator.compare).forEach((text, at) => texts.set(text, at));
      for (const i of this.rows) key[i] = texts.get(key[i]);
    }
    this.rows.sort((a, b) => d * (key[a] - key[b]) || a - b);
  }

  pages() { return Math.max(1, Math.ceil(this.rows.length / PAGE)); }

  /** The page in sight: the header's arrows, its rows, the count and the pager. */
  render() {
    this.seen = null;
    const arrow = (col) => (col === this.sortCol ? (this.sortDir > 0 ? ' ▲' : ' ▼') : '');
    for (const th of this.q('thead').querySelectorAll?.('th[data-col]') ?? []) th.textContent = th.dataset.col + arrow(th.dataset.col);
    const n = this.rows.length;
    this.page = Math.max(0, Math.min(this.pages() - 1, this.page ?? 0));
    const from = this.page * PAGE;
    const page = this.rows.slice(from, from + PAGE);
    const rows = page.map((i, k) => {
      const cls = [k % 2 ? 'odd' : '', i === this.picked ? 'picked' : ''].filter(Boolean).join(' ');
      return `<tr data-i="${i}"${cls ? ` class="${cls}"` : ''}>${this.columns.map((col) => {
        const s = esc(formatCell(this.value(i, col)));
        return `<td title="${s}">${s}</td>`;
      }).join('')}</tr>`;
    });
    this.q('tbody').innerHTML = rows.join('');
    this.q('.dv-scroll').scrollTop = 0;
    const of = n === this.total ? n.toLocaleString() : `${n.toLocaleString()} (of ${this.total.toLocaleString()})`;
    this.q('.dv-count').textContent = n ? `Rows ${(from + 1).toLocaleString()}–${(from + page.length).toLocaleString()} of ${of}` : `No rows (of ${this.total.toLocaleString()})`;
    this.q('.dv-page').value = this.page + 1;
    this.q('.dv-pages').textContent = this.pages().toLocaleString();
    // Measured once a table has rows: the columns' widths, kept.
    if (!this.fixed && rows.length && this.q('.dv-table').querySelector) {
      const table = this.q('.dv-table');
      const ths = [...this.q('thead').querySelectorAll('tr:first-child th')];
      const widths = ths.map((th) => th.offsetWidth);
      if (widths.every((w) => w > 0)) {
        table.querySelector('colgroup')?.remove();
        table.insertAdjacentHTML('afterbegin', `<colgroup>${widths.map((w) => `<col style="width:${w}px">`).join('')}</colgroup>`);
        table.style.width = `${widths.reduce((a, b) => a + b, 0)}px`;
        table.style.tableLayout = 'fixed';
        this.fixed = true;
      }
    }
  }
}

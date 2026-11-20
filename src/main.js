// MIDI library for LUNA: entry point. Wires the library (scan, catalogue, background
// indexing), the part search, the selected file (info, preview, loops) and what goes to LUNA.
// Built by Vite into dist/main.js, one classic script (Windows loads add-ons from file://).

import './styles.css';
import { $, copyText, createLog, esc, makeAct, prefs } from './ui/dom.js';
import { addCollection, addFavorite, collectionsWith, decodeFavorites, emptyFavorites, encodeFavorites, favoriteSig, mergeFavorites, moveCollection, removeCollection, removeFavorite, renameCollection } from './library/favorites.js';
import { VirtualTable } from './ui/virtual-table.js';
import { initSplitter, initVerticalSplitter } from './ui/splitter.js';
import { chooseFile } from './ui/file-picker.js';
import { InfoPanel } from './ui/info-panel.js';
import { findMidiFiles, fileRows, filterRows, baseName, fitStart } from './library/scanner.js';
import { createReader, NoAccess, sameRoot, verifyDirectory } from './library/reader.js';
import { createStore, readLegacyIndex } from './library/store.js';
import { Catalog, compactSearchScores, hasSearchScores } from './library/catalog.js';
import { Indexer } from './library/indexer.js';
import { ANALYSIS_EXT, analysisFile, encodeAnalysis, fingerprint, matchAnalysis, readAnalysis } from './library/backup.js';
import { parseMidi, formatTime, keyLabel } from './midi/parser.js';
import { EARLY, arrangement, extractNotes, noteBar, fragmentSequence, gridPlan, lanesSong, lanePlacements, songPlace, transposeBetween } from './midi/parts.js';
import { GM_FAMILIES, GM_PROGRAMS } from './midi/gm.js';
import { progressionFit, romanProgression } from './midi/chords.js';
import { grooveFit, grooveText, grooveUnion } from './midi/groove.js';
import { HARMONY_GOOD, HARMONY_MODEL, HARMONY_OK, harmonyFit, transposed } from './midi/harmony.js';
import { JOINT_GOOD, JOINT_OK, RHYTHM_GOOD, RHYTHM_MODEL, RHYTHM_OK, jointScore, rhythmFeatures, rhythmScore } from './midi/rhythm.js';
import { PHRASE, ROLE_BIT, compose, drumTurns, learn, rolesText } from './midi/director.js';
import { FILL_MIN_DURATION_FIT, FILL_MIN_SCORE, NEAR_SAME, likeness, activityLevel, diverseTop, familyOf, fillFragmentKey, fillInstrumentKey, fillScoreBreakdown, preferSharedArrangementCandidate, preferredArrangementSource, rankFillCandidates, scoreFillCandidate, unseenFillCandidates, unseenFillFragments } from './midi/fill.js';
import { buildFillSummary, SUMMARY_GOOD_SCORE } from './midi/fill-summary.js';
import { smfOf } from './midi/writer.js';
import { METERS, adaptRow, addRow, arrangementMaterial, barBeats, channelOf, clearBars, cutClip, clipFrom, layRow, layRowRange, loopBars, padBars, loopFile, loopGrid, loopGrooves, loopHits, loopInfo, loopProgression, loopTrackNames, loopSong, meterBeats, meterPulses, newLoop, padSpans, placeClip, placeClipsAsRows, placeRuns, rangeClip, readLoop, replaceSlot, rowClip, setMeter, slotRuns, tuneLoop } from './midi/loop.js';
import { baselineFill } from './midi/loop-confirmations.js';
import { fragmentsSongLoop, planSongImport, remixSongLoop } from './midi/song-loop.js';
import { LoopPanel } from './ui/loop-panel.js';
import { closeGroupedFillReview, fillChainPass, fillReviewGroups, fillReviewRow, fillTablesNeedRefresh, nextFillChainIndex, playableFillGroups, rememberFillReviewRows, restoreFillReviewRows, stepFillChainIndex, wirePlaylistControls } from './ui/fill-review.js';
import { copyFingerprintGrid, fingerprintBars } from './ui/fill-fingerprint.js';
import { fillMidiGrid, loopMidiGrid } from './ui/fill-midi-grid.js';
import { LoopSoundPicker } from './ui/loop-sound-picker.js';
import { SoundTester, presetKeys } from './ui/sound-tester.js';
import { RECORD_VERSION, ROLE_NAMES, keyClass, partFeatures, songKeyOf } from './midi/features.js';

import { PreviewPlayer } from './preview/player.js';
import { findSoundFontPreset, SoundFontEngine } from './preview/sf-engine.js';
import { LunaMidiOut, LunaTrackOutput } from './preview/luna-out.js';
import { drawFragmentMini, drawPartMini, drawSongMini, noteColor } from './ui/mini.js';
import { Timeline } from './ui/timeline.js';
import { FAMILY_ICONS, ROLE_ICONS, instrumentSvg } from './ui/family-icons.js';
import { DataViewer } from './ui/data-viewer.js';
import { SEND_HEAD, addMixToTrack, addNotesToTrack, addParts, addStems, channelWhat, programAt, tableRow } from './luna/bridge.js';
import { renderPart } from './preview/render.js';
import { every, tickerInBackground } from './preview/ticker.js';
import { sessionTarget } from './midi/session-fit.js';
import { onsetsOf, strongHits } from './midi/audio-onsets.js';
import { analyseTrack, wavSegment } from './midi/audio-analysis.js';
import { BUY_URL, TRIAL_DAYS, createLicence } from './licence.js';

const LOOP_BAR_LENGTHS = [1, 2, 4, 8, 12, 16];   // the lengths a passage is rounded up to
const loopRound = (bars) => LOOP_BAR_LENGTHS.find((L) => L >= bars) ?? bars;

// An error opens the log so it stays visible.
const log = createLog($('log'), (_text, kind) => {
  if (kind === 'err' && $('right').classList.contains('log-closed')) setLogOpen(true);
});
let luna = null;
let session = null;
const act = makeAct(log, () => session);

/**
 * An error nothing else reports (in a timer, an event, a row of a list) said in the log, each
 * once: inside LUNA there is no console, and without this a search that fails just does nothing.
 */
const reportError = (() => {
  const said = new Set();
  return (error, where = '') => {
    const text = String(error?.message ?? error ?? 'unknown error');
    // (Chrome's notice that a ResizeObserver will run again next frame: not an error.)
    if (/^ResizeObserver loop/.test(text) || said.has(text) || said.size > 50) return;
    said.add(text);
    log.fail(`${where || 'Something'} failed: ${text}. If it keeps happening, say what you were doing when it did.`);
  };
})();
window.addEventListener('error', (e) => reportError(e.error ?? e.message));
window.addEventListener('unhandledrejection', (e) => reportError(e.reason));

const store = createStore();
const catalog = new Catalog();
const reader = createReader({
  onAccess: (route) => showAccess(route),
  onDirectory: () => { showAccess(reader.access); showDirectoryAccess(); },
});
let sendingToLuna = false;
const indexer = new Indexer({
  store, catalog, reader,
  onProgress: () => onIndexProgress(),
  onFileStart: () => requestAnimationFrame(showCatalogStatus),
  onWarning: (record) => log.warn(`${record.path}: ${record.limited}`),
  onStop: (reason) => onIndexStop(reason),
  isBusy: () => player.playing || sendingToLuna,   // never under the preview or an export
});
const player = new PreviewPlayer();
let index = null;      // { root, paths, at, unread }
let current = null;    // { path, info }

const info = new InfoPanel(log);

/**
 * The preview state, one place like midiGrid's: the channels marked in the timeline (what is
 * heard and what goes to LUNA; none marked = all heard), the timeline's region and whether its
 * loop is on. The player reads them live, so every change is heard at once.
 */
const marked = new Set();

let audition = null;   // the part (catalogue index) playing alone from Parts, or null
let auditionBack = null;   // what played before it: { playing, pos }
let auditionRow = null;    // the fragments it goes through, in song order, or null
let auditionPlaces = [];   // where each of them plays: { startSec, endSec }
let listenTurn = 0;        // counts what was asked to sound: only the latest gets there
let pendingListen = null;  // the fragment asked to sound alone, its song still being read
let pageWired = false;     // wire() has run: what is painted from the page's state may be
let heardIn = null;        // a part sounding apart, in its song's seconds: { pieces (songPlace), duration }
let loopMode = false;      // the active workspace is a loop, not the song
let loopListen = null;     // what plays over it from Parts: { id, clip, program, drums, transpose }
let fillChain = null;      // The focused row's ▶▶ chain, if any.
const fillChains = new Map();   // One independent ▶▶ chain per loop row.
let fillChainGroup = null;      // Group currently controlled in Fill details / the chain strip.
let activeLoopTab = null;
let activeMidiTab = null;
let partDragged = 0;  // when a part was last dropped (the click that follows is not a click)

// The selected file's arrangement: pick the bars (and channels) to hear and to take to LUNA.
const timeline = new Timeline($('timeline'), {
  // The song as it is, its notes only: the fragments' colours were more confusing than useful
  // here (Explore, in New loop, still shows them).
  showFragments: false,
  isPicked: (ch) => marked.has(ch),
  // A lane's ▶ shows ⏸ only when that lane sounds alone: the main ▶ playing all of them leaves it.
  isSounding: (ch) => player.playing && audition === null && player.channels?.size === 1 && player.channels.has(ch),
  onPickToggle(ch) {
    if (marked.has(ch)) marked.delete(ch);
    else marked.add(ch);
    applyChannels();
  },
  onSolo(ch) {
    endAudition(false);
    const soloNow = player.playing && marked.size === 1 && marked.has(ch);
    if (soloNow) { togglePlay(); return; }
    marked.clear();
    marked.add(ch);
    applyChannels();
    if (timeline.pickedFragments(ch).length) playFragments(ch);
    else if (player.chain) applyLoop();
    if (!player.playing) void startPlaying();
  },
  onFragments(ch) {
    // Playing that lane's row of fragments: it changes as they are picked.
    if (!player.chain || !marked.has(ch)) return;
    if (timeline.pickedFragments(ch).length) playFragments(ch);
    else applyLoop();
  },
  onRegion(range, { final, created }) {
    applyLoop();
    if (created && final && !player.playing) void startPlaying();   // a new region plays at once
  },
  onToggleLoop() {
    timeline.setLoopOn(!timeline.loopOn);
    applyLoop();
    if (timeline.loopOn && !player.playing) void startPlaying();
  },
  onClearRegion: () => applyLoop(),
  onSeek(sec) {
    // Clicking outside the looping region turns the loop off and plays from there.
    const r = timeline.range;
    if (timeline.loopOn && r && (sec < current.info.tickToSec(r.startTick) || sec >= current.info.tickToSec(r.endTick))) {
      timeline.setLoopOn(false);
      applyLoop();
    }
    if (player.playing) player.seekSong(sec);
    else void startPlaying(sec);
  },
  onPlayPause: () => mainPlay(),
});
/** How files are read stays out of sight unless they cannot be read at all. */
function showAccess(route) {
  const direct = reader.directory?.permission === 'granted';
  $('access').textContent = route || direct ? '' : 'cannot read files';
  $('access').title = direct ? 'Library files read through the authorised folder' : route === 'file' ? 'Files read through file://' : route === 'server' ? 'Files read through the local helper server' : '';
  $('access').className = route || direct ? 'okc' : 'warnc';
}

function showDirectoryAccess() {
  const button = $('allowMidi');
  button.hidden = !index || reader.directory?.permission === 'granted';
  button.textContent = reader.directory?.permission === 'prompt' ? 'Reconnect MIDI access…' : 'Allow MIDI access…';
  button.title = index ? `Allow direct reading of ${index.root}, without the helper server` : '';
  if (reader.directory?.permission === 'granted' && $('midiAccessDlg').open) $('midiAccessDlg').close();
}

let startupAccessChecked = false;
async function offerStartupMidiAccess() {
  if (startupAccessChecked || !index?.paths.length) return;
  startupAccessChecked = true;
  const library = index;
  if (reader.directory?.permission === 'granted') return;
  // The folder was authorised and has lost its permission (LUNA restarted): say so at once, even
  // when the helper server or file:// can read the files, as the folder is how you chose to read them.
  const lost = reader.directory?.permission === 'prompt';
  if (!lost) {
    if (reader.access) return;
    try {
      await reader.read(library.paths[0]);
    } catch (error) {
      if (!(error instanceof NoAccess)) log.warn(`Could not check MIDI library access: ${error.message}`);
    }
  }
  if (index !== library || reader.directory?.permission === 'granted' || (!lost && reader.access)) return;
  $('midiAccessRoot').textContent = library.root;
  $('midiAccessError').hidden = true;
  $('midiAccessReconnect').textContent = reader.directory?.permission === 'prompt' ? 'Reconnect MIDI access…' : 'Allow MIDI access…';
  $('midiAccessDlg').showModal();
}

// ── library tabs ────────────────────────────────────────────────────────────────────────

function showTab(name) {
  // (Leaving Fill details stops the fragment it is playing alone, as closing it did.)
  if (name !== 'fill' && !(name === 'summary' && loopListen?.summaryReview) && loopListen?.fillReview) stopFillListen();
  for (const t of ['files', 'parts', 'favorites', 'summary', 'fill']) {
    $(`tab-${t}`).classList.toggle('on', t === name);
    $(`pane-${t}`).hidden = t !== name;
  }
  paintFillTabs();
  // Each active playlist has its own controls above the library tabs.
  paintChainStrip();
  document.body.classList.toggle('parts-tab', name === 'parts');
  if (name === 'parts') { failedMini.clear(); searchParts({ keepScroll: true, preserveOrder: true }); }
  else if (name === 'favorites') renderFavorites();
  else if (name === 'summary') renderSummary();
  else if (name === 'fill') renderFillDetails();
  else fileTable.renderSoon();
}

// ── files tab ───────────────────────────────────────────────────────────────────────────

let allFileRows = [];

const fileTable = new VirtualTable($('fileBody'), {
  key: (r) => r.path,
  renderRow(r, el) {
    const f = catalog.file(r.path);
    el.innerHTML = '<span class="c-name"></span><span class="c-title"></span><span class="c-author"></span><span class="c-num"></span><span class="c-num c-bpm"></span><span class="c-folder"></span>';
    const [name, title, author, dur, bpm, folder] = el.children;
    name.textContent = r.name;
    name.title = r.name;
    title.textContent = f?.title ?? '';
    title.title = f?.title ?? '';
    author.textContent = f?.author ?? '';
    author.title = f?.author ?? '';
    dur.textContent = f ? (f.ok ? formatTime(f.dur) : 'damaged') : '';
    bpm.textContent = f?.ok ? String(Math.round(f.bpm)) : '';
    folder.textContent = fitStart(r.dir, folderChars());
    folder.title = r.dir;
    if (f && !f.ok) el.classList.add('bad');
    if (r.dropped) { el.classList.add('dropped'); name.title = `${r.name}\nDropped here from Explorer (not in this folder)`; }
  },
  // In New loop a file is looked at in Explore, not opened: the loop keeps playing.
  onClick: (r) => fileClicked(r.path),
  // Double click: open it and play (the clicks before it have already started loading it).
  onDblClick: (r) => fileClicked(r.path, { then: () => { if (!player.playing) void startPlaying(); } }),
});

/** How many characters of a path fit in the folder column now (about 6.4 px each at 13 px). */
function folderChars() {
  const w = document.querySelector('#pane-files .thead .c-folder')?.offsetWidth ?? 200;
  return Math.max(8, Math.floor(w / 6.4));
}

function applyFileFilter() {
  const rows = filterRows(allFileRows, $('filter').value, (r) => catalog.metaText(r.path));
  fileTable.setItems(rows);
  $('fileCount').textContent = rows.length === allFileRows.length ? `${allFileRows.length.toLocaleString()} files` : `${rows.length.toLocaleString()} of ${allFileRows.length.toLocaleString()}`;
}

/** With no library yet, the file table gives way to the "choose your folder" welcome. */
function showLibraryEmpty(empty) {
  $('fileEmpty').hidden = !empty;
  $('fileBody').hidden = empty;
  document.querySelector('#pane-files .thead').hidden = empty;
}

function setIndex(next) {
  if (reader.directory && !sameRoot(reader.directory.root, next.root)) reader.clearDirectory();
  index = next;
  showDirectoryAccess();
  showLibraryEmpty(false);
  $('root').value = next.root;
  allFileRows = fileRows(next.paths.map((path) => ({ path, name: baseName(path) })), next.root);
  applyFileFilter();
  $('indexInfo').textContent = next.at ? `scanned ${new Date(next.at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}` : '';
  showCatalogStatus();
}

async function allowMidiAccess() {
  if (!index) throw new Error('Choose a MIDI library first.');
  const root = index.root;
  const saved = reader.directory;
  if (saved && sameRoot(saved.root, root) && saved.permission === 'prompt') {
    const permission = await saved.handle.requestPermission({ mode: 'read' });
    reader.setDirectory(root, saved.handle, permission);
    if (permission !== 'granted') throw new Error('MIDI folder access was not granted. Press Allow MIDI access to choose the folder again.');
  } else {
    if (typeof globalThis.showDirectoryPicker !== 'function') throw new Error('This LUNA browser does not support direct folder access. Use the local helper server instead.');
    let handle;
    try {
      handle = await globalThis.showDirectoryPicker({ mode: 'read' });
    } catch (e) {
      if (e.name === 'AbortError') { log.log('MIDI folder selection cancelled.'); return; }
      throw e;
    }
    if (!window.confirm(`Confirm that you selected this exact library folder:\n\n${root}\n\nThe browser cannot report the full path of the selected folder.`)) {
      log.log('MIDI folder access cancelled; the library was not changed.');
      return;
    }
    working('Checking the selected MIDI library…');
    try {
      const samples = [];
      for (const path of index.paths) {
        const fp = catalog.file(path)?.fp;
        if (fp && !path.includes('?')) samples.push({ path, fp });
        if (samples.length === 12) break;
      }
      const checked = await verifyDirectory(root, handle, samples, fingerprint);
      if (!index || !sameRoot(index.root, root)) throw new Error('The library changed while selecting the folder. Please try again.');
      await store.set('libraryDirectory', { root, handle });
      reader.setDirectory(root, handle, 'granted');
      if (!checked.matched) log.warn('No saved fingerprints were available to verify the selected folder; its full path was confirmed by you.');
      else if (checked.changed) log.warn(`${checked.changed} checked MIDI files were missing or changed; other files matched the saved analysis.`);
    } finally {
      working(null);
    }
  }
  log.ok('MIDI library access granted. The existing catalogue was kept.');
  failedMini.clear();
  fileTable.renderSoon();
  partTable.renderSoon();
}

/**
 * The page at work on something the user must wait for (the library read, the folder listed):
 * a veil over everything saying `text`, so no button is pressed meanwhile, with mouse or keys.
 * `working(null)`: done. The page starts under it (index.html) until connect() lifts it.
 */
function working(text) {
  const veil = $('busy');
  if (!veil) return;
  if (text) $('busyText').textContent = text;
  if (veil.hidden === !text) return;
  veil.hidden = !text;
  for (const el of document.body.children) if (el !== veil && el.tagName !== 'DIALOG') el.inert = !!text;
}

async function waitConnected(ms = 30000) {
  const until = Date.now() + ms;
  while (luna.status.value !== 'connected' && Date.now() < until) await new Promise((r) => setTimeout(r, 250));
  return luna.status.value === 'connected';
}

async function chooseFolder() {
  const typed = $('root').value.trim();
  const [folder] = await luna.gui.chooseFolders({ title: 'Choose your MIDI library folder', ...(typed ? { defaultPath: typed } : {}) });
  if (!folder) return log.log('Cancelled.');
  $('root').value = folder;
  await scanFolder();
}

/**
 * Another folder: what was analysed of the one before goes, so Files, Parts and Data
 * all speak of the new one. The song loaded and the loop stay (they read their files by path).
 */
async function forgetLibrary() {
  indexer.reset();
  catalog.clear();
  miniCache.clear();
  failedMini.clear();
  shownFrag.clear();
  clearPartFilters();
  searchParts();
  await store.clearFiles();
}

async function scanFolder() {
  if (!luna || !(await luna.gui.available())) throw new Error('LUNA is not connected.');
  if (indexer.running) indexer.pause();
  const root = $('root').value.trim();
  if (!root) return chooseFolder();
  working(`Listing the MIDI files of ${root}…`);
  try {
    await listFolder(root);
  } finally {
    working(null);
  }
}

/** scanFolder's work, under the veil: `root` listed, kept and shown. */
async function listFolder(root) {
  const t0 = performance.now();
  let reconnects = 0;
  const { files, folders, errors } = await findMidiFiles(luna.gui, root, {
    onProgress: (f, n, pending) => {
      $('fileCount').textContent = `scanning… ${f} folders, ${n.toLocaleString()} files, ${pending} to go`;
      working(`Listing the MIDI files of ${root}… ${n.toLocaleString()} files in ${f.toLocaleString()} folders, ${pending.toLocaleString()} folders to go`);
    },
    retry: async (e) => {
      if (!['disconnected', 'timeout', 'not_running'].includes(e.code)) return false;
      reconnects++;
      $('fileCount').textContent = 'connection lost, waiting for LUNA…';
      working('Connection lost, waiting for LUNA…');
      return waitConnected();
    },
  });
  const denied = errors.filter((e) => e.code === 'uasrv.not_permitted');
  if (denied.length && denied[0].path === root) throw new Error(`LUNA does not allow reading ${root}: choose it with "Choose folder…".`);
  log.ok(`${files.length.toLocaleString()} MIDI files in ${folders} folders, ${((performance.now() - t0) / 1000).toFixed(1)} s${reconnects ? `, ${reconnects} retries after losing the connection` : ''}.`);
  if (errors.length) {
    const byCode = {};
    for (const e of errors) byCode[e.code] = (byCode[e.code] ?? 0) + 1;
    log.warn(`  ${errors.length} folders not read: ${Object.entries(byCode).map(([c, n]) => `${n} ${c}`).join(', ')}.`);
    const mangled = errors.filter((e) => e.path.includes('?')).length;
    if (mangled) log.warn(`  ${mangled} with accents or special letters in their names: LUNA returns them with "?" and cannot find them. Renaming them without accents fixes it.`);
  }
  const next = { root, paths: files.map((f) => f.path), at: Date.now(), unread: errors.length };
  if (index?.root !== root) await forgetLibrary();
  await store.set('index', next);
  void rememberRoot(root);
  setIndex(next);
  // Listing finds the files; the user starts analysis with Analyse.
  const left = next.paths.filter((p) => !catalog.current(p)).length;
  if (left) log.log(`${left.toLocaleString()} files not analysed yet: press "Analyse" to search their parts and loops.`);
}

// LUNA 3.1.1 on Windows clears the pages' storage (IndexedDB, localStorage) every time it
// starts (seen: its webview_storage folder is made anew at launch). The library folder is
// therefore also kept in luna.secrets (the OS credential store, which lasts), and listed
// again on its own when the rest was lost.
const ROOT_KEY = 'library.root';

async function rememberRoot(root) {
  try { await luna.secrets.set(ROOT_KEY, root); } catch { /* kept for this run only */ }
}

/** After a LUNA restart wiped the library: the remembered folder again, scanned anew. */
async function restoreLibrary() {
  if (index) { void rememberRoot(index.root); return; }   // the saved library survived
  let root = null;
  try { root = await luna.secrets.get(ROOT_KEY); } catch { /* none */ }
  if (!root) return;
  $('root').value = root;
  log.log(`LUNA cleared the saved library when it restarted: scanning ${root} again.`);
  await act(null, 'Scan folder', scanFolder, false);
}

// ── catalogue status and background indexing ────────────────────────────────────────────

function showCatalogStatus() {
  const s = catalog.stats(index?.paths);
  const total = index?.paths.length ?? 0;
  const inIndex = s.files;
  const searchScores = catalog.searchScoreStats(index?.paths ?? []);
  const needsSearch = index?.paths.some((path) => indexer.needsAnalysis(path)) ?? false;
  const pct = total ? Math.round((inIndex / total) * 100) : 0;
  $('catBar').style.width = `${pct}%`;
  const done = total && inIndex >= total && !needsSearch;
  let text;
  if (!total) text = 'No library yet';
  else if (done) text = `${total.toLocaleString()} files analysed · ${s.parts.toLocaleString()} parts`;
  else if (indexer.running) {
    const { elapsedSec, leftSec } = indexer.rate;
    const elapsed = elapsedSec >= 60 ? `${Math.floor(elapsedSec / 60)} min elapsed` : `${Math.floor(elapsedSec)} s elapsed`;
    const remaining = Number.isFinite(leftSec) && leftSec > 30
      ? ` · ~${leftSec >= 3600 ? `${Math.floor(leftSec / 3600)} h ${Math.ceil(leftSec % 3600 / 60)} min` : `${Math.ceil(leftSec / 60)} min`} left`
      : '';
    text = indexer.isBusy()
      ? `Analysing MIDI and Search scores: ${indexer.done.toLocaleString()} of ${total.toLocaleString()} · ${elapsed} · waiting while you listen or send${remaining}`
      : `Analysing MIDI and Search scores: ${indexer.done.toLocaleString()} of ${total.toLocaleString()} · ${elapsed}${remaining}`;
  } else if (!inIndex) text = `${total.toLocaleString()} files · not analysed yet`;
  else text = `${inIndex.toLocaleString()} of ${total.toLocaleString()} files analysed · ${s.parts.toLocaleString()} parts`;
  if (s.bad) text += ` · ${s.bad.toLocaleString()} damaged`;
  if (total && searchScores.ready < total) {
    text += ` · Search scores ${searchScores.ready.toLocaleString()}/${total.toLocaleString()}`;
  }
  // ✕ closes it while it says the same, numbers aside (analysing: until it stops), in the same library.
  const gist = `${index?.root ?? ''}|${indexer.running ? 'analysing' : noteGist(text)}`;
  $('catalog').dataset.gist = gist;
  $('catalog').hidden = closedNotes.get('catalog') === gist;
  if (indexer.running && indexer.currentPath) {
    text += ` · ${indexer.currentPath.split(/[\\/]/).pop()}`;
  }
  $('catStatus').textContent = text;
  $('catStatus').title = text;
  $('indexBtn').hidden = !total || done;
  $('indexBtn').textContent = indexer.running ? 'Pause' : 'Analyse';
  $('indexBtn').classList.toggle('primary', !indexer.running);
  paintPartNote();
}

/** Over the parts: how much of the folder they cover, while that is not all of it. */
function paintPartNote() {
  const total = index?.paths.length ?? 0;
  const seen = catalog.stats(index?.paths).files;
  if (!total || seen >= total) { showNote('partNote', null); return; }
  showNote('partNote', indexer.running ? `Analysing: ${seen.toLocaleString()} of ${total.toLocaleString()} files so far.`
    : seen ? `Parts of the ${seen.toLocaleString()} files seen so far, of ${total.toLocaleString()}: press Analyse for all of them.`
      : 'Press Analyse to see the parts of this folder.');
}

/**
 * A note over Parts (partNote, fillNote) with `text` (null: none). ✕ closes it: it stays closed
 * while it says the same, whatever its numbers (the files seen go up as they are analysed); it
 * comes back when it says something else (the loop changed: ↓ Sort to sort again).
 */
const closedNotes = new Map();   // note's id -> what it said when closed, numbers aside
const noteGist = (text) => text.replace(/\d[\d.,]*/g, '#');
function showNote(id, text) {
  const note = $(id);
  note.querySelector('.note-text').textContent = text ?? '';
  note.hidden = !text || closedNotes.get(id) === noteGist(text);
}

function wireNoteClose() {
  for (const id of ['partNote', 'fillNote']) {
    $(id).querySelector('.note-close').onclick = () => {
      closedNotes.set(id, noteGist($(id).querySelector('.note-text').textContent));
      $(id).hidden = true;
    };
  }
  // Summary's explanation (showSummaryNote).
  $('summaryContext').querySelector('.note-close').onclick = () => {
    closedNotes.set('summaryContext', true);
    $('summaryContext').hidden = true;
  };
  // The analysis notice under the list (showCatalogStatus).
  $('catalogClose').onclick = () => {
    closedNotes.set('catalog', $('catalog').dataset.gist);
    $('catalog').hidden = true;
  };
}

/** Analyse what the catalogue lacks, in the background. `ask`: stop every ASK_EVERY files to ask (askNext). */
function startIndexing({ ask = true } = {}) {
  if (!index || indexer.running) { showCatalogStatus(); return; }
  if (index.paths.every((p) => !indexer.needsAnalysis(p))) { showCatalogStatus(); return; }
  void indexer.start(index.paths);
  // (start sets `done` before it reads anything: the files to go before asking count from here.)
  askAt = ask ? indexer.done + ASK_EVERY : Infinity;
  showCatalogStatus();
}

// Analyse stops every ASK_EVERY files read and asks: carry on, or work with those (a big library
// takes hours; its first thousands are already worth using).
let ASK_EVERY = 1000;      // (a probe sets it lower: MidiLibraryDebug.askEvery)
let askAt = Infinity;      // `indexer.done` at which it stops to ask next
let asking = false;        // stopped to ask: the pause is not logged as one of the user's

function askToGoOn() {
  asking = true;
  indexer.pause();
  const total = index?.paths.length ?? 0;
  const s = catalog.stats(index?.paths);
  const left = index?.paths.filter((path) => indexer.needsAnalysis(path)).length ?? 0;
  $('indexAskText').textContent = `${s.files.toLocaleString()} of ${total.toLocaleString()} files analysed · ${s.parts.toLocaleString()} parts. ${left.toLocaleString()} still to go: analyse more, or work with these?`;
  if (!$('indexAskDlg').open) $('indexAskDlg').showModal();
}

/** The answer: `more` 1,000 more, `all` the rest without asking, `use` stop here. */
function answerAsk(answer) {
  asking = false;
  $('indexAskDlg').close();
  if (answer === 'use') {
    log.ok(`Working with the ${catalog.stats(index?.paths).files.toLocaleString()} files analysed so far. "Analyse" carries on where it stopped.`);
    showCatalogStatus();
    return;
  }
  startIndexing({ ask: answer === 'more' });
}
$('indexAskMore').onclick = () => answerAsk('more');
$('indexAskAll').onclick = () => answerAsk('all');
$('indexAskUse').onclick = () => answerAsk('use');
// Esc or closed otherwise: as "Use these files" (stopped, nothing lost).
$('indexAskDlg').addEventListener('cancel', (e) => { e.preventDefault(); answerAsk('use'); });

let lastPartsRefresh = 0;
function onIndexProgress() {
  if (indexer.running && indexer.done >= askAt) { askAt = Infinity; askToGoOn(); }
  showCatalogStatus();
  fileTable.renderSoon();
  if (!$('pane-parts').hidden && performance.now() - lastPartsRefresh > 3000) {
    lastPartsRefresh = performance.now();
    searchParts({ keepScroll: true, preserveOrder: true });
  }
}

function onIndexStop(reason) {
  showCatalogStatus();
  if (!$('pane-parts').hidden) searchParts({ keepScroll: true, preserveOrder: true });
  if (reason === 'fin') {
    const remaining = index?.paths.filter((path) => indexer.needsAnalysis(path)).length ?? 0;
    if (remaining) log.warn(`Analysis finished with ${remaining.toLocaleString()} file(s) still needing analysis or Search scores. See the warnings above.`);
    else log.ok(`Library analysed: ${catalog.stats(index?.paths).parts.toLocaleString()} parts.`);
  }
  else if (reason === 'pausa') { if (!asking && !$('indexAskDlg').open) log.log('Analysis paused. "Analyse" carries on where it stopped.'); }
  else log.fail(`Analysis stopped: ${reason}`);
}

// ── the analysis as a .mdig (Data's Save analysis / Restore…): LUNA wipes it when it restarts ─

/** `job(item)` for every item, `n` at a time. */
async function eachAtOnce(items, n, job) {
  let next = 0;
  const worker = async () => { while (next < items.length) await job(items[next++]); };
  await Promise.all(Array.from({ length: n }, worker));
}

/** A file's fingerprint, read now; null when it cannot be read. Throws when no file can be read. */
async function fingerprintOf(path) {
  try { return fingerprint(await reader.read(path)); } catch (e) {
    if (e instanceof NoAccess) throw e;
    return null;
  }
}

/**
 * Save analysis: every analysed file of the library, its record and its fingerprint. With
 * `includeEvents`, each file is read again and every fragment keeps its notes, controls (volume, pan, expression, sustain, pitch bend) and
 * tempo (library/backup.js), so other tools can play it without the MIDI files.
 */
async function saveAnalysis(status, { includeSearchScores = false, includeEvents = false } = {}) {
  if (includeEvents) includeSearchScores = true;
  if (!index?.paths.length) throw new Error('No library yet: choose your MIDI folder first (Files).');
  if (indexer.running) indexer.pause();
  const inLibrary = new Set(index.paths);
  const records = [];
  status('Collecting the analysis…');
  await store.forEachFile((r) => { if (inLibrary.has(r.path) && (r.v ?? 1) >= RECORD_VERSION) records.push(r); });
  if (!records.length) throw new Error('Nothing analysed yet: press Analyse first.');
  let saved;
  if (includeSearchScores) {
    const scored = [];
    const missingFingerprints = [];
    let k = 0;
    status(`Reading MIDI to calculate Search scores… 0 of ${records.length.toLocaleString()}`);
    await eachAtOnce(records, 1, async (r) => {
      status(`Calculating Search scores… ${k + 1} of ${records.length.toLocaleString()} · ${r.path.split(/[\\/]/).pop()}`);
      const bytes = await reader.read(r.path);
      const fresh = await indexer.analyse(r.path, bytes, { includeSearchScores: true });
      const fp = fresh.fp;
      if (r.fp && r.fp !== fp) throw new Error(`"${r.path}" changed since it was analysed. Press Analyse before saving Search scores.`);
      if ((r.ok ?? false) !== (fresh.ok ?? false)) throw new Error(`"${r.path}" no longer matches its saved analysis. Press Analyse before saving Search scores.`);
      fresh.fp = fp;
      compactSearchScores(fresh, { keepEvents: includeEvents });
      scored.push(fresh);
      if (!r.fp) {
        r.fp = fp;
        missingFingerprints.push(r);
      }
      if (++k % 10 === 0 || k === records.length) status(`Calculating Search scores… ${k.toLocaleString()} of ${records.length.toLocaleString()}`);
    });
    await store.putFiles(missingFingerprints);
    saved = scored;
  } else {
    // Files analysed before fingerprints were kept: read once now (and kept for next time).
    const missing = records.filter((r) => !r.fp);
    let k = 0;
    await eachAtOnce(missing, 4, async (r) => {
      r.fp = await fingerprintOf(r.path);
      if (++k % 20 === 0) status(`Reading the files to fingerprint them… ${k} of ${missing.length}`);
    });
    await store.putFiles(missing.filter((r) => r.fp));
    saved = records.filter((r) => r.fp);
  }
  const parts = saved.reduce((n, r) => n + (r.parts?.length ?? 0), 0);
  const unread = records.length - saved.length;
  status('Preparing the compact analysis file…');
  await new Promise((resolve) => setTimeout(resolve, 0));
  status('Writing the analysis file…');
  const bytes = encodeAnalysis(analysisFile(index.root, saved), { includeEvents });
  status(`Starting download… ${(bytes.length / 1048576).toFixed(1)} MB`);
  await new Promise((resolve) => setTimeout(resolve, 0));
  const extra = includeEvents ? ' (with Search scores and MIDI events)' : includeSearchScores ? ' (with Search scores)' : '';
  const name = `MIDI Digger analysis · ${baseName(index.root)}${extra}${ANALYSIS_EXT}`;
  downloadBytes(bytes, name);
  log.ok(`Saved as "${name}" in your Downloads folder (${(bytes.length / 1048576).toFixed(1)} MB)${includeEvents ? ', with the Search scores and the notes, controls (volume, pan, expression, sustain, pitch bend) and tempo of every fragment' : includeSearchScores ? ', with compact Search gesture scores' : ''}. "Restore…" in Data takes it up again.`);
  status(`Saved: ${saved.length.toLocaleString()} files, ${parts.toLocaleString()} parts${includeEvents ? ', with Search scores and MIDI events' : includeSearchScores ? ', with Search scores' : ''}, in Downloads${unread ? ` (${unread.toLocaleString()} could not be read: left out)` : ''}.`);
}

/**
 * Restore…: a saved analysis, only for the files of this library that are still the same (each
 * read again and its fingerprint compared). The rest stay for Analyse.
 */
async function restoreAnalysis(status) {
  if (!index?.paths.length) throw new Error('Choose your MIDI folder first (Files): the analysis is checked against its files.');
  const file = await chooseFile(`${ANALYSIS_EXT},.json`);
  const bytes = file ? new Uint8Array(await file.arrayBuffer()) : null;
  if (bytes === null) { status('Cancelled.'); return; }
  status('Reading the saved analysis…');
  await new Promise((resolve) => setTimeout(resolve, 0));
  const analysis = readAnalysis(bytes, { includeEvents: false });
  if (String(analysis.root).toLowerCase() !== index.root.toLowerCase()) throw new Error(`That analysis is of ${analysis.root}, and your library is ${index.root}: choose that folder first.`);
  if (indexer.running) indexer.pause();
  const { check, gone, unsaved } = matchAnalysis(analysis, index.paths);
  const todo = check.filter((r) => !catalog.current(r.path)
    || (catalog.file(r.path)?.searchScores === false && hasSearchScores(r)));
  const already = check.length - todo.length;
  const loadingScores = todo.some((r) => catalog.file(r.path)?.searchScores === false && hasSearchScores(r));
  let same = 0;
  let changed = 0;
  let mismatched = 0;
  let k = 0;
  const batch = [];
  const task = loadingScores ? 'Loading Search scores and checking the files' : 'Checking the files are the same';
  status(`${task}… 0 of ${todo.length.toLocaleString()}`);
  await eachAtOnce(todo, 4, async (r) => {
    if ((await fingerprintOf(r.path)) === r.fp) {
      if (catalog.current(r.path) && catalog.file(r.path)?.searchScores === false
          && hasSearchScores(r) && !catalog.matchesSearchParts(r)) {
        mismatched++;
      } else {
        catalog.addFile(r);
        batch.push(r);
        same++;
      }
    } else changed++;
    if (batch.length >= 250) await store.putFiles(batch.splice(0));
    if (++k % 20 === 0) status(`${task}… ${k.toLocaleString()} of ${todo.length.toLocaleString()}`);
  });
  await store.putFiles(batch);
  fileTable.renderSoon();
  showCatalogStatus();
  searchParts({ keepScroll: true, preserveOrder: true });
  const notes = [
    changed && `${changed.toLocaleString()} changed since it was saved`,
    mismatched && `${mismatched.toLocaleString()} do not match the current part or fragment layout`,
    gone.length && `${gone.length.toLocaleString()} no longer in the folder`,
    already && `${already.toLocaleString()} already analysed`,
    unsaved && `${unsaved.toLocaleString()} not in it`,
  ].filter(Boolean);
  const text2 = `Restored ${same.toLocaleString()} files${notes.length ? ` · ${notes.join(' · ')}` : ''}.${changed || unsaved ? ' Analyse does the rest.' : ''}`;
  status(text2);
  log.ok(`Analysis restored, saved ${new Date(analysis.saved).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}: ${text2}`);
}

/** The catalogue's button: Analyse / Resume, or Pause while it runs. */
function toggleIndexing() {
  if (indexer.running) { indexer.pause(); return; }
  log.head('── Analyse');
  startIndexing();
}

// ── parts tab ───────────────────────────────────────────────────────────────────────────

// Thumbnails for result rows. A row's file is read and parsed when it scrolls into view (a few
// ms); the last parsed files and drawn thumbnails are kept so scrolling back is instant.
const parsedCache = new Map();   // path -> Promise<info>
const miniCache = new Map();     // part index -> canvas already drawn
const failedMini = new Set();
const MINI_W = 600;
const MINI_H = 30;
let miniWidth = 0;               // the width the thumbnails in miniCache are drawn at

function parsedFile(path) {
  if (current?.path === path) return Promise.resolve(current.info);
  if (!parsedCache.has(path)) {
    const promise = reader.read(path).then(parseMidi).catch((error) => {
      if (parsedCache.get(path) === promise) parsedCache.delete(path);
      throw error;
    });
    parsedCache.set(path, promise);
    if (parsedCache.size > 40) parsedCache.delete(parsedCache.keys().next().value);
  }
  return parsedCache.get(path);
}

/** The size a thumbnail is shown at, in screen pixels (stretched, it would blur). */
function miniSize() {
  const box = document.querySelector('#partBody .pr-mini');
  const scale = window.devicePixelRatio || 1;
  return box?.clientWidth ? { w: Math.round(box.clientWidth * scale), h: Math.round(box.clientHeight * scale) } : { w: MINI_W, h: MINI_H };
}

/**
 * A length searched in Parts (its Length filter): each card shows only its fragment's bars, across
 * its width, every result at the same scale. `zoomSpans`: those bars in its song's seconds, by
 * fragment, for the playhead and the clicks on it.
 */
const partsZoomed = () => !!$('fLoop')?.value;
const zoomSpans = new Map();
const miniKey = (i) => (partsZoomed() && catalog.part(i).loopBars ? `bars:${i}` : i);

function partMini(i, { w, h }) {
  const key = miniKey(i);
  if (miniCache.has(key)) return Promise.resolve(miniCache.get(key));
  const p = catalog.part(i);
  return parsedFile(p.path).then((parsed) => {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    if (key !== i) {
      zoomSpans.set(i, drawFragmentMini(cv, parsed, p.ch, { startBar: p.loopStart, bars: p.loopBars, n: p.frag }));
    } else {
      // The fragments, banded and the one chosen framed; unless "Fragments" is off in Parts: only the notes.
      const bands = $('fFrags')?.checked !== false;
      const others = bands ? catalog.fragmentIds(p.part).filter((f) => f !== i).map((f) => catalog.part(f))
        .map((f) => ({ at: f.atTick, ticks: f.ticks, n: f.frag })) : [];
      drawPartMini(cv, parsed, p.ch, bands && p.loopBars ? { at: p.atTick, ticks: p.ticks, n: p.frag } : null, others);
    }
    miniCache.set(key, cv);
    if (miniCache.size > 400) miniCache.delete(miniCache.keys().next().value);
    return cv;
  });
}

const PART_FILTERS = ['fRole', 'fFamily', 'fTs', 'fKey', 'fLoop', 'fText', 'fBpmMin', 'fBpmMax', 'fGesture', 'fEnergy'];
let partResults = [];         // what the search found, each part once
const shownFrag = new Map();  // part -> the fragment its row is on (▶ moves it along)
let playedPart = null;        // the result ▶ last played: a part's fragments share its channel
let trackFromPoint = false;   // what sounds alone is a part's whole track, from a point clicked (listenFromPoint)
let wholeChannel = false;     // and it plays its whole channel (Data's Parts), not its loop

/** Is this result the part the preview is playing right now? */
const isPlayingPart = (p) => player.playing && (loopMode ? loopListen?.id === p.index : audition !== null
  ? (auditionRow ? catalog.part(audition).part === p.part : audition === p.index)
  : current?.path === p.path && player.channels?.size === 1 && player.channels.has(p.ch) && (playedPart === null || playedPart === p.index));

/** The fragment a result's row shows now. */
const shownOf = (item) => shownFrag.get(catalog.part(item).part) ?? item;

/** The fragment chosen in Parts, on the lanes when its song is the one open there. */
function showActiveFragment(id) {
  const p = catalog.part(id);
  timeline.setActiveFragment(current?.path === p.path && p.loopBars ? { ch: p.ch, n: p.frag } : null);
}

/**
 * The song open in the lanes, chosen from fragment `id` (a card of Parts, a Search result): its
 * bars become the region, looping, scrolled into view, and the fragment is marked on its lane.
 */
function selectFragmentInSong(id) {
  const p = catalog.part(id);
  if (current?.path !== p.path) return;
  if (p.ticks) {
    // Its whole bars, as the card shows it (the notes may start a touch early or end before the bar line).
    const bars = p.loopBars && p.loopStart
      ? { startTick: current.info.barStartTick(p.loopStart), endTick: current.info.barStartTick(p.loopStart + p.loopBars) }
      : { startTick: p.atTick, endTick: p.atTick + p.ticks };
    timeline.setRegion(bars, true);
    timeline.showRegion();
    timeline.revealRegion();
  }
  timeline.setActiveFragment(p.ticks ? { ch: p.ch, n: p.frag } : null);
}

/**
 * A row of Parts is a part, whichever of its fragments it is on. Chosen by the user (not `quiet`,
 * as when a playing part moves on through its fragments), the log says what it is and where it
 * comes from (logChosen).
 */
function selectPart(id, { quiet = false } = {}) {
  partTable.select(catalog.part(id).part);
  showActiveFragment(id);
  if (!quiet) logChosenSoon(id);
}

// The fragment chosen, in the log: once the choosing stops (the arrows run through rows fast).
let chosenTimer = 0;
let chosenLogged = null;
function logChosenSoon(id) {
  clearTimeout(chosenTimer);
  chosenTimer = setTimeout(() => logChosen(id), 400);
}

/**
 * "🎸 Fingered Bass · d_queen.mid · ch 2 · bars 9–12 (a 4-bar loop played 6 times, fragment 2 of 3)
 * · A minor · 120 BPM · fits your session 69 %": the MIDI file a fragment comes from, its channel
 * and the bars of that song it takes.
 */
function logChosen(id) {
  if (id === chosenLogged) return;
  chosenLogged = id;
  const p = catalog.part(id);
  const frags = catalog.fragmentsInSong(p.part);
  const which = frags.length > 1 ? `, fragment ${frags.indexOf(id) + 1} of ${frags.length}` : '';
  const bars = p.loopBars
    ? `bars ${p.loopStart}–${p.loopStart + p.loopBars - 1} (a ${p.loopBars}-bar loop played ${p.loopCount} time${p.loopCount > 1 ? 's' : ''}${which})`
    : `the whole part, ${p.bars} bars (it repeats no loop)`;
  const key = p.key ? p.key.replace(' mayor', ' major').replace(' menor', ' minor') : '';
  const fit = partTarget ? fitOf(p).score : null;
  const fits = fit === null ? '' : `fits ${sessionFit ? 'your session' : 'the loop'} ${Math.round(fit * 100)} %`;
  log.log(['🎸', `${p.instrument} · ${baseName(p.path)} · ch ${p.ch} · ${bars}`, key, `${Math.round(p.bpm)} BPM`, fits].filter(Boolean).join(' · ').replace('🎸 · ', '🎸 '));
}

/**
 * ▶ on a row: its fragments one after another from the one it shows; again advances to the
 * fragment on its right, and again on the last stops. In New loop: over the loop (listenInLoop).
 */
function listen(item) {
  if (loopMode) { void act(null, '▶ Listen', () => listenInLoop(shownOf(item)), false); return; }
  const id = shownOf(item);
  if (isPlayingPart(catalog.part(id)) && !wholeChannel) {
    // Its whole track heard from a point (listenFromPoint): ▶ stops it.
    if (trackFromPoint) { endAudition(auditionBack?.playing); partTable.renderSoon(); return; }
    const next = catalog.sideFragment(id, 1);
    if (next === null) endAudition(auditionBack?.playing);
    else {
      shownFrag.set(catalog.part(next).part, next);
      selectPart(next);
      void act(null, '▶ Listen', () => auditionPart(next), false);
    }
    partTable.renderSoon();
    return;
  }
  selectPart(id);
  // It sounds apart: the song on the right stays as it is.
  void act(null, '▶ Listen', () => auditionPart(id), false);
  partTable.renderSoon();
}

/**
 * A double click on a card: that card's fragment sounds, and goes on sounding. Unlike ▶ it never
 * stops it nor moves on to the next fragment: the two clicks before it may already have made it
 * sound (a card clicked while another sounds takes over), and a double click must not undo that.
 */
function listenSure(item) {
  const id = shownOf(item);
  const same = (other) => other !== null && other !== undefined && catalog.part(other).part === catalog.part(id).part;
  if (loopMode) {
    if (loopListen?.id === id || pendingListen === id) return;
    void act(null, '▶ Listen', () => listenInLoop(id), false);
    return;
  }
  if (isPlayingPart(catalog.part(id)) || same(pendingListen)) return;
  selectPart(id);
  void act(null, '▶ Listen', () => auditionPart(id), false);
  partTable.renderSoon();
}

/** ▶ on a result: its loop when it has one, else the whole part. Again to pause. */
function playPart(i) {
  const p = catalog.part(i);
  selectPart(i);
  if (isPlayingPart(p) && !wholeChannel) { togglePlay(); partTable.renderSoon(); return; }
  playedPart = i;
  wholeChannel = false;
  void selectFile(p.path, {
    focusCh: p.ch,
    then: async () => {
      if (p.loopBars) await loopPattern(p.ch, p.atTick, p.atTick + p.ticks);
      else await startPlaying();
      partTable.renderSoon();
    },
  });
}

/** Is this whole file what sounds now (all its tracks, as Files plays it)? */
const playingFile = (path) => !loopMode && player.playing && audition === null && current?.path === path && !player.channels;

/**
 * ▶ on a file in Data: the whole song, all its tracks, as Files opens it; again: it stops. With
 * `from` (a click on its thumbnail, song seconds): from there, playing or not.
 */
function playFile(path, from = null) {
  if (playingFile(path)) {
    if (from === null) stopPreview();
    else player.seekSong(from);
    return;
  }
  if (loopMode) { log.warn('Close New loop to play a whole song here: the loop is what plays now.'); return; }
  wholeChannel = false;
  void selectFile(path, {
    then: async () => {
      marked.clear();
      applyChannels();
      timeline.setRegion(null);
      applyLoop();
      await startPlaying(from ?? 0);
    },
  });
}

/** A click on a Data thumbnail (Files or Parts), at `at` (0-1) of its song: it plays from there. */
async function seekRow(at, id, path) {
  const sec = at * (await parsedFile(path)).durationSec;
  if (id === null) playFile(path, sec);
  else playChannel(id, sec);
}

/**
 * ➜ LUNA in Data: a row to the session at its cursor, at its tempo, as Sound and / or MIDI as
 * the boxes under the song say: a fragment its bars, a part (`whole`) its channel, a file
 * (`filePath`, no part) all its tracks, each on a new track.
 */
async function sendRow(id, whole, filePath = null) {
  const withAudio = $('withAudio').checked;
  const withMidi = $('withMidi').checked;
  if (!withAudio && !withMidi) throw new Error('Tick "Sound", "MIDI" or both (under the song).');
  const p = id === null ? null : catalog.part(id);
  const path = filePath ?? p.path;
  const info = await parsedFile(path);
  if (!info.ppq || info.smpte) throw new Error(`${baseName(path)} is in SMPTE time: it cannot be placed on bars.`);
  const channels = p ? [p.ch] : info.channels.map((c) => c.channel);
  const range = p && !whole && p.ticks ? { startTick: p.atTick, endTick: p.atTick + p.ticks, repeat: 1, label: `${p.loopStart}-${p.loopStart + p.loopBars}` } : null;
  const at = session.transport.tick;
  const bpm = session.transport.tempo.value || info.bpm;
  log.log(`${baseName(path)} → LUNA at ${session.musical.timeline.formatBarBeat(at)}, ${Math.round(bpm)} BPM`);
  log.log(SEND_HEAD);
  const status = (text) => { $('composeStatus').textContent = text; };
  sendingToLuna = true;
  try {
    if (withAudio) {
      await loadSoundFont();
      await addStems(session, info, path, channels, {
        at, range, log, onStep: status,
        render: (ch) => renderPart({ bank: sfEngine.bank, info, channels: new Set([ch]), startTick: range ? range.startTick : 0, endTick: range ? range.endTick : info.lastTick, loopable: !!range, bpm, onProgress: (f) => status(`Rendering channel ${ch}… ${Math.round(f * 100)} %`) }),
      });
    }
    if (withMidi) await addParts(session, info, path, channels.map((ch) => `ch:${ch}`), { at, range, log });
    if (withMidi && !withAudio) log.log('MIDI tracks sound with the instrument you load on them in LUNA (INST).');
  } finally {
    sendingToLuna = false;
    status('');
  }
  renderSoundOptions();
}

/**
 * The whole channel of part `i`, from its first note, no loop: the player shortens long
 * silences. Again to pause.
 */
function playChannel(i, from = null) {
  const p = catalog.part(i);
  if (isPlayingPart(p) && wholeChannel) {
    if (from === null) togglePlay();
    else player.seekSong(from);   // a click on its thumbnail: on from there
    return;
  }
  playedPart = i;
  wholeChannel = true;
  void selectFile(p.path, {
    focusCh: p.ch,
    then: async () => {
      timeline.setRegion(null);
      applyLoop();
      await startPlaying(from ?? 0);
    },
  });
}

const partTable = new VirtualTable($('partBody'), {
  rowHeight: 100,
  key: (i) => catalog.part(i).part,
  onError: (error) => reportError(error, 'Drawing a card of Parts'),
  // A card per part: a line with its role's dot, the instrument, the file and the fragment it
  // is on; under it ▶ and the song across a large thumbnail, all its fragments marked and that
  // one framed. The rest of its facts are its tooltip. The whole card drags.
  renderRow(item, el) {
    const i = shownOf(item);
    const p = catalog.part(i);
    const count = catalog.fragmentIds(p.part).length;
    el.classList.add('pr');
    if (isPlayingPart(p)) el.classList.add('playing');
    el.innerHTML = `
      <div class="pr-head"><i class="dot role-${p.role}"></i><span class="pr-inst"></span><span class="pr-file"></span><span class="pr-count"></span><span class="pr-bpm"></span><span class="pr-inloop"></span><span class="pr-fill"></span><span class="pr-fit"></span><span class="pr-bars"></span>${favStar(p)}</div>
      <button class="pr-play" title="Listen to${p.loopBars ? ' its loop' : ' the part'}${count > 1 ? '; click again for the next fragment to the right, and again on the last to stop' : ''}">${isPlayingPart(p) ? '⏸' : '▶'}</button>
      <div class="pr-mini"><div class="cursor"></div></div>
      <div class="card-count" title="Where it is: the beats of the bar, and the bar of the fragment"></div>`;
    // Under ▶, the instrument's drawing, as in Summary (its place goes to the counter while it plays).
    const drawn = instrumentIcon(p);
    el.insertAdjacentHTML('beforeend', `<span class="pr-icon" title="${esc(drawn.family)}">${drawn.icon}</span>`);
    const [, inst, file, position] = el.querySelector('.pr-head').children;
    inst.textContent = p.instrument;
    file.textContent = baseName(p.path) + (p.name ? `  “${p.name}”` : '');
    // A song's first card in the list (the one above is of another file): its name stands out as the instrument's.
    const at = Number(el.dataset.i);
    const above = at > 0 ? partTable.items[at - 1] : null;
    if (above === null || above === undefined || catalog.part(above).path !== p.path) file.classList.add('new-song');
    position.textContent = count > 1 ? `${catalog.fragmentsInSong(p.part).indexOf(i) + 1}/${count}` : '';   // from the left
    // How many bars the fragment chosen is (which of its song, in its tooltip: the framed band).
    if (p.loopBars) {
      const bars = el.querySelector('.pr-bars');
      const where = p.loopBars > 1 ? `${p.loopStart}–${p.loopStart + p.loopBars - 1}` : `${p.loopStart}`;
      bars.textContent = `${p.loopBars} bar${p.loopBars > 1 ? 's' : ''}`;
      bars.title = `The fragment chosen: ${p.loopBars} bar${p.loopBars > 1 ? 's' : ''}, bar${p.loopBars > 1 ? 's' : ''} ${where} of its song (the framed band)`;
    }
    // Its song's tempo.
    if (p.bpm) el.querySelector('.pr-bpm').textContent = `${Math.round(p.bpm)} BPM`;
    // In the loop open now: this fragment (bright), or other bars of this part (dim); which row.
    const inLoop = loopMode ? loopSourcesOf(p) : [];
    if (inLoop.length) {
      const exact = inLoop.filter((s) => s.bar === p.loopStart);
      const mark = el.querySelector('.pr-inloop');
      mark.textContent = exact.length ? '● In loop' : '○ In loop';   // ○: other bars of this part are
      mark.className = `pr-inloop${exact.length ? ' exact' : ''}`;
      mark.title = `In the loop:\n${inLoop.map((s) => `${s.row}: ${s.bars > 1 ? `bars ${s.bar}–${s.bar + s.bars - 1}` : s.bar ? `bar ${s.bar}` : 'bars unknown'} of this part`).join('\n')}`;
      if (exact.length) el.classList.add('in-loop');
    }
    // How it goes with the loop (New loop), by its notes (fitOf): green, amber, red.
    const fit = el.querySelector('.pr-fit');
    const f = fitOf(p);
    if (f.score !== null) {
      const pc = (x) => `${Math.round(x * 100)} %`;
      fit.textContent = `${Math.round(f.score * 100)}%`;
      fit.className = `pr-fit ${f.good ? 'good' : f.pass ? 'ok' : 'bad'}`;
      fit.title = [
        `How it goes with ${sessionFit ? 'your LUNA session' : 'the loop'}: ${pc(f.score)}`,
        f.harmony ? `From its notes, moved to the key: ${pc(f.harmony.clash)} of the time they sound together a semitone clashes · notes alike, bar by bar: ${pc(f.harmony.chroma)}` : '',
        f.rhythm ? `From where its notes strike: ${pc(f.rhythm.hit)} of them fall with the others' · the beat divided alike: ${pc(f.rhythm.beat)} · moving together, bar by bar: ${pc(f.rhythm.bar)}` : '',
        f.marks ? `Green from ${pc(f.marks.good)}, amber from ${pc(f.marks.ok)}: the chance it was written to go with this (learned from ${(f.rhythm ? RHYTHM_MODEL : HARMONY_MODEL).songs.toLocaleString()} songs)` : '',
        f.chords !== null ? `Chords, beat for beat in the same key: ${pc(f.chords)}` : '',
        f.groove !== null ? `Groove with ${p.role === 'drums' ? 'the bass' : p.role === 'bass' ? 'the drums' : 'the drums and bass'}: ${pc(f.groove)} (${grooveText(p.groove)})` : '',
      ].filter(Boolean).join('\n');
    }
    // Sorted by Fill %: Fill's whole score of its best fragment, and what makes it.
    const filled = partFill.get(item);
    if (filled) {
      const badge = el.querySelector('.pr-fill');
      const fragments = catalog.fragmentsInSong(p.part);
      badge.textContent = `Fill ${Math.round(filled.score * 100)}%`;
      badge.title = [
        `Fill % of its best fragment for the loop${count > 1 ? ` (${fragments.indexOf(filled.id) + 1}/${count})` : ''}, as Fill would score it now:`,
        ...fillScoreBreakdown(filled).map(({ label, value, weight }) => `${label}: ${value === null ? 'unavailable' : `${Math.round(value * 100)}% (weight ${Math.round(weight * 100)}%)`}`),
        filled.score < FILL_MIN_SCORE ? `Below ${Math.round(FILL_MIN_SCORE * 100)}%: Fill would not offer it.` : '',
      ].filter(Boolean).join('\n');
      badge.className = `pr-fill ${filled.score >= 0.75 ? 'good' : filled.score >= FILL_MIN_SCORE ? 'ok' : 'bad'}`;
    }
    const key = p.key.replace(' mayor', '').replace(' menor', 'm');
    const facts = [ROLE_NAMES[p.role], `${Math.round(p.bpm)} BPM`, p.ts, key, `${p.bars} bars`].filter(Boolean).join(' · ');
    const fragment = p.loopBars ? `\n${p.loopBars} bar${p.loopBars > 1 ? 's' : ''} from bar ${p.loopStart}, played ${p.loopCount} time${p.loopCount > 1 ? 's' : ''}` : '';
    el.title = `${p.path}\n${facts}\nChannel ${p.ch} · ${p.notes} notes · ${p.density} notes/bar${fragment}\nClick a fragment: choose it · ${loopMode ? 'Click the song name: explore all its tracks · ' : 'Click: open the file · '}▶ or double click: listen · ↑ ↓ ← →: move, and it sounds if one is playing · Drag it onto a lane`;
    const box = el.querySelector('.pr-mini');
    const cached = miniCache.get(miniKey(i));
    if (cached) box.prepend(copyCanvas(cached));
  },
  onClick: (i, e) => {
    if (performance.now() - partDragged < 300) return;   // the end of a drag onto a lane
    if (e.target.closest('.fav-star')) return openFavMenu(shownOf(i), e);
    if (e.target.closest('.pr-play')) return listen(i);
    if (loopMode && e.target.closest('.pr-file')) {
      const shown = shownOf(i);
      void act(null, 'Explore', () => exploreFragment(shown), false);
      return;
    }
    const box = e.target.closest('.pr-mini');
    if (box) { void clickMini(i, box, e); return; }
    openRow(i);
  },
  onDblClick: (i, e) => {
    if (e.target.closest('button, .pr-file') && loopMode) return;
    if (e.target.closest('button')) return;
    listenSure(i);
  },
  onVisible(items) {
    // Draw the thumbnails still missing; each row picks its canvas up on the next render. A
    // panel of another width draws them all again, at the size they show.
    const size = miniSize();
    if (size.w !== miniWidth) { miniWidth = size.w; miniCache.clear(); }
    const missing = items.map(shownOf).filter((i) => !miniCache.has(miniKey(i)) && !failedMini.has(i));
    if (!missing.length || !reader.usable) return;
    let left = missing.length;
    for (const i of missing) {
      partMini(i, size).catch(() => { failedMini.add(i); }).finally(() => { if (--left === 0) partTable.renderSoon(); });
    }
  },
});

/** The gestures Parts searches by: id -> name. */
const SEARCH_GESTURE_NAMES = {
  'snare-roll': 'Snare roll',
  arpeggio: 'Arpeggio',
  kick: 'Kick',
  snare: 'Snare',
  hihat: 'Hi-hat',
  'closed-hihat': 'Closed hi-hat',
  'open-hihat': 'Open hi-hat',
  toms: 'Toms',
  'tom-fill': 'Tom fill',
  shuffle: 'Shuffle',
  'four-floor': 'Four on the floor',
  backbeat: 'Backbeat',
};

/**
 * A click on a thumbnail: the fragment under it becomes the row's; elsewhere it opens the row.
 * With "Fragments" off (no bands to choose from), it listens from that point (listenFromPoint).
 */
async function clickMini(item, box, e) {
  if ($('fFrags')?.checked === false) { await act(null, '▶ Listen from here', () => listenFromPoint(item, box, e), false); return; }
  // Only its fragment's bars on the card (a length searched): that fragment is the one under the click.
  const shown = shownOf(item);
  if (miniKey(shown) !== shown) { chooseFragment(shown); return; }
  const id = await fragmentUnder(item, box, e.clientX);
  if (id === undefined) openRow(item);
  else chooseFragment(id);
}

/** The fragment of a row under a point of its thumbnail, or undefined. */
async function fragmentUnder(item, box, clientX) {
  const { part, path } = catalog.part(item);
  const parsed = await parsedFile(path);
  const r = box.getBoundingClientRect();
  const sec = ((clientX - r.left) / r.width) * parsed.durationSec;
  return catalog.fragmentIds(part).find((f) => {
    const p = catalog.part(f);
    return p.ticks && sec >= parsed.tickToSec(p.atTick) && sec < parsed.tickToSec(p.atTick + p.ticks);
  });
}

/** Fragment `id` becomes its row's; if a part is playing alone, this one takes over. */
function chooseFragment(id) {
  if (loopMode) {
    shownFrag.set(catalog.part(id).part, id);
    selectPart(id);
    partTable.renderSoon();
    // (Not when it is the one sounding, or about to: listenInLoop would stop it.)
    if (loopListen && loopListen.id !== id && pendingListen !== id) void act(null, '▶ Listen', () => listenInLoop(id), false);
    return;
  }
  const was = audition !== null && player.playing;
  shownFrag.set(catalog.part(id).part, id);
  selectPart(id);
  partTable.renderSoon();
  if (was) void act(null, '▶ Listen', () => auditionPart(id), false);
}

/** ↑ and ↓ in Parts: the row above or below, with the fragment it shows. */
function chooseRow(step) {
  const at = partResults.findIndex((id) => catalog.part(id).part === partTable.selected);
  const to = at < 0 ? 0 : at + step;
  if (to < 0 || to >= partResults.length) return;
  partTable.reveal(to);
  chooseFragment(shownOf(partResults[to]));
}

/** ← and → in Parts: the fragment beside the selected row's, by where it plays in the song. */
function wireFragmentKeys() {
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if ($('dataDlg').open || e.target.closest?.('input, select, textarea, [contenteditable="true"]')) return;
    if (e.key === 'Enter' && !$('pane-files').hidden && !loopMode) {
      if (e.repeat || e.target.closest?.('.timeline, dialog, button')) return;
      const path = fileTable.selected;
      if (!path || !fileTable.items.some((row) => row.path === path)) return;
      e.preventDefault();
      void selectFile(path, { then: () => { if (!player.playing) void startPlaying(); } });
      return;
    }
    if (!e.key.startsWith('Arrow')) return;
    // Files: ↑ ↓ the file above or below, chosen and opened as a click does (in New loop, explored);
    // the list follows it instead of scrolling.
    if (!$('pane-files').hidden) {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      if (e.target.closest?.('.timeline, dialog') || (e.target.closest?.('button') && !e.target.closest?.('#fileBody'))) return;
      const rows = fileTable.items;
      const at = rows.findIndex((r) => r.path === fileTable.selected);
      const next = at < 0 ? 0 : at + (e.key === 'ArrowUp' ? -1 : 1);
      e.preventDefault();
      if (next < 0 || next >= rows.length) return;
      fileTable.select(rows[next].path);
      fileTable.reveal(next);
      fileClicked(rows[next].path);
      return;
    }
    if ($('pane-parts').hidden) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      chooseRow(e.key === 'ArrowUp' ? -1 : 1);
      return;
    }
    const part = partTable.selected;
    const item = partResults.find((id) => catalog.part(id).part === part);
    if (item === undefined) return;
    const next = catalog.sideFragment(shownOf(item), e.key === 'ArrowLeft' ? -1 : 1);
    e.preventDefault();
    if (next !== null) chooseFragment(next);
  });
}

/** A click on a row: the song it comes from, on the right; never in New loop, which stays. */
function openRow(item) {
  const shown = shownOf(item);
  const p = catalog.part(shown);
  // A part sounding alone: the card chosen takes over, without opening its song.
  const listening = loopMode ? loopListen !== null : audition >= 0 && audition !== null && player.playing;
  if (listening && !isPlayingPart(p)) { chooseFragment(shown); return; }
  selectPart(shown);
  if (loopMode) return;
  selectFile(p.path, { focusCh: p.ch, then: () => selectFragmentInSong(shown) });
}

function copyCanvas(src) {
  const cv = document.createElement('canvas');
  cv.width = src.width;
  cv.height = src.height;
  cv.getContext('2d').drawImage(src, 0, 0);
  return cv;
}

/**
 * How far into its song what is heard now is, 0-1 (the thumbnails' playhead); null when nothing
 * is. A part alone does not play on its song's clock: heardIn says where in its song it is.
 */
function heardFraction() {
  const heard = heardSongSec();
  return heard ? Math.min(1, heard.sec / Math.max(heard.duration, 0.001)) : null;
}

/** Where in its song what is heard now is: { sec, duration } of that song; null when nothing is. */
function heardSongSec() {
  const apart = audition !== null || loopMode;
  if (apart ? !heardIn : !current) return null;
  // New loop: the fragment counted from the bar it came in on; before it comes in, at its start.
  let pos = player.songPosition;
  if (loopMode && loopListen) {
    if (performance.now() < (loopListen.waitUntil ?? 0)) pos = 0;
    else pos -= ((loopListen.from ?? 0) * barBeats(loop) * 60) / loop.bpm;
  }
  const sec = apart ? songPlace(heardIn.pieces, pos) : player.songPosition;
  const duration = apart ? heardIn.duration : current.info.durationSec;
  return { sec, duration };
}

function loopFragmentFraction() {
  if (!loopListen?.clip || performance.now() < (loopListen.waitUntil ?? 0)) return null;
  const barsIn = player.songPosition / ((barBeats(loop) * 60) / loop.bpm) - (loopListen.from ?? 0);
  return ((barsIn % loopListen.clip.bars) + loopListen.clip.bars) % loopListen.clip.bars / loopListen.clip.bars;
}

/** Move the cursor on the result row that is playing. */
function movePartCursor() {
  const row = document.querySelector('#partBody .vt-row.playing');
  // A card showing only its fragment's bars (a length searched): the playhead over those bars.
  const shown = row ? shownOf(partTable.items[Number(row.dataset.i)]) : null;
  const span = shown !== null && miniKey(shown) !== shown ? zoomSpans.get(shown) : null;
  let at = row && heardFraction();
  if (span) {
    const heard = heardSongSec();
    at = heard ? Math.max(0, Math.min(1, (heard.sec - span.from) / Math.max(span.to - span.from, 0.001))) : null;
  }
  if (at !== null && at !== undefined && row) row.querySelector('.cursor').style.left = `${at * 100}%`;
  paintCounters();
}

/**
 * Where the fragment that sounds from Parts is, as the Loop kit counted it: { beat,
 * beats (of the bar, from 1), bar, bars (of the fragment, from 1) }, or null when none sounds.
 */
function heardCount() {
  if (!player.playing) return null;
  const pos = player.songPosition;
  const count = (barsIn, bars, beats) => {
    const k = Math.floor(barsIn + 1e-9);
    return { bar: ((k % bars) + bars) % bars + 1, bars, beats, beat: Math.min(beats, Math.floor((barsIn - k) * beats + 1e-9) + 1) };
  };
  // New loop: the fragment over the loop, at the loop's tempo, its bars round and round.
  if (loopMode) {
    if (!loopListen?.clip || performance.now() < (loopListen.waitUntil ?? 0)) return null;   // not in yet
    const barSec = (barBeats(loop) * 60) / loop.bpm;
    return count(pos / barSec - (loopListen.from ?? 0), Math.max(1, loopListen.clip.bars), meterPulses(loop.timeSig));
  }
  // Parts: a part's fragments one after another, each over its whole bars.
  if (audition !== null) {
    const p = catalog.part(audition);
    const place = auditionPlaces.find((s) => pos >= s.startSec && pos < s.endSec);
    if (!place || !p.loopBars) return null;
    return count(((pos - place.startSec) / (place.endSec - place.startSec)) * p.loopBars, p.loopBars, meterPulses(p.ts || '4/4'));
  }
  // Search (or Parts' ▶ on the song): a fragment's bars looping on the song itself.
  if (playedPart !== null && current) {
    const p = catalog.part(playedPart);
    if (current.path !== p.path || !p.loopBars || !p.loopStart) return null;
    const i = current.info;
    const barsIn = i.barOfTick(i.secToTick(pos)) - p.loopStart;
    if (barsIn < -0.01 || barsIn > p.loopBars + 0.01) return null;
    return count(Math.max(0, barsIn), p.loopBars, meterPulses(i.timeSig));
  }
  return null;
}

/**
 * The counter of the card that sounds (Parts, Search), under its ▶: a dot a beat, the first one
 * larger and the one sounding lit, and which bar of the fragment it is. Each frame, only when it
 * changes.
 */
let counted = '';
function paintCounters() {
  const c = heardCount();
  const key = c ? `${c.beat}|${c.beats}|${c.bar}|${c.bars}` : '';
  const rows = document.querySelectorAll('#partBody .vt-row.playing .card-count');
  if (key === counted && [...rows].every((el) => el.dataset.key === key)) return;
  counted = key;
  for (const el of document.querySelectorAll('.card-count')) {
    const mine = el.closest('.vt-row.playing') && c;
    const want = mine ? key : '';
    if (el.dataset.key === want) continue;
    el.dataset.key = want;
    el.innerHTML = mine
      ? `<span class="cc-beats">${Array.from({ length: c.beats }, (_, k) => `<i class="${k === 0 ? 'down' : ''}${k + 1 === c.beat ? ' now' : ''}"></i>`).join('')}</span><b>${c.bar}<small>/${c.bars}</small></b>`
      : '';
  }
}

let searchTimer = 0;
function searchPartsSoon() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => searchParts(), 150);
}

// What Parts is sorted by and its cards measured against, in New loop: the chords that play
// ('' none) and the rhythm section's grooves; null otherwise. How well a part must go with it
// to show green or amber.
let partTarget = null;
let partTargetKey = '';
const FIT_GOOD = 0.8;
const FIT_OK = 0.6;
const CHORDS_WEIGHT = 0.65;   // of the two, how much the chords count (the groove the rest)

/**
 * How well a part goes with what plays (partTarget): { score, chords, groove }, each 0–1 or null
 * when it cannot be told. Chords bar for bar with the harmony (never for drums); its groove with
 * the rhythm section it plays against: the bass for drums, the drums for a bass, both for the rest.
 */
function fitOf(p, target = partTarget) {
  const t = target;
  if (!t) return { score: null, chords: null, groove: null, harmony: null, rhythm: null, pass: null, good: false };
  const section = p.role === 'drums' ? t.bass : p.role === 'bass' ? t.drums : grooveUnion([t.drums, t.bass]);
  const groove = section ? grooveFit(p.groove, section, { loose: p.role === 'chords' || p.role === 'melody' }) : null;
  // With pitch: its notes against the notes that play (midi/harmony.js), moved to the key as it
  // will be heard. That alone is its score: a groove that falls well does not make up for notes
  // that clash (in the library it hardly tells what goes together: .dev/harmony-study.mjs).
  // (A favourite brings its own summary, `p.summary`: it is not in the catalogue.)
  const own = t.grid && p.role !== 'drums' ? (p.summary ? p.summary.grid : catalog.grid(p.index)) : null;
  const harmony = own && own.stepsPerBar === t.stepsPerBar
    ? harmonyFit(t.grid, own.grid, transposeBetween(keyClass(p.key), t.key), t.stepsPerBar) : null;
  // Its rhythm against where the others strike (midi/rhythm.js), drums too. With pitch, notes and
  // rhythm make one mark (they see different things: .dev/joint-study.mjs); drums, the rhythm alone.
  const struck = t.hits ? (p.summary ? p.summary.hits : catalog.hits(p.index)) : null;
  const rhythm = struck && struck.stepsPerBar === t.hitsPerBar ? rhythmFeatures(t.hits, struck.hits, t.hitsPerBar, struck.steps) : null;
  const marked = (score, ok, good) => ({ score, chords: null, groove, harmony, rhythm, marks: { ok, good }, pass: score >= ok, good: score >= good });
  if (harmony && rhythm) return marked(jointScore(harmony, rhythm), JOINT_OK, JOINT_GOOD);
  if (harmony) return marked(harmony.fit, HARMONY_OK, HARMONY_GOOD);
  if (p.role === 'drums' && rhythm) return marked(rhythmScore(rhythm), RHYTHM_OK, RHYTHM_GOOD);
  // There are notes to go with and this part's cannot be measured against them (no fragment, another
  // meter, never sounding together): it is not known to fit, and is not mixed with those that are.
  if (t.grid && p.role !== 'drums') return { score: null, chords: null, groove, harmony: null, rhythm: null, pass: false, good: false };
  // Nothing with pitch to compare with (drums, a session read from audio): the chords' names and the groove.
  const chords = t.chords && p.role !== 'drums' && p.chords ? progressionFit(p.chords, t.chords) : null;
  const score = chords !== null && groove !== null ? CHORDS_WEIGHT * chords + (1 - CHORDS_WEIGHT) * groove : chords ?? groove;
  return { score, chords, groove, harmony: null, rhythm: null, pass: score === null ? null : score >= FIT_OK, good: score !== null && score >= FIT_GOOD };
}

/** A target for fitOf from a loop: its chords, its rhythm section and its notes (`except`: a row left out). */
function loopTarget(of, options = {}) {
  return { chords: loopProgression(of), ...loopGrooves(of), ...(of.key ? loopGrid(of, options) ?? {} : {}), ...(loopHits(of, options) ?? {}), key: of.key };
}

/** Do a candidate's notes go with those of the fragments already chosen for other rows (`chosen`: [{ grid, stepsPerBar }], as they will sound)? */
function goesWithChosen(candidate, chosen) {
  const own = candidate.role === 'drums' ? null : candidate.summary ? candidate.summary.grid : catalog.grid(candidate.index);
  if (!own) return true;
  const shift = transposeBetween(keyClass(candidate.key), loop.key);
  return chosen.every((c) => {
    if (c.stepsPerBar !== own.stepsPerBar) return true;
    const h = harmonyFit(c.grid, own.grid, shift, own.stepsPerBar);
    return !h || h.fit >= HARMONY_OK;
  });
}

/**
 * goesWithChosen for a fragment laid over bars [from, to), each going round from its own first
 * bar: against those chosen for the bars it shares with them ([{ grid, stepsPerBar, from, to }]),
 * bar for bar where both sound.
 */
function goesWithChosenAt(candidate, chosen, from, to) {
  const own = candidate.role === 'drums' ? null : candidate.summary ? candidate.summary.grid : catalog.grid(candidate.index);
  if (!own?.grid.length) return true;
  const shift = transposeBetween(keyClass(candidate.key), loop.key);
  const spb = own.stepsPerBar;
  return chosen.every((c) => {
    const lo = Math.max(from, c.from);
    const hi = Math.min(to, c.to);
    if (lo >= hi || c.stepsPerBar !== spb || !c.grid.length) return true;
    const n = (hi - lo) * spb;
    const ctx = new Uint16Array(n);
    const cand = new Uint16Array(n);
    for (let k = 0; k < n; k++) {
      ctx[k] = c.grid[((lo - c.from) * spb + k) % c.grid.length];
      cand[k] = own.grid[((lo - from) * spb + k) % own.grid.length];
    }
    const h = harmonyFit(ctx, cand, shift, spb);
    return !h || h.fit >= HARMONY_OK;
  });
}

/** A candidate as goesWithChosen keeps those chosen: its grid as it will sound; null without one. */
function chosenGrid(candidate) {
  const own = candidate.role === 'drums' ? null : candidate.summary ? candidate.summary.grid : catalog.grid(candidate.index);
  return own ? { grid: transposed(own.grid, transposeBetween(keyClass(candidate.key), loop.key)), stepsPerBar: own.stepsPerBar } : null;
}

// ── 🎯 Fit to session: Parts measured against what the LUNA session's MIDI tracks play ─────

let sessionFit = null;   // while on: { target (as fitOf takes it), text (what was read, for its note) }

// A track's role by its name, whole words only ("Percussive Organ" is not drums; "Bass Drum" is).
const DRUM_NAME = /\b(drums?|kit|perc|percussion|beat|bater[ií]a)\b/i;
const BASS_NAME = /\b(bass|bajo)\b/i;

/**
 * An audio track over ticks [from, to) of the session, from its WAV files (the session's layout,
 * measured on LUNA 3.1: a source at <session>\audio\<uid>.wav; a clip played time-stretched, its
 * render at renders\clips\<uid>.wav, which spans the clip exactly; built, not listed, as LUNA
 * lets no page list that folder): what it is and where it strikes (midi/audio-analysis.js), its
 * hits in beats from `from`. Null when it has no clip there; throws when a file cannot be read.
 */
async function audioTrackRead(track, from, to, beatOf) {
  const tl = session.musical.timeline;
  const pkg = session.sessionPackagePath?.value;
  const playlist = session.playlistFor(track);
  if (!playlist) return null;
  if (!pkg) throw new Error("LUNA did not say where the session's folder is");
  const sep = pkg.includes('\\') ? '\\' : '/';
  await playlist.clips.load();
  const pieces = [];   // { samples, rate, tickAt(second of the piece) }
  for (const clip of playlist.clips.items) {
    const start = clip.start.value;
    const stop = clip.stop.value;
    if (clip.muted?.value || stop <= from || start >= to) continue;
    const render = clip.renderState?.value === 'current' ? clip.renderSourceUid?.value : null;
    const path = render ? `${pkg}${sep}renders${sep}clips${sep}${render}.wav` : `${pkg}${sep}audio${sep}${clip.sourceUid.value}.wav`;
    const clipSec = tl.seconds(start);
    const offset = render ? 0 : (clip.sourceStart.value ?? 0) / 1e9;   // the file's second at the clip's start
    const s0 = offset + tl.seconds(Math.max(start, from)) - clipSec;
    const s1 = offset + tl.seconds(Math.min(stop, to)) - clipSec;
    const seg = wavSegment(await reader.read(path), s0, s1);
    if (!seg?.samples.length) continue;
    pieces.push({ ...seg, tickAt: (sec) => tl.tickAtSeconds(clipSec + (s0 - offset) + sec) });
  }
  const rate = pieces[0]?.rate;
  const same = pieces.filter((p) => p.rate === rate);
  if (!same.length) return null;
  // One stretch of sound for the whole track, analysed at once; each hit back to its clip.
  const all = new Float32Array(same.reduce((n, p) => n + p.samples.length, 0));
  let at = 0;
  const starts = same.map((p) => { const s = at; all.set(p.samples, at); at += p.samples.length; return s; });
  const got = analyseTrack(all, rate);
  const onsets = got.hits.map((sec) => {
    const sample = Math.round(sec * rate);
    let k = starts.length - 1;
    while (k > 0 && starts[k] > sample) k--;
    return beatOf(same[k].tickAt((sample - starts[k]) / rate));
  }).filter((b) => b >= 0);
  return { role: got.role, why: got.why, onsets };
}

/**
 * Where an audio track strikes over ticks [from, to) of the session, in beats from `from`: its
 * clips' sources read through LUNA's waveform overview (no audio file is opened), their hits
 * found (midi/audio-onsets.js) and put on the session's timeline; the strong ones, as its groove.
 * A clip LUNA plays time-stretched is read from its render, which spans the clip exactly.
 */
async function audioHits(track, from, to, beatOf) {
  const tl = session.musical.timeline;
  const playlist = session.playlistFor(track);
  if (!playlist) return [];
  await playlist.clips.load();
  await session.sources?.load();
  const hits = [];
  for (const clip of playlist.clips.items) {
    const start = clip.start.value;
    const stop = clip.stop.value;
    if (clip.muted?.value || stop <= from || start >= to) continue;
    const rendered = clip.renderState?.value === 'current' && clip.renderSourceUid?.value;
    const source = session.sources?.items.find((s) => s.id === (rendered ? clip.renderSourceUid.value : clip.sourceUid.value));
    if (!source) continue;
    // The source's second at the clip's start, and the stretch of it under [from, to).
    const clipSec = tl.seconds(start);
    const offset = rendered ? 0 : (clip.sourceStart.value ?? 0) / 1e9;
    const s0 = offset + tl.seconds(Math.max(start, from)) - clipSec;
    const s1 = offset + tl.seconds(Math.min(stop, to)) - clipSec;
    let perSecond = 384;   // LUNA's fine overview (fact 72); the page says it too
    const first = Math.max(0, Math.floor(s0 * perSecond));
    const last = Math.ceil(s1 * perSecond);
    const peaks = new Float32Array(Math.max(0, last - first));
    for (let i = first; i < last;) {
      const page = await source.overview({ index: i, count: Math.min(4096, last - i), kind: 'fine' });
      if (!page?.count) break;
      perSecond = page.binsPerSecond ?? perSecond;
      for (let k = 0; k < page.count && i - first + k < peaks.length; k++) {
        let p = 0;
        for (const c of page.channels) p = Math.max(p, Math.abs(c.min[k]), Math.abs(c.max[k]));
        peaks[i - first + k] = p;
      }
      i += page.count;
    }
    for (const h of onsetsOf(peaks, perSecond)) {
      const tick = tl.tickAtSeconds(clipSec + first / perSecond + h.sec - offset);
      if (tick >= from && tick < to) hits.push({ beat: beatOf(tick), strength: h.strength });
    }
  }
  return strongHits(hits).map((h) => h.beat);
}

/**
 * Read the session: its MIDI tracks not muted (their clips not muted), over LUNA's loop when it
 * has one, else 8 bars from the playhead's bar; what they play becomes Parts' target
 * (midi/session-fit.js). Audio tracks cannot be read: they are only counted, to say so.
 */
async function readSessionFit() {
  const t = session.transport;
  const tl = session.musical.timeline;
  let from;
  let to;
  if (t.looping.value && t.loopStop.value > t.loopStart.value) {
    from = t.loopStart.value;
    to = t.loopStop.value;
  } else {
    const bar = tl.barBeat(t.tick).bar;
    from = tl.tickAtBar(bar);
    to = tl.tickAtBar(bar + 8);
  }
  const ts = t.timeSignature.value;
  const perBar = ts ? (ts.numerator * 4) / ts.denominator : 4;
  const beatOf = (tick) => (tick - from) / Luna.TICKS_PER_BEAT;
  const bars = Math.max(1, Math.round(beatOf(to) / perBar));
  const firstBar = tl.barBeat(from).bar;
  await session.tracks.reload();
  const tracks = [];
  const unread = [];   // audio tracks that are neither drums nor bass, as far as can be told
  const heard = [];    // what each audio track was taken for, and why (for the log)
  for (const track of session.tracks.items) {
    const type = track.trackType.value;
    if (track.mute?.real?.value) continue;
    const name = track.name.value ?? 'Track';
    if (type === 'audio') {
      // Audio: its groove only. What it is, from its sound (its WAV files); where they cannot be
      // read, or the sound does not tell, from its name, its hits from LUNA's waveform.
      const named = DRUM_NAME.test(name) ? 'drums' : BASS_NAME.test(name) ? 'bass' : null;
      let read = null;
      let failed = false;
      try { read = await audioTrackRead(track, from, to, beatOf); } catch (e) { failed = true; heard.push(`${name}: its audio files could not be read (${e.message})`); }
      if (!read && !failed) continue;   // no clip in these bars: nothing to say of it
      if (read && read.role !== 'other') {
        tracks.push({ name, audio: true, role: read.role, onsets: read.onsets });
        heard.push(`${name}: ${read.role} by its sound, ${read.why}`);
      } else if (named) {
        tracks.push({ name, audio: true, role: named, onsets: await audioHits(track, from, to, beatOf) });
        heard.push(`${name}: ${named} by its name${read ? ` (its sound did not tell: ${read.why})` : ''}`);
      } else if (read) unread.push(`${name} (${read.why})`);
      continue;
    }
    if (type !== 'instrument') continue;
    const playlist = session.playlistFor(track);
    if (!playlist) continue;
    await playlist.clips.load();
    const notes = [];
    let onTen = 0;   // notes on MIDI channel 10: the drums'
    for (const clip of playlist.clips.items) {
      const start = clip.start.value;
      const stop = clip.stop.value;
      if (clip.muted?.value || stop <= from || start >= to) continue;
      await clip.midi.ready();
      for (const n of clip.midi.notes.items) {
        const at = start + n.startTick;   // the notes' ticks are the clip's
        if (n.muted || at < from || at >= to || at >= stop) continue;
        const end = Math.min(to, stop, start + (n.stopTick ?? n.startTick + Luna.TICKS_PER_BEAT / 4));
        notes.push({ beat: beatOf(at), len: Math.max(0.01, beatOf(end) - beatOf(at)), pitch: n.pitch, vel: n.velocity });
        if (n.channel === 9) onTen++;
      }
    }
    tracks.push({ name, drums: DRUM_NAME.test(name) || (notes.length > 0 && onTen === notes.length), notes });
  }
  const where = `bars ${firstBar}–${firstBar + bars - 1}`;
  for (const line of heard) log.log(`   🔊 ${line}`);
  const notRead = unread.length ? ` · left out (audio, neither drums nor bass): ${unread.join(', ')}` : '';
  const got = sessionTarget(tracks, { perBar, bars });
  // Audio tracks named as drums or bass where no hit was found (no waveform analysis yet, or silent there).
  const quiet = tracks.filter((t) => t.audio && !t.onsets.length).map((t) => t.name);
  if (!got || !(got.target.chords || got.target.drums || got.target.bass)) {
    const why = quiet.length
      ? `no MIDI there, and no hit found in ${quiet.join(', ')} (LUNA may still be drawing their waveform: try again in a moment)`
      : `no MIDI there, and no audio track named as drums or bass${unread.length ? ` (${unread.length} other audio track${unread.length > 1 ? 's' : ''}: their chords cannot be read from audio)` : ''}`;
    throw new Error(`Nothing to fit in ${where} of the session: ${why}. Put LUNA's loop, or its playhead, over the bars to fit.`);
  }
  const read = got.roles.map((r) => `${r.name} (${r.role}${r.audio ? ', audio: groove' : ''})`).join(', ');
  const text = [`Fitting your session, ${where}`, got.chordText, got.target.drums || got.target.bass ? 'groove read' : ''].filter(Boolean).join(' · ');
  sessionFit = { target: got.target, text };
  paintFitNote();
  searchParts();
  log.ok(`🎯 ${text}. Read: ${read}${notRead}. Parts: what goes best with it first.`);
}

/** Over Parts, while 🎯 is on: what it is fitting to. */
function paintFitNote() {
  $('fitNote').hidden = !sessionFit;
  $('fitText').textContent = sessionFit?.text ?? '';
  $('fitSession').classList.toggle('on', !!sessionFit);
}

/** ↓ Sort: for Fit and Fill % there must be a loop or session to sort against; the other orders always. */
function paintFitSort() {
  $('sortFit').disabled = !partTarget && ['fit', 'fill'].includes($('sortBy').value);
}

/** ✕: Parts in its usual order again (or by New loop's loop). */
function stopSessionFit() {
  if (!sessionFit) return;
  sessionFit = null;
  paintFitNote();
  searchParts();
  log.log('🎯 No longer fitting to the session.');
}

/**
 * The loop as Parts (and the undo history) take it: while a ▶▶ playlist plays, its row as it was
 * before it (what sounds there changes every few bars: Parts' marks would never stay still, and
 * ↶ would bring back a passing one).
 */
function measuredLoop() {
  if (!fillChains.size) return loop;
  const savedRows = new Map([...fillChains.values()].map((c) => [c.row, c.saved]));
  return {
    ...loop,
    rows: loop.rows.map((row) => {
      const saved = savedRows.get(row);
      return saved ? { ...row, program: saved.program, drums: saved.drums, name: saved.name, sound: saved.sound, clips: saved.clips, off: saved.off } : row;
    }),
  };
}

/** The target for Parts now, and a text that changes when it does. */
function partsTargetNow() {
  if (sessionFit) return sessionFit.target;   // 🎯: the session, over New loop's loop
  const t = loopMode ? loopTarget(measuredLoop()) : null;
  return t && (t.chords || t.drums || t.bass || t.grid || t.hits) ? t : null;
}
const targetKey = (t) => (t ? `${t.chords}|${t.drums}|${t.bass}|${t.key}|${t.grid ? t.grid.join('.') : ''}|${t.hits ? t.hits.join('') : ''}` : '');

/** Parts searched again with its filters; a search that fails says why (on the count line and in the log) and leaves the list as it was. */
function searchParts(options = {}) {
  try {
    searchPartsNow(options);
  } catch (error) {
    $('partCount').textContent = `The search failed: ${error.message}`;
    reportError(error, 'The Parts search');
  }
}

function searchPartsNow({ keepScroll = false, preserveOrder = false } = {}) {
  const t0 = performance.now();
  paintIconBars();
  // The same filters as Search (catalog.js reads the text as it does: a gesture said in it too).
  const results = catalog.query({
    role: $('fRole').value,
    family: $('fFamily').value,
    text: $('fText').value,
    gesture: $('fGesture').value,
    bpmMin: $('fBpmMin').value,
    bpmMax: $('fBpmMax').value,
    ts: $('fTs').value,
    key: $('fKey').value,
    loop: $('fLoop').value,
    energy: $('fEnergy').value,
    repeats: $('fRepeats').checked,
  });
  // When there is a target, compatible parts come first; ties retain the catalogue order.
  partTarget = partsTargetNow();
  partTargetKey = targetKey(partTarget);
  paintFitSort();
  if (!keepScroll) shownFrag.clear();   // each row starts on the fragment the search found (by Fill %: its best)
  if (!preserveOrder) partFill.clear();
  if (preserveOrder) {
    const available = new Set(results);
    const kept = partResults.filter((id) => available.has(id));
    const existing = new Set(kept);
    const added = results.filter((id) => !existing.has(id));
    // (Those listed already are so without copies: only those coming in may go.)
    partResults = withoutNearRepeats([...kept, ...sortParts(added, { copies: true })], shownFragmentOf);
  } else {
    partResults = sortParts(results);
    partsSortedFor = sortStamp();   // (kept in its order, the list is still as it was sorted)
  }
  paintSortStale();
  partTable.setItems(partResults, { keepScroll });
  const hidden = results.length - partResults.length;
  const gesture = partsGesture();
  $('partCount').textContent = `${partResults.length.toLocaleString()} of ${catalog.size.toLocaleString()} parts${gesture ? ` · ${SEARCH_GESTURE_NAMES[gesture] ?? gesture}` : ''}${hidden > 0 ? ` (${hidden.toLocaleString()} cop${hidden === 1 ? 'y' : 'ies'} left out)` : ''} · ${Math.round(performance.now() - t0)} ms`;
}

/** The gesture Parts searches for: the one chosen, or said in its search text; '' none. */
const partsGesture = () => Catalog.searchWords($('fText').value, $('fGesture').value).gesture;

let partSeed = 1;   // Parts in Random order: the shuffle (↓ Sort draws another)

/**
 * Parts in the order chosen (sortBy): Fit or Fill % against the loop or session (sortByFit); with
 * neither, by gesture score when one is searched for, else as found (file order); Tempo (slowest
 * first), Longest (its fragment shown), Random. Without copies of the same piece
 * (withoutNearRepeats) unless `copies`.
 */
function sortParts(ids, { copies = false } = {}) {
  const by = $('sortBy').value;
  paintFillNote(null);   // (by Fill %, sortByFill says what it measured against)
  if ((by === 'fit' || by === 'fill') && partTarget) return sortByFit(ids);   // (without copies already)
  const gesture = partsGesture();
  // (Each part's value once, not at each comparison: a library has hundreds of thousands.)
  const sortedBy = (value, dir = 1) => {
    const v = new Map(ids.map((id) => [id, value(id)]));
    return [...ids].sort((a, b) => dir * (v.get(a) - v.get(b)));
  };
  let sorted = ids;
  // Tempo: in a loop, those nearest its tempo (as it is now) first; else the slowest first.
  if (by === 'bpm' && loopMode) sorted = sortedBy((id) => Math.abs(catalog.part(id).bpm - loop.bpm));
  else if (by === 'bpm') sorted = sortedBy((id) => catalog.part(id).bpm);
  else if (by === 'bars') sorted = sortedBy((id) => catalog.part(id).loopBars, -1);
  else if (by === 'random') sorted = shuffled(ids, partSeed);
  else if (gesture) sorted = sortedBy((id) => catalog.gestureScore(id, gesture) ?? 0, -1);
  return copies ? sorted : withoutNearRepeats(sorted, shownFragmentOf);
}

/** `ids` in an order drawn from `seed`: the same seed, the same order (as Search's Random). */
function shuffled(ids, seed) {
  const out = [...ids];
  let s = seed >>> 0;
  for (let i = out.length - 1; i > 0; i--) {
    s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** What a Parts row shows: its best fragment by Fill %, else the one it is on (`id` the fragment's own). */
function shownFragmentOf(id) {
  const fill = partFill.get(id);
  if (fill) return fill;
  const fid = shownFrag.get(catalog.part(id).part) ?? id;
  return { ...catalog.part(fid), id: fid };
}

/**
 * What of a part plays in the loop open: [{ row (its name), bar, bars }] of the song's bars, each
 * once; none, []. Drawn from the pads' sources, so whatever put them there (a drop, Fill, Arrange).
 */
function loopSourcesOf(p) {
  const path = p.path.toLowerCase();
  const found = new Map();
  for (const row of loop.rows) {
    for (const clip of row.clips.values()) {
      const src = (clip.whole ?? clip).src;
      if (!src || src.ch !== p.ch || src.path.toLowerCase() !== path) continue;
      const key = `${row.name}|${src.bar ?? src.at}`;
      if (!found.has(key)) found.set(key, { row: row.name || 'Instrument', bar: src.bar ?? null, bars: src.bars ?? null });
    }
  }
  return [...found.values()];
}

function sortByFit(results) {
  if ($('sortBy').value === 'fill') {
    const sorted = sortByFill(results);
    if (sorted) return sorted;
  }
  // (A part whose fit cannot be measured goes last, and the log says why: the others are still sorted.)
  const fitScore = (id) => {
    try { return fitOf(catalog.part(id)).score ?? -1; } catch (error) { reportError(error, 'Measuring a part\'s Fit'); return -1; }
  };
  const scores = new Map(results.map((id) => [id, fitScore(id)]));
  return withoutNearRepeats([...results].sort((a, b) => scores.get(b) - scores.get(a)), shownFragmentOf);
}

// ── Parts by Fill %: Fill's whole score (midi/fill.js) for each part, on its best fragment ──

const partFill = new Map();   // a Parts row (its id) -> its best fragment scored as Fill scores it

/**
 * Fill's context for Parts' Fill %, as ✨ Fill would take it at this moment (its "comparison
 * context before Fill"). With pads selected, as Fill on those bars: the loop with them removed,
 * in those bars, the dynamics and activity of the rows selected (of the part's kind, drums or
 * not, if any is). Without, as Fill adding an instrument: the whole loop as it is. Null with no
 * loop to fill (no New loop, 🎯 on, an empty loop, nothing to measure against).
 * { target (as fitOf takes it), contextOf(isDrums) (as scoreFillCandidate takes it), text }
 */
function partsFillContext({ ignoreSelection = false } = {}) {
  if (!loopMode || sessionFit || !loop.rows.length) return null;
  const model = directorModel();
  const daring = Number(loopPanel.toolbar.querySelector('.lp-daring')?.value) || 1;
  const sel = ignoreSelection ? null : loopPanel.sel;
  const of = measuredLoop();   // (a ▶▶ playlist's row as it was before it)
  const from = sel ? sel.c0 * loopPanel.unit : 0;
  const to = sel ? Math.min(loopBars(of), (sel.c1 + 1) * loopPanel.unit) : 0;
  if (sel && to > from) {
    const contextLoop = loopWithoutSelection(sel, from, to, of);
    const t = targetInBars(contextLoop, from, to);
    const target = t.chords || t.drums || t.bass || t.grid || t.hits ? t : null;
    if (!target) return null;
    const haveMask = contextLoop.rows.reduce((mask, row) => ([...row.clips.values()].some((clip) => clip.notes.length) ? mask | ROLE_BIT[rowRole(row)] : mask), 0);
    const rows = of.rows.slice(sel.r0, sel.r1 + 1);
    const statsOf = (drums) => {
      const same = rows.filter((row) => !!row.drums === drums);
      return rowsDynamics(same.length ? same : rows, from, to);
    };
    const stats = { true: statsOf(true), false: statsOf(false) };
    const names = rows.map((row) => row.name || 'Instrument').join(', ');
    return {
      target,
      text: `Fill % as ✨ Fill on the selected pads: bars ${from + 1}–${to}, against the loop without them · dynamics and activity of ${names}`,
      contextOf: (isDrums) => ({ bars: to - from, dynamics: stats[isDrums].dynamics, notesPerBar: stats[isDrums].notesPerBar, model, haveMask, daring }),
    };
  }
  const target = partsTargetNow();
  if (!target) return null;
  const bars = loopBars(of);
  const haveMask = of.rows.reduce((mask, row) => mask | ROLE_BIT[rowRole(row)], 0);
  const pitched = loopReference(false, of);
  const drums = loopReference(true, of);
  return {
    target,
    text: `Fill % as ✨ Fill adding an instrument: against the whole loop as it is now (${bars} bars)${fillChain ? `, ${fillChain.saved.name || 'the row'} as it was before its ▶▶ playlist` : ''}${ignoreSelection ? '' : ' · select pads to score for those bars instead'}`,
    contextOf: (isDrums) => {
      const ref = isDrums ? drums : pitched;
      return { bars, dynamics: ref.dynamics, notesPerBar: ref.notesPerBar, model, haveMask, daring };
    },
  };
}

/** A part's best fragment by Fill % in `ctx` (partsFillContext), scored (its `id` the fragment's); null when none can be measured. */
function partFillOf(id, ctx) {
  const part = catalog.part(id);
  const fragments = catalog.fragmentIds(part.part).filter((fid) => catalog.part(fid).loopBars);
  let best = null;
  for (const fid of fragments.length ? fragments : [id]) {
    const fragment = catalog.part(fid);
    const measured = fitOf(fragment, ctx.target);
    if (measured.score === null) continue;
    const scored = scoreFillCandidate({ ...fragment, fit: measured.score, measured }, ctx.contextOf(fragment.role === 'drums'));
    if (!best || scored.score > best.score) best = { ...scored, id: fid };
  }
  return best;
}

/** Above Parts: what its Fill % was measured against (null: none). */
function paintFillNote(text) {
  fillNoteText = text ?? null;
  paintSortStale();
}

let fillNoteText = null;      // what Parts' Fill % was last measured against (partsFillContext's text)
let partsSortedFor = '';      // what Parts' order was measured against when it was sorted (sortStamp)

/**
 * What Parts' order depends on, for the order chosen: Fit, the loop's notes and grooves; Fill %,
 * those, its rows (sound, mute, volume…), the pads selected and the role setting; Tempo, the
 * loop's tempo. The others depend on nothing of the loop: ''.
 */
function sortStamp() {
  const by = $('sortBy').value;
  if (!loopMode) return '';
  if (by === 'bpm') return `bpm|${Math.round(loop.bpm)}`;
  if (by === 'fit') return `fit|${partTargetKey}`;
  if (by === 'fill') {
    const rows = measuredLoop().rows.map((r) => [r.program, r.drums ? 1 : 0, r.mute ? 1 : 0, r.solo ? 1 : 0, r.volume, r.clips.size].join(',')).join(';');
    const daring = loopPanel.toolbar.querySelector('.lp-daring')?.value ?? '';
    return `fill|${partTargetKey}|${rows}|${JSON.stringify(loopPanel.sel)}|${daring}|${loopBars(loop)}`;
  }
  return '';
}

/**
 * The loop changed since Parts was sorted (by Fit, Fill % or Tempo): ↓ Sort lights up and the note
 * above the list says so (choosing the same order again in its list is no change, nothing runs:
 * measuring a whole library each time the loop changes would take too long).
 */
function paintSortStale() {
  if ($('pane-parts').hidden) return;
  const by = $('sortBy').value;
  const stale = !!partsSortedFor && partsSortedFor !== sortStamp() && (by === 'bpm' || !!partTarget);
  const button = $('sortFit');
  button.classList.toggle('stale', stale);
  button.title = stale
    ? `The loop has changed since Parts was sorted: sort again${by === 'fill' ? ', measuring Fill % anew' : ''}, against the loop as it is now`
    : 'Sort Parts again by what is chosen in the order list (Random: shuffle again)';
  const note = [by === 'fill' ? fillNoteText : null,
    stale ? `The loop has changed since: ↓ Sort to ${by === 'fill' ? 'measure and sort' : 'sort'} again.` : null].filter(Boolean).join(' · ');
  showNote('fillNote', note || null);
}

/**
 * Parts ordered by Fill %, measured anew against the loop as it is at this moment (each time
 * Fill % is chosen, or ↓ Sort): each row on its best fragment, chosen again by those scores; the
 * same notes in two files once (the best stays). Not Fill's cut (55%) nor its variety: all of
 * them, to see. Null when there is no loop to fill: then by Fit.
 */
function sortByFill(results) {
  const ctx = partsFillContext();
  paintFillNote(ctx?.text);
  if (!ctx) return null;
  for (const id of results) {
    const best = partFillOf(id, ctx);
    if (best) partFill.set(id, best);
  }
  const score = (id) => partFill.get(id)?.score ?? -1;
  const sorted = [...results].sort((a, b) => score(b) - score(a));
  const seen = new Set();
  const exact = sorted.filter((id) => {
    const best = partFill.get(id);
    if (!best) return true;
    shownFrag.set(catalog.part(id).part, best.id);
    const key = contentKey(best);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return withoutNearRepeats(exact, (id) => partFill.get(id));
}

const NEAR_CHECK = 5000;   // how far down the Parts list (any order) is looked at for other transcriptions of what is above
const NEAR_WINDOW = 1000;   // of the fragments kept of the same kind, how many above each is compared with
// Drums: many songs share a plain beat, and those are different parts to choose from: only all but the same.
const NEAR_SAME_DRUMS = 0.95;
const NEAR_MIN_BARS = 4;   // shorter fragments are never taken for another copy unless their notes are exactly the same
const NEAR_NOTES = 0.2;    // two copies of a part have about as many notes: at most this much apart

/**
 * A fragment's notes for withoutNearRepeats: as heard in one key, the loop's (C major with no loop
 * key: any one key does, to set transcriptions in two keys side by side; drums: where they
 * strike), and each bar's together.
 */
function nearSignature(fragment) {
  const drums = fragment.role === 'drums';
  const own = drums ? catalog.hits(fragment.id) : catalog.grid(fragment.id);
  if (!own) return null;
  // (Hits are unpacked into a buffer reused: copied.)
  const grid = drums ? Uint8Array.from(own.hits) : transposed(own.grid, transposeBetween(keyClass(fragment.key), loop.key || '0 mayor'));
  // A bar's worth first: only those alike there are looked at step by step.
  const perBar = grid.length / Math.max(1, fragment.loopBars);
  const bars = Array.from({ length: fragment.loopBars }, (_, b) => grid.subarray(b * perBar, (b + 1) * perBar).reduce((m, x) => m | x, 0));
  return { grid, bars, bucket: `${fragment.role}|${fragment.loopBars}|${grid.length}` };
}

/**
 * The Parts list (by Fit, by Fill % or as found) without the same piece twice: a row whose
 * fragment shown (`shownOf(id)`: { ...fragment, id }) has the same notes as one above it, or notes
 * as heard (its drums: where they strike) nearly those of one above (likeness ≥ NEAR_SAME), of
 * the same role and length, goes; the one above, better placed, stays. The first NEAR_CHECK rows
 * are looked at, those below as they are (no one goes that far down; a whole library would take
 * too long).
 */
function withoutNearRepeats(ids, shownOf) {
  const kept = new Map();   // role|bars|steps -> the grids of those kept
  const same = new Map();   // the notes of those kept, exactly (contentKey) -> the row
  const out = [];
  for (let k = 0; k < ids.length; k++) {
    const id = ids[k];
    // (A row that cannot be compared stays, and the log says why: the rest are still looked at.)
    let best = null;
    try { best = k < NEAR_CHECK ? shownOf(id) : null; } catch (error) { reportError(error, 'Looking for repeated parts'); }
    if (!best) { out.push(id); continue; }
    let exact;
    try { exact = contentKey(best); } catch (error) { reportError(error, 'Looking for repeated parts'); out.push(id); continue; }
    if (same.has(exact)) { repeatTrace?.push({ id, of: same.get(exact), how: 'same' }); continue; }
    same.set(exact, id);
    // Nearly the same: only from NEAR_MIN_BARS (a bar or one alone is too little to tell, a plain
    // beat or a held note is in many songs), and only for a part about as long (NEAR_NOTES: the
    // whole part, not only that fragment, is another copy of the one above).
    let mine = null;
    try { mine = best.loopBars >= NEAR_MIN_BARS ? nearSignature(best) : null; } catch (error) { reportError(error, 'Looking for repeated parts'); }
    if (!mine) { out.push(id); continue; }
    const notes = catalog.part(best.id).notes;
    // (The nearest above: the last NEAR_WINDOW kept of its kind. Repeats score near each other.)
    const others = kept.get(mine.bucket) ?? [];
    let repeat = null;
    for (let o = others.length - 1; o >= Math.max(0, others.length - NEAR_WINDOW) && !repeat; o--) {
      if (Math.abs(others[o].notes - notes) > NEAR_NOTES * Math.max(others[o].notes, notes)) continue;
      if (likeness(others[o].bars, mine.bars) < 0.8) continue;
      const alike = likeness(others[o].grid, mine.grid);
      if (alike >= (best.role === 'drums' ? NEAR_SAME_DRUMS : NEAR_SAME)) repeat = { of: others[o].row, alike };
    }
    if (repeat) { repeatTrace?.push({ id, ...repeat, how: 'near' }); continue; }
    out.push(id);
    // Every fragment of the part kept stands for it: another transcription is found whichever
    // section of the piece its best fragment is (the one above may show bar 1, it bar 34).
    const part = catalog.part(best.id).part;
    for (const fid of catalog.fragmentIds(part)) {
      const f = catalog.part(fid);
      if (f.loopBars < NEAR_MIN_BARS || f.role !== best.role) continue;
      let sig = null;
      try { sig = fid === best.id ? mine : nearSignature({ ...f, id: fid }); } catch (error) { reportError(error, 'Looking for repeated parts'); }
      if (!sig) continue;
      sig.row = id;
      sig.notes = notes;
      const list = kept.get(sig.bucket) ?? [];
      list.push(sig);
      kept.set(sig.bucket, list);
    }
  }
  return out;
}

let repeatTrace = null;   // development only (MidiLibraryDebug.repeatTrace): each row left out, { id, of, how, alike }

/** ↓ Sort: Parts again in the order chosen, the row in view (or the one selected) kept where it is. Random: another shuffle. */
function sortPartsByFit() {
  if (!partTarget && ['fit', 'fill'].includes($('sortBy').value)) return;
  if ($('sortBy').value === 'random') partSeed = Math.floor(Math.random() * 2 ** 32);
  const body = $('partBody');
  const height = partTable.rowHeight;
  const scrollTop = body.scrollTop;
  const topIndex = Math.floor(scrollTop / height);
  const selectedIndex = partResults.findIndex((id) => catalog.part(id).part === partTable.selected);
  const selectedTop = selectedIndex * height;
  const selectedVisible = selectedIndex >= 0 && selectedTop >= scrollTop && selectedTop < scrollTop + body.clientHeight;
  const anchorId = selectedVisible ? partResults[selectedIndex] : partResults[topIndex];
  const anchorPart = anchorId === undefined ? null : catalog.part(anchorId).part;
  const anchorOffset = anchorId === undefined ? 0 : (selectedVisible ? selectedTop : topIndex * height) - scrollTop;

  partFill.clear();
  partResults = sortParts(partResults);
  partsSortedFor = sortStamp();
  paintSortStale();
  partTable.setItems(partResults, { keepScroll: true });

  if (anchorPart !== null) {
    const anchorIndex = partResults.findIndex((id) => catalog.part(id).part === anchorPart);
    if (anchorIndex >= 0) body.scrollTop = Math.max(0, anchorIndex * height - anchorOffset);
  }
}

/** The role's drawings show its filter, whatever changed it. */
function paintIconBars() {
  for (const b of $('roleBar').children) b.classList.toggle('on', b.dataset.value === $('fRole').value);
}

/** Drawings that choose in a list, hidden: a click on the one chosen leaves the filter off. */
function iconBar(bar, list, items) {
  $(bar).innerHTML = items.map(({ value, name, icon }) => `<button data-value="${value}" title="${name}" aria-label="${name}">${icon}</button>`).join('');
  $(bar).onclick = (e) => {
    const b = e.target.closest('[data-value]');
    if (!b) return;
    $(list).value = b.dataset.value === $(list).value ? '' : b.dataset.value;
    searchParts();
  };
}

function fillFilters() {
  $('fFamily').append(...GM_FAMILIES.map((name, i) => new Option(name, String(i))));
  iconBar('roleBar', 'fRole', ROLE_ICONS);
  for (const ts of ['4/4', '3/4', '6/8', '2/4', '12/8', '2/2', '5/4', '7/8', '9/8']) $('fTs').append(new Option(ts, ts));
  // One spelling per key: the search matches the others (Db major finds C# major). Values
  // keep the stored form ("C mayor"); labels are English.
  const majors = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const minors = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
  for (const k of majors) $('fKey').append(new Option(`${k} major`, `${k} mayor`));
  for (const k of minors) $('fKey').append(new Option(`${k} minor`, `${k} menor`));
  // The gestures, as Search lists them.
  for (const [id, name] of Object.entries(SEARCH_GESTURE_NAMES)) $('fGesture').append(new Option(name, id));
  for (const id of ['fRole', 'fFamily', 'fTs', 'fKey', 'fLoop', 'fGesture', 'fEnergy', 'fRepeats']) $(id).onchange = () => searchParts();
  for (const id of ['fText', 'fBpmMin', 'fBpmMax']) $(id).oninput = searchPartsSoon;
  $('sortFit').onclick = sortPartsByFit;
  // (A search again, not a sort: the order decides each row's fragment and which copy stays.)
  $('sortBy').onchange = () => searchParts();
  $('fClear').onclick = () => {
    clearPartFilters();
    searchParts();
  };
  // ? : the musical search help; its examples go into Parts' search.
  $('fHelp').onclick = () => $('searchHelpDlg').showModal();
}

/** Parts' filters all off (its order and Fragments stay). */
function clearPartFilters() {
  for (const id of PART_FILTERS) $(id).value = '';
  $('fRepeats').checked = false;
}

// ── selected file ───────────────────────────────────────────────────────────────────────

/**
 * A file chosen in Files. New loop: its tracks in Explore, to listen to and take bars from (the
 * song open and the loop stay as they are). Otherwise it opens (selectFile).
 */
function fileClicked(path, options = {}) {
  if (loopMode) { void act(null, 'Explore', () => openExploreFile(path), false); return; }
  void selectFile(path, options);
}

let selectedPath = '';
let fileLoadTurn = 0;
let dataTrackSelection = null;
// Changing file while listening carries on listening to the new one (kept across a quick run
// of clicks, where a file is left before it has loaded).
let resumeOnLoad = false;

/**
 * After the open file's path, what tells it apart: its tempo, meter, key and length (from the
 * catalogue, or from the file itself while it has not been analysed). 📂 shows it in Explorer,
 * where LUNA can (not in a browser).
 */
function paintFileFacts(path = selectedPath) {
  const f = path ? catalog.file(path) : null;
  const parsed = path && current?.path === path ? current.info : null;
  const bpm = f?.ok ? f.bpm : parsed?.bpm;
  const ts = (f?.ok && f.ts) || parsed?.timeSig;
  const key = f?.ok ? keyLabel(f.key) : '';
  const dur = f?.ok ? f.dur : parsed?.durationSec;
  $('fileFacts').textContent = path ? [bpm ? `${Math.round(bpm)} BPM` : '', ts, key, dur ? formatTime(dur) : ''].filter(Boolean).join(' · ') : '';
  $('revealFile').hidden = !path || !luna || droppedBytes.has(path);   // (a drop's bytes have no place on disk)
  paintRegionStar();
}

// ── MIDI files dropped from Explorer: listed at the top of Files and opened (explored in New loop) ──
// Inside LUNA they come as their paths on disk (Luna.onPathDrop) and are read as any file. Where
// LUNA hands them to the page as plain drops (in a browser; in LUNA 3.1 after the window was
// closed and opened again) only their bytes come: kept here under "Dropped\name", read from here.
const droppedBytes = new Map();
const DROPPED = 'Dropped\\';
{
  // (A read put in its place later, as the development probes do, goes under this one.)
  let read = reader.read;
  // A copy each time: the analysis hands its bytes over to its worker, which leaves them empty here.
  const withDrops = (path) => (droppedBytes.has(path) ? Promise.resolve(droppedBytes.get(path).slice()) : read(path));
  Object.defineProperty(reader, 'read', { get: () => withDrops, set: (fn) => { read = fn; }, configurable: true });
}

/** The files dropped (paths), the MIDI ones listed and the first opened. */
function takeDropped(paths) {
  const mids = paths.filter((p) => /\.midi?$/i.test(p));
  const others = paths.length - mids.length;
  if (others) log.warn(`${others} dropped file${others > 1 ? 's are' : ' is'} not MIDI (.mid, .midi): left out.`);
  if (!mids.length) return;
  const known = new Set(mids.map((p) => p.toLowerCase()));
  const rows = fileRows(mids.map((path) => ({ path, name: baseName(path) })), '').map((r) => ({ ...r, dropped: true }));
  allFileRows = [...rows, ...allFileRows.filter((r) => !known.has(r.path.toLowerCase()))];
  $('filter').value = '';
  applyFileFilter();
  showTab('files');
  showLibraryEmpty(false);
  fileTable.select(mids[0]);
  fileTable.reveal(0);
  fileClicked(mids[0]);
  log.ok(`${mids.length} MIDI file${mids.length > 1 ? 's' : ''} dropped: at the top of Files${loopMode ? ', the first in Explore to take to the loop' : ', the first open'}.`);
}

function wireFileDrops() {
  const hot = (on) => document.body.classList.toggle('drop-hot', on);
  if (globalThis.Luna?.canDropPaths?.()) {
    try {
      Luna.onPathDrop({ dragOver: () => hot(true), dragLeave: () => hot(false), drop: ({ paths }) => { hot(false); takeDropped(paths); } });
    } catch (e) { log.warn(`Dropping files from Explorer is not available: ${e.message}`); }
  }
  const hasFiles = (e) => [...(e.dataTransfer?.types ?? [])].includes('Files');
  document.addEventListener('dragover', (e) => { if (hasFiles(e)) { e.preventDefault(); hot(true); } });
  document.addEventListener('dragleave', (e) => { if (hasFiles(e) && !e.relatedTarget) hot(false); });
  document.addEventListener('drop', async (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    hot(false);
    const paths = [];
    for (const file of e.dataTransfer.files) {
      const path = `${DROPPED}${file.name}`;
      if (/\.midi?$/i.test(file.name)) droppedBytes.set(path, new Uint8Array(await file.arrayBuffer()));
      paths.push(path);
    }
    takeDropped(paths);
  });
}

/** A file shown in Explorer, selected in its folder (LUNA's own, so only inside LUNA). */
async function revealFile(path) {
  if (!path) throw new Error('No file is open.');
  if (!luna || !(await luna.gui.available())) throw new Error('Only inside LUNA: the browser cannot open Explorer.');
  await luna.gui.revealPath(path);
  log.ok(`Shown in Explorer: ${path}`);
}

/** Right click on a file in Files: open it, show it in Explorer, copy its path. */
function wireFileMenu() {
  let menu = null;
  const close = () => { menu?.remove(); menu = null; };
  $('fileBody').addEventListener('contextmenu', (e) => {
    const row = e.target.closest('.vt-row');
    const item = row && fileTable.items[Number(row.dataset.i)];
    if (!item) return;
    e.preventDefault();
    close();
    const path = item.path;
    menu = document.createElement('div');
    menu.className = 'ctx-menu';
    menu.innerHTML = `<button type="button" data-do="open">Open</button>
      <button type="button" data-do="reveal"${luna ? '' : ' disabled title="Only inside LUNA"'}>📂 Show in Explorer</button>
      <button type="button" data-do="copy">Copy path</button>`;
    document.body.append(menu);
    const r = menu.getBoundingClientRect();
    menu.style.left = `${Math.min(e.clientX, innerWidth - r.width - 4)}px`;
    menu.style.top = `${Math.min(e.clientY, innerHeight - r.height - 4)}px`;
    menu.onclick = (ev) => {
      const what = ev.target.closest('[data-do]')?.dataset.do;
      if (!what) return;
      close();
      if (what === 'open') { fileTable.select(path); fileClicked(path); }
      else if (what === 'reveal') void act(null, '📂 Show in Explorer', () => revealFile(path), false);
      else void copyText(path).then(() => log.ok(`Path copied: ${path}`), () => log.warn('The path could not be copied here.'));
    };
  });
  for (const type of ['pointerdown', 'scroll', 'blur']) {
    window.addEventListener(type, (e) => { if (menu && !menu.contains(e.target)) close(); }, true);
  }
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}

async function selectFile(path, { focusCh = null, then = null } = {}) {
  const loadTurn = ++fileLoadTurn;
  let tab = midiTabs.find((item) => item.path === path);
  if (!tab) {
    if (!loopMode) saveActiveMidiTab();
    tab = makeMidiTab(path);
    if (!loopMode) closeUnselectedMidiTabs(tab);
  }
  const resumeAfterSwitch = player.playing && (tab !== activeMidiTab || loopMode);
  if (tab !== activeMidiTab || loopMode) activateMidiTab(tab, { load: false });
  if (resumeAfterSwitch && !tab.current) resumeOnLoad = true;
  endAudition(false);
  dataTrackSelection = null;
  const same = path === selectedPath && current?.path === path;
  let auditioning = false;   // a part sounding alone that began while the song was read
  selectedPath = path;
  fileTable.select(path);
  $('selected').textContent = path;
  $('selected').title = path;
  paintFileFacts(path);
  if (!same) {
    if (player.playing && favPlaying === null) resumeOnLoad = true;
    if (favPlaying !== null) { favPlaying = null; renderFavorites(); }   // a favourite alone: it was its, not the song's
    player.stop();
    current = null;
    info.clear();
    timeline.clear();
    paintPlayer();
    try {
      const bytes = await reader.read(path);
      const parsed = parseMidi(bytes);
      if (path !== selectedPath || loadTurn !== fileLoadTurn) return; // the user moved on meanwhile
      current = { path, info: parsed };
      paintFileFacts(path);
      if (!catalog.current(path)) void indexer.analyseOne(path, bytes).then(() => { fileTable.renderSoon(); paintFileFacts(); });
      // A part began to sound alone while the song was read (a double click on a card of Parts:
      // the first click opens its song, the double click plays the part): the song is shown, and
      // what sounds is left as it is (endAudition loads the song when it ends).
      auditioning = audition !== null;
      if (!auditioning) {
        player.load(parsed);
        player.setChannels(null);
      }
      info.render(parsed, path);
      marked.clear();
      timeline.load(parsed, info.features);
      tab.current = current;
      tab.features = info.features;
      tab.timelineState = timeline.saveState();
      renderCompose();
      paintPlayer();
    } catch (e) {
      if (path !== selectedPath || loadTurn !== fileLoadTurn) return;
      resumeOnLoad = false;
      info.clear(e instanceof NoAccess ? e.message : `Cannot open it: ${e.message}`);
      timeline.clear();
      return;
    }
  }
  if (focusCh) {
    // A search result: that channel alone is marked (and heard), and its lane shown.
    marked.clear();
    marked.add(focusCh);
    if (auditioning) { timeline.draw(); partTable.renderSoon(); }   // (the part alone keeps sounding)
    else applyChannels();
    timeline.focusLane(focusCh);
  }
  const resume = resumeOnLoad && !auditioning;
  resumeOnLoad = false;
  if (then) then();   // it says itself whether to play
  else if (resume && !player.playing) await startPlaying();
  if (tab === activeMidiTab && current?.path === path) saveActiveMidiTab();
}

// ── preview: one state (marked channels, region, loop on/off), read live by the player ──

/** Marked channels changed: redraw the lanes and let the player hear only those. */
function applyChannels() {
  paintRegionStar();
  player.setChannels(marked.size ? marked : null);
  timeline.draw();
  partTable.renderSoon();
}

// ── LUNA's tempo, and changes heard at the next bar ─────────────────────────────────────

const LIVE_MARGIN = 0.25;   // s: a change needs this much ahead to come in cleanly

/** LUNA's session's tempo, 0 with no session open. */
const lunaBpm = () => session?.transport.tempo.value || 0;

// ── undo: the states New loop has been in (as loopSnapshot() gives them), to go back one by one ─

const LOOP_UNDO_MAX = 50;
let loopHistory = [];
let loopRedoHistory = [];

/** ↶ / ↷: the available loop history actions. */
function paintUndo() {
  $('undo').disabled = !(loopMode && loopHistory.length);
  $('redo').disabled = !(loopMode && loopRedoHistory.length);
}

// ── Save loop / Open loop: a loop as a .json file, to take it up again another day ──────────

/**
 * A .json to the Downloads folder and, as LUNA may not let a page download, to the clipboard
 * (not a very large one, such as a big library's analysis).
 */
async function downloadJson(text, name, then) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  let copied = false;
  if (text.length < 5e6) try { await copyText(text); copied = true; } catch { /* not allowed here */ }
  log.ok(`Saved as "${name}" in your Downloads folder${copied ? ' (and copied to the clipboard: paste it into a .json file if it is not there)' : ''}. ${then}`);
}

/** Bytes as a file to the Downloads folder (a saved analysis: too large for the clipboard). */
function downloadBytes(bytes, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([bytes], { type: 'application/octet-stream' }));
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}

/** A selected .json's text, or null when cancelled. */
async function chooseJson() {
  const file = await chooseFile('.json,application/json');
  return file ? file.text() : null;
}

/** Open loop: a .json saved with Save loop; a Loop kit saved by an earlier version opens as a loop too. */
async function openSaved() {
  const file = await chooseFile('.json,application/json');
  if (!file) return log.log('Cancelled.');
  let state;
  try { state = JSON.parse(await file.text()); } catch { throw new Error('That file is not a saved loop (it is not JSON).'); }
  if (state?.app === KIT_FILE) await openKitFile(state);
  else openLoopFile(state, file.name);   // throws when it is not a loop
}

const KIT_FILE = 'mididigger-kit';   // a Loop kit's file (versions before 0.6)

/**
 * A Loop kit saved by an earlier version, as a New loop: its song's meter, key and tempo; a row
 * per instrument it had in it, with its mixer; each row its loop, laid out on the pads the kit
 * had on. Its MIDI files are read again: they must still be where they were.
 */
async function openKitFile(state) {
  if (!state.file || !Array.isArray(state.lanes)) throw new Error('That file is not a kit saved by MIDI Digger.');
  let song;
  try { song = await parsedFile(state.file); } catch { throw new Error(`Cannot open ${state.file}, the kit's song: has it moved?`); }
  if (!song.ppq || song.smpte) throw new Error(`${baseName(state.file)} is in SMPTE time: it has no bars.`);
  const keyOf = (path, info) => keyClass(catalog.file(path)?.key || songKeyOf(info));
  const made = newLoop();
  if (METERS.includes(song.timeSig)) setMeter(made, song.timeSig);
  made.key = keyOf(state.file, song) || made.key;
  made.bpm = Math.round(song.bpm);
  const pads = state.pads ? new Map(state.pads.rows) : null;
  const cols = state.pads?.cols ?? (Number(state.length) || 16);
  const inKit = new Set(state.marked ?? state.lanes.map((l) => l.ch));
  const lanes = state.lanes.filter((l) => inKit.has(l.ch)).sort((a, b) => a.ch - b.ch);
  const grid = { unit: 1, cols, rows: new Map(lanes.map((l) => [l.ch, pads?.get(l.ch) ?? Array(cols).fill(true)])) };
  const plan = gridPlan(grid, lanes.map((l) => l.ch));
  const mix = new Map(state.mix ?? []);
  let missing = 0;
  for (const l of lanes) {
    // Its notes: the kit's song, or the song it was borrowed from.
    const path = l.src?.path ?? state.file;
    const ch = l.src?.ch ?? l.ch;
    let info;
    try { info = l.src ? await parsedFile(path) : song; } catch { log.warn(`Ch ${l.ch}: cannot read ${path} (has it moved?): left out.`); missing++; continue; }
    const name = channelWhat(info, ch, l.startTick);
    const drums = extractNotes(info, `ch:${ch}`).drums;
    const clip = { ...rangeClip(info, ch, { startTick: l.startTick, endTick: l.endTick }, name, keyOf(path, info), barBeats(made)), src: { path, ch, at: l.startTick } };
    if (!clip.notes.length) { log.log(`Ch ${l.ch} (${name}): no notes in its loop: left out.`); continue; }
    const row = addRow(made, { program: drums ? 0 : programAt(info, ch, l.startTick) ?? 0, drums, name });
    if (!row) { log.warn('No channel is left for more instruments: the rest stay out.'); break; }
    Object.assign(row, { mute: false, solo: false, volume: 100 }, mix.get(l.ch) ?? {});
    layRow(row, clip, lanePlacements(plan, l.ch, clip.bars), cols);
  }
  if (!made.rows.length) throw new Error('Nothing of that kit could be read again.');
  made.length = [1, 2, 4, 8, 12, 16, 32].includes(cols) ? cols : null;
  tuneLoop(made);
  openLoopFile(loopFile(made));
  log.ok(`Loop kit of ${baseName(state.file)} open as a loop: ${made.rows.length} instrument${made.rows.length > 1 ? 's' : ''}, its pads as they were${missing ? ` (${missing} could not be read)` : ''}. Save loop keeps it in the new format.`);
}

// ── ⇡ Loop from song: remix the explored song's fragments into New loop ──

let importTurn = new Map();   // song -> the last variation generated in this loop tab
let fillSuggested = new Set();   // instruments Fill has suggested, including ones later removed
let fillReplacements = new Set();   // fragments already tried for the same selected row and bars

/** The tracks selected in Explore, for ⇡ Loop from song and ⇉ All fragments: null (all of them) when none is. */
function exploreChannels() {
  return explored?.selected.size ? new Set(explored.selected) : null;
}

/** For the log: which tracks came in, when only some were selected. */
const selectedText = (channels) => (channels ? ` (the ${channels.size === 1 ? 'track' : `${channels.size} tracks`} selected in Explore)` : '');

/**
 * ⇡ Loop from song (New loop): a new arrangement of this song's fragments on each press.
 * Locked and unrelated rows stay; an empty loop takes the song's meter, key and tempo.
 * `channels`: only those tracks of the song (the ones selected in Explore; null, all).
 */
async function importSong(path, channels = null) {
  const i = await parsedFile(path);
  if (!i.ppq || i.smpte) throw new Error(`${baseName(path)} is in SMPTE time: it has no bars to take loops from.`);
  const own = loop.rows.filter((r) => r.imported === path);
  const turn = own.length && importTurn.has(path) ? importTurn.get(path) + 1 : 0;
  const plan = planSongImport(loop.rows, path, channels);
  const key = keyClass(catalog.file(path)?.key || songKeyOf(i));
  const input = {
    ...loop,
    timeSig: !plan.rows.length && METERS.includes(i.timeSig) ? i.timeSig : loop.timeSig,
    key: !plan.rows.length ? key || loop.key : loop.key,
    bpm: !plan.rows.length && !lunaBpm() ? Math.round(i.bpm) : loop.bpm,
  };
  const result = remixSongLoop(input, i, path, { key, turn, model: directorModel(), channels });
  importTurn.set(path, result.turn);
  if (!result.changed) {
    log.warn('⇡ No different arrangement was found in these attempts. The loop was left unchanged; press again to try more combinations.');
    return;
  }
  Object.assign(loop, result.loop);
  recordLoop();
  loopPanel.render();
  soundLoop();
  partTable.renderSoon();
  if (result.skipped.length) log.warn(`⇡ Could not add song channels ${result.skipped.join(', ')}: no free row or the loop already has drums.`);
  log.ok(`⇡ ${baseName(path)}: ${result.added} instrument${result.added === 1 ? '' : 's'}${selectedText(channels)}, fragments rearranged${result.rests ? ` with ${result.rests} empty pads` : ''}${result.score === null ? '' : ` (mean Fill score ${Math.round(result.score * 100)}%)`}. Press again for another variation. ↶ to undo.`);
}

/**
 * ⇉ All fragments: each instrument of the song explored, its different fragments one after
 * another from bar 1 (midi/song-loop.js fragmentsSongLoop). The loop as importSong takes it: an
 * empty one takes the song's meter, key and tempo.
 */
async function songFragmentsIntoLoop(path, channels = null) {
  const i = await parsedFile(path);
  if (!i.ppq || i.smpte) throw new Error(`${baseName(path)} is in SMPTE time: it has no bars to take fragments from.`);
  const plan = planSongImport(loop.rows, path, channels);
  const key = keyClass(catalog.file(path)?.key || songKeyOf(i));
  const input = {
    ...loop,
    timeSig: !plan.rows.length && METERS.includes(i.timeSig) ? i.timeSig : loop.timeSig,
    key: !plan.rows.length ? key || loop.key : loop.key,
    bpm: !plan.rows.length && !lunaBpm() ? Math.round(i.bpm) : loop.bpm,
  };
  const result = fragmentsSongLoop(input, i, path, { key, channels });
  Object.assign(loop, result.loop);
  recordLoop();
  loopPanel.render();
  soundLoop();
  partTable.renderSoon();
  if (result.skipped.length) log.warn(`⇉ Could not add song channels ${result.skipped.join(', ')}: no free row or the loop already has drums.`);
  log.ok(`⇉ ${baseName(path)}: ${result.added} instrument${result.added === 1 ? '' : 's'}${selectedText(channels)}, ${result.placed} different fragment${result.placed === 1 ? '' : 's'} one after another over ${result.total} bars${result.cut ? `, ${result.cut} cut at the loop's end` : ''}${result.left ? `; ${result.left} more did not fit` : ''}. Where an instrument's fragments run out its pads stay empty. ↶ to undo.`);
}

/**
 * Channels of a song into the loop, each a row of its own, its range (`ranges`: Map ch ->
 * { startTick, endTick }) round and round over the loop's length (16 bars when it has none). An
 * empty loop takes the song's meter, key and tempo (LUNA's when a session is open); a drums row
 * the loop has already stays. `tag`: fields for each row made (Import marks its rows with the
 * song). Returns how many came in; throws when none could.
 */
function channelsIntoLoop(path, i, ranges, mark, tag = {}, beforeRecord = null, { preserveLocked = false } = {}) {
  const key = keyClass(catalog.file(path)?.key || songKeyOf(i));
  if (!loop.rows.length) {
    if (METERS.includes(i.timeSig)) setMeter(loop, i.timeSig);
    loop.key = key || loop.key;
    if (!lunaBpm()) loop.bpm = Math.round(i.bpm);
  }
  if (!loop.length) loop.length = 16;
  const total = loop.length;
  let added = 0;
  const made = [];
  // Drums first (their row goes on top), then the others as the song numbers them.
  for (const ch of [...ranges.keys()].sort((a, b) => Number(a !== 10) - Number(b !== 10) || a - b)) {
    const { startTick, endTick } = ranges.get(ch);
    const drums = ch === 10;
    if (drums && loop.rows.some((r) => r.drums)) { log.log(`${mark} The loop has its drums already: the song's stay out.`); continue; }
    const name = channelWhat(i, ch, startTick);
    const clip = { ...rangeClip(i, ch, { startTick, endTick }, name, key, barBeats(loop)), src: { path, ch, at: startTick } };
    if (!clip.notes.length) continue;
    const row = addRow(loop, { program: drums ? 0 : programAt(i, ch, startTick) ?? 0, drums, name });
    if (!row) { log.warn(`${mark} No channel is left for more instruments: the rest stay out.`); break; }
    Object.assign(row, tag, tag.imported ? { importedCh: ch } : {});
    for (let b = 0; b < total; b += clip.bars) placeClip(row, b, { ...clip, notes: clip.notes.map((n) => ({ ...n })) }, total);
    made.push(row);
    added++;
  }
  if (!added) throw new Error(`Nothing of ${baseName(path)} could go into the loop: no notes there.`);
  beforeRecord?.(made);   // one change for ↶, with what the caller does to the new rows
  tuneLoop(preserveLocked ? { key: loop.key, rows: loop.rows.filter((row) => !row.locked) } : loop);
  recordLoop();
  loopPanel.render();
  soundLoop();
  partTable.renderSoon();
  return added;
}

/**
 * A fresh New loop. The open song is loaded into Explore with all its tracks. With bars selected
 * on the song, the new loop also opens with them, each instrument heard there (the ones marked;
 * none marked, all) a row of its own, the selection round and round.
 */
async function newLoopFromSong() {
  const song = current;
  const range = !activeLoopTab && song?.info.ppq && !song.info.smpte ? timeline.range : null;
  const channels = song && range ? (marked.size ? [...marked] : song.info.channels.map((c) => c.channel)) : [];
  const tab = makeLoopTab();
  activateLoopTab(tab);
  fillSuggested.clear();
  fillReplacements.clear();
  if (song) {
    await openExploreFile(song.path);
    if (activeLoopTab !== tab) return;
    // The song in Explore with all its tracks selected (bars chosen in the song: the tracks marked, below).
    if (explored?.parts) setExplorePicks(new Set(explored.parts.keys()), explored.ch, false);
  }
  if (!range) return;
  if (channels.length) setExplorePicks(new Set(channels), channels[0]);
  explorer.setRegion(range, true);
  const lane = explorer.lanes.find((item) => item.ch === explored?.ch);
  const fragment = lane?.fragments.findIndex((item) => item.ticks === range.endTick - range.startTick
    && item.ats.includes(range.startTick)) ?? -1;
  explorer.setActiveFragment(fragment >= 0 ? { ch: explored.ch, n: fragment } : null);
  explorer.revealRegion();
  paintExplore();
  const added = channelsIntoLoop(song.path, song.info, new Map(channels.map((ch) => [ch, range])), '✂');
  const d = timeline.describe();
  log.ok(`✂ ${baseName(song.path)}: ${d.len} bar${d.len === '1' ? '' : 's'} from ${d.from} into New loop, ${added} instrument${added > 1 ? 's' : ''}${marked.size ? ' (the ones marked)' : ''}. ↶ to undo.`);
}

// ── a part of Parts heard alone (▶), in place of the song open, which stays as it is ──────

/** `song` alone, looped, in place of what plays, from second `from`: `id` says what it is (audition). */
async function soundAlone(song, id, from = 0) {
  if (audition === null) auditionBack = { playing: player.playing, pos: player.songPosition };
  wholeChannel = false;
  trackFromPoint = false;
  player.stop();
  audition = id;
  player.load(song);
  player.setChannels(null);
  player.setLoop({ startSec: 0, endSec: song.durationSec });
  await startPlaying(from);
}

/** ▶ in Parts: part `i` alone, its fragments one after the other; a part with no loop, whole. */
async function auditionPart(i) {
  pendingListen = i;
  try {
    await auditionPartNow(i);
  } finally {
    if (pendingListen === i) pendingListen = null;
  }
}

async function auditionPartNow(i) {
  const p = catalog.part(i);
  const turn = ++listenTurn;
  const src = await parsedFile(p.path);
  if (turn !== listenTurn) return;   // another was chosen meanwhile: the last one sounds
  if (p.loopBars) { await auditionFragments(p, src); return; }
  const { song, bars } = wholeTrackSong(p, src);
  await soundAlone(song, i);
  selectPart(i);
  partTable.renderSoon();
  log.log(`${p.instrument} · ${baseName(p.path)} alone, ${bars} bar${bars > 1 ? 's' : ''}.`);
}

/** A part's whole track alone, all its song's bars (heardIn set to them): { song, bars, startTick }. */
function wholeTrackSong(p, src) {
  const bars = Math.max(1, Math.ceil(src.bars));
  // Drums on the drums channel; the rest on its own channel (never the drums').
  const ch = p.role === 'drums' ? 10 : p.ch === 10 ? 1 : p.ch;
  const startTick = src.barStartTick(1);
  const endTick = src.barStartTick(1 + bars);
  const song = lanesSong(src, [{ ch, startTick, endTick, info: src, srcCh: p.ch, transpose: 0 }], null, null);
  if (!song) throw new Error('Nothing to play there.');
  heardIn = { pieces: [{ startSec: 0, endSec: song.durationSec, fromSec: src.tickToSec(startTick), toSec: src.tickToSec(endTick) }], duration: src.durationSec };
  return { song, bars, startTick };
}

/**
 * "Fragments" off in Parts: a click on a thumbnail listens from that point, whatever fragment is
 * there. On a song: the part's whole track alone, from that very moment (another click, from
 * there). In a loop: over the loop, as many bars as the loop has from the bar clicked, in time
 * with it (alone if the loop is stopped).
 */
async function listenFromPoint(item, box, e) {
  const id = shownOf(item);
  const p = catalog.part(id);
  const turn = ++listenTurn;
  const src = await parsedFile(p.path);
  if (turn !== listenTurn) return;   // another was chosen meanwhile: the last one sounds
  const r = box.getBoundingClientRect();
  const x = Math.max(0, Math.min(0.999, (e.clientX - r.left) / r.width));
  // The card shows only its fragment's bars (a length searched): the point within those.
  const span = miniKey(id) !== id ? zoomSpans.get(id) : null;
  const sec = span ? span.from + x * (span.to - span.from) : x * src.durationSec;
  const tick = src.secToTick(sec);
  if (loopMode) {
    const lastBar = Math.max(1, Math.ceil(src.bars));
    const bar = Math.min(lastBar, Math.max(1, Math.floor(src.barOfTick(tick) + 1e-9)));
    const bars = Math.max(1, Math.min(loopBars(loop), lastBar - bar + 1));
    const atTick = src.barStartTick(bar);
    const ticks = src.barStartTick(bar + bars) - atTick;
    const stretch = { ...p, atTick, ticks, loopStart: bar, loopBars: bars };
    await listenInLoop(id, { part: stretch, fraction: Math.max(0, Math.min(0.999, (tick - atTick) / Math.max(1, ticks))) });
    return;
  }
  const { song, startTick } = wholeTrackSong(p, src);
  auditionRow = null;   // (the whole track: no fragment to follow)
  auditionPlaces = [];
  // (lanesSong plays at the file's main tempo, not its tempo map: the point clicked, in its seconds.)
  await soundAlone(song, id, Math.max(0, ((tick - startTick) * 60) / src.bpm / src.ppq));
  trackFromPoint = true;
  selectPart(id);
  partTable.renderSoon();
}

/**
 * A part's fragments, left to right, from `p` on and round again, on one bar grid so that they
 * keep time (fragmentSequence): each on its beat of the bar, whole bars each.
 */
async function auditionFragments(p, src) {
  const row = catalog.fragmentsInSong(p.part).map((id) => catalog.part(id)).filter((f) => f.ticks);
  const song = fragmentSequence(src, p.ch, row.map((f) => ({ at: f.atTick, ticks: f.ticks, startBar: f.loopStart, bars: f.loopBars })));
  if (!song.events.length) throw new Error(`${p.instrument} in ${baseName(p.path)} has nothing to play.`);
  const songSec = (bar) => src.tickToSec(src.barStartTick(bar));
  heardIn = { pieces: row.map((f, k) => ({ ...song.places[k], fromSec: songSec(f.loopStart), toSec: songSec(f.loopStart + f.loopBars) })), duration: src.durationSec };
  await soundAlone(song, p.index, song.places[row.findIndex((f) => f.index === p.index)]?.startSec ?? 0);
  auditionRow = row.map((f) => f.index);
  auditionPlaces = song.places;
  selectPart(p.index);
  partTable.renderSoon();
}

/** Each frame: the row playing its fragments shows the one that sounds. */
function followFragments() {
  if (!auditionRow) return;
  const pos = player.songPosition;
  const id = auditionRow[auditionPlaces.findIndex((s) => pos >= s.startSec && pos < s.endSec)];
  if (id === undefined || id === audition) return;
  audition = id;
  shownFrag.set(catalog.part(id).part, id);
  selectPart(id, { quiet: true });   // the part playing moves on by itself: no log line each time
  partTable.renderSoon();
}

/** What was there again after listening to a part alone: the song (playing if `play`). */
function endAudition(play) {
  if (audition === null) return;
  audition = null;
  auditionRow = null;
  player.stop();
  player.setChannels(null);
  if (current) {
    player.load(current.info);
    applyChannels();
    applyLoop();
    if (play) void startPlaying(auditionBack?.pos ?? 0);
    timeline.updateLabels();
    paintPlayer();
  }
  partTable.renderSoon();
}

/** A part with no fragment as a passage: from its first note to its last, 16 bars at most. */
function channelPassage(src, ch) {
  const bars = src.events.filter((e) => e.type === 'on' && e.ch === ch - 1).map((e) => noteBar(src, e.tick));
  if (!bars.length) return null;
  const first = Math.min(...bars);
  return { bar: first, bars: loopRound(Math.min(16, Math.max(...bars) - first + 1)) };
}

// ── a loop built from nothing: parts of any song on pads, nothing to do with the song open ─

const emptyLoop = newLoop();
const loop = new Proxy(emptyLoop, {
  get(_target, key) { return Reflect.get(activeLoopTab?.loop ?? emptyLoop, key); },
  set(_target, key, value) { return Reflect.set(activeLoopTab?.loop ?? emptyLoop, key, value); },
});
let loopState = '';

// ↶ in New loop: the states it has been in (loopHistory), as its file keeps it, notes and all.
// (A ▶▶ playlist's row as it was before it: what passes through it is not a step to go back to.)
const loopSnapshot = () => JSON.stringify({ ...loopFile(measuredLoop()), saved: null });

/** After each change: the state before it goes to the history. */
function recordLoop() {
  adoptEditedChainRow();
  const now = loopSnapshot();
  if (now === loopState) return;
  loopHistory.push(loopState);
  if (loopHistory.length > LOOP_UNDO_MAX) loopHistory.shift();
  loopRedoHistory.length = 0;
  loopState = now;
  paintUndo();
}

/** ↶: the loop as it was before the last change. */
function undoLoop() {
  const s = loopHistory.pop();
  if (!s) return;
  endAllFillChains();   // the loop goes back to its saved rows before a preview plays
  loopRedoHistory.push(loopState);
  readLoop(loop, JSON.parse(s));
  loopState = s;
  loopPanel.render();
  soundLoop();
  paintUndo();
  log.log(`Undo: the loop as it was before the last change${loopHistory.length ? ` (${loopHistory.length} more to undo)` : ''}.`);
}

/** ↷: restore the most recently undone loop state. */
function redoLoop() {
  const s = loopRedoHistory.pop();
  if (!s) return;
  endAllFillChains();
  loopHistory.push(loopState);
  if (loopHistory.length > LOOP_UNDO_MAX) loopHistory.shift();
  readLoop(loop, JSON.parse(s));
  loopState = s;
  loopPanel.render();
  soundLoop();
  paintUndo();
  log.log(`Redo: restored the last undone loop change${loopRedoHistory.length ? ` (${loopRedoHistory.length} more to redo)` : ''}.`);
}

let loopPanel = new LoopPanel($('loopPanel'), loop, {
  // A volume being slid is one change, made when it is let go.
  onChange: ({ restart, sliding }) => { if (!sliding) recordLoop(); soundLoop({ restart }); paintFillChain(); },
  onExploreClose: closeExplore,
  onExploreOpenSong: () => { if (explored) void selectFile(explored.part.path); },
  // What Fill found shows at once: its results tab on the left (only when it found something new).
  onFill: (daring, selection, source) => void act(null, '✨ Fill', async () => {
    const tab = activeLoopTab;
    const before = { review: tab?.fillReview, tabs: tab?.fillReviewTabs.length ?? 0 };
    await fillLoop(daring, selection, source);
    if (!loopMode || activeLoopTab !== tab || !tab) return;
    if (tab.fillReviewTabs.length > before.tabs) selectFillReviewTab(tab.fillReviewTabs.at(-1));
    else if (tab.fillReview !== before.review && tab.fillReview?.length) selectFillReviewTab(null);
  }, false),
  onImport: () => { if (explored?.parts) void act(null, '⇡ Loop from song', () => importSong(explored.part.path, exploreChannels()), false); },
  onImportFragments: () => { if (explored?.parts) void act(null, '⇉ All fragments', () => songFragmentsIntoLoop(explored.part.path, exploreChannels()), false); },
  onArrange: (template, daring, source) => void act(null, ARRANGE_NAMES[template], () => arrangeLoop(template, daring, source), false),
  onSync: (on, ms) => setSync(on, ms),
  onWarning: (message) => log.warn(message),
  onSound: (row) => openRowSound(row),
  onFavorite: (row, e) => openRowFavMenu(row, e),
  favoriteOf: (row) => rowFavoriteCollections(row),
  playlistActive: (row) => [...fillChains.values()].some((chain) => chain.row === row),
  onSeekBar: seekLoopBar,
  // Other pads selected: Parts by Fill % was measured for the ones before (↓ Sort lights up). (Later: it can come while the panel is made.)
  onSelection: () => queueMicrotask(paintSortStale),
  toolbar: $('loopToolbar'),
});
loopPanel.toolbar.querySelector('.lp-daring').addEventListener('change', paintSortStale);   // (Fill % weighs roles by it)
let explored = null;   // the track in it: { part, info, ch }; a whole file also has `parts` (ch -> part)
// One track of any song in full, as the lanes show it, to pick bars from for the loop; or a
// whole file (chosen in Files), its tracks lower; click their names to pick them.
let explorer = new Timeline(loopPanel.exploreLane, {
  get laneH() { return explored?.parts ? 44 : 80; },
  fragmentToggle: true,
  firstFragmentOnly: true,
  regionLanes: () => explored?.selected ?? new Set(),
  isPicked: (ch) => !!explored?.selected.has(ch),
  isSounding: (ch) => exploringAlone() && exploreSounding() && explored?.selected.size === 1 && explored.selected.has(ch),
  onPickToggle: (ch) => toggleExplorePick(ch),
  onLaneClick: (ch) => ensureExplorePick(ch),
  // ▶ selects and plays only this track; ▶ on the one already playing stops it.
  onSolo(ch) {
    const same = exploringAlone() && exploreSounding() && player.channels?.size === 1 && player.channels.has(ch);
    pickExplore(ch, false);
    if (same) toggleExplore();
    else void act(null, '▶ Explore', () => soundExplore(null, true), false);
  },
  onPlayPause: () => toggleExplore(),
  onRegion: (range, { final, created }) => exploreRegion(final, created),
  onToggleLoop() {
    explorer.setLoopOn(!explorer.loopOn);
    exploreRegion(true, false);
  },
  onClearRegion: () => exploreRegion(true, false),
  onSeek: (sec) => exploreSeek(sec),
  onFragmentClick({ ch, n }, tick) {
    ensureExplorePick(ch);
    const f = explorer.lanes.find((l) => l.ch === ch).fragments[n];
    const at = f.ats.find((a) => tick >= a && tick < a + f.ticks) ?? f.at;
    explorer.setRegion({ startTick: at, endTick: at + f.ticks }, true);
    exploreRegion(true, true);
  },
});

const loopTabs = [];
const midiTabs = [];
let nextLoopTab = 1;

function makeMidiTab(path) {
  const name = baseName(path);
  const tab = { path, current: null, features: null, marked: new Set(), timelineState: null };
  tab.element = document.createElement('div');
  tab.element.className = 'workspace-tab-wrap';
  tab.button = document.createElement('button');
  tab.button.className = 'workspace-tab';
  tab.button.type = 'button';
  tab.button.setAttribute('role', 'tab');
  tab.button.textContent = name.slice(0, 11);
  tab.button.title = path;
  tab.button.setAttribute('aria-selected', 'false');
  tab.button.onclick = () => activateMidiTab(tab);
  const close = document.createElement('button');
  close.className = 'workspace-close';
  close.type = 'button';
  close.textContent = '×';
  close.setAttribute('aria-label', `Close ${name}`);
  close.title = 'Close this MIDI';
  close.onclick = () => closeMidiTab(tab);
  tab.element.append(tab.button, close);
  $('loopTabs').append(tab.element);
  midiTabs.push(tab);
  return tab;
}

/**
 * A loop tab named after its file (opened, or saved under that name), as a MIDI file's tab is:
 * its first 11 characters, the whole name in its tooltip. Save loop offers that name again.
 */
function nameLoopTab(tab, fileName) {
  tab.fileName = fileName;
  tab.saveName = fileName.replace(/\.json$/i, '');
  tab.button.textContent = fileName.slice(0, 11);
  tab.button.title = fileName;
}

function makeLoopTab(initialLoop = newLoop()) {
  requireLoops();
  const tab = {
    id: nextLoopTab++,
    loop: initialLoop,
    loopId: crypto.randomUUID(),
    history: [],
    redo: [],
    state: '',
    fillSuggested: new Set(),
    fillReview: null,
    fillReviewTabs: [],
    selectedFillTab: null,
    fillReplacements: new Set(),
    importTurn: new Map(),
    explored: null,
    exploreRange: null,
    exploreFragment: null,
    explorePx: 20,
    exploreFit: true,
    exploreScrollLeft: 0,
    exploreScrollTop: 0,
    loopScrollLeft: 0,
    selection: null,
    copied: null,
    takeOut: null,
    daring: '1',
    syncOn: prefs.get('lunaSync') === '1',
    syncMs: Number(prefs.get('syncMs')) || 0,
  };
  tab.element = document.createElement('div');
  tab.element.className = 'workspace-tab-wrap';
  tab.element.innerHTML = `<button class="workspace-tab" type="button" role="tab" aria-selected="false">Loop ${tab.id}</button><button class="workspace-close" type="button" aria-label="Close loop ${tab.id}" title="Close this loop">×</button>`;
  tab.button = tab.element.querySelector('.workspace-tab');
  tab.button.onclick = () => activateLoopTab(tab);
  tab.element.querySelector('.workspace-close').onclick = () => closeLoop(tab);
  $('loopTabs').append(tab.element);
  loopTabs.push(tab);
  tab.state = JSON.stringify({ ...loopFile(tab.loop), saved: null });
  return tab;
}

function saveActiveLoopTab() {
  if (!activeLoopTab) return;
  rememberFillReviewRows(activeLoopTab, loop.rows);
  Object.assign(activeLoopTab, {
    history: loopHistory,
    redo: loopRedoHistory,
    state: loopState,
    fillSuggested,
    fillReplacements,
    importTurn,
    explored,
    exploreRange: explorer.range,
    exploreFragment: explorer.activeFragment,
    explorePx: explorer.px,
    exploreFit: explorer.fit,
    exploreScrollLeft: explorer.scroll.scrollLeft,
    exploreScrollTop: explorer.scroll.scrollTop,
    loopScrollLeft: loopPanel.grid.scrollLeft,
    selection: loopPanel.sel,
    copied: loopPanel.copied,
    takeOut,
    daring: loopPanel.toolbar.querySelector('.lp-daring').value,
    syncOn: lunaSync,
    syncMs,
  });
}

function renderWorkspaceTabs() {
  const songActive = !activeLoopTab && !activeMidiTab;
  $('songTab').classList.toggle('on', songActive);
  $('songTab').setAttribute('aria-selected', String(songActive));
  for (const tab of midiTabs) {
    const active = !activeLoopTab && tab === activeMidiTab;
    tab.button.classList.toggle('on', active);
    tab.button.setAttribute('aria-selected', String(active));
  }
  for (const tab of loopTabs) {
    const active = tab === activeLoopTab;
    tab.button.classList.toggle('on', active);
    tab.button.setAttribute('aria-selected', String(active));
  }
}

/** An untouched MIDI tab is temporary: keep tabs with a channel, range or fragment selected. */
function midiTabHasSelection(tab) {
  const state = tab.timelineState;
  return tab.marked.size > 0
    || !!state?.range
    || !!state?.activeFragment
    || [...(state?.fragPicks?.values() ?? [])].some((picks) => picks.size > 0);
}

/** When a new MIDI is opened, discard untouched MIDI tabs without disturbing the current switch. */
function closeUnselectedMidiTabs(keep) {
  for (const tab of [...midiTabs]) {
    if (tab === keep || midiTabHasSelection(tab)) continue;
    tab.element.remove();
    midiTabs.splice(midiTabs.indexOf(tab), 1);
    if (tab === activeMidiTab) activeMidiTab = null;
  }
}

function saveActiveMidiTab() {
  if (!activeMidiTab || loopMode || current?.path !== activeMidiTab.path) return;
  activeMidiTab.current = current;
  activeMidiTab.marked = new Set(marked);
  activeMidiTab.timelineState = timeline.saveState();
  activeMidiTab.features = info.features;
}

function restoreExplorer(tab) {
  explored = tab.explored;
  if (!explored) {
    explorer.clear();
    paintExplore();
    return;
  }
  const tracks = explored.parts
    ? new Map([...explored.parts.keys()].map((ch) => [ch, partFeatures(explored.info, ch)]))
    : new Map([[explored.ch, partFeatures(explored.info, explored.ch)]]);
  explorer.load(explored.info, tracks, explored.parts ? null : explored.ch);
  explorer.fit = tab.exploreFit;
  explorer.px = tab.explorePx;
  explorer.draw();
  explorer.setRegion(tab.exploreRange, !!tab.exploreRange);
  explorer.setActiveFragment(tab.exploreFragment);
  explorer.scroll.scrollLeft = tab.exploreScrollLeft;
  explorer.scroll.scrollTop = tab.exploreScrollTop;
  paintExplore();
}

// The library's tab (Files, Parts, Search) stays as it is: what was being looked at (a search's
// results, a file found) is still there to take to the loop.
function activateLoopTab(tab) {
  if (tab === activeLoopTab) return;
  endAllFillChains();   // restore all playlist rows before this loop is put away
  saveActiveLoopTab();
  saveActiveMidiTab();
  endAudition(false);
  player.stop();
  loopListen = null;
  syncDriven = false;
  activeLoopTab = tab;
  loopMode = true;
  loopHistory = tab.history;
  loopRedoHistory = tab.redo;
  loopState = tab.state;
  readLoop(loop, JSON.parse(tab.state));
  restoreFillReviewRows(tab, loop.rows, fillChainDone);
  fillSuggested = tab.fillSuggested;
  fillReplacements = tab.fillReplacements;
  importTurn = tab.importTurn;
  takeOut = tab.takeOut;
  lunaSync = tab.syncOn;
  syncMs = tab.syncMs;
  loopPanel.sel = tab.selection;
  loopPanel.copied = tab.copied;
  loopPanel.toolbar.querySelector('.lp-daring').value = tab.daring;
  loopPanel.anchor = null;
  loopPanel.position = null;
  loopPanel.counted = null;
  $('songWorkspace').hidden = true;
  $('loopWorkspace').hidden = false;
  document.body.classList.add('loop-mode');
  renderWorkspaceTabs();
  loopPanel.render();
  loopPanel.grid.scrollLeft = tab.loopScrollLeft;
  paintFillDetails();
  restoreExplorer(tab);
  loopPanel.showBar(null);
  loopPanel.showSync(lunaSync, syncMs);
  renderCompose();
  paintUndo();
  soundLoop();
  sortPartsByLoop();
  paintPlayer();
}

function activateMidiTab(tab, { load = true, force = false } = {}) {
  if (tab === activeMidiTab && !loopMode && !force) {
    if (load && !tab.current) void selectFile(tab.path);
    return;
  }
  saveActiveLoopTab();
  saveActiveMidiTab();
  endAudition(false);
  player.stop();
  loopListen = null;
  syncDriven = false;
  activeLoopTab = null;
  activeMidiTab = tab;
  loopMode = false;
  clearLoopOutputs();
  current = tab.current;
  selectedPath = tab.current?.path ?? '';
  marked.clear();
  for (const channel of tab.marked) marked.add(channel);
  fileTable.select(tab.path);
  $('selected').textContent = tab.path;
  $('selected').title = tab.path;
  paintFileFacts(tab.path);
  $('songWorkspace').hidden = false;
  $('loopWorkspace').hidden = true;
  document.body.classList.remove('loop-mode');
  timeline.clear();
  info.clear();
  if (current && tab.features) {
    info.info = current.info;
    info.features = tab.features;
    timeline.load(current.info, tab.features);
    timeline.restoreState(tab.timelineState);
    player.load(current.info);
    player.setChannels(marked.size ? marked : null);
    applyLoop();
  } else {
    current = null;
    selectedPath = '';
  }
  renderWorkspaceTabs();
  renderCompose();
  paintUndo();
  if (partTarget) searchParts({ keepScroll: true });
  partTable.renderSoon();
  paintPlayer();
  paintFillDetails();   // (a song: nothing for Fill details to show)
  if (load && !current) void selectFile(tab.path);
}

function closeMidiTab(tab) {
  const index = midiTabs.indexOf(tab);
  if (index < 0) return;
  const wasActive = tab === activeMidiTab;
  if (wasActive && !loopMode) saveActiveMidiTab();
  tab.element.remove();
  midiTabs.splice(index, 1);
  if (!wasActive) { renderWorkspaceTabs(); return; }
  const next = midiTabs[Math.min(index, midiTabs.length - 1)] ?? null;
  if (loopMode) {
    activeMidiTab = next;
    renderWorkspaceTabs();
    return;
  }
  activeMidiTab = null;
  if (next) activateMidiTab(next, { force: true });
  else activateSongTab();
}

function activateSongTab() {
  saveActiveLoopTab();
  saveActiveMidiTab();
  endAudition(false);
  player.stop();
  loopListen = null;
  syncDriven = false;
  activeLoopTab = null;
  activeMidiTab = null;
  loopMode = false;
  clearLoopOutputs();
  current = null;
  selectedPath = '';
  marked.clear();
  fileTable.select(null);
  $('selected').textContent = '(no file chosen)';
  $('selected').title = '';
  paintFileFacts('');
  info.clear();
  timeline.clear();
  $('loopWorkspace').hidden = true;
  $('songWorkspace').hidden = false;
  document.body.classList.remove('loop-mode');
  renderWorkspaceTabs();
  renderCompose();
  paintUndo();
  player.setChannels(null);
  if (partTarget) searchParts({ keepScroll: true });
  partTable.renderSoon();
  paintPlayer();
  paintFillDetails();
}

function closeLoop(tab = activeLoopTab) {
  if (!tab) return;
  const index = loopTabs.indexOf(tab);
  if (tab === activeLoopTab) saveActiveLoopTab();
  tab.element.remove();
  loopTabs.splice(index, 1);
  if (tab !== activeLoopTab) { renderWorkspaceTabs(); return; }
  player.stop();
  loopListen = null;
  syncDriven = false;
  loopPanel.showBar(null);
  activeLoopTab = null;
  loopMode = false;
  const next = loopTabs[Math.min(index, loopTabs.length - 1)];
  if (next) activateLoopTab(next);
  else if (activeMidiTab) activateMidiTab(activeMidiTab, { force: true });
  else activateSongTab();
}

function startNewLoop() {
  return newLoopFromSong();
}

/** A bar number in the Loop: seek there, or switch back from a part being heard alone. */
/**
 * A bar number clicked over the pads: the loop from that bar. Stopped, it starts playing there
 * (unless it plays along with LUNA, 🔗: LUNA's transport leads); playing, it jumps there and goes on.
 */
function seekLoopBar(bar) {
  if (!loopMode || !Number.isInteger(bar) || bar < 0 || bar >= loopBars(loop)) return;
  // (A part or an Explore track alone in the player: stopped, the loop back in it.)
  if (loopListen?.alone) {
    player.stop();
    syncDriven = false;
    loopListen = null;
    soundLoop();
  }
  const secondsPerBar = (barBeats(loop) * 60) / loop.bpm;
  if (!player.playing && !syncing()) {
    loopPanel.showBar(bar);
    void startPlaying(bar * secondsPerBar);
    return;
  }
  player.seekSong(bar * secondsPerBar);
  loopPanel.showBar(bar);
  loopPanel.count({ beat: 1, bar: bar + 1, lap: player.audibleLap + 1 });
  paintPlayer();
}

/** Seconds between the points a change can come in on: a bar, or a beat as the meter counts them (2/2 in halves, 6/8 in dotted quarters). */
const cutUnit = (quantum = 'bar') => (barBeats(loop) * 60) / loop.bpm / (quantum === 'beat' ? meterPulses(loop.timeSig) : 1);

/**
 * The loop to the player: playing, it comes in at the next bar (`quantum` 'beat': the next beat,
 * for a change heard at once, ▶▶'s), with a new tempo at once.
 */
function soundLoop({ restart = false, at = null, quantum = 'bar', changedRows = null, cutAt = null } = {}) {
  sortPartsByLoop();   // every change to the loop comes through here
  paintLoopFiles();    // ⤓ MIDI once it has something
  if (loopMode && fillPaneOpen() && fillTablesNeedRefresh($('fillDetailsBody'), fillResultRows, fillInstrumentRows,
    fillGroupRow, (inst) => loop.rows.some((row) => playsInstrument(row, inst)))) renderFillDetails();
  if (exploringAlone()) return;   // its song is in the player: the loop comes back when it ends
  const was = player.playing;
  const position = player.songPosition;
  const reviewing = !!loopListen?.fillReview;
  const routingChanged = reviewing ? loopRouting !== '[]' : configureLoopOutputs();
  if (reviewing) clearLoopOutputs();
  let song;
  try {
    song = loopSong(reviewing ? { ...loop, rows: [] } : loop, loopListen);
  } catch (error) {
    if (error.code !== 'midi_channels_unavailable' || !loopListen?.explore) throw error;
    loopListen = null;
    log.warn(error.message);
    song = loopSong(loop);
  }
  if (player.playing && player.loop && !restart && !routingChanged) {
    const unit = cutUnit(quantum);
    const cut = cutAt === null
      ? Math.ceil((player.songPosition + LIVE_MARGIN) / unit - 1e-9) * unit
      : (cutAt - player.audibleLap * Math.max(1, Math.round(player.duration / chainBarSec()))) * chainBarSec();
    const protectedChannels = new Set([...fillChains.values()]
      .filter((chain) => chain.next && loop.rows.includes(chain.row))
      .map((chain) => channelOf(loop, chain.row) + 1));
    const channels = changedRows
      ? new Set(changedRows.filter((row) => loop.rows.includes(row)).map((row) => channelOf(loop, row) + 1))
      : new Set([...song.channels, ...player.info.channels].map((c) => c.channel).filter((ch) => !protectedChannels.has(ch)));
    if (channels.size) player.morph(song, [...channels].map((ch) => ({ ch, at: cut })), { whole: true });
    return;
  }
  player.load(song);
  player.setChannels(null);
  player.setLoop({ startSec: 0, endSec: song.durationSec });
  if (was) void startPlaying(at !== null ? Math.min(at, song.durationSec - 0.001) : routingChanged ? Math.min(position, song.durationSec - 0.001) : 0);
  paintPlayer();
}

/** Refresh fit scores when the target changes without reordering the current Parts results. */
function sortPartsByLoop() {
  // Favorites, open, marked again when the loop is another (its fit marks).
  if (!$('pane-favorites').hidden && targetKey(partsTargetNow()) !== favTargetKey) renderFavorites();
  if (!$('pane-summary').hidden) renderSummary();
  if (!loopMode || $('pane-parts').hidden) return;
  const next = partsTargetNow();
  const nextKey = targetKey(next);
  if (nextKey !== partTargetKey) {
    partTarget = next;
    partTargetKey = nextKey;
    paintFitSort();
    partTable.renderSoon();
  }
  paintSortStale();   // (the order is not changed: ↓ Sort lights up if it was measured against the loop as it was)
}

const exploringAlone = () => !!(loopListen?.explore && loopListen.alone);
const exploreSounding = () => player.playing && !!loopListen?.explore;

/** A part dropped on the Explore box: its whole track, with the part selected. */
async function openExplore(id) {
  const part = catalog.part(id);
  const info = await parsedFile(part.path);
  if (exploreSounding()) toggleExplore();
  explored = { part, info, ch: part.ch, selected: new Set([part.ch]) };
  explorer.load(info, new Map([[part.ch, partFeatures(info, part.ch)]]), part.ch);
  if (part.ticks) {
    explorer.setRegion({ startTick: part.atTick, endTick: part.atTick + part.ticks }, true);
    explorer.setActiveFragment({ ch: part.ch, n: part.frag });
  }
  paintExplore();
  explorer.revealRegion();
}

/**
 * A file chosen in Files, in New loop: all its tracks in Explore (it is analysed first if it
 * was not), the first one picked. The song open, the player's loop and its pads are not touched.
 */
async function openExploreFile(path) {
  if (explored?.parts && explored.part.path === path) return;   // the clicks of a double click
  if (!catalog.current(path)) await indexer.analyseOne(path);
  const f = catalog.file(path);
  if (!f?.ok || !f.partCount) throw new Error(`${baseName(path)} has no tracks to take bars from.`);
  const parts = new Map();
  for (let i = f.partStart; i < f.partStart + f.partCount; i++) {
    const p = catalog.part(i);
    parts.set(p.ch, p);
  }
  const info = await parsedFile(path);
  if (exploreSounding()) toggleExplore();
  const first = Math.min(...parts.keys());
  explored = { part: parts.get(first), info, ch: first, parts, selected: new Set([first]) };
  explorer.load(info, new Map([...parts.keys()].map((ch) => [ch, partFeatures(info, ch)])));
  paintExplore();
  loopPanel.explore.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  fileTable.renderSoon();
}

/**
 * New loop: the song of fragment `id` (a card of Parts or a Search result) in Explore, with its
 * track picked and its bars selected, as it was heard on the card.
 */
async function exploreFragment(id) {
  const p = catalog.part(id);
  await openExploreFile(p.path);
  pickExplore(p.ch);
  const region = p.ticks ? { startTick: p.atTick, endTick: p.atTick + p.ticks } : null;
  explorer.setRegion(region, !!region);
  explorer.setActiveFragment(region ? { ch: p.ch, n: p.frag } : null);
  explorer.showRegion();
  if (region) explorer.revealRegion();
  paintExplore();
}

/** A row in Data: open its file in the lanes, focusing the channel or fragment when it has one. */
async function openDataSelection(selection) {
  const part = selection.partId === undefined ? null : catalog.part(selection.partId);
  if (loopMode) {
    await openExploreFile(selection.path);
    if (part) pickExplore(part.ch);
    const fragment = selection.kind === 'fragment' ? { startTick: selection.atTick, endTick: selection.atTick + selection.ticks } : null;
    explorer.setRegion(fragment, !!fragment);
    explorer.setActiveFragment(fragment ? { ch: part.ch, n: part.frag } : null);
    explorer.showRegion();
    if (fragment) explorer.revealRegion();
    paintExplore();
    dataTrackSelection = selection;
    return;
  }

  showTab('files');
  await selectFile(selection.path, {
    focusCh: part?.ch ?? null,
    then: () => {
      if (part) partTable.select(part.part);
      else { marked.clear(); applyChannels(); }
      const fragment = selection.kind === 'fragment' ? { startTick: selection.atTick, endTick: selection.atTick + selection.ticks } : null;
      timeline.setRegion(fragment, !!fragment);
      timeline.setActiveFragment(fragment ? { ch: part.ch, n: part.frag } : null);
      applyLoop();
    },
  });
  if (current?.path !== selection.path) throw new Error(`Could not open ${baseName(selection.path)} in the track area.`);
  dataTrackSelection = selection;
}

/** Update the selected tracks without changing the common time range. */
function setExplorePicks(selected, preferred, updateSound = true) {
  if (!explored) return;
  const ch = selected.has(preferred) ? preferred : selected.values().next().value;
  if (ch !== undefined) {
    explored.ch = ch;
    explored.part = explored.parts?.get(ch) ?? explored.part;
  }
  explored.selected = selected;
  explorer.draw();
  paintExplore();
  if (!updateSound) return;
  if (!selected.size && exploreSounding()) toggleExplore();
  else if (ch !== undefined && exploringAlone()) player.setChannels(selected);
  else if (ch !== undefined && exploreSounding() && explorer.range) void act(null, '▶ Explore', async () => exploreOverLoop(), false);
}

function pickExplore(ch, updateSound = true) {
  if (!explored || (explored.parts ? !explored.parts.has(ch) : explored.ch !== ch)) return;
  setExplorePicks(new Set([ch]), ch, updateSound);
}

function toggleExplorePick(ch) {
  if (!explored || (explored.parts ? !explored.parts.has(ch) : explored.ch !== ch)) return;
  const selected = new Set(explored.selected);
  if (!selected.delete(ch)) selected.add(ch);
  setExplorePicks(selected, ch);
}

function ensureExplorePick(ch) {
  if (!explored || (explored.parts ? !explored.parts.has(ch) : explored.ch !== ch)) return;
  setExplorePicks(new Set([...explored.selected, ch]), ch);
}

function closeExplore() {
  if (exploreSounding()) toggleExplore();
  explored = null;
  explorer.clear();
  paintExplore();
}

function paintExplore() {
  const count = explored?.selected.size ?? 0;
  const name = explored ? `${count === 0 ? 'No tracks selected' : count > 1 ? `${count} tracks` : explored.part.instrument} · ${baseName(explored.part.path)}` : null;
  loopPanel.showExplore(name, !!explorer.range && count > 0, !!explored?.parts);
}

/** The selection in seconds of its song, for the player (null: no selection). */
function exploreSpan() {
  const r = explorer.range;
  return r ? { startSec: explored.info.tickToSec(r.startTick), endSec: explored.info.tickToSec(r.endTick) } : null;
}

/** The bars selected as a clip. Throws when there is nothing in them. */
function makeExploreClip(part, beats = barBeats(loop), preserveLeadingSilence = false) {
  const { info } = explored;
  const clip = rangeClip(info, part.ch, explorer.range, part.instrument, keyClass(part.key), beats, { preserveLeadingSilence });
  const bar = Math.max(1, Math.floor(info.barOfTick(explorer.range.startTick) + 1e-9));
  return { ...clip, src: { path: part.path, ch: part.ch, at: explorer.range.startTick, bar, bars: clip.bars } };
}

/**
 * Where something put over the loop that plays comes in: at the loop's next bar (as soundLoop
 * changes what sounds), its own first bar there; the loop stopped, from its start. { from: the
 * loop's bar (from 0), waitUntil: when that is, performance.now() time (0: at once) }.
 */
function comingIn() {
  if (!player.playing || !player.loop) return { from: 0, waitUntil: 0 };
  const barSec = (barBeats(loop) * 60) / loop.bpm;
  const pos = player.songPosition;
  const at = Math.ceil((pos + LIVE_MARGIN) / barSec - 1e-9) * barSec;
  const playingBars = Math.max(1, Math.round(player.duration / barSec));
  return { from: Math.round(at / barSec) % playingBars, waitUntil: performance.now() + Math.max(0, at - pos) * 1000 };
}

/** The selection over the loop that plays, on the loop's bars and in its key, from its first bar where it comes in. */
function exploreOverLoop() {
  try {
    const parts = [...explored.selected].map((ch) => explored.parts?.get(ch) ?? explored.part);
    const tracks = parts.map((part) => {
      const clip = makeExploreClip(part, barBeats(loop), parts.length > 1);
      return { clip, program: part.program, drums: part.role === 'drums', transpose: transposeBetween(clip.key, loop.key) };
    }).filter((track) => track.clip.notes.length);
    if (!tracks.length) throw new Error('There are no notes in those bars on the selected tracks.');
    if (tracks.length < parts.length) log.warn(`${parts.length - tracks.length} selected track(s) have no notes in those bars.`);
    const next = { explore: true, id: null, clip: tracks[0].clip, tracks, alone: false, ...comingIn() };
    loopSong(loop, next);   // Check channel availability before changing what is playing.
    loopListen = next;
    soundLoop();
  } catch (error) {
    if (loopListen?.explore && !loopListen.alone) { loopListen = null; soundLoop(); }
    throw error;
  }
}

/**
 * ▶ on the track. With the loop playing, the selection plays over it. Stopped, the track alone,
 * in its own song and tempo, the selection round and round; the loop does not start.
 */
async function soundExplore(from = null, forceAlone = false) {
  if (!explored) return;
  if (!explored.selected.size) throw new Error('Select a track to listen to.');
  if (!forceAlone && player.playing && !loopListen?.alone) {
    if (!explorer.range) { log.warn('Select some bars of the track to hear them over the loop.'); return; }
    exploreOverLoop();
    return;
  }
  ++listenTurn;
  loopListen = { explore: true, id: null, alone: true };
  player.stop();
  clearLoopOutputs();
  player.load(explored.info);
  player.setChannels(explored.selected);
  player.setLoop(exploreSpan());
  await startPlaying(from);
  partTable.renderSoon();
}

/** ▶ again: it stops, and the loop stays as it was. */
function toggleExplore() {
  if (!exploreSounding()) { void act(null, '▶ Explore', () => soundExplore(), false); return; }
  if (exploringAlone()) player.stop();
  loopListen = null;
  soundLoop();
  paintPlayer();
}

/** The selection changed: what plays goes on with the new one, and a new one plays. */
function exploreRegion(final, created) {
  paintExplore();
  if (exploringAlone() && player.playing) { player.setLoop(exploreSpan()); return; }
  if (!final) return;
  if (exploreSounding()) {
    if (explorer.range) void act(null, '▶ Explore', async () => exploreOverLoop(), false);
    else toggleExplore();
  } else if (created) void act(null, '▶ Explore', () => soundExplore(), false);
}

/** A click on the track, off its fragments: alone it goes there. Out of the selection, that goes. */
function exploreSeek(sec) {
  if (player.playing && !exploringAlone()) return;   // the loop keeps its own time
  const span = exploreSpan();
  if (span && (sec < span.startSec || sec >= span.endSec)) {
    explorer.setRegion(null);
    paintExplore();
  }
  if (exploreSounding()) {
    player.setLoop(exploreSpan());
    player.seekSong(sec);
  } else void act(null, '▶ Explore', () => soundExplore(sec), false);
}

/** The first part sets the loop's tempo, meter and key, the rest follow them. */
function adoptLoop(p, empty = !loop.rows.length) {
  if (!empty) return;
  loop.bpm = Math.round(p.bpm) || loop.bpm;
  if (METERS.includes(p.ts)) setMeter(loop, p.ts);
  loop.key = keyClass(p.key) || loop.key;
}

/** A part as a clip: its fragment or, with none, from its first note on (16 bars at most). */
function clipOf(p, src) {
  const at = channelPassage(src, p.ch);
  if (!p.ticks && !at) throw new Error(`${p.instrument} in ${baseName(p.path)} has no notes.`);
  const frag = p.ticks ? { at: p.atTick, ticks: p.ticks, startBar: p.loopStart, bars: p.loopBars }
    : { at: src.barStartTick(at.bar), ticks: src.barStartTick(at.bar + at.bars) - src.barStartTick(at.bar), startBar: at.bar, bars: at.bars };
  // Where it comes from, so ✨ Fill can look for its own song's drum turns.
  // (`bar`, `bars`: the bars of its song it is, from 1: the loop says where each pad comes from.)
  return { ...clipFrom(src, p.ch, frag, p.instrument, keyClass(p.key), barBeats(loop)), src: { path: p.path, ch: p.ch, at: src.barStartTick(frag.startBar), bar: frag.startBar, bars: frag.bars } };
}

/**
 * ▶ on a part with the loop open: with the loop playing it plays over it; stopped, on its own,
 * and the loop does not start. Again to take it off.
 */
async function listenInLoop(id, { fraction = null, part = null } = {}) {
  // (`part`: other bars of it than its fragment's, listenFromPoint's: always heard anew from there.)
  if (!part && loopListen?.id === id && fraction !== null) {
    const entry = comingIn();
    loopListen = { ...loopListen, ...entry, from: entry.from - fraction * loopListen.clip.bars };
    soundLoop();
    if (!player.playing) await startPlaying(0);
    return;
  }
  if (!part && loopListen?.id === id) {
    if (loopListen.alone) player.stop();
    loopListen = null;
    soundLoop();
    partTable.renderSoon();
    paintPlayer();
    return;
  }
  const p = part ?? catalog.part(id);
  const turn = ++listenTurn;
  pendingListen = id;
  let src;
  try {
    src = await parsedFile(p.path);
  } finally {
    if (pendingListen === id) pendingListen = null;
  }
  if (turn !== listenTurn) return;   // another was chosen meanwhile: the last one sounds
  if (exploreSounding()) toggleExplore();
  adoptLoop(p);
  const clip = clipOf(p, src);
  loopPanel.render();
  const bar = p.ticks ? p.loopStart : channelPassage(src, p.ch).bar;
  const songSec = (b) => src.tickToSec(src.barStartTick(b));
  heardIn = { pieces: [{ startSec: 0, endSec: clip.bars * barBeats(loop) * (60 / loop.bpm), fromSec: songSec(bar), toSec: songSec(bar + clip.bars) }], duration: src.durationSec };
  const alone = player.playing ? !!loopListen?.alone : true;
  const entry = comingIn();
  const next = { id, clip, alone, ...entry, from: entry.from - (fraction ?? 0) * clip.bars, program: p.program, drums: p.role === 'drums', transpose: transposeBetween(clip.key, loop.key) };
  loopSong(loop, next);
  loopListen = next;
  selectPart(id);
  soundLoop();
  if (!player.playing) await startPlaying(0);
  partTable.renderSoon();
}

/** Save: downloaded as a .json, with its notes, under the name chosen; it needs no song to open again. */
async function saveLoop() {
  if (!loop.rows.length) throw new Error('The loop is empty: drag a part onto it first.');
  const name = await askFileName(activeLoopTab?.saveName ?? loopFileName(), '.json');
  if (!name) { log.log('Not saved.'); return; }
  if (activeLoopTab) nameLoopTab(activeLoopTab, `${name}.json`);   // its tab named after it; offered again next time
  const file = loopFile(loop);
  if (activeLoopTab) file.loopId = activeLoopTab.loopId;
  await downloadJson(JSON.stringify(file), `${name}.json`, '"Open loop…", in a new loop tab, takes it up again.');
}

/** A name that tells the loop's file from the others: its tab, tempo and key ("Loop 4 - 110 BPM - F minor"). */
function loopFileName() {
  const tonics = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const m = /^(\d+) (mayor|menor)$/.exec(loop.key ?? '');
  const key = m ? ` - ${tonics[Number(m[1])]} ${m[2] === 'menor' ? 'minor' : 'major'}` : '';
  return `${activeLoopTab?.button.textContent ?? 'Loop'} - ${Math.round(loop.bpm)} BPM${key}`;
}

/**
 * The name a file is downloaded under, asked for with `suggested` in it (selected, to type over):
 * without `ext` and the characters Windows does not allow; null when cancelled or left empty.
 */
function askFileName(suggested, ext, { title = 'Save loop', hint = 'The name of the file in your Downloads folder.', ok = 'Save' } = {}) {
  const dlg = $('saveNameDlg');
  const input = $('saveNameInput');
  $('saveNameExt').textContent = ext;
  $('saveNameTitle').textContent = title;
  $('saveNameHint').textContent = hint;
  $('saveNameOk').textContent = ok;
  input.value = suggested;
  return new Promise((resolve) => {
    const done = (value) => {
      dlg.onclose = null;
      if (dlg.open) dlg.close();
      const clean = value === null ? '' : value.replace(ext ? new RegExp(`${ext.replace('.', '\\.')}$`, 'i') : /$^/, '').replace(/[\\/:*?"<>|\x00-\x1f]+/g, ' ').replace(/\s+/g, ' ').trim();
      resolve(clean || null);
    };
    dlg.querySelector('form').onsubmit = (e) => { e.preventDefault(); done(input.value); };
    $('saveNameCancel').onclick = () => done(null);
    dlg.onclose = () => done(null);   // Esc
    dlg.showModal();
    input.focus();
    input.select();
  });
}

/** A loop saved with Save loop: each open gets its own tab. */
function openLoopFile(file, fileName = null) {
  const opened = newLoop();
  readLoop(opened, file);
  const tab = makeLoopTab(opened);
  if (typeof file.loopId === 'string') tab.loopId = file.loopId;
  if (fileName) nameLoopTab(tab, fileName);
  activateLoopTab(tab);
  loopHistory.length = 0;
  loopRedoHistory.length = 0;
  loopState = loopSnapshot();
  saveActiveLoopTab();
  loopListen = null;
  player.stop();
  loopPanel.render();
  soundLoop();
  paintPlayer();
  partTable.renderSoon();
}

// Where the last send went: the next one goes on after it, on the same tracks, while LUNA's
// cursor has not moved since (and some of those tracks are still there). ＋ New tracks forgets it.
let takeOut = null;   // { tracks: Map, nextAt, cursor, session, layout: the pitched rows, in order, sent }

/**
 * The loop to LUNA: one pass of what plays now, mute and solo as they are, an instrument a
 * track. At LUNA's cursor or, send after send, after the last one on the same tracks, so a
 * piece is built in LUNA take by take. Audio at the session's tempo, so it lines up with its bars.
 */
async function sendLoop(status) {
  if ($('destSel').checked) throw new Error('A loop goes to new tracks: one per instrument.');
  const withAudio = $('withAudio').checked;
  const withMidi = $('withMidi').checked;
  if (!withAudio && !withMidi) throw new Error('Tick "Sound", "MIDI" or both.');
  const info = loopInfo(loop);
  if (!info.playing.length) throw new Error('The loop plays nothing: drag a part onto it, or turn its rows on.');
  if (withAudio && loop.rows.some((row) => row.sound?.kind === 'luna' && info.playing.includes(channelOf(loop, row) + 1))) {
    throw new Error('Sound export cannot render LUNA instrument tracks. Choose MIDI only, or change those rows to SoundFont before sending audio.');
  }
  if (withAudio && loop.rows.some((row) => row.sound?.kind === 'soundfont' && (row.sound.bankId !== soundFontId() || !findSoundFontPreset(sfEngine.bank, row.sound)))) {
    await loadSoundFont();
    if (loop.rows.some((row) => row.sound?.kind === 'soundfont' && (row.sound.bankId !== soundFontId() || !findSoundFontPreset(sfEngine.bank, row.sound)))) {
      throw new Error('A selected SoundFont preset is unavailable. Select its SoundFont and preset again before exporting audio.');
    }
  }
  await session.tracks.reload();
  const cursor = session.transport.tick;
  if (takeOut?.session !== session.uid) takeOut = { tracks: new Map(), nextAt: null, cursor: null, session: session.uid };
  const alive = [...takeOut.tracks.values()].some((id) => session.tracks.items.some((t) => t.id === id));
  // Each row goes to a track by its place among the rows: rows put in another order, added or
  // taken out since the last send would land on another row's track. New tracks then.
  const layout = loop.rows.filter((r) => !r.drums);
  const sameRows = !takeOut.layout || (takeOut.layout.length === layout.length && takeOut.layout.every((r, k) => r === layout[k]));
  if (!sameRows && takeOut.nextAt !== null && alive) log.log('The rows are not as at the last send: this one goes to new tracks, at the cursor.');
  const onward = takeOut.nextAt !== null && cursor === takeOut.cursor && alive && sameRows;
  if (!alive || !sameRows) takeOut.tracks.clear();
  takeOut.layout = layout;
  const at = onward ? takeOut.nextAt : cursor;
  const bars = loopBars(loop);
  const bpm = session.transport.tempo.value || loop.bpm;
  log.log(`The loop, ${bars} bars → LUNA at ${session.musical.timeline.formatBarBeat(at)}, ${Math.round(bpm)} BPM${onward ? ', after the last send, on its tracks' : ''}`);
  if (Math.round(bpm) !== Math.round(loop.bpm)) log.warn(`The session is at ${Math.round(bpm)} BPM and the loop at ${Math.round(loop.bpm)}: it goes at the session's, on its bars.`);
  if (loop.timeSig !== '4/4') log.warn(`The loop is in ${loop.timeSig}: give the LUNA session that meter, so that its bars fall together.`);
  log.log(SEND_HEAD);
  // A clip per pad that sounds: the silences stay out.
  const pads = padSpans(loop);
  const spansOf = (pick) => pads.get(Number(pick.slice(3))) ?? [];
  const { tracks } = takeOut;
  try {
    if (withAudio) {
      await loadSoundFont();
      await addStems(session, info, 'Loop', info.playing, {
        at, log, onStep: status, spansOf, tracks,
        render: (ch) => renderPart({ bank: sfEngine.bank, info, channels: new Set([ch]), startTick: 0, endTick: info.lastTick, bpm, presets: soundFontPresets(), onProgress: (f) => status(`Rendering channel ${ch}… ${Math.round(f * 100)} %`) }),
      });
    }
    if (withMidi) await addParts(session, info, 'Loop', info.playing.map((ch) => `ch:${ch}`), { at, log, spansOf, tracks });
  } finally {
    // What went is placed (failed ones are named): the next send goes on after it.
    takeOut.nextAt = at + bars * barBeats(loop) * Luna.TICKS_PER_BEAT;
    takeOut.cursor = cursor;
  }
  if (withMidi && !withAudio) log.log('MIDI tracks sound with the instrument you load on them in LUNA (INST).');
  log.log('The next send goes on after this one, on the same tracks (＋ New tracks: new ones at the cursor; moving LUNA\'s cursor does it too).');
}

/** A part dropped on the loop: on a pad, with that row's sound; or as a new instrument. */
async function dropInLoop(id, to) {
  if (to.explore) { await openExplore(id); return; }
  const p = catalog.part(id);
  const src = await parsedFile(p.path);
  adoptLoop(p);
  placeInLoop(p, clipOf(p, src), to);
  if (loopListen?.id === id) {
    loopListen = null;   // now it is in the loop
    soundLoop();
  }
}

// ── ★ Favorites: fragments kept in collections, whole in themselves (library/favorites.js) ──

let favorites = emptyFavorites();
let favPlaying = null;   // the favourite sounding alone (not in New loop): its id
let favTargetKey = '';   // the loop (or session) the fit marks of the pane were measured against

const saveFavorites = () => void store.set('favorites', favorites).catch(() => {});

/** "7 mayor" (a clip's key) as the catalogue names keys, "G mayor", for adoptLoop. */
const keyNameOfClass = (key) => {
  const m = /^(\d+) (mayor|menor)$/.exec(key ?? '');
  return m ? `${['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'][Number(m[1])]} ${m[2]}` : '';
};

/** A fragment's place (Parts, Search): what tells it as a favourite. */
const sigOfPart = (p) => favoriteSig({ path: p.path, ch: p.ch, startBar: p.loopStart, bars: p.loopBars });

/**
 * A fragment of the library as a favourite, whole in itself: its clip in its own meter (notes in
 * beats, its chords, its key), its instrument, tempo and meter, its harmonic and rhythmic summary
 * for fit marks, and where it came from (for reference).
 */
async function favoriteFromPart(id) {
  const p = catalog.part(id);
  const src = await parsedFile(p.path);
  const at = channelPassage(src, p.ch);
  if (!p.ticks && !at) throw new Error(`${p.instrument} in ${baseName(p.path)} has no notes.`);
  const frag = p.ticks ? { at: p.atTick, ticks: p.ticks, startBar: p.loopStart, bars: p.loopBars }
    : { at: src.barStartTick(at.bar), ticks: src.barStartTick(at.bar + at.bars) - src.barStartTick(at.bar), startBar: at.bar, bars: at.bars };
  const beats = METERS.includes(p.ts) ? meterBeats(p.ts) : 4;
  const clip = { ...clipFrom(src, p.ch, frag, p.instrument, keyClass(p.key), beats), src: { path: p.path, ch: p.ch, at: src.barStartTick(frag.startBar), bar: frag.startBar, bars: frag.bars } };
  const grid = catalog.grid(id);
  const hits = catalog.hits(id);
  return {
    name: p.instrument, track: (p.name ?? '').trim(), instrument: p.instrument, role: p.role, program: p.program, drums: p.role === 'drums',
    bpm: Math.round(p.bpm * 10) / 10, ts: p.ts, path: p.path, ch: p.ch, startBar: p.loopStart || frag.startBar, bars: p.loopBars || clip.bars,
    atTick: frag.at, ticks: frag.ticks,   // where in its song
    clip, ...(grid ? { grid: [...grid.grid], gridPerBar: grid.stepsPerBar } : {}), ...(hits ? { hits: [...hits.hits], hitsPerBar: hits.stepsPerBar } : {}),
  };
}

/**
 * A favourite as fitOf measures it: its role and key, and its own summary (grid, hits) in place of
 * the catalogue's. (Older favourites kept no steps per bar: those of their length over their bars.)
 */
const favSummaries = new WeakMap();
function favPart(item) {
  if (!favSummaries.has(item)) {
    const bars = Math.max(1, item.bars || item.clip.bars || 1);
    const per = (n, kept) => kept ?? (Number.isInteger(n / bars) ? n / bars : 0);
    const gridPerBar = item.grid?.length ? per(item.grid.length, item.gridPerBar) : 0;
    const hitsPerBar = item.hits?.length ? per(item.hits.length, item.hitsPerBar) : 0;
    favSummaries.set(item, {
      grid: gridPerBar ? { grid: Uint16Array.from(item.grid), stepsPerBar: gridPerBar } : null,
      hits: hitsPerBar ? { hits: Uint8Array.from(item.hits), steps: item.hits.length, stepsPerBar: hitsPerBar } : null,
    });
  }
  return { role: item.role, key: keyNameOfClass(item.clip.key), summary: favSummaries.get(item) };
}

/**
 * A favourite as Fill and Arrange take a fragment of the library (midi/fill.js): what they score it
 * by (its length, dynamics, activity, role, fit), and its clip, which comes with it (`favClip`): no
 * MIDI file is read, and it is used with its song moved or gone.
 */
function favCandidate(item) {
  const notes = item.clip.notes;
  const bars = Math.max(1, item.clip.bars || item.bars || 1);
  const mean = notes.length ? notes.reduce((s, n) => s + n.vel, 0) / notes.length : NaN;
  const spread = notes.length ? Math.sqrt(notes.reduce((s, n) => s + (n.vel - mean) ** 2, 0) / notes.length) : NaN;
  return {
    ...favPart(item), fav: item.id, favClip: item.clip,
    path: item.path, ch: item.ch, atTick: item.atTick ?? item.clip.src?.at ?? item.startBar, ticks: item.ticks ?? Math.round(bars * (item.clip.beats ?? 4) * 480),
    program: item.program, instrument: item.instrument, name: item.track, bpm: item.bpm, ts: item.ts,
    loopBars: bars, loopStart: item.startBar, notes: notes.length, velocity: mean, velocitySpread: spread,
    energy: ['sparse', 'medium', 'busy'][activityLevel(notes.length / bars)],
  };
}

/**
 * The fragments Fill and Arrange choose from: the library's (of the loop's meter, near its tempo),
 * or, with `source` a collection's id, that collection's favourites (of the loop's meter: a clip is
 * in beats, any tempo goes). Checked now (throws, saying why); the fragments come as they are asked for.
 */
function fillPool(source, of = loop) {
  const ts = of.timeSig || '4/4';
  if (source) {
    const c = favorites.collections.find((x) => x.id === source);
    if (!c) throw new Error('That collection of favourites is no longer there: choose another source next to ✨ Fill.');
    const items = c.items.map((id) => favorites.items[id]).filter((it) => it?.clip.notes.length && (it.ts || '4/4') === ts);
    if (!items.length) throw new Error(`"${c.name}" has no favourite in ${ts}: Fill and Arrange take fragments of the loop's meter.`);
    return items.map(favCandidate);
  }
  if (!index?.paths.length) throw new Error('Choose a MIDI library first (Files), then analyse it, or choose a collection of ★ favourites as the source.');
  if (!catalog.size) throw new Error('Analyse your library first ("Analyse"), or choose a collection of ★ favourites as the source.');
  const paths = new Set(index.paths.map((path) => path.toLowerCase()));
  const ids = [...catalog.query({ ts, bpmMin: of.bpm * 0.8, bpmMax: of.bpm * 1.25 })];
  // (Gone through again each time it is asked for, never held whole: a library has millions.)
  return { *[Symbol.iterator]() {
    for (const id of ids) {
      const part = catalog.part(id);
      if (!paths.has(part.path.toLowerCase()) || !catalog.current(part.path)) continue;
      for (const fragmentId of catalog.fragmentIds(part.part)) {
        const fragment = catalog.part(fragmentId);
        if (fragment.role !== part.role || !fragment.ticks || !fragment.loopBars || fragment.notes === 0) continue;
        yield fragment;
      }
    }
  } };
}

// ── Live Summary: the indexed fragments ranked with Fill's exact current context ──────────────

let summaryData = null;
let summaryRunningToken = null;
let summaryRunningTab = null;
let summaryVersion = 0;

const summaryToken = () => `${loopSnapshot()}|${summaryBarsFilter()}|${loopPanel.toolbar.querySelector('.lp-daring')?.value ?? ''}|${indexer.done}`;

function* scoredSummaryCandidates(context) {
  const bars = summaryBarsFilter();
  const existing = new Set(loop.rows.map((row) => row.drums ? 'drums' : `program:${row.program}`));
  for (const candidate of fillPool('')) {
    if (existing.has(fillInstrumentKey(candidate)) || (bars && candidate.loopBars !== bars)) continue;
    const measured = fitOf(candidate, context.target);
    if (measured.pass === false || !Number.isFinite(measured.score)) continue;
    const scoring = context.contextOf(candidate.role === 'drums');
    const scored = scoreFillCandidate({ ...candidate, fit: measured.score, measured, scoring }, scoring);
    if (scored.duration < FILL_MIN_DURATION_FIT || scored.score < FILL_MIN_SCORE) continue;
    scored.fragmentKey = fillFragmentKey(scored);
    scored.instrumentKey = fillInstrumentKey(scored);
    yield scored;
  }
}

async function calculateSummary() {
  const version = ++summaryVersion;
  if (!loopMode) throw new Error('Open a New loop first; Summary ranks the library against its current musical context.');
  if (!partsFillContext({ ignoreSelection: true })) throw new Error('Put some musical material in the loop first, so fragments have a Fit target.');
  const tab = activeLoopTab;
  const token = summaryToken();
  summaryRunningToken = token;
  summaryRunningTab = tab;
  $('summaryRefresh').disabled = true;
  $('summaryCount').textContent = 'Calculating against the current loop…';
  try {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    if (version !== summaryVersion || !loopMode || activeLoopTab !== tab || summaryToken() !== token) return;
    const context = partsFillContext({ ignoreSelection: true });
    if (!context) throw new Error('The loop has no Fit target. Add musical material and recalculate.');
    const data = buildFillSummary(scoredSummaryCandidates(context));
    if (version !== summaryVersion) return;
    summaryData = { data, context, token, tab };
    renderSummaryResults();
  } finally {
    if (version === summaryVersion) {
      summaryRunningToken = null;
      summaryRunningTab = null;
      $('summaryRefresh').disabled = false;
      if (!$('pane-summary').hidden && loopMode && activeLoopTab === tab && summaryToken() !== token) renderSummary();
    }
  }
}

function renderSummary() {
  if (!$('pane-summary')) return;
  const current = partsFillContext({ ignoreSelection: true });
  if (!loopMode) {
    summaryData = null;
    showSummaryNote('Summary needs an open New loop so every fragment is compared against the same current musical context.');
    $('summaryCount').textContent = '';
    $('summaryBody').innerHTML = '<div class="summary-empty">Create or open a New loop, then return to Summary.</div>';
    return;
  }
  if (!current) {
    summaryData = null;
    showSummaryNote('No Fit target is available yet.');
    $('summaryCount').textContent = '';
    $('summaryBody').innerHTML = '<div class="summary-empty">Add musical material to the loop, then recalculate. Pad selection does not affect Summary.</div>';
    return;
  }
  const token = summaryToken();
  if (!summaryData || summaryData.tab !== activeLoopTab || summaryData.token !== token) {
    if (summaryRunningToken !== token || summaryRunningTab !== activeLoopTab) void act(null, 'Calculate Summary', () => calculateSummary(), false);
    return;
  }
  renderSummaryResults();
}

function summaryBarsFilter() {
  const value = Number($('summaryBars').value);
  return value || 0;
}

let summaryRole = '';   // Summary's role drawings: what the instrument's fragments play ('' any)

/**
 * Summary's explanation, as Parts' notes. ✕ closes it until LUNA restarts: it says much the same
 * each time (the loop's rows in it change as instruments come in), so it does not come back with them.
 */
function showSummaryNote(text) {
  const note = $('summaryContext');
  note.querySelector('.note-text').textContent = text ?? '';
  note.hidden = !text || closedNotes.has('summaryContext');
}

/** Summary's bar, as Parts': the role drawings and the instrument's name. Wired once. */
function wireSummaryFilters() {
  $('summaryRoleBar').innerHTML = ROLE_ICONS.map(({ value, name, icon }) => `<button type="button" data-value="${value}" title="${name}" aria-label="${name}">${icon}</button>`).join('');
  $('summaryRoleBar').onclick = (e) => {
    const b = e.target.closest('[data-value]');
    if (!b) return;
    summaryRole = summaryRole === b.dataset.value ? '' : b.dataset.value;   // the one on again: off
    paintSummaryFilters();
    renderSummaryResults();
  };
  let wait = 0;
  $('summaryText').oninput = () => { clearTimeout(wait); wait = setTimeout(renderSummaryResults, 150); };
  $('summaryClear').onclick = () => {
    summaryRole = '';
    $('summaryText').value = '';
    paintSummaryFilters();
    renderSummaryResults();
  };
}

const paintSummaryFilters = () => { for (const b of $('summaryRoleBar').children) b.classList.toggle('on', b.dataset.value === summaryRole); };

/** An instrument's drawing: the drum kit, or its General MIDI family's (ui/family-icons.js). */
function instrumentIcon(group) {
  if (group.role === 'drums') return { icon: ROLE_ICONS.find((r) => r.value === 'drums').icon, family: 'Drums' };
  const family = Math.max(0, Math.min(15, Math.floor((group.program ?? 0) / 8)));
  return { icon: FAMILY_ICONS[family], family: GM_FAMILIES[family] };
}

function renderSummaryResults() {
  if (!$('pane-summary') || !summaryData) return;
  const { data, context } = summaryData;
  const good = Math.round(SUMMARY_GOOD_SCORE * 100);
  const roleName = summaryRole ? ROLE_ICONS.find((r) => r.value === summaryRole)?.name.toLowerCase() : '';
  showSummaryNote(`${context.text}. Pad selection is ignored. Fragments: how many of each instrument${roleName ? ` playing ${roleName}` : ''} score ${good}% Fill or more.`);
  $('summaryCount').textContent = `${data.count.toLocaleString()} matching fragment${data.count === 1 ? '' : 's'} analysed`;
  // The instruments, not the fragments, as the filters leave them (with a role: only their
  // fragments playing it), by how many fragments of theirs go with the loop, most first.
  const words = $('summaryText').value.toLowerCase().split(/\s+/).filter(Boolean);
  const view = data.groups.map((group) => {
    const part = summaryRole ? group.roles?.[summaryRole] : group;
    return part?.count ? { group, goodCount: part.goodCount, count: part.count, candidates: part.candidates } : null;
  }).filter((v) => v && words.every((w) => v.group.instrument.toLowerCase().includes(w)));
  const fitting = view.filter((v) => v.goodCount > 0);
  summaryVisible = (fitting.length ? fitting : view)
    .sort((a, b) => b.goodCount - a.goodCount || b.count - a.count || a.group.instrument.localeCompare(b.group.instrument));
  const filtered = summaryRole || words.length;
  $('summaryBody').innerHTML = summaryVisible.length ? `<table class="summary-table">
      <thead><tr><th class="num">#</th><th></th><th>Instrument</th><th class="num" title="Fragments of this instrument at ${good}% Fill or more">Fragments</th><th></th></tr></thead>
      <tbody>${summaryVisible.map(({ group, goodCount, count }, i) => {
        const { icon, family } = instrumentIcon(group);
        return `<tr>
        <td class="num">${i + 1}</td>
        <td class="summary-icon" title="${esc(family)}">${icon}</td>
        <td>${esc(group.instrument)}</td>
        <td class="num" title="${goodCount.toLocaleString()} at ${good}% or more, of ${count.toLocaleString()} that fit">${goodCount.toLocaleString()}</td>
        <td class="summary-add"><button type="button" data-summary-add="${i}" title="Add ${esc(group.instrument)} to the loop: it comes in on the next bar and nothing else stops. With ▶▶ playlists playing it joins them, its fragments one after another">＋ Add</button></td>
      </tr>`;
      }).join('')}</tbody>
    </table>`
    : filtered ? '<div class="summary-empty">No instrument matches the filters. ✕ clears them.</div>'
    : '<div class="summary-empty">No eligible fragments match the current loop and bar filter. Recalculate after changing the musical context.</div>';
  $('summaryBody').querySelectorAll('[data-summary-add]').forEach((button) => {
    button.onclick = () => void act(button, '＋ Add instrument', () => addSummaryInstrument(summaryVisible[Number(button.dataset.summaryAdd)]), false);
  });
}

let summaryVisible = [];   // Summary's table, in its order: [{ group, goodCount, count, candidates }]

/** ＋ Add in Summary: addInstrument, its context the one Summary ranked against. */
async function addSummaryInstrument({ group, candidates }) {
  const review = summaryData;
  if (!review || activeLoopTab !== review.tab || summaryToken() !== review.token) {
    throw new Error('The loop or filter changed. Recalculate Summary and try again.');
  }
  await addInstrument(group, candidates, {
    by: 'Summary', fitTarget: review.context.target,
    contextOf: (chosen) => fillContextSnapshot(review.context.target, chosen.scoring, {
      source: review.context.text, rows: fillRowsSnapshot(loop.rows),
      dynamicsSource: 'the loop rows of its kind',
    }),
    still: () => summaryToken() === review.token,
  });
}

/** Does a loop row play this instrument (Summary's or Fill's: { role, program })? */
const playsInstrument = (row, inst) => (inst.role === 'drums' ? !!row.drums : !row.drums && row.program === inst.program);

/**
 * One instrument of a Fill or Summary result as its own Fill results group (a tab): its fragments,
 * best first, its ▶▶ playing them, only this instrument's. `row`: its row in the loop, if it has one.
 */
function instrumentGroup(inst, candidates, { by, context, fitTarget, chosen = candidates[0], row = null }) {
  const alternatives = candidates.filter((item) => item !== chosen);
  return {
    label: `${by} · ${chosen.instrument}`, instrumentTab: true,
    chosen, alternatives, context, row, index: row ? loop.rows.indexOf(row) : undefined,
    fingerprints: new Map([chosen, ...alternatives].map((item) => [item, fillCandidateSnapshot(item, fitTarget)])),
    from: 0, to: loopBars(loop), added: true, by,
  };
}

/**
 * ＋ Add (Summary, or Fill results' instruments): the instrument into the loop, a new row with its
 * best fragment, coming in on the next bar while the loop goes on: nothing stops. With ▶▶ playlists
 * playing it joins them, its fragments (all of this instrument; in Summary with a role chosen,
 * those playing it) one after another as the others'. Its tab in Fill results (not opened) has
 * them too; returns that group. `contextOf(chosen)`: what it was compared against; `still()`: the
 * result is still the one shown.
 */
async function addInstrument(inst, candidates, { by, fitTarget, contextOf, still = () => true }) {
  const drums = inst.role === 'drums';
  if (loop.rows.some((row) => playsInstrument(row, inst))) {
    throw new Error(`${inst.instrument} is already in the loop.`);
  }
  // Only a fragment heard alone (Fill details' ▶) stops; the loop and its ▶▶ playlists go on.
  if (loopListen?.fillReview) stopFillListen();
  const tab = activeLoopTab;
  // Its best fragment that can be read.
  let chosen = null;
  let clip = null;
  for (const candidate of candidates) {
    try {
      const read = await candidateClip(candidate, new Map());
      if (read.notes.length) { chosen = candidate; clip = read; break; }
    } catch { /* unreadable: the next */ }
  }
  if (!chosen) throw new Error(`None of the fragments of ${inst.instrument} could be read.`);
  if (!loopMode || activeLoopTab !== tab || !still()) throw new Error('The loop changed while the MIDI was read: try again.');
  clip.bars = chosen.loopBars;
  clip.transpose = transposeBetween(clip.key, loop.key);
  clip.adapt = true;
  const context = contextOf(chosen);
  const from = 0;
  const to = loopBars(loop);
  const row = addRow(loop, { program: chosen.program, drums, name: chosen.instrument });
  if (!row) throw new Error('The loop has no free instrument row.');
  const fillId = markFillClip(clip, chosen, context);
  layRow(row, clip, [{ at: 0, from: 0, bars: to }], to);
  adaptRows([row], from, to, { preserveLocked: true });
  baselineFill(row, fillId);
  recordLoop();
  loopPanel.render();
  // Playing: only its row changes, from the next bar; the rest sounds on as it was.
  const playing = player.playing;
  soundLoop(playing ? { quantum: 'bar', changedRows: [row] } : {});
  partTable.renderSoon();
  const reviewGroup = instrumentGroup(inst, candidates, { by, context, fitTarget, chosen, row });
  saveFillReview([reviewGroup], { individual: true, open: false });
  log.ok(`${by === 'Summary' ? '📊' : '✨'} ${chosen.instrument} · ${baseName(chosen.path)} added from ${by} at ${Math.round(chosen.score * 100)}%${playing ? ', in on the next bar' : ''}. ↶ to undo.`);
  // ▶▶ playlists playing: it joins them (the same instrument always: its fragments only).
  if (!playing || !steppableFillChains().length || reviewGroup.alternatives.length < 1) return reviewGroup;
  const items = await readFillChainItems(reviewGroup);
  if (!loopMode || activeLoopTab !== tab || !loop.rows.includes(row) || row.locked || !player.playing || fillChains.has(reviewGroup)) return reviewGroup;
  const c = createFillChain(reviewGroup, items, tab);
  chainSwitch(c, 0, chainNextCut('bar'));
  log.log(`▶▶ ${chosen.instrument} joins the playlists: its ${items.length} fragments one after another, as the others.`);
  return reviewGroup;
}

/**
 * An instrument of Fill results' table opened: its tab (the one it has already, if open), its
 * fragments as Fill details lists them, ▶▶ playing them into its row (made when there is none).
 */
function openInstrumentTab(group, inst) {
  group.instrumentTabs ??= new Map();
  const known = group.instrumentTabs.get(inst.key);
  const open = known && activeLoopTab?.fillReviewTabs.find((t) => t.group === known);
  if (open) { selectFillReviewTab(open); return; }
  const row = loop.rows.find((r) => playsInstrument(r, inst)) ?? null;
  const chosen = row && group.chosen && inst.candidates.includes(group.chosen) ? group.chosen : inst.candidates[0];
  const tabGroup = instrumentGroup(inst, inst.candidates, { by: group.by ?? 'Fill', context: group.context, fitTarget: group.fitTarget, chosen, row });
  group.instrumentTabs.set(inst.key, tabGroup);
  saveFillReview([tabGroup], { individual: true });
}

/** ＋ Add in Fill results' table of instruments: addInstrument, compared against what Fill was. */
async function addFillInstrument(group, inst) {
  const added = await addInstrument(inst, inst.candidates, {
    by: group.by ?? 'Fill', fitTarget: group.fitTarget, contextOf: () => group.context,
    still: () => fillGroupsNow().includes(group),
  });
  group.instrumentTabs ??= new Map();
  group.instrumentTabs.set(inst.key, added);
  paintFillDetails();   // its tab made (addInstrument), not opened: Fill results stays in sight (☰ List opens it)
}

/** A candidate's clip: a favourite's, a copy of it; the library's, read from its song (`cache`: path -> song). */
async function candidateClip(candidate, cache) {
  if (candidate.favClip) return structuredClone(candidate.favClip);
  let src = cache.get(candidate.path);
  if (!src) {
    src = await parsedFile(candidate.path);
    cache.set(candidate.path, src);
  }
  return clipOf(candidate, src);
}

/** The source chosen next to ✨ Fill, for the log: '' for the library. */
const sourceText = (source) => {
  const c = source && favorites.collections.find((x) => x.id === source);
  return c ? ` · from ★ "${c.name}"` : '';
};

/** A favourite's fit with the open loop (or the session), as Parts marks it; null with nothing to go with. */
function favFit(item, target) {
  if (!target || !item) return null;
  const m = fitOf(favPart(item), target);
  return m.score === null ? null : m;
}

/** ★ on a card of Parts: the collections, ticked where it is; a click puts it in or takes it out. */
function openFavMenu(id, e) {
  const p = catalog.part(id);
  openCollectionsMenu(e, {
    title: `${p.instrument} · ${baseName(p.path)}`,
    sigs: [sigOfPart(p)],
    build: async () => [await favoriteFromPart(id)],
    text: `${p.instrument} · ${baseName(p.path)}, bars ${p.loopStart}–${p.loopStart + Math.max(1, p.loopBars) - 1}`,
  });
}

// ── ★ on the File line: the bars of the region on the song, a favourite for each of its tracks ──

/**
 * The region on the open song as favourites: its whole bars, of each track marked (of every track
 * that plays in it when none is), one favourite each, as a card of Parts would make it (its clip in
 * its own meter, its grid and hits for fit marks). { sigs, title, build, text } or null with no region.
 */
function regionFavorites() {
  const r = !loopMode && current?.info && timeline.range;
  if (!r || r.endTick <= r.startTick) return null;
  const info = current.info;
  const path = current.path;
  const startBar = Math.max(1, Math.floor(info.barOfTick(r.startTick) + 1e-9));
  const endBar = Math.max(startBar + 1, Math.ceil(info.barOfTick(r.endTick) - 1e-9));
  const at = info.barStartTick(startBar);
  const ticks = info.barStartTick(endBar) - at;
  const bars = endBar - startBar;
  const early = EARLY * info.ppq;
  // The channels that strike a note in those bars (one pass over the song: this is painted as the region moves).
  const playing = new Set();
  for (const ev of info.events) if (ev.type === 'on' && ev.b > 0 && ev.tick >= at - early && ev.tick < at + ticks - early) playing.add(ev.ch + 1);
  const channels = (marked.size ? [...marked] : [...playing]).filter((ch) => playing.has(ch)).sort((a, b) => a - b);
  if (!channels.length) return { empty: true, startBar, bars };
  const f = catalog.file(path);
  const ts = (f?.ok && f.ts) || info.timeSig || '4/4';
  const beats = METERS.includes(ts) ? meterBeats(ts) : 4;
  const key = keyClass(f?.ok ? f.key : '');
  const bpm = Math.round((f?.ok ? f.bpm : info.bpm) * 10) / 10 || 120;
  const one = (ch) => {
    const feat = partFeatures(info, ch);
    const drums = ch === 10;
    const instrument = drums ? 'Drums' : GM_PROGRAMS[feat.program] ?? `Program ${feat.program}`;   // as the cards name it
    // The bars as selected, an empty one at its start kept (a part that comes in on bar 2 does so in it too).
    const clip = { ...rangeClip(info, ch, { startTick: at, endTick: at + ticks }, instrument, key, beats, { preserveLeadingSilence: true }), src: { path, ch, at } };
    // Its grid and hits as the catalogue keeps a fragment's: a loop of its own with it alone, in its key.
    const own = { ...newLoop(), timeSig: METERS.includes(ts) ? ts : '4/4', key: '', length: clip.bars };
    placeClip(addRow(own, { program: feat.program, drums, name: instrument }), 0, { ...clip, transpose: 0, shift: 0 });
    const grid = drums ? null : loopGrid(own);
    const hits = loopHits(own);
    return {
      name: instrument, track: (feat.trackName ?? '').trim(), instrument, role: feat.role, program: feat.program, drums,
      bpm, ts, path, ch, startBar, bars, atTick: at, ticks, clip,
      ...(grid ? { grid: [...grid.grid], gridPerBar: grid.stepsPerBar } : {}), ...(hits ? { hits: [...hits.hits], hitsPerBar: hits.hitsPerBar } : {}),
    };
  };
  return {
    startBar, bars,
    title: `${channels.length === 1 ? `ch ${channels[0]}` : `${channels.length} tracks`} · ${baseName(path)} · bars ${startBar}–${endBar - 1}`,
    sigs: channels.map((ch) => favoriteSig({ path, ch, startBar, bars })),
    build: async () => channels.map(one),
    text: `${channels.length} track${channels.length === 1 ? '' : 's'} of ${baseName(path)}, bars ${startBar}–${endBar - 1}`,
  };
}

// ── ★ on a row of the loop: the row as it sounds now, a favourite ──

/** A short fingerprint of a text (FNV-1a), for a favourite made in a loop: the same notes, the same favourite. */
function textHash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(36);
}

/**
 * A row of the open loop as a favourite: its notes as they sound (in the loop's key, each pad's
 * shift, swing and velocity, pads off left out), from its first pad to its last, at the loop's
 * tempo and meter, with its grid and hits for fit marks. Null when it plays nothing.
 */
function rowFavorite(row) {
  const made = rowClip(loop, row);
  if (!made) return null;
  const { first, ...clip } = made;
  const ts = METERS.includes(loop.timeSig) ? loop.timeSig : '4/4';
  const own = { ...newLoop(), timeSig: ts, key: '', length: clip.bars };
  placeClip(addRow(own, { program: row.program, drums: row.drums, name: row.name }), 0, { ...clip, transpose: 0, shift: 0 });
  const grid = row.drums ? null : loopGrid(own);
  const hits = loopHits(own);
  const instrument = row.drums ? 'Drums' : GM_PROGRAMS[row.program] ?? row.name;
  const where = activeLoopTab?.saveName ?? activeLoopTab?.button.textContent ?? 'Loop';
  const sig = `loop|${textHash(JSON.stringify([row.drums ? -1 : row.program, ts, clip.bars, clip.notes.map((n) => [n.beat, n.len, n.pitch, n.vel])]))}`;
  return {
    sig, name: row.name || instrument, track: '', instrument, role: rowRole(row), program: row.program, drums: row.drums,
    bpm: Math.round(loop.bpm * 10) / 10, ts, path: where, ch: row.drums ? 10 : 1, startBar: first + 1, bars: clip.bars,
    atTick: 0, ticks: Math.round(clip.bars * clip.beats * 480), clip,
    ...(grid ? { grid: [...grid.grid], gridPerBar: grid.stepsPerBar } : {}), ...(hits ? { hits: [...hits.hits], hitsPerBar: hits.hitsPerBar } : {}),
  };
}

/** The names of the collections that hold a row of the loop as it sounds now. */
function rowFavoriteCollections(row) {
  if (!favorites.collections.length) return [];
  const item = rowFavorite(row);
  return item ? collectionsWith(favorites, item.sig).map((c) => c.name) : [];
}

/** ★ on a row of the loop: the collections, ticked where it is; a click puts it in or takes it out. */
function openRowFavMenu(row, e) {
  const item = rowFavorite(row);
  if (!item) { log.warn(`${row.name} plays nothing: nothing to keep.`); return; }
  openCollectionsMenu(e, {
    title: `${item.name} · ${item.path}`,
    sigs: [item.sig],
    build: async () => [item],
    text: `${item.name} of ${item.path}, ${item.bars} bar${item.bars === 1 ? '' : 's'}`,
  });
}

/** The ★ of the File line: on with a region, filled when all it would keep is in a collection. */
function paintRegionStar() {
  const b = $('favRegion');
  if (!b || !pageWired) return;
  const region = regionFavorites();
  b.hidden = loopMode || !current;
  b.disabled = !region || region.empty;
  const held = region?.sigs ? favorites.collections.filter((c) => region.sigs.every((s) => collectionsWith(favorites, s).some((x) => x.id === c.id))) : [];
  b.textContent = held.length ? '★' : '☆';
  b.classList.toggle('on', held.length > 0);
  b.title = !region ? 'Select bars on the song first (drag over the bar numbers): ★ keeps them as favourites, a favourite for each track marked (for each that plays there when none is)'
    : region.empty ? 'No track marked plays in the selected bars'
    : `${held.length ? `In favourites: ${held.map((c) => c.name).join(', ')}\n` : ''}Keep ${region.text} as favourites: one for each track ${marked.size ? 'marked' : 'that plays there'}`;
}

/**
 * The collections, ticked where all of `sigs` are; a click puts them all in, or takes them all out
 * when they all are there. `build()`: the favourites to put in, made when they are put in.
 */
function openCollectionsMenu(e, { title, sigs, build, text }) {
  document.querySelector('.ctx-menu')?.remove();
  const allIn = (cId) => sigs.every((s) => collectionsWith(favorites, s).some((x) => x.id === cId));
  const menu = document.createElement('div');
  menu.className = 'ctx-menu fav-menu';
  menu.innerHTML = `<div class="fav-menu-title">★ ${esc(title)}</div>${favorites.collections.map((c) => `<button type="button" data-c="${c.id}">${allIn(c.id) ? '✓' : '　'} ${esc(c.name)}</button>`).join('')}<button type="button" data-new="1">+ New collection…</button>`;
  document.body.append(menu);
  const r = menu.getBoundingClientRect();
  menu.style.left = `${Math.min(e.clientX, innerWidth - r.width - 4)}px`;
  menu.style.top = `${Math.min(e.clientY, innerHeight - r.height - 4)}px`;
  const close = (ev) => { if (!menu.contains(ev.target)) { menu.remove(); window.removeEventListener('pointerdown', close, true); } };
  window.addEventListener('pointerdown', close, true);
  menu.onclick = (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    menu.remove();
    window.removeEventListener('pointerdown', close, true);
    void act(null, '★ Favorites', async () => {
      let cId = b.dataset.c;
      if (b.dataset.new) {
        const name = await askFileName('', '', { title: 'New collection', hint: 'A name for it: Techno drums, Celtic, Intros…', ok: 'Create' });
        if (!name) return;
        cId = addCollection(favorites, name).id;
      }
      const c = favorites.collections.find((x) => x.id === cId);
      if (allIn(cId)) {
        for (const sig of sigs) {
          const item = Object.values(favorites.items).find((x) => x.sig === sig);
          if (item) removeFavorite(favorites, cId, item.id);
        }
        log.log(`★ Out of "${c.name}": ${text}.`);
      } else {
        for (const item of await build()) addFavorite(favorites, cId, item);
        log.ok(`★ In "${c.name}": ${text}.`);
      }
      favoritesChanged();
    }, false);
  };
}

function favoritesChanged() {
  saveFavorites();
  renderFavorites();
  paintRegionStar();
  if (loopMode) loopPanel.render();   // the ★ of its rows
  partTable.renderSoon();
}

/** A favourite's notes as a thumbnail, pitch up, in its octave's colours (as the pads draw them). */
function drawFavNotes(canvas, item) {
  const g = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  g.clearRect(0, 0, w, h);
  const { notes, bars = 1, beats = 4 } = item.clip;
  const total = Math.max(1, bars * beats);
  g.fillStyle = '#2c2c2c';
  for (let b = 0; b <= bars; b++) g.fillRect(Math.round((b * beats / total) * w), 0, 1, h);
  if (!notes.length) return;
  const lo = Math.min(...notes.map((n) => n.pitch)), hi = Math.max(...notes.map((n) => n.pitch));
  const span = Math.max(12, hi - lo + 1);
  const rowH = Math.max(2, (h - 4) / span);
  for (const n of notes) {
    g.fillStyle = noteColor(n.pitch, n.vel, item.drums);
    g.fillRect((n.beat / total) * w, h - 2 - (n.pitch - lo + 1) * rowH, Math.max(2, (n.len / total) * w - 1), Math.max(2, rowH - 1));
  }
}

/** ★ on a card: filled when its fragment is in a collection (named in its tooltip). */
function favStar(p) {
  const held = collectionsWith(favorites, sigOfPart(p));
  return `<button type="button" class="fav-star${held.length ? ' on' : ''}" title="${held.length ? `In favourites: ${esc(held.map((c) => c.name).join(', '))} · click to add or take out` : 'Add to favourites'}">${held.length ? '★' : '☆'}</button>`;
}

const favIsPlaying = (id) => (loopMode ? loopListen?.id === `fav:${id}` : favPlaying === id && player.playing);

/** The Favorites pane: a collection per fold (open or closed), its fragments inside. */
function renderFavorites() {
  const body = $('favBody');
  if (!body) return;
  const keyText = (k) => keyNameOfClass(k).replace(' mayor', '').replace(' menor', 'm');
  // The fit of each with the loop (New loop) or the session (🎯), as on the cards of Parts.
  const target = partsTargetNow();
  favTargetKey = targetKey(target);
  const fits = new Map(Object.values(favorites.items).map((it) => [it.id, favFit(it, target)]));
  const byFit = target && $('favByFit')?.checked;
  const order = (ids) => (byFit ? [...ids].sort((a, b) => (fits.get(b)?.score ?? -1) - (fits.get(a)?.score ?? -1)) : ids);
  const badge = (id) => {
    const f = fits.get(id);
    if (!f) return '';
    return `<span class="pr-fit ${f.good ? 'good' : f.pass ? 'ok' : 'bad'}" title="How it goes with ${sessionFit ? 'your LUNA session' : 'the loop'}, moved to its key: ${Math.round(f.score * 100)} %">${Math.round(f.score * 100)}%</span>`;
  };
  if (!favorites.collections.length) {
    body.innerHTML = '<p class="fav-empty">No collections yet. <b>+ New collection</b>, then ★ on a card of Parts to keep its fragment in it.</p>';
  } else {
    body.innerHTML = favorites.collections.map((c, k) => `
      <div class="fav-coll${c.open ? ' open' : ''}" data-c="${c.id}">
        <div class="fav-head">
          <button type="button" class="fav-toggle" title="${c.open ? 'Close' : 'Open'}">${c.open ? '▾' : '▸'}</button>
          <b class="fav-name" title="${esc(c.name)}">${esc(c.name)}</b><span class="fav-n">${c.items.length}</span>
          <span class="grow"></span>
          <button type="button" class="fav-up" title="Up"${k ? '' : ' disabled'}>▲</button>
          <button type="button" class="fav-down" title="Down"${k < favorites.collections.length - 1 ? '' : ' disabled'}>▼</button>
          <button type="button" class="fav-rename" title="Rename">✎</button>
          <button type="button" class="fav-export" title="Save this collection alone as a .mdig (to share it)">⤓</button>
          <button type="button" class="fav-del" title="Delete this collection (click twice)">✕</button>
        </div>
        ${c.open ? `<div class="fav-items">${c.items.length ? order(c.items).map((id) => {
          const it = favorites.items[id];
          if (!it) return '';
          const facts = [`${Math.round(it.bpm)} BPM`, it.ts, keyText(it.clip.key), `${it.clip.bars} bar${it.clip.bars === 1 ? '' : 's'}`].filter(Boolean).join(' · ');
          const { icon, family } = instrumentIcon(it);
          return `<div class="fav-item${favIsPlaying(id) ? ' playing' : ''}" data-f="${id}" title="${esc(it.path)}${it.track ? `\ntrack “${esc(it.track)}”` : ''}\nbars ${it.startBar}–${it.startBar + it.bars - 1}, channel ${it.ch}\nDrag it onto the loop · ▶ to hear it">
            <button type="button" class="fav-play" title="Listen">${favIsPlaying(id) ? '⏸' : '▶'}</button>
            <canvas class="fav-notes" width="240" height="36"></canvas>
            <span class="fav-icon" title="${esc(family)}">${icon}</span>
            <div class="fav-text"><b class="fav-title" title="Click to rename it${it.name && it.name !== it.instrument ? ` (${esc(it.instrument)})` : ''}"><i class="dot role-${it.role}"></i>${esc(it.name || it.instrument)}${badge(id)}</b><small>${esc(baseName(it.path))} · ${esc(facts)}</small></div>
            <button type="button" class="fav-remove" title="Out of this collection">✕</button>
          </div>`;
        }).join('') : '<p class="fav-empty">Empty: ★ on a card of Parts puts a fragment here.</p>'}</div>` : ''}
      </div>`).join('');
    for (const cv of body.querySelectorAll('.fav-item canvas')) drawFavNotes(cv, favorites.items[cv.closest('.fav-item').dataset.f]);
  }
  loopPanel?.setSources(favorites.collections.map((c) => ({ id: c.id, name: c.name, n: c.items.length })));
  const n = Object.keys(favorites.items).length;
  $('favCount').textContent = `${n.toLocaleString()} favourite${n === 1 ? '' : 's'} in ${favorites.collections.length} collection${favorites.collections.length === 1 ? '' : 's'}`;
}

/** ▶ on a favourite: in New loop over the loop (as a part of Parts), else alone, round and round. */
async function playFavorite(id) {
  const item = favorites.items[id];
  if (!item) return;
  if (loopMode) {
    if (loopListen?.id === `fav:${id}`) {
      if (loopListen.alone) player.stop();
      loopListen = null;
      soundLoop();
    } else {
      if (exploreSounding()) toggleExplore();
      adoptLoop({ bpm: item.bpm, ts: item.ts, key: keyNameOfClass(item.clip.key) });
      const clip = structuredClone(item.clip);
      const alone = player.playing ? !!loopListen?.alone : true;
      const entry = comingIn();
      const next = { id: `fav:${id}`, clip, alone, ...entry, program: item.program, drums: item.drums, transpose: transposeBetween(clip.key, loop.key) };
      loopSong(loop, next);
      heardIn = null;
      loopListen = next;
      loopPanel.render();
      soundLoop();
      if (!player.playing) await startPlaying(0);
    }
  } else if (favPlaying === id && player.playing) {
    stopFavorite();
  } else {
    // Alone: a loop of its own, at its tempo, meter and key, round and round.
    const own = { ...newLoop(), bpm: item.bpm || 120, timeSig: METERS.includes(item.ts) ? item.ts : '4/4', key: item.clip.key, length: Math.max(1, item.clip.bars) };
    const row = addRow(own, { program: item.program, drums: item.drums, name: item.instrument });
    placeClip(row, 0, structuredClone(item.clip));
    const song = loopSong(own);
    endAudition(false);
    player.stop();
    player.load(song);
    player.setChannels(null);
    player.setLoop({ startSec: 0, endSec: song.durationSec });
    favPlaying = id;
    await player.play(0);
  }
  renderFavorites();
  paintPlayer();
}

/** The favourite sounding alone stops; the song open is in the player again. */
function stopFavorite() {
  if (favPlaying === null) return;
  favPlaying = null;
  player.stop();
  if (current?.info) { player.load(current.info); applyLoop(); }
  renderFavorites();
  paintPlayer();
}

/** A favourite dropped on New loop: onto a pad of a row, or under the rows (a new instrument). */
function dropFavorite(id, to) {
  const item = favorites.items[id];
  if (!item) return;
  if (to.explore) throw new Error('A favourite is a fragment, not a song: drop it on a pad, or under the rows for a new instrument.');
  const p = { role: item.role, ts: item.ts, instrument: item.name || item.instrument, program: item.program, bpm: item.bpm, key: keyNameOfClass(item.clip.key) };
  adoptLoop(p);
  placeInLoop(p, structuredClone(item.clip), to);
  if (loopListen?.id === `fav:${id}`) { loopListen = null; soundLoop(); }
}

async function saveFavoritesFile({ collection = null } = {}) {
  const only = collection ? favorites.collections.find((c) => c.id === collection) : null;
  const favs = only ? { items: Object.fromEntries(only.items.map((id) => [id, favorites.items[id]])), collections: [only] } : favorites;
  if (!Object.keys(favs.items).length) throw new Error(only ? `"${only.name}" is empty.` : 'No favourites yet: ★ on a card of Parts.');
  const name = await askFileName(only ? `MIDI Digger favorites - ${only.name}` : 'MIDI Digger favorites', '.mdig', { title: only ? `Save "${only.name}"` : 'Save favorites', ok: 'Save' });
  if (!name) { log.log('Not saved.'); return; }
  downloadBytes(encodeFavorites(favs), `${name}.mdig`);
  log.ok(`${Object.keys(favs.items).length} favourite${Object.keys(favs.items).length === 1 ? '' : 's'} saved as "${name}.mdig" in your Downloads folder. ⤒ Restore… takes them up again, here or on another computer.`);
}

async function restoreFavoritesFile() {
  const file = await chooseFile('.mdig');
  if (!file) { log.log('Cancelled.'); return; }
  const from = decodeFavorites(new Uint8Array(await file.arrayBuffer()));
  const added = mergeFavorites(favorites, from);
  favoritesChanged();
  log.ok(`Favorites restored from "${file.name}": ${added.toLocaleString()} new in ${from.collections.length} collection${from.collections.length === 1 ? '' : 's'} (those you had are kept).`);
}

function wireFavorites() {
  $('favNew').onclick = () => void act(null, '★ New collection', async () => {
    const name = await askFileName('', '', { title: 'New collection', hint: 'A name for it: Techno drums, Celtic, Intros…', ok: 'Create' });
    if (!name) return;
    addCollection(favorites, name);
    favoritesChanged();
  }, false);
  $('favByFit').onchange = () => renderFavorites();
  $('favSave').onclick = (e) => act(e.currentTarget, '⤓ Save favorites', () => saveFavoritesFile(), false);
  $('favRestore').onclick = (e) => act(e.currentTarget, '⤒ Restore favorites', restoreFavoritesFile, false);
  let deleting = null;
  // A click on a favourite's name: edited there; Enter (or clicking away) keeps it, Esc leaves it.
  // Empty: back to its instrument. The name is the favourite's, in every collection it is in.
  const renameInPlace = (title, item) => {
    const input = Object.assign(document.createElement('input'), { className: 'fav-name-edit', value: item.name || item.instrument || '', spellcheck: false });
    title.replaceWith(input);
    input.focus();
    input.select();
    let done = false;
    const finish = (keep) => {
      if (done) return;
      done = true;
      const name = input.value.replace(/\s+/g, ' ').trim();
      if (keep && (name || item.instrument) !== (item.name || item.instrument)) item.name = name || item.instrument;
      favoritesChanged();
    };
    input.onkeydown = (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    };
    input.onblur = () => finish(true);
  };
  $('favBody').addEventListener('click', (e) => {
    const title = e.target.closest('.fav-title');
    if (title) {
      const item = favorites.items[title.closest('.fav-item')?.dataset.f];
      if (item) renameInPlace(title, item);
      return;
    }
    const coll = e.target.closest('.fav-coll');
    const c = coll && favorites.collections.find((x) => x.id === coll.dataset.c);
    if (!c) return;
    const item = e.target.closest('.fav-item')?.dataset.f;
    if (e.target.closest('.fav-play')) { void act(null, '▶ Favorite', () => playFavorite(item), false); return; }
    if (e.target.closest('.fav-remove')) {
      if (favPlaying === item) stopFavorite();
      removeFavorite(favorites, c.id, item);
      favoritesChanged();
      return;
    }
    if (e.target.closest('.fav-toggle, .fav-name')) { c.open = !c.open; favoritesChanged(); return; }
    if (e.target.closest('.fav-up')) { moveCollection(favorites, c.id, -1); favoritesChanged(); return; }
    if (e.target.closest('.fav-down')) { moveCollection(favorites, c.id, 1); favoritesChanged(); return; }
    if (e.target.closest('.fav-export')) { void act(null, '⤓ Save collection', () => saveFavoritesFile({ collection: c.id }), false); return; }
    if (e.target.closest('.fav-rename')) {
      void act(null, '✎ Rename collection', async () => {
        const name = await askFileName(c.name, '', { title: 'Rename collection', hint: 'Its new name.', ok: 'Rename' });
        if (name) { renameCollection(favorites, c.id, name); favoritesChanged(); }
      }, false);
      return;
    }
    if (e.target.closest('.fav-del')) {
      // Twice: the first click asks, the second (within 3 s) deletes.
      const b = e.target.closest('.fav-del');
      if (deleting === c.id) {
        deleting = null;
        if (c.items.includes(favPlaying)) stopFavorite();
        removeCollection(favorites, c.id);
        favoritesChanged();
        log.log(`Collection "${c.name}" deleted.`);
      } else {
        deleting = c.id;
        b.textContent = 'Delete?';
        b.classList.add('confirm');
        setTimeout(() => { if (deleting === c.id) { deleting = null; renderFavorites(); } }, 3000);
      }
    }
  });
}

// ── ✨ Fill: the rest of the loop as the library's songs are arranged (midi/director.js) ──

/** The toolbar's Fill details on while there is something to show; its tab, open, shows the loop open now. */
function paintFillDetails() {
  paintFillTabs();
  if (fillPaneOpen()) {
    if (!displayedFillGroups()?.length) showTab('parts');
    else renderFillDetails();
  }
}

function paintFillTabs() {
  const tabs = loopMode ? activeLoopTab?.fillReviewTabs ?? [] : [];
  const selected = loopMode ? activeLoopTab?.selectedFillTab : null;
  paintPlayAllFills();
  $('groupedFillTab').hidden = !(loopMode && activeLoopTab?.fillReview?.length);
  $('tab-fill').classList.toggle('on', fillPaneOpen() && !selected);
  const box = $('fillReviewTabs');
  box.replaceChildren(...tabs.map((tab) => {
    const wrap = document.createElement('span');
    wrap.className = 'fill-review-tab';
    wrap.classList.toggle('playing', fillChains.has(tab.group));
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = tab.group.label;
    // An instrument's tab: its drawing before its name, as in the table it was opened from.
    if (tab.group.chosen && !tab.group.instruments) {
      const icon = document.createElement('span');
      icon.className = 'fill-tab-icon';
      icon.innerHTML = instrumentIcon(tab.group.chosen).icon;
      button.prepend(icon);
    }
    button.title = `Fill details: ${tab.group.label}`;
    button.classList.toggle('on', fillPaneOpen() && selected === tab);
    button.onclick = () => selectFillReviewTab(tab);
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = '×';
    close.title = 'Close these results and stop their playlist';
    close.setAttribute('aria-label', `Close Fill details for ${tab.group.label}`);
    close.onclick = () => closeFillReviewTab(tab);
    wrap.append(button, close);
    tab.element = wrap;
    return wrap;
  }));
}

function selectFillReviewTab(tab) {
  if (!activeLoopTab) {
    showTab('fill');
    return;
  }
  if (loopListen?.fillReview) stopFillListen();
  activeLoopTab.selectedFillTab = tab;
  focusFillChain(tab?.group ?? activeLoopTab.fillReview?.[0] ?? null);
  $('chainGroup').dataset.labels = '';
  $('fillDetailsBody').scrollTop = 0;
  showTab('fill');
}

function closeFillReviewTab(tab) {
  const tabs = activeLoopTab?.fillReviewTabs;
  const index = tabs?.indexOf(tab) ?? -1;
  if (index < 0) return;
  endFillChain({ group: tab.group });
  fillChainDone.delete(tab.group);
  tabs.splice(index, 1);
  if (activeLoopTab.selectedFillTab === tab) {
    const next = tabs[Math.min(index, tabs.length - 1)];
    if (next) { selectFillReviewTab(next); return; }
    activeLoopTab.selectedFillTab = null;
    focusFillChain(activeLoopTab.fillReview?.[0] ?? null);
    $('chainGroup').dataset.labels = '';
  }
  paintFillDetails();
  paintFillChain();
}

function closeGroupedFillTab() {
  const tab = activeLoopTab;
  if (!loopMode || !tab?.fillReview?.length) return;
  const displaying = fillPaneOpen() && !tab.selectedFillTab;
  if (displaying) ++listenTurn;
  const rows = tab.fillReview.map((group) => fillChains.get(group)?.row).filter(Boolean);
  closeGroupedFillReview(tab, (group) => endFillChain({ group, quiet: true, refresh: false }), fillChainDone);
  if (rows.length) {
    loopPanel.render();
    soundLoop({ changedRows: rows });
  }
  if (displaying) {
    const next = tab.fillReviewTabs[0];
    if (next) selectFillReviewTab(next);
    else showTab('parts');
  } else paintFillDetails();
  paintFillChain();
}

/** The rows that sound in a loop, as they sound, from its first bar: what Fill details draws as the context. */
function loopLayers(of = loop) {
  const solo = of.rows.some((row) => row.solo);
  const perBar = barBeats(of);
  const layers = [];
  for (const row of of.rows) {
    if (row.mute || (solo && !row.solo)) continue;
    const clip = rowClip(of, row);
    if (clip) layers.push({ name: row.name || 'Instrument', drums: !!row.drums, notes: clip.notes.map((n) => ({ ...n, len: Math.max(n.len, 1 / 32), beat: n.beat + clip.first * perBar })) });
  }
  return { bars: loopBars(of), beats: perBar, layers };
}

function fillContextSnapshot(target, context, { source, rows, dynamicsSource, previous = [], of = loop, music = null }) {
  return {
    source, rows, dynamicsSource, previous, music: music ?? loopLayers(of),
    bars: context.bars, dynamics: context.dynamics && { ...context.dynamics },
    notesPerBar: context.notesPerBar, roles: rolesText(context.haveMask),
    songs: context.model?.songs ?? 0, daring: context.daring,
    bpm: loop.bpm, meter: loop.timeSig,
    key: target?.key || '',
    chords: target?.chords || '', drums: target?.drums || '', bass: target?.bass || '',
    pitch: copyFingerprintGrid(target?.grid, target?.stepsPerBar),
    hits: copyFingerprintGrid(target?.hits, target?.hitsPerBar),
  };
}

function fillCandidateSnapshot(candidate, target) {
  const pitch = candidate.summary ? candidate.summary.grid : catalog.grid(candidate.index);
  const hits = candidate.summary ? candidate.summary.hits : catalog.hits(candidate.index);
  const shift = candidate.measured.harmony ? transposeBetween(keyClass(candidate.key), target?.key) : 0;
  return {
    pitch: copyFingerprintGrid(pitch && shift ? transposed(pitch.grid, shift) : pitch?.grid, pitch?.stepsPerBar),
    hits: copyFingerprintGrid(hits?.hits.subarray(0, hits.steps), hits?.stepsPerBar),
    shift,
  };
}

function fillRowsSnapshot(rows) {
  return rows.map((row) => `${row.name || 'Instrument'} (${rowRole(row)}${row.mute ? ', muted' : ''}${row.solo ? ', solo' : ''})`).join(', ') || 'none';
}

function markFillClip(clip, candidate, context) {
  const id = crypto.randomUUID();
  clip.fillOrigins = [{
    id,
    candidate: {
      path: candidate.path, ch: candidate.ch, atTick: candidate.atTick, ticks: candidate.ticks,
      instrument: candidate.instrument, program: candidate.program, role: candidate.role,
      score: candidate.score, dimensions: fillScoreBreakdown(candidate),
    },
    context,
  }];
  return id;
}

function fillGridDetails(pitch, hits) {
  const grid = (data, kind, label) => {
    if (!data) return `<div>${label}: unavailable</div>`;
    const bars = fingerprintBars(data, kind).map((text, i) => `<div>Bar ${i + 1}: ${esc(text)}</div>`).join('');
    return `<div><b>${label}</b> · ${data.stepsPerBar} steps/bar · positions start at 1${bars}</div>`;
  };
  return `<details class="fill-fingerprint-grid"><summary>Show note and rhythm grids</summary>
    ${grid(pitch, 'pitch', 'Pitch classes sounding at each step')}
    ${grid(hits, 'hits', 'Note-on positions at each bar')}</details>`;
}

/** How many proposals Fill details shows for each thing Fill or Arrange chose: that one and the alternatives. */
const FILL_SHOWN = 50;

/** A calculator, drawn in the button's colour as the page's other glyphs (not a coloured emoji). */
const CALC_ICON = '<svg class="calc-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="1.5" width="10" height="13" rx="1.5"/><rect x="5" y="3.5" width="6" height="2.5" rx=".4"/><g fill="currentColor" stroke="none"><circle cx="5.6" cy="8.6" r=".85"/><circle cx="8" cy="8.6" r=".85"/><circle cx="10.4" cy="8.6" r=".85"/><circle cx="5.6" cy="11.6" r=".85"/><circle cx="8" cy="11.6" r=".85"/><circle cx="10.4" cy="11.6" r=".85"/></g></svg>';

function fillFitEvidence(measured, role) {
  const pct = (value) => `${Math.round(value * 100)}%`;
  const { harmony, rhythm, chords, groove } = measured;
  if (harmony && rhythm) return `Joint notes + rhythm: clash ${pct(harmony.clash)}, chroma ${pct(harmony.chroma)}, harmony cover ${pct(harmony.cover)}; hit ${pct(rhythm.hit)}, cover ${pct(rhythm.cover)}, beat ${pct(rhythm.beat)}, accent ${pct(rhythm.accent)}, bar ${pct(rhythm.bar)}, density ${rhythm.density.toFixed(2)} octaves`;
  if (harmony) return `Notes only: clash ${pct(harmony.clash)}, chroma ${pct(harmony.chroma)}, harmony cover ${pct(harmony.cover)}`;
  if (role === 'drums' && rhythm) return `Drum rhythm: hit ${pct(rhythm.hit)}, cover ${pct(rhythm.cover)}, beat ${pct(rhythm.beat)}, accent ${pct(rhythm.accent)}, bar ${pct(rhythm.bar)}, density ${rhythm.density.toFixed(2)} octaves`;
  const fallback = [chords !== null ? `chords ${pct(chords)}` : '', groove !== null ? `groove ${pct(groove)}` : ''].filter(Boolean);
  return fallback.length ? `Fallback comparison: ${fallback.join(' · ')}` : 'Fit comparison unavailable';
}

let fillDetailCandidates = [];   // what Fill details lists now: { candidate, group }, by the index on its buttons

/** Fill details' ▶ buttons: ⏸ on the one sounding now. */
function paintFillListen() {
  if (!fillPaneOpen()) return;
  const sounding = player.playing && loopListen?.fillReview ? loopListen.fillCandidate : null;
  for (const b of $('fillDetailsBody').querySelectorAll('[data-fill-listen]')) {
    const on = sounding && fillDetailCandidates[Number(b.dataset.fillListen)]?.candidate === sounding;
    b.textContent = on ? '⏸' : '▶';
    b.classList.toggle('on', !!on);
  }
}

/** The fragment Fill details is playing, stopped: the loop as it was, silent. */
function stopFillListen() {
  // (▶▶ too: the row as it was before ⇣ changes it.)
  endAllFillChains();
  ++listenTurn;
  if (!loopListen?.fillReview) return;
  player.stop();
  loopListen = null;
  soundLoop();
  paintPlayer();
}

/**
 * Fill details (its tab on the left): what Fill or Arrange last found for the loop open, each group
 * with its context and the proposals in the order they were ranked, to listen to and put in or out.
 */
let fillInstrumentRows = [];   // the rows of Fill results' instruments tables: [{ group, inst }]

/**
 * A Fill result's instruments as Summary shows them: #, drawing, name, how many fragments fit,
 * ＋ Add (✓ when it is in the loop already), most fragments first. Rows indexed in fillInstrumentRows.
 */
function fillInstrumentsTable(group) {
  const good = Math.round(SUMMARY_GOOD_SCORE * 100);
  const list = [...group.instruments].sort((a, b) => b.goodCount - a.goodCount || b.count - a.count || a.instrument.localeCompare(b.instrument));
  return `<table class="summary-table fill-instruments">
    <thead><tr><th class="num">#</th><th></th><th>Instrument</th><th class="num" title="Fragments of this instrument at ${good}% Fill or more">Fragments</th><th></th></tr></thead>
    <tbody>${list.map((inst, i) => {
      const at = fillInstrumentRows.push({ group, inst }) - 1;
      const { icon, family } = instrumentIcon(inst);
      const inLoop = loop.rows.some((row) => playsInstrument(row, inst));
      return `<tr data-fill-instrument="${at}">
        <td class="num">${i + 1}</td>
        <td class="summary-icon" title="${esc(family)}">${icon}</td>
        <td>${esc(inst.instrument)}</td>
        <td class="num" title="${inst.goodCount.toLocaleString()} at ${good}% or more, of ${inst.count.toLocaleString()} that fit">${inst.goodCount.toLocaleString()}</td>
        <td class="summary-add">${inLoop ? `<button type="button" data-fill-list title="${esc(inst.instrument)} is in the loop: open its fragments in a tab of its own">☰ List</button>`
          : `<button type="button" data-fill-add title="Add ${esc(inst.instrument)} to the loop (its tab of fragments is made, ☰ List opens it): it comes in on the next bar and nothing else stops. With ▶▶ playlists playing it joins them, its fragments one after another">＋ Add</button>`}</td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;
}

let fillResultRows = [];   // the rows of the grouped Fill results' table: [group]

/**
 * The grouped Fill results as a table, as Summary's: #, the instrument's drawing, the result (its
 * row and bars), how many of its proposals fit, ✓ when its row is in the loop (＋ Add when it was
 * deleted), most first. A ▶▶ before the name while its playlist plays. Rows indexed in fillResultRows.
 */
function fillResultsTable(groups) {
  const good = Math.round(SUMMARY_GOOD_SCORE * 100);
  const list = groups.map((group) => {
    const order = fillGroupOrder(group);
    const goodCount = group.instruments ? group.instruments.reduce((n, inst) => n + inst.goodCount, 0) : order.filter((c) => c.score >= SUMMARY_GOOD_SCORE).length;
    return { group, goodCount, count: group.instruments ? group.instruments.reduce((n, inst) => n + inst.count, 0) : order.length };
  }).sort((a, b) => b.goodCount - a.goodCount || b.count - a.count || a.group.label.localeCompare(b.group.label));
  return `<table class="summary-table fill-instruments">
    <thead><tr><th class="num">#</th><th></th><th>Instrument</th><th class="num" title="Its proposals at ${good}% Fill or more">Fragments</th><th></th></tr></thead>
    <tbody>${list.map(({ group, goodCount, count }, i) => {
      const at = fillResultRows.push(group) - 1;
      const drawn = group.chosen && !group.instruments ? instrumentIcon(group.chosen) : null;
      const action = group.instruments || fillGroupRow(group)
        ? `<button type="button" data-fill-list title="Open ${group.instruments ? 'the instruments it found' : 'its fragments'} in a tab of its own">☰ List</button>`
        : '<button type="button" data-fill-back title="Its row was deleted: put this instrument back in the loop, in on the next bar (its tab of fragments is made, ☰ List opens it)">＋ Add</button>';
      return `<tr data-fill-result="${at}">
        <td class="num">${i + 1}</td>
        <td class="summary-icon"${drawn ? ` title="${esc(drawn.family)}"` : ''}>${drawn ? drawn.icon : ''}</td>
        <td>${fillChains.has(group) ? '<span class="fill-result-playing" title="Its playlist is playing">▶▶</span> ' : ''}${esc(group.label)}</td>
        <td class="num" title="${goodCount.toLocaleString()} at ${good}% or more, of ${count.toLocaleString()}">${goodCount.toLocaleString()}</td>
        <td class="summary-add">${action}</td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;
}

function renderFillDetails() {
  fillInstrumentRows = [];
  fillResultRows = [];
  const groups = displayedFillGroups();
  $('fillDetailsEmpty').textContent = groups ? ''
    : loopMode ? 'Nothing yet for this loop: press ✨ Fill, or one of the Arrange buttons (Build-up, Breakdown, Arc…), and what they found shows here.'
    : 'Open a loop (a tab next to Song, or + New loop): what ✨ Fill or Arrange find for it shows here.';
  $('fillDetailsEmpty').hidden = !!groups;
  if (!groups) {
    if (loopListen?.fillReview) stopFillListen();
    $('fillDetailsBody').innerHTML = '';
    fillDetailCandidates = [];
    fillGridData = null;
    return;
  }
  const anchor = fillAnchor();
  const candidates = [];
  const contexts = [];   // the context of each group with its rows to draw, by the index on its grid
  fillDetailCandidates = candidates;
  const pct = (value) => `${Math.round(value * 100)}%`;
  const number = (value) => Number.isFinite(value) ? Number(value.toFixed(1)) : 'unavailable';
  const progression = (value) => value ? romanProgression(value) : 'unavailable';
  const keyName = (value) => (keyNameOfClass(value) || value || 'unavailable').replace(' mayor', ' major').replace(' menor', ' minor');
  // 🧮: how a proposal was scored, written when it is opened (there are many).
  const calcOf = ({ candidate, group }) => {
    const signature = group.fingerprints.get(candidate);
    const dimensions = fillScoreBreakdown(candidate).map(({ label: name, value, weight }) =>
      `<span>${name}: ${value === null ? 'unavailable' : `${pct(value)} (weight ${pct(weight)})`}</span>`).join('');
    return `<div class="fill-fingerprint-facts">
        <span>Source: ${number(candidate.bpm)} BPM · ${esc(candidate.ts || 'meter unavailable')} · key ${esc(keyName(candidate.key))}</span>
        <span>Velocity: ${number(candidate.velocity)} mean / ${number(candidate.velocitySpread)} spread · activity: ${esc(candidate.energy || 'unavailable')}</span>
        <span>Chords (relative): ${esc(progression(candidate.chords))} · groove: ${esc(grooveText(candidate.groove) || 'unavailable')}</span>
      </div>
      <div class="fill-details-scores">${dimensions}</div>
      <div class="fill-fingerprint-evidence">${esc(fillFitEvidence(candidate.measured, candidate.role))}</div>
      <div class="dim">Fragment grids${candidate.measured.harmony ? `: pitch moved ${signature.shift} semitones for Fit` : ': pitch shown as indexed, not used for Fit'}${candidate.measured.rhythm && (candidate.measured.harmony || candidate.role === 'drums') ? '; rhythm used for Fit' : '; rhythm not used for Fit'}.</div>
      ${fillGridDetails(signature.pitch, signature.hits)}`;
  };
  // The calculator of "What we have": what was compared against, written when it is opened.
  const contextCalcOf = (context, by) => {
    const dynamics = context.dynamics ? `${number(context.dynamics.mean)} mean / ${number(context.dynamics.spread)} spread` : 'unavailable';
    const level = ['sparse', 'medium', 'busy'][activityLevel(context.notesPerBar)];
    return `<div>Fit target: ${esc(context.source)}</div>
      <div>Loop rows before ${by}: ${esc(context.rows)}</div>
      <div>Length: ${context.bars} bars · loop: ${number(context.bpm)} BPM, ${esc(context.meter)} · Fit key: ${esc(keyName(context.key))}</div>
      <div>Dynamics reference (${esc(context.dynamicsSource)}): ${dynamics} MIDI velocity</div>
      <div>Activity reference (${esc(context.dynamicsSource)}): ${number(context.notesPerBar)} notes/bar · ${level}</div>
      <div>Role reference (loop rows, including muted): ${esc(context.roles)} · ${context.songs} analysed songs · role setting ${number(context.daring)}</div>
      <div>Fit chords (relative): ${esc(progression(context.chords))} · drums groove: ${esc(grooveText(context.drums) || 'unavailable')} · bass groove: ${esc(grooveText(context.bass) || 'unavailable')}</div>
      ${context.previous.length ? `<div>Earlier selections also checked for pitched clashes when grids exist: ${esc(context.previous.join(', '))}</div>` : ''}
      ${fillGridDetails(context.pitch, context.hits)}`;
  };
  const contextBys = [];   // each group's "Fill" or "Arrange", by its context's index
  const asTable = fillResultsAsTable();
  $('fillDetailsBody').innerHTML = groups.map((group, g) => {
    const { label, chosen, alternatives, context, fingerprints } = group;
    const item = (candidate, n) => {
      const selected = candidate === chosen;
      const index = candidates.push({ candidate, group }) - 1;
      const calc = fillCalcOpen.has(candidate);
      const where = group.arrange ? `wherever this fragment plays in ${esc(group.row?.name || 'its row')}, the same bars of it`
        : group.added ? `as the new instrument (${esc(group.row?.name || 'its row')})` : `in bars ${group.from + 1}–${group.to} of ${esc(group.row?.name || 'its row')}`;
      // Icons only (the panel is narrow): what each does, in its tooltip.
      const take = !group.row ? ''
        : selected ? `<button type="button" class="fill-take" disabled title="In the loop: this is the one there now" aria-label="In the loop">✓</button>`
        : `<button type="button" class="fill-take" data-fill-take="${index}" title="Replace: put this one in the loop ${where}, in place of the one there now (↶ to undo)" aria-label="Replace">⇣</button>`;
      return `<div class="fill-details-item">
        <div class="fill-details-item-head"><button type="button" data-fill-listen="${index}" title="Listen to it alone (click again to stop)" aria-label="Listen to ${esc(candidate.instrument)}">▶</button>
        <strong>${n + 1} · ${esc(candidate.instrument)} · Fill ${pct(candidate.score)}</strong><small class="fill-item-meta">${esc(baseName(candidate.path))} · ${esc(candidate.role)} · ${candidate.loopBars} bars</small><span class="fill-actions">${take}<button type="button" class="fill-calc${calc ? ' on' : ''}" data-fill-calc="${index}" aria-expanded="${calc}" title="Calculations: source facts, Fill % by dimension, Fit evidence and its grids (click again to hide)" aria-label="Calculations for ${esc(candidate.instrument)}">${CALC_ICON}</button></span></div>
        ${fillGridDrawn.has(candidate)
          ? `<div class="fill-midi-scroll" data-fill-grid="${index}" data-seen="1">${fillGridDrawn.get(candidate)}</div>`
          : `<div class="fill-midi-scroll" data-fill-grid="${index}" role="status">Loading MIDI grid…</div>`}
        <div class="fill-calc-box" data-fill-calc-box="${index}"${calc ? '' : ' hidden'}>${calc ? calcOf(candidates[index]) : ''}</div>
      </div>`;
    };
    const by = group.by ?? 'Fill';
    const at = contexts.push(context) - 1;
    contextBys[at] = by;
    const calc = fillContextCalcOpen;
    const contextFold = `<details class="fill-fingerprint-context">
        <summary><b>What we have · comparison context before ${by}</b></summary>
        <div class="fill-context-head"><span class="fill-midi-label">${context.music ? `MIDI grid · the loop rows that sound, before ${by}` : 'What it was compared against'}</span><button type="button" class="fill-calc${calc ? ' on' : ''}" data-fill-context-calc="${at}" aria-expanded="${calc}" title="What it was compared against: the Fit target, the loop rows, length, tempo and key, the dynamics, activity and role references, the chords and grooves, and the grids (click again to hide)" aria-label="What it was compared against">${CALC_ICON}</button></div>
        ${context.music ? `<div class="fill-midi-scroll fill-midi-context" data-fill-context="${at}" role="status">Loading MIDI grid…</div>` : ''}
        <div class="fill-calc-box" data-fill-context-box="${at}"${calc ? '' : ' hidden'}>${calc ? contextCalcOf(context, by) : ''}</div>
      </details>`;
    // Several results (one for each row Fill filled): a table of them, each one's fragments in a tab of its own.
    if (asTable) return g ? '' : `<section class="fill-details-group">
      ${contextFold}
      <b>What ${by} found</b> <span class="dim">· one result for each instrument, by how many of its proposals fit (${Math.round(SUMMARY_GOOD_SCORE * 100)}% Fill or more); ☰ List opens one's fragments, ＋ Add puts it in the loop (its tab made, to open later)</span>
      ${fillResultsTable(groups)}</section>`;
    // Several instruments found: the instruments (as Summary's table), each one's fragments in a tab of its own.
    if (group.instruments) return `<section class="fill-details-group"><strong>${esc(label)}</strong>
      ${contextFold}
      <b>What ${by} found</b> <span class="dim">· the instruments, by how many of their fragments fit (${Math.round(SUMMARY_GOOD_SCORE * 100)}% Fill or more); ☰ List opens one's fragments, ＋ Add puts it in the loop (its tab made, to open later)</span>
      ${fillInstrumentsTable(group)}</section>`;
    return `<section class="fill-details-group"><strong>${esc(label)}</strong>
      ${contextFold}
      <b>What ${by} found</b> <span class="dim">· in the order ${by} ranked them; ✓ marks the one in the loop</span>${fillGroupOrder(group).map(item).join('')}${alternatives.length ? '' : '<p class="dim">No other eligible alternatives at this step.</p>'}</section>`;
  }).join('');
  // The table of results, as Summary's: ☰ List opens that result's tab (its fragments); ＋ Add puts
  // back an instrument whose row was deleted and opens it.
  $('fillDetailsBody').querySelectorAll('[data-fill-result]').forEach((tr) => {
    const group = fillResultRows[Number(tr.dataset.fillResult)];
    const list = tr.querySelector('[data-fill-list]');
    if (list) list.onclick = () => openGroupTab(group);
    const back = tr.querySelector('[data-fill-back]');
    if (back) back.onclick = () => void act(back, '＋ Add instrument', () => addGroupBack(group), false);
  });
  // The instruments' tables: ☰ List opens one in the loop in its tab; ＋ Add puts it in the loop and opens it.
  $('fillDetailsBody').querySelectorAll('[data-fill-instrument]').forEach((tr) => {
    const { group, inst } = fillInstrumentRows[Number(tr.dataset.fillInstrument)];
    const list = tr.querySelector('[data-fill-list]');
    if (list) list.onclick = () => openInstrumentTab(group, inst);
    const add = tr.querySelector('[data-fill-add]');
    if (add) add.onclick = () => void act(add, '＋ Add instrument', () => addFillInstrument(group, inst), false);
  });
  $('fillDetailsBody').querySelectorAll('[data-fill-listen]').forEach((button) => {
    button.onclick = () => {
      const { candidate } = candidates[Number(button.dataset.fillListen)];
      if (player.playing && loopListen?.fillReview && loopListen.fillCandidate === candidate) { stopFillListen(); return; }
      void act(button, '▶ Fill fragment', () => listenFillCandidate(candidate), false);
    };
  });
  $('fillDetailsBody').querySelectorAll('[data-fill-take]').forEach((button) => {
    button.onclick = () => void act(button, '⇣ Fill fragment to loop', () => takeFillCandidate(candidates[Number(button.dataset.fillTake)]), false);
  });
  // The context, folded (the panel is narrow): open, it keeps open from one drawing to the next.
  for (const fold of $('fillDetailsBody').querySelectorAll('.fill-fingerprint-context')) {
    fold.open = fillContextOpen;
    fold.ontoggle = () => { fillContextOpen = fold.open; if (fold.open) drawFillGrids(); };
  }
  // The calculator of "What we have": what was compared against, shown or hidden (in every group alike, and so it stays).
  $('fillDetailsBody').querySelectorAll('[data-fill-context-calc]').forEach((button) => {
    button.onclick = () => {
      const at = Number(button.dataset.fillContextCalc);
      const box = $('fillDetailsBody').querySelector(`[data-fill-context-box="${at}"]`);
      const open = box.hidden;
      if (open && !box.childElementCount) box.innerHTML = contextCalcOf(contexts[at], contextBys[at]);
      box.hidden = !open;
      button.classList.toggle('on', open);
      button.setAttribute('aria-expanded', String(open));
      fillContextCalcOpen = open;
    };
  });
  // 🧮 opens and closes its proposal's calculations; open, they stay so when the list is drawn again.
  $('fillDetailsBody').querySelectorAll('[data-fill-calc]').forEach((button) => {
    button.onclick = () => {
      const index = Number(button.dataset.fillCalc);
      const { candidate } = candidates[index];
      const box = $('fillDetailsBody').querySelector(`[data-fill-calc-box="${index}"]`);
      const open = box.hidden;
      if (open && !box.childElementCount) box.innerHTML = calcOf(candidates[index]);
      box.hidden = !open;
      button.classList.toggle('on', open);
      button.setAttribute('aria-expanded', String(open));
      if (open) fillCalcOpen.add(candidate); else fillCalcOpen.delete(candidate);
    };
  });
  fillGridData = { contexts, candidates, tab: activeLoopTab, beats: barBeats(loop), key: loop.key };
  // A proposal's grid read and drawn when it comes near the view: not the fifty files at once.
  fillGridSeen?.disconnect();
  fillGridSeen = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
      if (!isIntersecting) continue;
      fillGridSeen.unobserve(target);
      target.dataset.seen = '1';
      drawFillGrid(target);
    }
  }, { root: $('fillDetailsBody'), rootMargin: '600px 0px' });
  for (const element of $('fillDetailsBody').querySelectorAll('[data-fill-grid]:not([data-seen])')) fillGridSeen.observe(element);
  drawFillGrids();
  restoreFillAnchor(anchor);
  paintFillListen();
  paintFillChain();
}

/**
 * Where Fill details' list is: the first proposal in view and how far from the top, to leave it
 * there when the list is drawn again (⇣ Replace must not move it). Null when not showing.
 */
function fillAnchor() {
  const body = $('fillDetailsBody');
  if (!fillPaneOpen() || !body.clientHeight) return null;
  const top = body.getBoundingClientRect().top;
  for (const element of body.querySelectorAll('[data-fill-grid]')) {
    const item = element.closest('.fill-details-item');
    const box = item.getBoundingClientRect();
    if (box.bottom > top) return { candidate: fillDetailCandidates[Number(element.dataset.fillGrid)]?.candidate, offset: box.top - top, scroll: body.scrollTop };
  }
  return { candidate: null, offset: 0, scroll: body.scrollTop };
}

function restoreFillAnchor(anchor) {
  if (!anchor) return;
  const body = $('fillDetailsBody');
  const index = anchor.candidate ? fillDetailCandidates.findIndex(({ candidate }) => candidate === anchor.candidate) : -1;
  const element = index >= 0 ? body.querySelector(`[data-fill-grid="${index}"]`)?.closest('.fill-details-item') : null;
  if (element) body.scrollTop += element.getBoundingClientRect().top - body.getBoundingClientRect().top - anchor.offset;
  else body.scrollTop = anchor.scroll;
}

let fillContextOpen = false;   // the context of each group shown unfolded
let fillContextCalcOpen = false;   // and, in it, the text of what was compared against (its calculator)
let fillGridData = null;       // what Fill details' grids are drawn from: { contexts, candidates, tab, beats, key, clips }
let fillGridSeen = null;       // which proposals' grids have come near the view (IntersectionObserver)
const fillCalcOpen = new WeakSet();   // the proposals whose 🧮 calculations are shown
const fillClips = new WeakMap();      // proposal -> its fragment, read (a promise): once, however often the list is drawn
const fillGridDrawn = new WeakMap();  // proposal -> its MIDI grid as last drawn: the list drawn again keeps its height
const fillGridFailed = new WeakSet(); // proposals whose fragment could not be read (said in the log once)

const fillGridBox = (element, height) => ({ width: element.clientWidth || 300, height });

/**
 * Fill details' MIDI grids, each fitting its box whole (no scroll): as wide as the panel is now,
 * as tall as it allows. Again when the panel changes width; the fragments read once (`clips`).
 * Those folded away are drawn when they open; a proposal's, once it has come near the view.
 */
function drawFillGrids() {
  const data = fillGridData;
  if (!data || !fillPaneOpen() || activeLoopTab !== data.tab) return;
  for (const element of $('fillDetailsBody').querySelectorAll('[data-fill-context]')) {
    if (!element.clientWidth) continue;
    const { music } = data.contexts[Number(element.dataset.fillContext)];
    try { element.innerHTML = loopMidiGrid(music.layers, { bars: music.bars, beats: music.beats, ...fillGridBox(element, 240) }); }
    catch (error) { element.textContent = `MIDI grid unavailable: ${error.message}`; }
  }
  for (const element of $('fillDetailsBody').querySelectorAll('[data-fill-grid][data-seen]')) drawFillGrid(element);
}

/** One proposal's MIDI grid, its fragment read the first time. */
function drawFillGrid(element) {
  const data = fillGridData;
  if (!data || !element.clientWidth || !fillPaneOpen() || activeLoopTab !== data.tab) return;
  const { candidate } = data.candidates[Number(element.dataset.fillGrid)];
  if (!fillClips.has(candidate)) fillClips.set(candidate, candidateClip(candidate, new Map()));
  void fillClips.get(candidate).then((clip) => {
    if (!element.isConnected || !fillPaneOpen() || activeLoopTab !== data.tab) return;
    element.innerHTML = fillMidiGrid(clip, {
      bars: candidate.loopBars, beats: data.beats, transpose: transposeBetween(clip.key, data.key), drums: candidate.role === 'drums', ...fillGridBox(element, 180),
    });
    element.removeAttribute('role');
    fillGridDrawn.set(candidate, element.innerHTML);
  }).catch((error) => {
    if (!element.isConnected || !fillPaneOpen() || activeLoopTab !== data.tab) return;
    element.textContent = `MIDI grid unavailable: ${error.message}`;
    element.removeAttribute('role');
    // Said once: the list is drawn again at each change.
    if (fillGridFailed.has(candidate)) return;
    fillGridFailed.add(candidate);
    log.warn(`MIDI grid for ${candidate.instrument} · ${baseName(candidate.path)}: ${error.message}`);
  });
}

/** Is the Fill details tab the one showing? */
function fillPaneOpen() { return !$('pane-fill').hidden; }

// The panel dragged wider or narrower: the grids drawn again to its width (once it stops moving).
{
  let width = 0;
  let timer = 0;
  new ResizeObserver(([entry]) => {
    const now = Math.round(entry.contentRect.width);
    if (!now || now === width) return;
    width = now;
    clearTimeout(timer);
    timer = setTimeout(drawFillGrids, 150);
  }).observe($('pane-fill'));
}

/** The toolbar's Fill details: its tab, on the left. */
function openFillDetails() {
  if (fillPaneOpen()) renderFillDetails();
  else showTab('fill');
}

/**
 * ⇣ To loop in Fill details: an alternative in place of what Fill chose, in the same bars of the
 * same row (for a new instrument, its whole row, its sound that one's), as Fill would have put it:
 * in the loop's key, its notes moved to go with the rest. It becomes the chosen one of its group.
 */
async function takeFillCandidate({ candidate, group }) {
  if (group.arrange) return takeArrangeCandidate({ candidate, group });
  const row = fillGroupRow(group);
  if (!row) throw new Error('That row is no longer in the loop: run ✨ Fill again.');
  group.row = row;
  if (!fillGroupsNow().includes(group)) throw new Error('These details are of another Fill.');
  stopFillListen();
  const clip = await candidateClip(candidate, new Map());
  if (!clip.notes.length) throw new Error('This fragment has no usable notes.');
  if (!loop.rows.includes(row)) throw new Error('That row is no longer in the loop.');
  clip.bars = candidate.loopBars;
  clip.transpose = transposeBetween(clip.key, loop.key);
  clip.adapt = true;
  const fillId = markFillClip(clip, candidate, group.context);
  if (group.added) {
    // The new instrument is this one: its sound and name too.
    Object.assign(row, { program: candidate.program, drums: candidate.role === 'drums', name: candidate.instrument });
    layRow(row, clip, [{ at: 0, from: 0, bars: group.to }], loopBars(loop));
  } else if (!layRowRange(row, clip, group.from, group.to, loopBars(loop))) {
    throw new Error(`Could not put it in bars ${group.from + 1}–${group.to} of ${row.name || 'the row'}.`);
  }
  if (candidate.replacementKey) fillReplacements.add(candidate.replacementKey);
  if (candidate.instrumentKey) fillSuggested.add(candidate.instrumentKey);
  adaptRows([row], group.added ? 0 : group.from, group.added ? Infinity : group.to);
  baselineFill(row, fillId);
  // The chosen one now; the one it replaces goes back among the alternatives, where it was.
  chooseInGroup(group, candidate);
  recordLoop();
  loopPanel.render();
  soundLoop();
  partTable.renderSoon();
  log.ok(`✨ ${candidate.instrument} · ${baseName(candidate.path)} (${Math.round(candidate.score * 100)}%) now ${group.added ? 'the new instrument' : `in bars ${group.from + 1}–${group.to} of ${row.name || 'the row'}`}. ↶ to go back.`);
  openFillDetails();
}

/** What a group of Fill details found, in the order it was ranked: it stays so whichever is put in the loop. */
const fillGroupOrder = (group) => (group.order ??= [group.chosen, ...group.alternatives]);

/** The one of a group now in the loop: the rest its alternatives, the list in the same order. */
function chooseInGroup(group, candidate) {
  const order = fillGroupOrder(group);
  group.chosen = candidate;
  group.alternatives = order.filter((c) => c !== candidate);
}

/** Where a fragment Arrange put sounds now in its row (midi/loop.js slotRuns). */
const arrangeRuns = (group, row = group.row) => slotRuns(row, { places: group.places, length: group.length, start: group.start, bars: group.bars, whole: group.current, total: group.total });

const runsText = (runs) => runs.map(({ at, n }) => (n > 1 ? `${at + 1}–${at + n}` : `${at + 1}`)).join(', ');

function arrangeGroupLabel(group) {
  const runs = arrangeRuns(group);
  return `${group.row?.name || group.chosen.instrument} · ${group.bars}-bar fragment${runs.length ? ` · bars ${runsText(runs)}` : ''}`;
}

/**
 * ⇣ To loop for a fragment Arrange chose: the alternative in every bar where that one sounds,
 * the same bars of it in each (its sections kept), with the feel and level of what was there.
 */
async function takeArrangeCandidate({ candidate, group }) {
  const row = loop.rows.includes(group.row) ? group.row : null;
  const runs = row ? arrangeRuns(group, row) : [];
  if (!runs.length) throw new Error('Those bars no longer hold what Arrange put there (edited or ↶): run Arrange again.');
  stopFillListen();
  const clip = await candidateClip(candidate, new Map());
  if (!clip.notes.length) throw new Error('This fragment has no usable notes.');
  if (!loop.rows.includes(row)) throw new Error('That row is no longer in the loop.');
  Object.assign(clip, { transpose: transposeBetween(clip.key, loop.key), adapt: true, ...group.keep });
  replaceSlot(row, runs, clip, group.bars);
  group.current = clip;
  adaptRows([row], 0, Infinity, { preserveLocked: true });
  chooseInGroup(group, candidate);
  group.label = arrangeGroupLabel(group);
  recordLoop();
  loopPanel.render();
  soundLoop();
  partTable.renderSoon();
  log.ok(`🎼 ${candidate.instrument} · ${baseName(candidate.path)} (${Math.round(candidate.score * 100)}%) now in bars ${runsText(runs)} of ${row.name || 'the row'}. ↶ to go back.`);
  openFillDetails();
}

async function listenFillCandidate(candidate, pane = 'fill') {
  const tab = activeLoopTab;
  const turn = ++listenTurn;
  const clip = await candidateClip(candidate, new Map());
  const stillOpen = pane === 'summary' ? !$('pane-summary').hidden : fillPaneOpen();
  if (turn !== listenTurn || !stillOpen || activeLoopTab !== tab) return;
  if (!clip.notes.length) throw new Error('This fragment has no usable notes.');
  clip.bars = candidate.loopBars;
  const next = {
    id: null, fillReview: true, summaryReview: pane === 'summary', fillCandidate: candidate, clip, alone: true, from: 0, waitUntil: 0,
    program: candidate.program, drums: candidate.role === 'drums',
    transpose: transposeBetween(clip.key, loop.key),
  };
  loopSong({ ...loop, rows: [] }, next);
  endAllFillChains();
  player.stop();
  syncDriven = false;
  loopListen = next;
  soundLoop();
  await startPlaying(0);
}

// ── ▶▶ in Fill details: a group's proposals one after another, put in the loop as they come in ──
//
// The proposals go into the group's row in rank order, changing at each loop boundary and cycling
// back to the first. The pads show each as it sounds (a new instrument: its sound and name too).
// By hand it changes at once, on the next beat (on the bar's grid: in on
// beat 3, it is heard from its beat 3): ⏮ ⏭ the one before or after in the list, ↶ ↷ back and forth
// in what has sounded, ↩★ the one marked ★ (a chorus: after it, on with the one it came in on). ↻
// keeps the one sounding. When stopped, the row is as it was; ⤓ Save chain
// writes what was heard.
// Each fillChains entry is keyed by its Fill details group:
// fillChain: { group, kind ('added' | 'bars' | 'arrange'), row, from, to, saved (the row before),
// savedCurrent, items [{ candidate, clip, bars }] in their order, cur { index, at, start, bars, cut,
// resume } (bars counted from when the loop began to play: in at `at`, laid from bar `start`, its
// pass ending at start + bars), next (the same, already in the row, sounding from
// `at`), trail [indices as they sounded] and pos (where in it), chorus (an index), repeat, heard
// [candidates heard through a loop boundary, in order], tab, begun }.

const chainBarSec = () => (barBeats(loop) * 60) / loop.bpm;
const fillChainDone = new Map();   // Finished chains, kept per group so each can still be saved.
let playAllFillsPending = false;

function focusFillChain(group) {
  fillChainGroup = group ?? null;
  fillChain = group ? fillChains.get(group) ?? null : null;
}

function focusAnotherFillChain() {
  focusFillChain(fillChains.values().next().value?.group ?? null);
}

/** Where the loop is, in bars from when it began to play (its laps counted). */
function chainBarNow() {
  const barSec = chainBarSec();
  const songBars = Math.max(1, Math.round(player.duration / barSec));
  return player.audibleLap * songBars + player.songPosition / barSec;
}

/** Where a change made now comes in (as soundLoop's: the next bar, or beat, past the margin), in bars as chainBarNow; stopped, the first bar. */
function chainNextCut(quantum = 'bar') {
  if (!player.playing) return 0;
  const barSec = chainBarSec();
  const songBars = Math.max(1, Math.round(player.duration / barSec));
  const unit = cutUnit(quantum);
  return player.audibleLap * songBars + (Math.ceil((player.songPosition + LIVE_MARGIN) / unit - 1e-9) * unit) / barSec;
}

/** Proposal `item` in the row, as ⇣ puts it (a new instrument: its first bar on bar `start`, round the loop). */
function layChainItem(c, item, start) {
  const row = c.row;
  const L = loopBars(loop);
  const clip = { ...item.clip, notes: item.clip.notes.map((n) => ({ ...n })), bars: item.bars, transpose: transposeBetween(item.clip.key, loop.key), adapt: true };
  if (c.kind === 'added') {
    Object.assign(row, { program: item.candidate.program, drums: item.candidate.role === 'drums', name: item.candidate.instrument });
    const s = ((start % L) + L) % L;
    layRow(row, clip, s ? [{ at: s, from: 0, bars: L - s }, { at: 0, from: L - s, bars: s }] : [{ at: 0, from: 0, bars: L }], L);
  } else if (c.kind === 'arrange') {
    const runs = arrangeRuns(c.group, row);
    Object.assign(clip, c.group.keep);
    if (runs.length) replaceSlot(row, runs, clip, c.group.bars);
    c.group.current = clip;   // (where it sounds now, for the next one)
  } else layRowRange(row, clip, c.from, c.to, L);
  adaptRows([row], c.kind === 'bars' ? c.from : 0, c.kind === 'bars' ? c.to : Infinity, { preserveLocked: true });
  noteChainLaid(c);
}

/** The row as it was before ▶▶ (its sound and name too). */
function restoreChainRow(c) {
  const { row, saved } = c;
  Object.assign(row, { program: saved.program, drums: saved.drums, name: saved.name, sound: saved.sound, clips: new Map(saved.clips), off: [...saved.off] });
  if (c.kind === 'arrange') c.group.current = c.savedCurrent;
  noteChainLaid(c);
}

/** The row's pads as ▶▶ last laid them: what tells a change by hand. */
function noteChainLaid(c) {
  c.laid = new Map(c.row.clips);
  c.laidOff = c.row.off.join(',');
}

/**
 * A ▶▶ playlist's row changed by hand (its pads edited, pasted, cleared, a part dropped on it…),
 * or taken out: the playlist stops there, and the row keeps what it had with that change: it is
 * yours now. Before each step goes to the undo history (recordLoop).
 */
function adoptEditedChainRow() {
  let changed = false;
  for (const [group, c] of [...fillChains]) {
    if (!c.laid) continue;
    const row = c.row;
    const same = loop.rows.includes(row) && row.clips.size === c.laid.size
      && [...row.clips].every(([bar, clip]) => c.laid.get(bar) === clip) && row.off.join(',') === c.laidOff;
    if (same) continue;
    fillChains.delete(group);
    if (c.heard.length) fillChainDone.set(group, c);
    if (fillChain === c) focusAnotherFillChain();
    changed = true;
    log.log(`▶▶ Stopped: ${row.name || 'its row'} was changed by hand, so it keeps what was in it with your change.`);
  }
  if (changed) paintFillChain();
}

/**
 * Proposal `index` into the row now, sounding from `at` (the
 * pads show it then): on the next bar, or with `quantum` 'beat' the next beat (laid from the bar
 * that beat is in, so it keeps to the bar). `nav`: where in the trail it is (↶ ↷); `resume`:
 * what comes after it (after ↩★).
 */
function chainSwitch(c, index, at, { quantum = 'bar', nav = null, resume, deferSound = false, byHand = false } = {}) {
  const item = c.items[index];
  const start = Math.floor(at + 1e-9);
  layChainItem(c, item, start);
  c.next = { index, at, start, bars: fillChainPass(loopBars(loop), start), nav, resume, byHand };
  if (!deferSound) {
    soundLoop({ quantum, changedRows: [c.row], cutAt: at });
    paintFillChain();
  }
}

async function readFillChainItems(group) {
  const read = await Promise.all(fillGroupOrder(group).map(async (candidate) => {
    try {
      if (!fillClips.has(candidate)) fillClips.set(candidate, candidateClip(candidate, new Map()));
      const clip = await fillClips.get(candidate);
      return clip.notes.length ? { candidate, clip, bars: Math.max(1, candidate.loopBars || clip.bars) } : null;
    } catch (error) {
      log.warn(`▶▶ Could not read ${candidate.instrument || 'a proposal'}: ${error.message}`);
      return null;
    }
  }));
  const items = read.filter(Boolean);
  if (!items.length) throw new Error('None of these proposals could be read.');
  return items;
}

/**
 * A Fill results group's row in the loop: its own; after ↶ (rows made anew) the one in its place
 * if it is the same instrument; for drums, the loop's drums row (there is only one). Null when the
 * loop has none of these (its row was deleted).
 */
function fillGroupRow(group) {
  return fillReviewRow(group, loop.rows, fillGroupsNow(), fillGroupOrder);
}

/** A deleted row stays deleted for ▶▶ play all: it never puts instruments in the loop (that is Summary's ＋ Add, or ✨ Fill). */
const ROW_GONE = 'Its row was deleted from the loop: ▶▶ in its own tab of Fill results brings it back.';

/**
 * ▶▶ of one Fill result (in its tab) whose row was deleted: pressed on it, you want to hear it, so
 * its instrument comes back: the row's sound and name as they were (or, not known, its chosen
 * proposal's) and what was chosen in its bars. One step for ↶. (▶▶ play all never does this.)
 */
function remakeFillRow(group, items) {
  const lost = group.row;
  const chosen = items.find((item) => item.candidate === group.chosen) ?? items[0];
  const c = chosen.candidate;
  const row = addRow(loop, lost ?? { program: c.program, drums: c.role === 'drums', name: c.instrument });
  if (!row) throw new Error('No channel is left in the loop for it: remove a row first.');
  if (lost) Object.assign(row, { sound: lost.sound, volume: lost.volume ?? row.volume });
  if (group.arrange) {
    // Arrange's fragment back where it sounded, so the playlist finds its bars (arrangeRuns).
    replaceSlot(row, placeRuns({ places: group.places, length: group.length, start: group.start, bars: group.bars, total: group.total }), group.current, group.bars);
    adaptRows([row], 0, Infinity, { preserveLocked: true });
  } else {
    const L = loopBars(loop);
    layChainItem({ kind: group.added ? 'added' : 'bars', row, group, from: group.from ?? 0, to: Math.min(L, group.to ?? L) }, chosen, 0);
  }
  group.row = row;
  recordLoop();
  loopPanel.render();
  log.log(`▶▶ ${row.name || 'Its instrument'} back in the loop for its playlist (↶ takes it out).`);
  return row;
}

function createFillChain(group, items, tab) {
  const row = fillGroupRow(group);
  if (!row) throw new Error(ROW_GONE);
  const sameRow = [...fillChains.values()].find((chain) => chain.row === row);
  if (sameRow) endFillChain({ quiet: true, group: sameRow.group });
  group.row = row;
  const kind = group.arrange ? 'arrange' : group.added ? 'added' : 'bars';
  if (kind === 'arrange' && !arrangeRuns(group, row).length) throw new Error('Those bars no longer hold what Arrange put there (edited or ↶): run Arrange again.');
  fillChainDone.delete(group);
  const c = {
    group, kind, row, from: group.from ?? 0, to: Math.min(loopBars(loop), group.to ?? loopBars(loop)),
    saved: { clips: new Map(row.clips), off: [...row.off], program: row.program, drums: row.drums, name: row.name, sound: row.sound },
    savedCurrent: group.current, items, cur: null, next: null, trail: [], pos: -1, chorus: null, repeat: false, heard: [], tab, begun: false,
  };
  fillChains.set(group, c);
  focusFillChain(group);
  return c;
}

/** ▶▶: a group's proposals, in their order, one after another into its row while the loop plays (stopped, it starts). */
async function startFillChain(group) {
  if (!loopMode) return;
  const locked = fillGroupRow(group);
  if (locked?.locked) throw new Error(`🔒 ${locked.name || 'Its row'} is locked: unlock it to play Fill's proposals into it.`);
  if (loopListen?.fillReview) stopFillListen();
  if (loopListen?.alone) { player.stop(); loopListen = null; soundLoop(); }
  const tab = activeLoopTab;
  const turn = ++listenTurn;
  const items = await readFillChainItems(group);
  if (turn !== listenTurn || activeLoopTab !== tab || !loopMode || !fillGroupsNow().includes(group)) return;
  if (!fillGroupRow(group)) remakeFillRow(group, items);   // its row deleted: pressed here, it comes back
  const c = createFillChain(group, items, tab);
  const wasPlaying = player.playing;
  chainSwitch(c, 0, chainNextCut('bar'));
  if (!wasPlaying) {
    loopPanel.render();
    await startPlaying(0);
  }
  log.log(`▶▶ ${items.length} proposal${items.length === 1 ? '' : 's'} one after another into ${c.saved.name || 'the row'}, returning to the first after the last: ⏮ ⏭ ↶ ↷ change it on the next beat, ★ marks a chorus and ↩★ goes back to it, ⤓ Save chain keeps what you heard. ■ in the toolbar keeps the one playing; ■ on its strip puts the row back as it was.`);
}

/** What ▶▶ play all starts: only into rows of the loop (a deleted one stays deleted), not locked ones (🔒: Fill leaves them as they are). */
function playAllFillGroups() {
  // (A result of several instruments is played by instrument, from their tabs: never one row changing instrument.)
  return playableFillGroups(fillGroupsNow().filter((group) => !group.instruments && !fillGroupRow(group)?.locked), fillGroupRow, fillChains, fillGroupOrder);
}

/** Fill results whose row was deleted, not played by ▶▶: said once per press. */
function logGoneFillRows() {
  const gone = fillGroupsNow().filter((group) => !fillGroupRow(group) && fillGroupOrder(group).length >= 2);
  if (gone.length) log.log(`▶▶ Not played, their row was deleted (▶▶ in its own tab of Fill results brings it back): ${[...new Set(gone.map((group) => group.label))].join(', ')}.`);
}

/** The playlists playing that ▶▶ moves on: those of rows not locked. */
const steppableFillChains = () => (loopMode ? [...fillChains.values()].filter((c) => !c.row.locked) : []);

function paintPlayAllFills() {
  const button = $('playAllFills');
  const stepping = steppableFillChains().length;
  button.disabled = playAllFillsPending || !loopMode || (!stepping && !playAllFillGroups().length);
  button.title = stepping
    ? `Every Fill playlist playing (${stepping}) on to its next proposal, on the next pad (from its first beat, whole): as ⏭ on each (not those of 🔒 locked rows)`
    : 'Play all available Fill playlists in the current loop together (not into 🔒 locked rows)';
}

async function startAllFillChains() {
  const groups = playAllFillGroups();
  if (!groups.length) return;
  if (loopListen?.fillReview) stopFillListen();
  if (loopListen?.alone) { player.stop(); loopListen = null; soundLoop(); }
  const tab = activeLoopTab;
  const turn = ++listenTurn;
  const results = await Promise.allSettled(groups.map(readFillChainItems));
  if (turn !== listenTurn || activeLoopTab !== tab || !loopMode) return;
  const available = new Set(playAllFillGroups());
  const chains = [];
  logGoneFillRows();
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i], result = results[i];
    if (!available.has(group)) continue;
    if (result.status === 'rejected') {
      log.fail(`▶▶ ${group.label}: ${result.reason.message}`);
      continue;
    }
    // One playlist per row (two results can find the same one: the drums row, or one put back by ↶).
    if (chains.some((chain) => chain.row === fillGroupRow(group))) continue;
    try {
      chains.push(createFillChain(group, result.value, tab));
    } catch (error) {
      log.fail(`▶▶ ${group.label}: ${error.message}`);
    }
  }
  if (!chains.length) return;
  const wasPlaying = player.playing;
  const cut = chainNextCut('bar');
  for (const chain of chains) chainSwitch(chain, 0, cut, { deferSound: true });
  soundLoop({ changedRows: chains.map((chain) => chain.row), cutAt: cut });
  paintFillChain();
  if (!wasPlaying) {
    loopPanel.render();
    await startPlaying(0);
  }
  log.log(`▶▶ Started ${chains.length} Fill playlist${chains.length === 1 ? '' : 's'} together.`);
}

/** A change by hand: the one sounding cut before the loop boundary. */
function chainCut(c, at) {
  if (c.cur && at < c.cur.start + c.cur.bars - 1e-6) c.cur.cut = true;
}

/** ⏮ / ⏭: the one before or after in the list, on the next beat (`c`: the playlist, the one in focus by default). */
function chainStep(step, c = fillChain, { quantum = 'beat', at = chainNextCut(quantum), deferSound = false } = {}) {
  if (!c || chainLocked(c)) return;
  // From the one sounding; from the one coming in only when a press put it there (pressed twice:
  // two on). The one laid by itself in the last bar of the one sounding has not been heard yet.
  const base = c.next?.byHand || !c.cur ? c.next?.index ?? 0 : c.cur.index;
  const index = stepFillChainIndex(base, step, c.items.length);   // after the last, the first again
  chainCut(c, at);
  chainSwitch(c, index, at, { quantum, deferSound, byHand: true });
}

/**
 * ▶▶ while playlists play: every one on to its next proposal, as ⏭ on each (not those of 🔒 rows),
 * all on the next pad: from its first beat, whole, not cut into the bar sounding.
 */
function stepAllFillChains() {
  const all = [...fillChains.values()];
  const chains = all.filter((c) => !c.row.locked);
  if (all.length > chains.length) log.log(`🔒 ${all.filter((c) => c.row.locked).map((c) => c.row.name || 'Instrument').join(', ')}: locked, as ${all.length - chains.length === 1 ? 'it is' : 'they are'}.`);
  if (!chains.length) return;
  const at = chainNextCut('bar');
  for (const c of chains) chainStep(1, c, { quantum: 'bar', at, deferSound: true });
  soundLoop({ quantum: 'bar', changedRows: chains.map((c) => c.row), cutAt: at });
  paintFillChain();
}

/** ↶ / ↷: back or forth in what has sounded (not the list's order), on the next beat. */
function chainHistory(step) {
  const c = fillChain;
  if (!c || chainLocked(c)) return;
  const pos = (c.next && c.next.nav !== null ? c.next.nav : c.pos) + step;
  if (pos < 0 || pos >= c.trail.length) return;
  const at = chainNextCut('beat');
  chainCut(c, at);
  chainSwitch(c, c.trail[pos], at, { quantum: 'beat', nav: pos });
}

/** ★: the one sounding is the chorus (again: none). */
function chainMarkChorus() {
  const c = fillChain;
  if (!c?.cur) return;
  c.chorus = c.chorus === c.cur.index ? null : c.cur.index;
  paintFillChain();
}

/** ↩★: the chorus on the next beat; after it, on with the one it came in on (or, from the chorus itself, the next in the list). */
function chainToChorus() {
  const c = fillChain;
  if (!c || c.chorus === null || chainLocked(c)) return;
  const from = c.next ?? c.cur;
  const resume = !from ? c.chorus + 1 : from.index === c.chorus ? from.resume ?? from.index + 1 : from.index;
  const at = chainNextCut('beat');
  chainCut(c, at);
  chainSwitch(c, c.chorus, at, { quantum: 'beat', resume });
}

/** A proposal clicked in the list while ▶▶ plays: it comes in on the next pad (bar), and the chain goes on from there. */
function chainJumpTo(candidate) {
  const c = fillChain;
  if (!c || chainLocked(c)) return;
  const index = c.items.findIndex((item) => item.candidate === candidate);
  if (index < 0) return;
  const at = chainNextCut('bar');
  chainCut(c, at);
  chainSwitch(c, index, at, { quantum: 'bar' });
}

/** ↻: the one sounding again and again (it stays in the row); again, on to the next after it. */
function chainRepeat() {
  const c = fillChain;
  if (!c?.cur) return;
  c.repeat = !c.repeat;
  if (c.repeat && c.next) holdChainItem(c);
  paintFillChain();
}

/** The next was already in the row (the last bar of the one sounding): the one sounding back in it, as it was. */
function holdChainItem(c) {
  layChainItem(c, c.items[c.cur.index], c.cur.start);
  c.next = null;
  soundLoop({ changedRows: [c.row] });
  loopPanel.render();
}

/**
 * A playlist whose row is locked (🔒: Fill leaves it as it is): its pads stay as they sound, so a
 * press that would change them does nothing and says so. True when locked.
 */
function chainLocked(c) {
  if (!c?.row.locked) return false;
  log.warn(`🔒 ${c.row.name || 'This row'} is locked: its pads stay as they are. Unlock it to change its proposals.`);
  return true;
}

/** ▶▶ stopped (■, another tab, ⇣…): the row as it was, now. What was heard can still be saved. */
function endFillChain({ quiet = false, group = fillChainGroup, refresh = true } = {}) {
  const c = group ? fillChains.get(group) : null;
  if (!c) { if (refresh) paintFillChain(); return; }
  fillChains.delete(group);
  if (c.heard.length) fillChainDone.set(group, c);
  if (fillChain === c) focusAnotherFillChain();
  restoreChainRow(c);
  if (refresh) {
    loopPanel.render();
    soundLoop({ changedRows: [c.row] });
    paintFillChain();
  }
  if (!quiet) log.log(`▶▶ Stopped: ${c.heard.length} heard to a loop boundary. ${c.saved.name || 'The row'} as it was.`);
}

function endAllFillChains() {
  if (!fillChains.size) return;
  for (const group of [...fillChains.keys()]) endFillChain({ quiet: true, group, refresh: false });
  loopPanel.render();
  soundLoop();
  paintFillChain();
}

/** Each frame: the next one into the row in the last bar of the one sounding, the pads in step with what is heard, what was heard to its end. */
function followFillChain() {
  if (!fillChains.size) return;
  const focus = fillChainGroup;
  const changed = new Set();
  for (const c of [...fillChains.values()]) {
    focusFillChain(c.group);
    if (followOneFillChain(c)) changed.add(c);
  }
  focusFillChain(focus && fillChains.has(focus) ? focus : fillChains.values().next().value?.group ?? null);
  if (changed.size) logFillChainsNow(changed);
}

const CHAIN_LOG_COLUMNS = [{ label: 'Instrument', width: 24 }, { label: 'Song', width: 56 }, { label: 'Bars', num: true, width: 9 }, { label: 'Proposal', num: true, width: 8 }];

/**
 * The pads changed: in the log, a table of the song each ▶▶ playlist row plays now (in the loop's
 * row order), the rows that did not change this time greyed.
 */
function logFillChainsNow(changed) {
  const playing = inRowOrder([...fillChains.values()].filter((c) => c.cur && loop.rows.includes(c.row)));
  if (!playing.length) return;
  log.table('♪ Now playing', CHAIN_LOG_COLUMNS, playing.map((c) => ({ cells: chainNowCells(c), dim: !changed.has(c) })));
}

/** Playlists in the order of their rows in the loop. */
const inRowOrder = (chains) => chains.sort((a, b) => loop.rows.indexOf(a.row) - loop.rows.indexOf(b.row));

/** A playlist's line in the log's tables (CHAIN_LOG_COLUMNS): its row, the song and bars sounding, which of the list. */
function chainNowCells(c) {
  const { candidate } = c.items[c.cur.index];
  const first = candidate.loopStart, n = candidate.loopBars;
  const bars = Number.isFinite(first) && n > 0 ? (n > 1 ? `${first}–${first + n - 1}` : `${first}`) : '';
  return [c.row.name || candidate.instrument || 'Row', baseName(candidate.path), bars, `${c.cur.index + 1}/${c.items.length}`];
}

/**
 * ■ with ▶▶ playlists playing: each row keeps the proposal sounding now, what you were hearing
 * (not the row as it was before ▶▶), so ▶ again plays the same. One step for ↶, which brings the
 * rows back as they were. A playlist whose first proposal had not come in yet leaves its row as it was.
 */
function keepAllFillChains() {
  const kept = [];
  for (const [group, c] of [...fillChains]) {
    fillChains.delete(group);
    if (!c.cur || !loop.rows.includes(c.row)) {
      restoreChainRow(c);
      if (c.heard.length) fillChainDone.set(group, c);
      continue;
    }
    // The next may be in the row already (laid in the last bar of the one sounding): the one sounding back in it.
    if (c.next) layChainItem(c, c.items[c.cur.index], c.cur.start);
    c.next = null;
    const { candidate } = c.items[c.cur.index];
    c.heard.push(candidate);   // (⤓ Save chain: heard, up to the one kept)
    fillChainDone.set(group, c);
    chooseInGroup(group, candidate);   // Fill results: the one in the loop now
    if (group.arrange) group.label = arrangeGroupLabel(group);
    kept.push(c);
  }
  focusAnotherFillChain();
  loopPanel.render();
  paintFillChain();
  if (!kept.length) return;
  recordLoop();
  log.table('■ Kept what was playing (↶ brings the rows back as they were before ▶▶)', CHAIN_LOG_COLUMNS, inRowOrder(kept).map((c) => ({ cells: chainNowCells(c) })));
}

/** One ▶▶ playlist followed this frame; true when its row's pads changed to the next proposal. */
function followOneFillChain(c) {
  if (!loopMode || activeLoopTab !== c.tab) { endFillChain({ quiet: true, group: c.group }); return; }
  if (!player.playing) return;
  const bar = chainBarNow();
  // Followed from when the playhead is in its first bar: the player, starting, may say for a
  // moment it is at the song's end (it comes round to 0 at once).
  if (!c.begun) {
    const first = c.next ?? c.cur;
    if (!first || bar < first.at - 1e-6 || bar >= first.at + 1) return;
    c.begun = true;
  }
  let changed = false;
  // 🔒 locked while it plays: the row stays as it sounds now, what was laid to come in taken back.
  if (c.row.locked && c.next && c.cur) holdChainItem(c);
  // What was laid comes in: the pads show it now, as it sounds.
  if (c.next && bar >= c.next.at - 1e-6) {
    if (c.cur && !c.cur.cut) c.heard.push(c.items[c.cur.index].candidate);
    // What has sounded, for ↶ ↷: a new one after where it was (what was ahead of it forgotten, as a browser's).
    if (c.next.nav !== null) c.pos = c.next.nav;
    else {
      c.trail = [...c.trail.slice(0, c.pos + 1), c.next.index];
      c.pos = c.trail.length - 1;
    }
    c.cur = c.next;
    c.next = null;
    loopPanel.render();
    paintFillChain(true);
    changed = true;
  }
  if (!c.cur || c.next) return changed;
  const end = c.cur.start + c.cur.bars;
  if (c.repeat || c.row.locked) {
    // ↻ (or 🔒): the same again (it goes on in the row): heard once more each time it comes round.
    if (bar >= end - 1e-6) {
      c.heard.push(c.items[c.cur.index].candidate);
      c.cur = { ...c.cur, at: end, start: end, bars: fillChainPass(loopBars(loop), end), cut: false };
      paintFillChain();
    }
    return changed;
  }
  // Its last bar: the next one into the row now, to come in where this one ends (after the chorus, the one it came in on).
  if (bar >= end - 1 - 1e-6) {
    chainSwitch(c, nextFillChainIndex(c.cur, c.items.length), end);
  }
  return changed;
}

/** The groups of Fill details now (those of the loop open): what Fill or Arrange found for each. */
const fillGroupsNow = () => (loopMode ? fillReviewGroups(activeLoopTab) : []);
const displayedFillGroups = () => (loopMode
  ? activeLoopTab?.selectedFillTab ? [activeLoopTab.selectedFillTab.group] : activeLoopTab?.fillReview ?? null
  : null);

/** The grouped "Fill results" tab with several results: shown as a table of them (each opens in a tab of its own). */
const fillResultsAsTable = () => loopMode && !activeLoopTab?.selectedFillTab && (activeLoopTab?.fillReview?.length ?? 0) > 1;

/** A result's tab of its own (its fragments listed, its ▶▶): the one it has, or a new one, not opened. */
function ensureGroupTab(group) {
  const tabs = activeLoopTab?.fillReviewTabs;
  if (!tabs) return null;
  let tab = tabs.find((t) => t.group === group);
  if (!tab) { tab = { group }; tabs.push(tab); }
  return tab;
}

/** One of the grouped results in its tab, opened (☰ List). */
function openGroupTab(group) {
  const tab = ensureGroupTab(group);
  if (!tab) return;
  selectFillReviewTab(tab);
  tab.element?.firstElementChild?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

/** ＋ Add on a grouped result whose row was deleted: its instrument back in the loop (as its own ▶▶ would), in on the next bar. */
async function addGroupBack(group) {
  if (fillGroupRow(group)) return;
  const items = await readFillChainItems(group);
  if (!loopMode || fillGroupRow(group) || !fillGroupsNow().includes(group)) return;
  const row = remakeFillRow(group, items);
  soundLoop(player.playing ? { quantum: 'bar', changedRows: [row] } : {});
  ensureGroupTab(group);   // its tab made, not opened: Fill results stays in sight (☰ List opens it)
  paintFillDetails();
}

/** The group whose playlist is controlled by the visible selector. */
function chainGroupNow() {
  const groups = fillPaneOpen() ? displayedFillGroups() ?? [] : fillGroupsNow();
  if (fillPaneOpen()) {
    const selected = groups[Number($('chainGroup').value)];
    if (selected) return selected;
  }
  if (fillChainGroup && groups.includes(fillChainGroup)) return fillChainGroup;
  return [...fillChains.values()][0]?.group ?? groups[0] ?? null;
}

/** The ▶▶ bar, fixed over Fill details' list: its buttons wired once. */
function wireFillChainBar() {
  $('chainPlay').onclick = (e) => {
    const group = chainGroupNow();
    if (!group) return;
    focusFillChain(group);
    if (fillChains.has(group)) { endFillChain({ group }); return; }
    // (act enables its button again when done: the bar painted as the chain is, after it.)
    if (group) void act(e.currentTarget, '▶▶ Fill proposals in the loop', () => startFillChain(group), false).then(() => paintFillChain());
  };
  $('chainPrev').onclick = () => { focusFillChain(chainGroupNow()); chainStep(-1); };
  $('chainNext').onclick = () => { focusFillChain(chainGroupNow()); chainStep(1); };
  $('chainBack').onclick = () => { focusFillChain(chainGroupNow()); chainHistory(-1); };
  $('chainFwd').onclick = () => { focusFillChain(chainGroupNow()); chainHistory(1); };
  $('chainRepeat').onclick = () => { focusFillChain(chainGroupNow()); chainRepeat(); };
  $('chainMark').onclick = () => { focusFillChain(chainGroupNow()); chainMarkChorus(); };
  $('chainChorus').onclick = () => { focusFillChain(chainGroupNow()); chainToChorus(); };
  $('chainSave').onclick = (e) => {
    const group = chainGroupNow();
    if (group) void act(e.currentTarget, '⤓ Save chain', () => saveFillChain(group), false).then(() => paintFillChain());
  };
  $('chainGroup').onchange = () => { focusFillChain(chainGroupNow()); paintFillChain(); };
  // ▶▶ playing: a proposal clicked (not on its buttons, its calculations) comes in on the next pad.
  $('fillDetailsBody').addEventListener('click', (e) => {
    const group = chainGroupNow();
    focusFillChain(group);
    if (!fillChain || e.target.closest('button, a, input, select, summary, .fill-calc-box')) return;
    const item = e.target.closest('.fill-details-item');
    const at = Number(item?.querySelector('[data-fill-grid]')?.dataset.fillGrid);
    const x = Number.isInteger(at) ? fillDetailCandidates[at] : null;
    if (x && x.group === fillChain.group) chainJumpTo(x.candidate);
  });
}

/**
 * A separate strip over the tabs for each active playlist, with its own controls.
 */
function paintChainStrip() {
  const groups = fillGroupsNow();
  const active = [...fillChains.values()].filter((c) => groups.includes(c.group));
  const strip = $('chainStrip');
  strip.hidden = !active.length;
  if (strip.hidden) return;
  const elements = new Set(active.map((c) => c.stripElement).filter(Boolean));
  for (const row of strip.children) if (!elements.has(row)) row.remove();
  for (const c of active) {
    if (!c.stripElement) {
      c.stripElement = $('chainStripTemplate').content.firstElementChild.cloneNode(true);
      const actions = {
        prev: () => chainStep(-1), next: () => chainStep(1),
        back: () => chainHistory(-1), fwd: () => chainHistory(1),
        repeat: () => chainRepeat(), mark: () => chainMarkChorus(),
        chorus: () => chainToChorus(), stop: () => endFillChain({ group: c.group }),
        save: (button) => void act(button, '⤓ Save chain', () => saveFillChain(c.group), false).then(() => paintFillChain()),
      };
      wirePlaylistControls(c.stripElement, c.group, focusFillChain, actions);
    }
    if (c.stripElement.parentElement !== strip) strip.append(c.stripElement);
    const now = c.cur;
    const chorus = c.chorus;
    const text = c.stripElement.querySelector('.chain-strip-text');
    // 🔒 its row locked: it stays on the one sounding, nothing changes it.
    const locked = !!c.row.locked;
    // The drawing of the instrument sounding now (before one comes in, the row's).
    const playing = now ? c.items[now.index].candidate : null;
    const icon = playing ? instrumentSvg(playing.role === 'drums', playing.program) : instrumentSvg(c.row.drums, c.row.program);
    let iconBox = c.stripElement.querySelector('.chain-strip-icon');
    if (!iconBox) {
      iconBox = Object.assign(document.createElement('span'), { className: 'chain-strip-icon' });
      iconBox.setAttribute('aria-hidden', 'true');
      text.before(iconBox);
    }
    if (iconBox.dataset.icon !== icon) { iconBox.innerHTML = icon; iconBox.dataset.icon = icon; }
    text.textContent = `▶▶ ${c.saved.name || 'Row'}: ${now ? `${now.index + 1}/${c.items.length} · ${c.items[now.index].candidate.instrument}${now.index === chorus ? ' ★' : ''}` : 'coming in…'}${c.repeat ? ' · ↻' : ''}${locked ? ' · 🔒' : ''}`;
    text.title = `${c.saved.name || 'Row'} · heard ${c.heard.length}${chorus !== null ? ` · chorus ${chorus + 1}` : ''}${locked ? ' · locked: it stays on this one (unlock the row to go on)' : ''}`;
    const pos = c.next && c.next.nav !== null ? c.next.nav : c.pos;
    const button = (name) => c.stripElement.querySelector(`[data-chain-act="${name}"]`);
    button('prev').disabled = button('next').disabled = locked;
    button('back').disabled = locked || pos <= 0;
    button('fwd').disabled = locked || pos >= c.trail.length - 1;
    button('repeat').classList.toggle('on', c.repeat);
    button('mark').classList.toggle('on', chorus !== null && now?.index === chorus);
    button('mark').disabled = !now;
    button('chorus').disabled = locked || chorus === null;
    button('save').disabled = c.group.arrange;
  }
}

/** Fill details' ▶▶ bar and the proposal sounding, as the chain is (`reveal`: that one into view). */
function paintFillChain(reveal = false) {
  paintPlayAllFills();
  loopPanel.paintPlaylists();
  for (const tab of activeLoopTab?.fillReviewTabs ?? []) tab.element?.classList.toggle('playing', fillChains.has(tab.group));
  const groups = displayedFillGroups() ?? [];
  // A table of results: their ▶▶ is in each one's tab (the strips over the tabs control those playing).
  const asTable = fillResultsAsTable();
  $('fillChainBar').hidden = !groups.length || asTable;
  $('chainStatus').hidden = !groups.length || asTable;
  const select = $('chainGroup');
  if (groups.length) {
    const labels = groups.map((group, g) => `${g + 1} · ${group.label}${fillChains.has(group) ? ' · ▶▶' : ''}`);
    if (select.dataset.labels !== labels.join('\n')) {
      const previous = groups.includes(fillChainGroup) ? fillChainGroup : chainGroupNow();
      select.innerHTML = labels.map((label, g) => `<option value="${g}">${esc(label)} · ${fillGroupOrder(groups[g]).length}</option>`).join('');
      select.value = String(Math.max(0, groups.indexOf(previous)));
      select.dataset.labels = labels.join('\n');
    }
    select.hidden = groups.length < 2;
  }
  const group = chainGroupNow();
  focusFillChain(group);
  paintChainStrip();
  if (!fillPaneOpen() || !groups.length || asTable) return;
  const on = !!fillChain;
  const sounding = on ? fillChain.cur : null;
  const play = $('chainPlay');
  play.textContent = on ? '■' : '▶▶';
  play.classList.toggle('on', on);
  play.disabled = !on && (fillGroupOrder(group).length < 2 || !!group.instruments);
  play.title = on ? 'Stop: the row as it was'
    : group.instruments ? '▶▶ is in each instrument\'s tab: click an instrument in the table to open it'
    : `▶▶ The ${fillGroupOrder(group).length} proposals for ${group.row?.name || 'its row'} change at each loop boundary, returning to the first after the last`;
  select.disabled = false;
  for (const id of ['chainPrev', 'chainNext', 'chainRepeat', 'chainMark']) $(id).disabled = !on;
  // 🔒 its row locked: it stays on the one sounding.
  const locked = on && !!fillChain.row.locked;
  if (locked) $('chainPrev').disabled = $('chainNext').disabled = true;
  $('chainRepeat').classList.toggle('on', on && fillChain.repeat);
  // ↶ ↷: whether there is something to go back or forth to in what has sounded.
  const pos = on ? (fillChain.next && fillChain.next.nav !== null ? fillChain.next.nav : fillChain.pos) : -1;
  $('chainBack').disabled = !on || locked || pos <= 0;
  $('chainFwd').disabled = !on || locked || pos >= fillChain.trail.length - 1;
  // ★ lit while the chorus sounds; ↩★ once there is one.
  const chorus = on ? fillChain.chorus : null;
  $('chainMark').classList.toggle('on', on && chorus !== null && sounding?.index === chorus);
  $('chainMark').title = on && chorus !== null ? `The chorus: ${chorus + 1} · ${fillChain.items[chorus].candidate.instrument}. Press it on another one to mark that one instead; on this one, to unmark it` : 'Mark the one playing as the chorus (again: unmark it)';
  $('chainChorus').disabled = !on || locked || chorus === null;
  const save = $('chainSave');
  const completed = fillChainDone.get(group);
  const done = !on && completed?.tab === activeLoopTab;
  save.disabled = group.arrange || (!on && !done);
  save.textContent = done ? `⤓ Save chain (${completed.heard.length})` : '⤓ Save chain';
  save.title = group.arrange ? 'After Arrange the chain is heard, not saved: put one in with ⇣'
    : `Save the chain: proposals heard through a loop boundary, in order, and the one playing, one after another using their original lengths ${group.added ? 'over the whole loop, each phrase with its own sound' : `in bars ${group.from + 1}–${group.to} of ${group.row?.name || 'its row'}`}, cut at the end (↶ to undo)`;
  $('chainStatus').textContent = on
    ? `▶▶ ${sounding ? `${sounding.index + 1}/${fillChain.items.length} · ${fillChain.items[sounding.index].candidate.instrument}${sounding.index === chorus ? ' ★' : ''}` : 'coming in…'}${fillChain.repeat ? ' · ↻ again' : ''}${chorus !== null && sounding?.index !== chorus ? ` · ★ ${chorus + 1}` : ''} · heard ${fillChain.heard.length}`
    : done ? `▶▶ stopped · ${completed.heard.length} heard: ⤓ Save chain keeps them`
    : group.instruments ? '▶▶ is in each instrument\'s tab: click an instrument below to open it'
    : `▶▶ plays the ${fillGroupOrder(group).length} proposals${groups.length > 1 ? ` of ${group.label}` : ''} one after another into the loop`;
  // The list: clickable while ▶▶ plays; the one sounding lit, the one coming in on the next pad dashed.
  $('fillDetailsBody').classList.toggle('chain-on', on);
  for (const el of $('fillDetailsBody').querySelectorAll('.fill-details-item.chain-now, .fill-details-item.chain-next')) el.classList.remove('chain-now', 'chain-next');
  const itemOf = (index) => {
    const candidate = fillChain.items[index].candidate;
    const at = fillDetailCandidates.findIndex((x) => x.candidate === candidate && x.group === fillChain.group);
    return at >= 0 ? $('fillDetailsBody').querySelector(`[data-fill-grid="${at}"]`)?.closest('.fill-details-item') : null;
  };
  const coming = on && fillChain.next && fillChain.next.index !== sounding?.index ? itemOf(fillChain.next.index) : null;
  coming?.classList.add('chain-next');
  if (!sounding) return;
  const item = itemOf(sounding.index);
  if (!item) return;
  item.classList.add('chain-now');
  if (reveal) item.scrollIntoView({ block: 'nearest' });
}

/**
 * ⤓ Save chain: what was heard (each proposal heard through a loop boundary, in order, and the one
 * sounding) one after another in the loop, cut at the end of its bars: a new instrument over the
 * whole loop, each phrase with its own sound (the row Fill added takes the first's, the others
 * a row each); pads chosen, in those bars of their row, with its sound. ↶ undoes it.
 */
async function saveFillChain(group) {
  // The chain sounding, or the last one heard through a loop boundary.
  const c = fillChains.get(group) ?? (fillChainDone.get(group)?.tab === activeLoopTab ? fillChainDone.get(group) : null);
  if (!c) throw new Error('Press ▶▶ and listen first: the chain is what you hear.');
  if (group.arrange) throw new Error('A chain is saved for ✨ Fill: after Arrange, put one in with ⇣.');
  const now = fillChains.get(group) === c && c.cur ? c.items[c.cur.index].candidate : null;
  fillChainDone.delete(group);
  const phrases = [...c.heard, ...(now ? [now] : [])];
  if (!phrases.length) throw new Error('Nothing heard yet.');
  const row = c.row && loop.rows.includes(c.row) ? c.row : null;
  if (!row) throw new Error('That row is no longer in the loop: run ✨ Fill again.');
  const itemOf = new Map(c.items.map((item) => [item.candidate, item]));
  endFillChain({ quiet: true, group });   // (the row as it was, first: the chain is written over that)
  fillChainDone.delete(group);   // (saved: nothing left to save)
  const total = loopBars(loop);
  const from = group.added ? 0 : group.from;
  const to = group.added ? total : Math.min(total, group.to);
  // A new instrument: each phrase with its sound, a row each (the first in the row Fill added).
  const rowOf = new Map();
  const keyOf = (candidate) => (candidate.role === 'drums' ? 'drums' : `p${candidate.program}`);
  let skipped = 0;
  const target = (candidate) => {
    if (!group.added) return row;
    const key = keyOf(candidate);
    if (rowOf.has(key)) return rowOf.get(key);
    let r;
    if (!rowOf.size) {
      r = row;
      Object.assign(r, { program: candidate.program, drums: candidate.role === 'drums', name: candidate.instrument });
    } else r = addRow(loop, { program: candidate.program, drums: candidate.role === 'drums', name: candidate.instrument });
    rowOf.set(key, r);
    return r;
  };
  clearBars(row, from, to);
  const touched = new Set([row]);
  let at = from;
  let placed = 0, cut = 0, left = 0;
  for (const candidate of phrases) {
    if (at >= to) { left++; continue; }
    const item = itemOf.get(candidate);
    const r = target(candidate);
    if (!r) { skipped++; at += item.bars; continue; }   // (no channel left, or a second drums row)
    const clip = { ...item.clip, notes: item.clip.notes.map((n) => ({ ...n })), bars: item.bars, transpose: transposeBetween(item.clip.key, loop.key), adapt: true };
    const fits = Math.min(item.bars, to - at);
    placeClip(r, at, fits < item.bars ? cutClip(clip, 0, fits) : clip, total);
    touched.add(r);
    if (fits < item.bars) cut++;
    placed++;
    at += fits;
  }
  adaptRows([...touched], from, to);
  chooseInGroup(group, phrases[0]);   // (✓ on the first of it, in the loop now)
  recordLoop();
  loopPanel.render();
  soundLoop();
  partTable.renderSoon();
  log.ok(`⤓ Chain saved: ${placed} phrase${placed === 1 ? '' : 's'} one after another in bars ${from + 1}–${Math.min(at, to)}${group.added && rowOf.size > 1 ? `, on ${rowOf.size} rows (each with its sound)` : ` of ${row.name || 'the row'}`}${cut ? `, the last cut at bar ${to}` : ''}${left ? `; ${left} more did not fit` : ''}${skipped ? `; ${skipped} left out (no channel for another instrument)` : ''}. ↶ to undo.`);
  const tab = activeLoopTab.fillReviewTabs.find((item) => item.group === group);
  selectFillReviewTab(tab ?? null);
  if (!tab) {
    const index = (displayedFillGroups() ?? []).indexOf(group);
    if (index >= 0) {
      $('chainGroup').value = String(index);
      paintFillChain();
    }
  }
}


function saveFillReview(groups, { individual = false, open = true } = {}) {
  if (!activeLoopTab) return;
  if (individual && groups.length === 1) {
    const tab = { group: groups[0] };
    activeLoopTab.fillReviewTabs.push(tab);
    if (open) {
      selectFillReviewTab(tab);
      tab.element?.firstElementChild?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    } else {
      paintFillTabs();
    }
    return;
  }
  const retained = (activeLoopTab.fillReview ?? []).filter((group) => fillChains.has(group) || fillChainDone.has(group));
  activeLoopTab.fillReview = [...retained, ...groups.filter((group) => !retained.includes(group))];
  activeLoopTab.selectedFillTab = null;
  $('chainGroup').dataset.labels = '';
  if (groups.length) fillChainGroup = groups[0];
  paintFillDetails();
}

/** A row's role: its drums, a bass by its sound, else chords when its notes come together. */
function rowRole(row) {
  if (row.drums) return 'drums';
  if (row.program >= 32 && row.program <= 39) return 'bass';
  const notes = [...row.clips.values()].flatMap((c) => c.notes);
  const starts = new Map();
  for (const n of notes) starts.set(Math.round(n.beat * 48), (starts.get(Math.round(n.beat * 48)) ?? 0) + 1);
  let together = 0;
  for (const v of starts.values()) if (v > 1) together += v;
  return notes.length && together / notes.length > 0.4 ? 'chords' : 'melody';
}

const turnsOf = new Map();   // "path|ch" -> its drum turns (bars)

/** The drum turns (bars) of a channel of a song (midi/director.js drumTurns). */
async function songTurns(path, ch) {
  const key = `${path}|${ch}`;
  if (!turnsOf.has(key)) {
    const info = await parsedFile(path);
    const notes = extractNotes(info, `ch:${ch}`).notes;
    turnsOf.set(key, { info, bars: drumTurns(notes, { barOf: (t) => noteBar(info, t), barStart: (b) => info.barStartTick(b), ppq: info.ppq, bars: Math.ceil(info.bars) }) });
  }
  return turnsOf.get(key);
}

/**
 * A bar of drums of its own, for the bar before a change: one of the turns of the song the
 * loop's drums come from; else of a drum part of the library that goes with the loop. Null with none.
 */
async function turnClip(drums, of = loop) {
  const [, first] = [...drums.clips].sort((a, b) => a[0] - b[0])[0] ?? [];
  const take = ({ info, bars }, ch, name) => {
    const bar = bars[Math.floor(Math.random() * bars.length)];
    // `turn`: a fill of its own, not one of the row's fragments (Arrange leaves it out).
    return { ...rangeClip(info, ch, { startTick: info.barStartTick(bar), endTick: info.barStartTick(bar + 1) }, name, '', barBeats(of)), src: first?.src, turn: true };
  };
  if (first?.src) {
    try {
      const own = await songTurns(first.src.path, first.src.ch);
      if (own.bars.length) return take(own, first.src.ch, `${first.name} · turn`);
    } catch (error) {
      log.warn(`🎼 Could not read drum turns from ${baseName(first.src.path)}: ${error.message}`);
    }
  }
  const target = loopTarget(of);
  const others = catalog.query({ role: 'drums', ts: of.timeSig, bpmMin: of.bpm * 0.8, bpmMax: of.bpm * 1.25, limit: 2000 })
    .map((k) => catalog.part(k)).map((p) => ({ p, fit: fitOf(p, target).score ?? 0.5 })).sort((a, b) => b.fit - a.fit).slice(0, 10);
  for (let tries = 0; tries < 4 && others.length; tries++) {
    const { p } = others.splice(Math.floor(Math.random() * others.length), 1)[0];
    try {
      const t = await songTurns(p.path, p.ch);
      if (t.bars.length) return take(t, p.ch, `Drums · ${baseName(p.path)} · turn`);
    } catch { /* unreadable: the next */ }
  }
  return null;
}

/**
 * What a new instrument's dynamics and activity are measured against: the rows that sound (not
 * muted; the solo ones when some are) of its kind, `drums` or those with notes. A part with notes
 * against the drums' hits and velocities would be told to be as busy and as hard as a kit.
 * { dynamics: { mean, spread } | null, notesPerBar: number | null } (null: no row of that kind).
 */
function loopReference(drums, of = loop) {
  const solo = of.rows.some((row) => row.solo && !row.mute);
  const rows = of.rows.filter((row) => !row.mute && (!solo || row.solo) && !!row.drums === drums);
  const velocities = [];
  for (const row of rows) {
    for (const clip of row.clips.values()) {
      for (const note of clip.notes) velocities.push(note.vel * (clip.vel ?? 1) * (row.volume / 100));
    }
  }
  if (!velocities.length) return { dynamics: null, notesPerBar: null };
  const mean = velocities.reduce((sum, value) => sum + value, 0) / velocities.length;
  const variance = velocities.reduce((sum, value) => sum + (value - mean) ** 2, 0) / velocities.length;
  // Notes a bar of each row, on average: two rows of chords are not twice as busy as one.
  return { dynamics: { mean, spread: Math.sqrt(variance) }, notesPerBar: velocities.length / Math.max(1, loopBars(of)) / rows.length };
}

/**
 * A fragment's notes as a fingerprint: where its pitches sound and where it strikes, its length
 * and how many notes. The same notes in two files (a song saved twice under other names, a part
 * copied to another instrument) give the same one: Fill shows them once.
 */
function contentKey(candidate) {
  const g = candidate.summary ? candidate.summary.grid : catalog.grid(candidate.index);
  const h = candidate.summary ? candidate.summary.hits : catalog.hits(candidate.index);
  let x = 0x811c9dc5;
  const mix = (v) => { x = Math.imul(x ^ (v | 0), 0x01000193); };
  mix(candidate.loopBars);
  mix(candidate.notes);
  mix(candidate.role === 'drums' ? 1 : 0);
  if (g) for (const v of g.grid) mix(v);
  if (h) for (let k = 0; k < (h.steps ?? h.hits.length); k++) mix(h.hits[k]);
  return (x >>> 0).toString(36);
}

/** `ranked` (best first) with each fragment's notes once: the best of the same notes stays. */
function withoutRepeats(ranked) {
  const seen = new Set();
  return ranked.filter((candidate) => {
    const key = contentKey(candidate);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function selectedDynamics(row, from, to) {
  return rowsDynamics([row], from, to);
}

/** The dynamics of `rows` in bars [from, to), and their notes a bar (each row's, on average). */
function rowsDynamics(rows, from, to) {
  const perBar = barBeats(loop);
  const velocities = [];
  for (const row of rows) {
    for (const [at, clip] of row.clips) {
      for (const note of clip.notes) {
        const beat = at * perBar + note.beat;
        if (beat < from * perBar || beat >= to * perBar) continue;
        velocities.push(note.vel * (clip.vel ?? 1) * (row.volume / 100));
      }
    }
  }
  if (!velocities.length) return { dynamics: null, notesPerBar: 0 };
  const mean = velocities.reduce((sum, value) => sum + value, 0) / velocities.length;
  const variance = velocities.reduce((sum, value) => sum + (value - mean) ** 2, 0) / velocities.length;
  return { dynamics: { mean, spread: Math.sqrt(variance) }, notesPerBar: velocities.length / (to - from) / Math.max(1, rows.length) };
}

/** The loop without the selected pads; with `keepLocked`, those of 🔒 rows stay (Fill leaves them: the rest must go with them). */
function loopWithoutSelection(selection, from, to, of = loop, { keepLocked = false } = {}) {
  const copy = {
    ...of,
    length: loopBars(of),
    rows: of.rows.map((row) => ({ ...row, clips: new Map(row.clips), off: [...row.off] })),
  };
  for (let r = Math.max(0, selection.r0); r <= Math.min(selection.r1, copy.rows.length - 1); r++) {
    if (!(keepLocked && copy.rows[r].locked)) clearBars(copy.rows[r], from, to);
  }
  return copy;
}

function targetInBars(of, from, to, options = {}) {
  const target = loopTarget(of, options);
  for (const [grid, steps] of [['grid', 'stepsPerBar'], ['hits', 'hitsPerBar']]) {
    if (!target[grid]) continue;
    const slice = target[grid].subarray(Math.round(from * target[steps]), Math.round(to * target[steps]));
    if (slice.some((value) => value)) target[grid] = slice;
    else { delete target[grid]; delete target[steps]; }
  }
  return target;
}

async function fillSelectedBars(daring, selection, source = '') {
  if (!loop.rows.length) throw new Error('Put an instrument in the loop first.');
  const pool = fillPool(source);
  const from = selection.c0 * loopPanel.unit;
  const to = Math.min(loopBars(loop), (selection.c1 + 1) * loopPanel.unit);
  const bars = to - from;
  if (bars <= 0) throw new Error('Select one or more loop pads to replace.');

  // The selection prevails: every selected pad is filled, those without notes too (the length is
  // all of it). Gaps are laid by the pattern buttons (Arrange, Markov…), not by Fill.
  const contextLoop = loopWithoutSelection(selection, from, to, loop, { keepLocked: true });
  const target = targetInBars(contextLoop, from, to);
  const partTargetForFill = target.chords || target.drums || target.bass || target.grid || target.hits ? target : null;
  const lockedRows = [];   // 🔒: Fill leaves them as they are
  const chosenSoFar = [];   // what the rows above take: those below must go with it too
  const haveMask = contextLoop.rows.reduce((mask, row) => {
    const hasNotes = [...row.clips.values()].some((clip) => clip.notes.length);
    return hasNotes ? mask | ROLE_BIT[rowRole(row)] : mask;
  }, 0);
  const model = directorModel();
  const fragmentCache = new Map();
  const targetRows = [];
  const skippedRows = [];
  const rowsSnapshot = fillRowsSnapshot(loop.rows);
  const barsText = (a, b) => (b - a > 1 ? `${a + 1}–${b}` : `${a + 1}`);

  for (let r = selection.r0; r <= selection.r1; r++) {
    const row = loop.rows[r];
    if (!row) continue;
    if (row.locked) { lockedRows.push(row); continue; }
    const stats = selectedDynamics(row, from, to);
    const context = { bars, dynamics: stats.dynamics, notesPerBar: stats.notesPerBar, model, haveMask, daring };
    const reviewContext = fillContextSnapshot(partTargetForFill, context, {
      source: `Loop with selected pads removed · note and hit grids from bars ${from + 1}–${to}; chords and grooves from the loop`,
      rows: rowsSnapshot, dynamicsSource: `${row.name || 'selected row'}, selected bars`,
      previous: targetRows.map(({ row: previous }) => previous.name || 'Instrument'),
    });
    const best = new Map();
    const role = rowRole(row);

    for (const fragment of pool) {
      // The row keeps its sound: from the library, the same instrument; from a collection, one of
      // the same role too (a flute's phrase for the piano's melody), as the collection is a choice of yours.
      if (row.drums !== (fragment.role === 'drums')) continue;
      if (!row.drums && fragment.program !== row.program && !(fragment.fav && fragment.role === role)) continue;
      const measured = fitOf(fragment, partTargetForFill);
      if (measured.pass === false) continue;
      const scored = scoreFillCandidate({ ...fragment, fit: measured.score, measured, role: fragment.role }, context);
      if (scored.duration < FILL_MIN_DURATION_FIT || scored.score < FILL_MIN_SCORE) continue;
      scored.fragmentKey = fillFragmentKey(scored);
      scored.replacementKey = `${r}|${row.program}|${from}|${to}|${scored.fragmentKey}`;
      if (scored.score > (best.get(scored.fragmentKey)?.score ?? -1)) best.set(scored.fragmentKey, scored);
    }

    const eligible = [...best.values()];
    const ranked = withoutRepeats(unseenFillFragments(eligible, fillReplacements)
      .sort((a, b) => b.score - a.score));
    if (!ranked.length) {
      const why = eligible.length
        ? 'all suitable fragments for this instrument and pad range have already been tried'
        : 'no suitable fragment of this instrument matches the selected duration and musical context';
      skippedRows.push({ row, why });
      continue;
    }
    const fits = (candidate) => goesWithChosenAt(candidate, chosenSoFar, from, to);
    let chosen = null;
    for (const candidate of ranked) {
      if (!fits(candidate)) continue;
      try {
        const clip = await candidateClip(candidate, fragmentCache);
        if (!clip.notes.length) continue;
        clip.bars = candidate.loopBars;
        clip.transpose = transposeBetween(clip.key, loop.key);
        clip.adapt = true;
        chosen = { row, index: r, candidate, clip, key: candidate.replacementKey };
        break;
      } catch (error) {
        log.warn(`✨ Fill could not use ${baseName(candidate.path)}: ${error.message}`);
      }
    }
    if (!chosen) {
      skippedRows.push({ row, why: 'no suitable fragment goes with those chosen for the other rows, or they could not be read' });
      continue;
    }
    // The alternatives (Fill details shows FILL_SHOWN in all), the row's sound kept: among those
    // nearly as good, other songs before more bars of the same one (its song's already in with the one chosen).
    const songOf = (candidate) => candidate.path.toLowerCase();
    const others = [];
    for (const candidate of ranked) {
      if (candidate !== chosen.candidate && fits(candidate)) others.push(candidate);
      if (others.length === FILL_SHOWN * 8) break;
    }
    chosen.alternatives = diverseTop(others, FILL_SHOWN - 1, songOf, { taken: [songOf(chosen.candidate)] });
    chosen.context = reviewContext;
    chosen.fingerprints = new Map([chosen.candidate, ...chosen.alternatives].map((candidate) =>
      [candidate, fillCandidateSnapshot(candidate, partTargetForFill)]));
    const taken = chosenGrid(chosen.candidate);
    if (taken) chosenSoFar.push({ ...taken, from, to });
    targetRows.push(chosen);
  }

  const skippedText = () => skippedRows.map(({ row, why }) => `${row.name || 'Instrument'} (${why})`).join('; ');
  if (lockedRows.length) log.log(`🔒 ${lockedRows.map((row) => row.name || 'Instrument').join(', ')}: locked, as ${lockedRows.length === 1 ? 'it is' : 'they are'}.`);
  if (!targetRows.length) {
    if (skippedRows.length) log.warn(`✨ Fill did not replace anything: ${skippedText()}. All selected pads were left unchanged.`);
    else if (lockedRows.length) log.warn('✨ Fill did not replace anything: every selected row is locked (🔒). Unlock one to fill it.');
    else log.warn('✨ Fill did not replace anything: the selection contains no instrument rows.');
    return;
  }
  if (targetRows.some(({ index: r, row }) => loop.rows[r] !== row)) {
    log.warn('✨ Fill did not replace anything: the loop changed while fragments were being read. Select the pads again and retry.');
    return;
  }
  for (const item of targetRows) {
    const { row, candidate, clip, key, context } = item;
    item.fillId = markFillClip(clip, candidate, context);
    if (!layRowRange(row, clip, from, to, loopBars(loop))) {
      throw new Error(`Could not replace bars ${from + 1}–${to} of ${row.name || 'the selected instrument'}.`);
    }
    fillReplacements.add(key);
  }
  adaptRows(targetRows.map(({ row }) => row), from, to, { preserveLocked: true });
  for (const { row, fillId } of targetRows) baselineFill(row, fillId);
  recordLoop();
  loopPanel.render();
  soundLoop();
  partTable.renderSoon();
  log.ok(`✨ Filled bars ${from + 1}–${to} (${bars} bar${bars === 1 ? '' : 's'}, every selected pad, empty ones too)${sourceText(source)}. Instrument sounds, loop length, and all unselected bars were preserved.`);
  log.table('✨ Fill', FILL_LOG_COLUMNS, targetRows.map(({ row, candidate }) => ({
    cells: [row.name || candidate.instrument, barsText(from, to), baseName(candidate.path), `${Math.round(candidate.score * 100)}%`],
  })));
  if (skippedRows.length) log.warn(`✨ Fill left these unchanged: ${skippedText()}.`);
  saveFillReview(targetRows.map(({ row, index, candidate, alternatives, context, fingerprints }) => ({
    label: `${row.name || candidate.instrument} · bars ${barsText(from, to)}`,
    chosen: candidate, alternatives, context, fingerprints, row, index, from, to,
  })), { individual: selection.r0 === selection.r1 });
}

const FILL_LOG_COLUMNS = [{ label: 'Instrument', width: 24 }, { label: 'Bars', num: true, width: 9 }, { label: 'Song', width: 56 }, { label: 'Fill', num: true, width: 5 }];

/** With no pad selection Fill adds one new instrument over the unchanged loop length. */
async function fillLoop(daring, selection = null, source = '') {
  if (selection) return fillSelectedBars(daring, selection, source);
  if (!loop.rows.length) throw new Error('Put a part in the loop first: Fill suggests one new instrument that fits it.');
  const pool = fillPool(source);
  const bars = loopBars(loop);
  const haveMask = loop.rows.reduce((mask, row) => mask | ROLE_BIT[rowRole(row)], 0);
  const model = directorModel();
  const existing = new Set(loop.rows.map((row) => row.drums ? 'drums' : `program:${row.program}`));
  partTarget = partsTargetNow();
  // Dynamics and activity against the rows of its kind: a part with notes against those with notes
  // (the drums left out), drums against the drums; none of its kind, not measured.
  const pitchedRef = loopReference(false);
  const drumsRef = loopReference(true);
  const contextOf = (drums) => {
    const ref = drums ? drumsRef : pitchedRef;
    return { bars, dynamics: ref.dynamics, notesPerBar: ref.notesPerBar, model, haveMask, daring };
  };
  const context = contextOf(false);
  const reviewContext = fillContextSnapshot(partTarget, context, {
    source: sessionFit ? sessionFit.text : 'Current loop before adding the instrument',
    rows: fillRowsSnapshot(loop.rows),
    dynamicsSource: 'unmuted rows with notes, the drums left out; a drums fragment is measured against the drums',
  });
  const bestByInstrument = new Map();
  // Every instrument found, as Summary counts them (its fragments that fit, its best kept): the
  // table its Fill results show, each instrument's fragments a tab of its own.
  const found = buildFillSummary((function* scored() {
    for (const fragment of pool) {
      const role = fragment.role;
      if (existing.has(role === 'drums' ? 'drums' : `program:${fragment.program}`)) continue;
      const measured = fitOf(fragment);
      const fit = measured.score;
      if (measured.pass === false) continue;
      const scored = scoreFillCandidate({ ...fragment, fit, measured, role }, contextOf(role === 'drums'));
      if (scored.duration < FILL_MIN_DURATION_FIT) continue;
      scored.instrumentKey = fillInstrumentKey(scored);
      if (scored.score > (bestByInstrument.get(scored.instrumentKey)?.score ?? -1)) bestByInstrument.set(scored.instrumentKey, scored);
      if (scored.score < FILL_MIN_SCORE) continue;
      scored.fragmentKey = fillFragmentKey(scored);
      yield scored;
    }
  })());
  const eligible = [...bestByInstrument.values()].filter((candidate) => candidate.score >= FILL_MIN_SCORE);
  // The same notes once (a song in two files, a part copied to another instrument).
  const ranked = withoutRepeats(unseenFillCandidates(eligible, fillSuggested).sort((a, b) => b.score - a.score));
  const stale = source ? 0 : index.paths.filter((path) => !catalog.current(path)).length;
  if (!ranked.length) {
    if (eligible.length) {
      log.warn(`✨ Fill did not add anything: all ${eligible.length} suitable unused instrument${eligible.length === 1 ? ' has' : 's have'} already been suggested. Start a new loop to reset the suggestions. Existing pads and loop length were left unchanged.`);
      return;
    }
    log.warn(`✨ Fill did not add anything: no unused instrument has a fragment that fills the loop's length (as long, or one that repeats whole) with a suitable musical fit${stale ? ` (${stale} library file${stale === 1 ? ' is' : 's are'} still being analysed)` : ''}. Existing pads and loop length were left unchanged.`);
    return;
  }

  // Those offered (FILL_SHOWN): the best first, then, among those nearly as good, other instrument
  // families before more of one (five rhythm guitars at 91 % tell less than a guitar, a pad, strings…).
  const offered = diverseTop(ranked, FILL_SHOWN, familyOf);
  const fingerprints = new Map(offered.map((candidate) =>
    [candidate, fillCandidateSnapshot(candidate, partTarget)]));
  let added = null;
  let addedRow = null;
  const songs = new Map();
  for (const candidate of offered) {
    let clip;
    try {
      clip = await candidateClip(candidate, songs);
    } catch (error) {
      log.warn(`✨ Fill could not take ${candidate.instrument} from ${baseName(candidate.path)}: ${error.message}`);
      continue;
    }
    if (!clip.notes.length) {
      log.warn(`✨ Fill skipped ${candidate.instrument} from ${baseName(candidate.path)}: the fragment has no usable notes.`);
      continue;
    }
    clip.bars = candidate.loopBars;
    clip.transpose = transposeBetween(clip.key, loop.key);
    clip.adapt = true;
    const row = addRow(loop, { program: candidate.program, drums: candidate.role === 'drums', name: candidate.instrument });
    if (!row) {
      log.warn('✨ Fill did not add anything: the loop has no free instrument row.');
      return;
    }
    const fillId = markFillClip(clip, candidate, reviewContext);
    layRow(row, clip, [{ at: 0, from: 0, bars }], bars);
    adaptRows([row]);
    baselineFill(row, fillId);
    added = candidate;
    addedRow = row;
    fillSuggested.add(candidate.instrumentKey);
    break;
  }
  if (!added) {
    log.warn('✨ Fill did not add anything: the best suitable fragments could not be read. Existing pads and loop length were left unchanged.');
    return;
  }
  recordLoop();
  loopPanel.render();
  soundLoop();
  partTable.renderSoon();
  log.ok(`✨ Added ${added.instrument} (${added.role}) · ${baseName(added.path)}${sourceText(source)} · ${Math.round(added.score * 100)}% match · ${added.loopBars} of ${bars} bars${model.songs ? ` · role preference learned from ${model.songs} songs` : ''}. Existing tracks and loop length were not changed.`);
  saveFillReview([{
    label: `New instrument · ${bars} bars`,
    chosen: added,
    alternatives: offered.filter((candidate) => candidate !== added).slice(0, FILL_SHOWN - 1),
    context: reviewContext, fingerprints, row: addedRow, index: loop.rows.indexOf(addedRow), from: 0, to: bars, added: true,
    // Its results show the instruments found (a table, as Summary's), not fragments of many at once.
    instruments: found.groups, fitTarget: partTarget,
  }]);
}

/** The patterns of Arrange: value, name. */
const ARRANGE_NAMES = { loops: 'All together', build: 'Build-up', builddown: 'Build-down', breakdown: 'Breakdown', song: 'Arc', fill: 'Groove with fill', stop: 'Stop-time', markov: '✨ Markov' };

/**
 * The rows Arrange and Fill lay out (not those locked, 🔒: they stay as they are), each with its
 * material: the different fragments it plays, in the order they come, each whole (the clip a
 * piece was cut from), to be played one after another. A drum turn (Fill's) is not one of them.
 * `bars`: the material's length.
 */
function loopMaterial(of = loop) {
  return of.rows.map((row, ch) => {
    const seen = new Map();   // what each fragment is -> the fragment, whole
    for (const [, clip] of [...row.clips].sort((a, b) => a[0] - b[0])) {
      const whole = clip.whole ?? clip;
      if (whole.turn) continue;
      // The same fragment: from the same bars of the same song, or (no source) the same notes.
      const what = whole.src ? `${whole.src.path}|${whole.src.ch}|${whole.src.at}|${whole.shift ?? 0}|${whole.key}`
        : JSON.stringify([whole.key, whole.shift ?? 0, whole.notes.map((n) => [n.beat, n.pitch])]);
      if (!seen.has(what) || seen.get(what).bars < whole.bars) seen.set(what, whole);
    }
    const material = [...seen.values()];
    return { row, ch, material, bars: material.reduce((n, c) => n + c.bars, 0) };
  }).filter((l) => l.material.length && !l.row.locked);
}

/** The piece's length for Arrange and Fill: the loop's Length, or 16 bars (8 at the least). */
function arrangeBars(of = loop) {
  if (of.length && of.length < 8) of.length = 16;
  return of.length ?? Math.max(16, loopBars(of));
}

/**
 * Lay out the existing fragments first, then match alternatives against that arrangement.
 * Work on a copy until the asynchronous matching is complete.
 */
async function arrangeLoop(template, daring, source = '') {
  if (!loop.rows.length && explored?.parts) await importSong(explored.part.path);
  if (!loop.rows.length) throw new Error('Put some parts in the loop first, or explore a song (Files): Arrange lays out the rows it has.');
  const startingTab = activeLoopTab;
  const startingState = loopSnapshot();
  const staged = {
    ...loop,
    rows: loop.rows.map((row) => ({ ...row, clips: new Map(row.clips), off: [...row.off] })),
  };
  const lanes = loopMaterial(staged);
  if (!lanes.length) throw new Error('Every row is locked (🔒): unlock one to arrange it.');
  if (loop.rows.some((r) => r.locked)) log.log(`🔒 ${loop.rows.filter((r) => r.locked).map((r) => r.name).join(', ')}: locked, as they are.`);
  const model = directorModel();
  const roles = new Map(staged.rows.map((row) => [row, rowRole(row)]));
  const total = arrangeBars(staged);
  let plan = null;
  let markov = null;
  if (template === 'markov') {
    if (!model.songs) log.warn('✨ No song analysed with its form yet: Markov arranges with simple defaults. Analyse the library again to teach it.');
    const have = lanes.reduce((mask, lane) => mask | ROLE_BIT[roles.get(lane.row)], 0);
    markov = { ...compose(model, have, Math.floor(total / PHRASE), { daring }), have };
  } else {
    plan = arrangement(lanes.map((lane) => ({ ch: lane.ch, role: roles.get(lane.row), bars: lane.bars })), template, total);
  }
  const placesOf = (lane) => (markov ? [{ at: 0, from: 0, bars: total }] : lanePlacements(plan, lane.ch, lane.bars));
  const lay = (materials) => {
    for (let i = 0; i < lanes.length; i++) {
      const lane = lanes[i];
      layRow(lane.row, materials[i], placesOf(lane), total);
      if (markov) markov.form.forEach((mask, k) => {
        if (!(mask & ROLE_BIT[roles.get(lane.row)])) clearBars(lane.row, k * PHRASE, (k + 1) * PHRASE);
      });
    }
  };
  lay(lanes.map((lane) => lane.material));
  const result = await arrangeMaterials(staged, lanes, daring, model, roles, source);
  lay(lanes.map((lane, i) => arrangementMaterial(lane.material, result.lanes[i].material)));
  let turned = 0;
  if (markov) {
    const drums = lanes.find((lane) => lane.row.drums)?.row;
    if (drums) for (let k = 0; k < markov.form.length; k++) {
      if (!markov.turns[k] || !(markov.form[k] & ROLE_BIT.drums)) continue;
      const clip = await turnClip(drums, staged);
      if (!clip) break;
      placeClip(drums, k * PHRASE + PHRASE - 1, clip, total);
      turned++;
    }
  }
  if (!loopMode || activeLoopTab !== startingTab || loopSnapshot() !== startingState) {
    log.warn('🎼 Arrange stopped because the loop changed while compatible fragments were being checked. Run Arrange again on the current loop.');
    return;
  }
  loop.length = staged.length;
  for (const lane of lanes) {
    loop.rows[lane.ch].clips = lane.row.clips;
    loop.rows[lane.ch].off = lane.row.off;
  }
  adaptRows(lanes.map((lane) => loop.rows[lane.ch]), 0, Infinity, { preserveLocked: true });
  // Fill details: each fragment Arrange replaced, where it sounds, with the alternatives it weighed.
  const reviews = result.reviews.map(({ lane, original, start, clip, chosen, alternatives, context, fingerprints }) => {
    const group = {
      by: 'Arrange', arrange: true, chosen, alternatives, context, fingerprints,
      row: loop.rows[lane.ch], index: lane.ch, places: placesOf(lane), length: lane.bars, start, bars: original.bars, current: clip, total,
      keep: { shift: original.shift ?? 0, swing: original.swing ?? 50, swingGrid: original.swingGrid ?? 0.25, vel: original.vel ?? 1 },
    };
    group.label = arrangeGroupLabel(group);
    return group;
  });
  if (reviews.length) saveFillReview(reviews);
  recordLoop();
  loopPanel.render();
  soundLoop();
  partTable.renderSoon();
  const { replaced, fallbacks, sourceCount } = result;
  if (replaced) log.log(`🎼 Arrange matched ${replaced} fragment${replaced === 1 ? '' : 's'}${sourceText(source)} against the arranged loop using Fill's fit, duration, dynamics, activity and role score${sourceCount > 1 ? ` · ${sourceCount} source songs` : sourceCount === 1 ? ' · one source song' : ''}.`);
  if (fallbacks) log.warn(`🎼 ${fallbacks} fragment${fallbacks === 1 ? '' : 's'} kept its existing material because no suitable readable alternative was found.`);
  log.log(`${ARRANGE_NAMES[template]} · ${total} bars`);
  if (markov) {
    markov.form.forEach((mask, k) => log.log(`  Bars ${k * PHRASE + 1}–${(k + 1) * PHRASE}: ${rolesText(mask & markov.have)}`));
    log.ok(`✨ Arranged: ${markov.form.length} phrases${turned ? `, ${turned} drum turn${turned > 1 ? 's' : ''}` : ''}. ↶ to undo.`);
  } else {
    let bar = 1;
    for (const section of plan.sections) {
      const names = lanes.filter((lane) => section.channels.includes(lane.ch)).map((lane) => lane.row.name);
      log.log(`  Bars ${bar}–${bar + section.bars - 1}: ${names.length ? names.join(', ') : 'silence'}`);
      bar += section.bars;
    }
    log.ok(`Arranged as ${ARRANGE_NAMES[template]}: ${plan.sections.length} sections. ↶ to undo.`);
  }
}

function arrangementDynamics(clip, row) {
  const velocities = clip.notes.map((note) => note.vel * (clip.vel ?? 1) * (row.volume / 100));
  if (!velocities.length) return null;
  const mean = velocities.reduce((sum, value) => sum + value, 0) / velocities.length;
  const variance = velocities.reduce((sum, value) => sum + (value - mean) ** 2, 0) / velocities.length;
  return { mean, spread: Math.sqrt(variance) };
}

function arrangementTarget(of, row) {
  const total = loopBars(of);
  const copy = {
    ...of,
    length: total,
    rows: of.rows.map((item) => ({ ...item, clips: new Map(item.clips), off: [...item.off] })),
  };
  const rowIndex = of.rows.indexOf(row);
  if (rowIndex >= 0) clearBars(copy.rows[rowIndex], 0, total);
  const progression = loopProgression(of) || loopProgression(copy);
  return { ...loopTarget(copy), chords: progression };
}

async function arrangeMaterials(of, lanes, daring, model, roles, source = '') {
  if (!source && (!index?.paths.length || !catalog.size)) {
    log.warn('🎼 Arrange kept the current fragments: choose and analyse a MIDI library, or a collection of ★ favourites as the source, to find compatible alternatives.');
    return { lanes, replaced: 0, fallbacks: 0, sourceCount: 0 };
  }
  const maskWithout = (row) => of.rows.reduce((mask, other) => other === row ? mask : mask | ROLE_BIT[roles.get(other)], 0);
  // The library's by instrument (role and sound); a collection's by role: the row keeps its sound.
  const candidatesByInstrument = new Map();
  for (const fragment of fillPool(source, of)) {
    const key = source ? fragment.role : `${fragment.role}|${fragment.program}`;
    const pool = candidatesByInstrument.get(key) ?? [];
    pool.push(fragment);
    candidatesByInstrument.set(key, pool);
  }
  const slots = [];

  const rowsBefore = fillRowsSnapshot(of.rows);
  const music = loopLayers(of);
  for (const lane of lanes) {
    const role = roles.get(lane.row);
    const target = arrangementTarget(of, lane.row);
    const pool = candidatesByInstrument.get(source ? role : `${role}|${lane.row.program}`) ?? [];
    let start = 0;   // where this fragment begins in the row's material
    for (const original of lane.material) {
      start += original.bars;
      if (!lane.row.clips.size) {
        slots.push({ lane, original, ranked: [], silent: true });
        continue;
      }
      const context = {
        bars: original.bars,
        dynamics: arrangementDynamics(original, lane.row),
        notesPerBar: original.notes.length / Math.max(1, original.bars),
        model,
        haveMask: maskWithout(lane.row),
        daring,
      };
      const candidates = [];
      for (const fragment of pool) {
        if (original.src && fragment.path.toLowerCase() === original.src.path.toLowerCase()
          && fragment.ch === original.src.ch && fragment.atTick === original.src.at) continue;
        const measured = fitOf(fragment, target);
        if (measured.pass === false) continue;
        candidates.push({ ...fragment, fit: measured.score, measured, role });
      }
      const ranked = rankFillCandidates(candidates, context)
        .filter((candidate) => candidate.duration >= FILL_MIN_DURATION_FIT && candidate.score >= FILL_MIN_SCORE);
      const review = fillContextSnapshot(target, context, {
        source: 'The arranged loop with this row left out · its chords, grooves and note grids',
        rows: rowsBefore, dynamicsSource: `${lane.row.name || 'this row'}, the fragment it replaces`, music,
      });
      slots.push({ lane, original, ranked, target, review, start: start - original.bars });
    }
  }

  const primarySource = preferredArrangementSource(slots.map(({ ranked }) => ranked));
  const parsed = new Map();
  const usedByRow = new Map();
  const takenByRow = new Map();   // row -> the grids of what replaces its fragments, as they will sound
  const materials = new Map(lanes.map((lane) => [lane.row, []]));
  let replaced = 0;
  let fallbacks = 0;

  const reviews = [];   // what Fill details shows of each fragment replaced
  for (const { lane, original, ranked, silent, target, review, start } of slots) {
    if (silent) {
      materials.get(lane.row).push(original);
      continue;
    }
    const used = usedByRow.get(lane.row) ?? new Set();
    usedByRow.set(lane.row, used);
    const shared = preferSharedArrangementCandidate(ranked.filter((candidate) => !used.has(fillFragmentKey(candidate))), primarySource);
    const ordered = shared
      ? [shared, ...ranked.filter((candidate) => candidate !== shared)]
      : ranked;
    let replacement = null;
    // Each row was measured against the loop as it was; what replaces the other rows must go with it too.
    const others = [...takenByRow].filter(([row]) => row !== lane.row).flatMap(([, list]) => list);
    for (const candidate of ordered) {
      const key = fillFragmentKey(candidate);
      if (used.has(key)) continue;
      if (!goesWithChosen(candidate, others)) continue;
      try {
        const clip = await candidateClip(candidate, parsed);
        if (!clip.notes.length) continue;
        clip.transpose = transposeBetween(clip.key, loop.key);
        clip.adapt = true;
        clip.shift = original.shift ?? 0;
        clip.swing = original.swing ?? 50;
        clip.swingGrid = original.swingGrid ?? 0.25;
        clip.vel = original.vel ?? 1;
        replacement = { clip, key, candidate };
        const taken = chosenGrid(candidate);
        if (taken) takenByRow.set(lane.row, [...(takenByRow.get(lane.row) ?? []), taken]);
        break;
      } catch (error) {
        log.warn(`🎼 Arrange could not read ${baseName(candidate.path)}: ${error.message}`);
      }
    }
    if (replacement) {
      materials.get(lane.row).push(replacement.clip);
      used.add(replacement.key);
      replaced++;
      // The alternatives (FILL_SHOWN in all) that go with what the other rows took: other songs
      // first among those nearly as good.
      const songOf = (candidate) => candidate.path.toLowerCase();
      const rest = [];
      for (const candidate of withoutRepeats(ranked)) {
        if (candidate !== replacement.candidate && !used.has(fillFragmentKey(candidate)) && goesWithChosen(candidate, others)) rest.push(candidate);
        if (rest.length === FILL_SHOWN * 8) break;
      }
      const alternatives = diverseTop(rest, FILL_SHOWN - 1, songOf, { taken: [songOf(replacement.candidate)] });
      reviews.push({
        lane, original, start, clip: replacement.clip, chosen: replacement.candidate, alternatives, context: review,
        fingerprints: new Map([replacement.candidate, ...alternatives].map((candidate) => [candidate, fillCandidateSnapshot(candidate, target)])),
      });
    } else {
      materials.get(lane.row).push(original);
      fallbacks++;
    }
  }

  const arrangedLanes = lanes.map((lane) => {
    const material = materials.get(lane.row);
    return { ...lane, material, bars: material.reduce((sum, clip) => sum + clip.bars, 0) };
  });
  const sourceCount = new Set(arrangedLanes.flatMap((lane) => lane.material.filter((clip) => clip.src).map((clip) => clip.src.path.toLowerCase()))).size;
  return { lanes: arrangedLanes, replaced, fallbacks, sourceCount, reviews };
}

/**
 * The fragments Fill and Arrange brought to these rows (their clips are marked `adapt`), made to
 * go with the notes that play in the bars [from, to): the few that are wrong there move a step
 * (midi/adapt.js). Each row against the others as they are by then.
 */
function adaptRows(rows, from = 0, to = Infinity, { preserveLocked = false } = {}) {
  tuneLoop(preserveLocked ? { key: loop.key, rows } : loop);
  let moved = 0;
  for (const row of rows) moved += adaptRow(loop, row, from, to);
  if (moved) log.log(`🎯 ${moved} note${moved > 1 ? 's' : ''} moved a step to go with the notes that play (the rest as written).`);
}

/** After Arrange or Fill: the loop in its key, kept for ↶, drawn and heard. */
function loopChanged() {
  tuneLoop(loop);
  recordLoop();
  loopPanel.render();
  soundLoop();
  partTable.renderSoon();
}

/** A clip of part `p` where it was dropped (`to` as LoopPanel.dropAt gives it). */
function placeInLoop(p, clip, to) {
  const drums = p.role === 'drums';
  if (!to.added && to.row.drums !== drums) throw new Error(drums ? 'Drums go on the drums row.' : 'That is the drums row: another instrument cannot play it.');
  if (p.ts && meterBeats(p.ts) !== barBeats(loop)) log.warn(`${p.instrument} is in ${p.ts} and the loop in ${loop.timeSig}: its bars do not match, it will not sound as in its song.`);
  const row = to.added ? loop.rows.find((r) => r.drums && drums) ?? addRow(loop, { program: p.program, drums, name: p.instrument }) : to.row;
  if (!row) throw new Error('No channel is left for another instrument.');
  placeClip(row, to.added ? 0 : to.bar, clip, loop.length);
  tuneLoop(loop);
  recordLoop();
  loopPanel.render();
  soundLoop();
  partTable.renderSoon();
}

/** Take all selected tracks over the same source interval, aligned on the destination bar. */
function placeExploreSelection(to) {
  const parts = explorer.lanes.filter((lane) => explored.selected.has(lane.ch))
    .map((lane) => explored.parts?.get(lane.ch) ?? explored.part);
  if (!parts.length) throw new Error('Select at least one track.');
  if (parts.length === 1) {
    const empty = !loop.rows.length;
    const beats = empty && METERS.includes(parts[0].ts) ? meterBeats(parts[0].ts) : barBeats(loop);
    const clip = makeExploreClip(parts[0], beats);
    if (!clip.notes.length) throw new Error('There are no notes in those bars.');
    adoptLoop(parts[0]);
    placeInLoop(parts[0], clip, to);
    return;
  }
  const empty = !loop.rows.length;
  const beats = empty && METERS.includes(parts[0].ts) ? meterBeats(parts[0].ts) : barBeats(loop);
  const clips = [];
  const silent = [];
  for (const part of parts) {
    const clip = makeExploreClip(part, beats, true);
    if (!clip.notes.length) { silent.push(part.instrument); continue; }
    clips.push({ clip, program: part.program, drums: part.role === 'drums', name: part.instrument, part });
  }
  if (!clips.length) throw new Error('None of the selected tracks has notes in those bars.');
  placeClipsAsRows(loop, clips, to.added ? 0 : to.bar);
  adoptLoop(clips[0].part, empty);
  if (silent.length) log.warn(`No notes in the selected range: ${silent.join(', ')}; those tracks were not added.`);
  for (const { part } of clips) {
    if (part.ts && meterBeats(part.ts) !== barBeats(loop)) log.warn(`${part.instrument} is in ${part.ts} and the loop in ${loop.timeSig}: its bars do not match, it will not sound as in its song.`);
  }
  loopChanged();
}

/** The bars what is carried will take on the loop, as a clip: `d.bars`, once it is read. */
async function measureDrag(d) {
  const what = d.explore ? 'explore' : d.i;
  if (d.measured === what) return;
  d.measured = what;
  if (d.explore) {
    const beats = !loop.rows.length && METERS.includes(explored.part.ts) ? meterBeats(explored.part.ts) : barBeats(loop);
    d.bars = Math.max(1, Math.ceil((explorer.range.endTick - explorer.range.startTick) / explored.info.ppq / beats - 1e-9));
    return;
  }
  const p = catalog.part(what);
  d.bars = p.loopBars || 1;
  const clip = clipOf(p, await parsedFile(p.path));
  if (d.measured === what) d.bars = clip.bars;
}

/**
 * A part dragged out of Parts onto New loop's rows, or onto the song or + New loop to start one with it.
 */
function wirePartDrag() {
  const body = $('partBody');
  let drag = null;
  body.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('button')) return;
    const row = e.target.closest('.vt-row');
    if (!row) return;
    e.preventDefault();   // no text selection while dragging
    const item = partTable.items[Number(row.dataset.i)];
    const started = { i: shownOf(item), x: e.clientX, y: e.clientY, ghost: null };
    drag = started;
    // Pressed on a fragment of the thumbnail: that is the one carried, with no click first.
    const box = e.target.closest('.pr-mini');
    if (box) {
      void fragmentUnder(item, box, e.clientX).then((id) => {
        if (id === undefined) return;
        started.i = id;
        if (started.ghost) chooseFragment(id);
      });
    }
  });
  // A favourite travels the same way, whole in itself (its clip: no file read).
  $('favBody').addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('button, .fav-title, .fav-name-edit')) return;
    const row = e.target.closest('.fav-item');
    const item = row && favorites.items[row.dataset.f];
    if (!item) return;
    e.preventDefault();
    drag = { fav: row.dataset.f, x: e.clientX, y: e.clientY, ghost: null, picture: row.querySelector('.fav-notes'), bars: item.clip.bars, measured: 'fav' };
  });
  // The bars selected on the Explore track travel the same way.
  loopPanel.exploreTake.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || !explorer.range || !explored?.selected.size) return;
    e.preventDefault();
    drag = { explore: true, x: e.clientX, y: e.clientY, ghost: null };
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (!drag.ghost) {
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
      // The label follows the mouse with the part's picture, so what is carried is seen.
      if (!drag.explore && !drag.fav) chooseFragment(drag.i);
      drag.ghost = Object.assign(document.createElement('div'), { className: 'part-ghost' });
      const picture = drag.explore ? null : drag.fav ? drag.picture : miniCache.get(miniKey(drag.i)) ?? miniCache.get(catalog.part(drag.i).part);
      if (picture) drag.ghost.append(copyCanvas(picture));
      drag.text = document.createElement('span');
      drag.ghost.append(drag.text);
      document.body.append(drag.ghost);
      (drag.fav ? $('favBody') : body).classList.add('dragging');
    }
    drag.ghost.style.left = `${e.clientX + 14}px`;
    drag.ghost.style.top = `${e.clientY + 10}px`;
    const favItem = drag.fav ? favorites.items[drag.fav] : null;
    if (loopMode) {
      drag.to = loopPanel.dropAt(e.clientX, e.clientY);
      if ((drag.explore || drag.fav) && drag.to?.explore) drag.to = null;
      const p = drag.explore ? explored.part : favItem ? { instrument: `★ ${favItem.instrument}`, path: favItem.path } : catalog.part(drag.i);
      const multiple = drag.explore && explored.selected.size > 1;
      const where = !drag.to ? '' : drag.to.explore ? ' → explore its whole track' : drag.to.added ? ' → new instrument' : multiple ? ` → new tracks at bar ${drag.to.bar + 1}` : ` → ${drag.to.row.name}`;
      drag.text.textContent = `🎸 ${multiple ? `${explored.selected.size} tracks` : p.instrument} · ${baseName(p.path)}${where}`;
      if (!drag.fav) void measureDrag(drag).catch(() => {});
      loopPanel.showDrop(drag.to, drag.bars, multiple);
      return;
    }
    // Over + New loop or the song: it starts a New loop with it.
    drag.newLoop = !drag.explore && !!document.elementFromPoint(e.clientX, e.clientY)?.closest('#songWorkspace');
    $('songWorkspace').classList.toggle('drop', drag.newLoop);
    const p = favItem ? { instrument: `★ ${favItem.instrument}`, path: favItem.path } : catalog.part(drag.i);
    drag.text.textContent = `🎸 ${p.instrument} · ${baseName(p.path)}${drag.newLoop ? ' → New loop' : ' · drag onto + New loop'}`;
  });
  window.addEventListener('pointerup', () => {
    if (!drag) return;
    const d = drag;
    drag = null;
    if (!d.ghost) return;
    d.ghost.remove();
    body.classList.remove('dragging');
    $('favBody').classList.remove('dragging');
    $('songWorkspace').classList.remove('drop');
    partDragged = performance.now();
    if (d.newLoop && !loopMode) {
      void act(null, '🎸 New loop', async () => {
        if (d.fav) stopFavorite();
        const tab = makeLoopTab();
        activateLoopTab(tab);
        if (d.fav) dropFavorite(d.fav, { added: true });
        else await dropInLoop(d.i, { added: true });
      }, false);
      return;
    }
    if (loopMode) {
      loopPanel.showDrop(null);
      if (d.to && d.explore) void act(null, '🎸 Loop', async () => {
        placeExploreSelection(d.to);
      }, false);
      else if (d.to && d.fav) void act(null, '🎸 Loop', async () => dropFavorite(d.fav, d.to), false);
      else if (d.to) void act(null, '🎸 Loop', () => dropInLoop(d.i, d.to), false);
    }
  });
}

/** Region or loop switch changed: the player loops the region while the loop is on. */
function applyLoop() {
  paintRegionStar();   // (every change of the region comes through here)
  // A part sounding alone loops over its own song (soundAlone), not over the song's region.
  if (audition !== null) { paintPlayer(); return; }
  const r = timeline.range;
  const i = current?.info;
  player.setLoop(timeline.loopOn && r && i ? { startSec: i.tickToSec(r.startTick), endSec: i.tickToSec(r.endTick) } : null);
  paintPlayer();
}

/** Play from a song second, or from where it stopped (the loop start when the loop is on). */
async function startPlaying(fromSong = null) {
  if (!current && audition === null && !loopMode) return;
  if (loopMode && !exploringAlone()) {
    if (!loopListen?.fillReview && loop.rows.some((row) => row.sound?.kind === 'soundfont') && loadedSoundFontId !== soundFontId()) {
      try { await loadSoundFont(); } catch { return; }
    }
    if (loopListen?.fillReview) clearLoopOutputs();
    else configureLoopOutputs();
  }
  await player.play(fromSong);
  timeline.updateLabels();
  paintPlayer();
}

/** The main ▶: the song, whatever a lane's ▶ was playing (the row of fragments is only theirs). */
function mainPlay() {
  if (loopMode) {
    if (loopListen?.alone) {
      // Listening to a part alone: the main ▶ is the loop's, not that part's.
      loopListen = null;
      player.stop();
      soundLoop();
      partTable.renderSoon();
    }
    if (player.playing) { player.pause(); syncDriven = false; }
    else if (syncing()) void syncStart();   // LUNA plays: the loop comes in on its bars
    else void startPlaying();
    paintPlayer();
    return;
  }
  if (audition !== null) { endAudition(auditionBack?.playing); return; }
  if (!player.playing && player.chain) applyLoop();
  togglePlay();
}

function togglePlay() {
  if (!current) return;
  if (player.playing) { player.pause(); timeline.updateLabels(); paintPlayer(); }
  else void startPlaying();
}

function stopPreview() {
  ++listenTurn;
  if (loopMode) {
    player.stop();
    syncDriven = false;   // until LUNA plays again (or ▶)
    if (fillChains.size) keepAllFillChains();   // (■ ends ▶▶ too, each row keeping what it was playing)
    loopListen = null;
    soundLoop();
    loopPanel.showBar(null);
    loopPanel.count(null);
    partTable.renderSoon();
    paintPlayer();
    return;
  }
  endAudition(false);
  player.stop();
  timeline.updateLabels();
  paintPlayer();
  timeline.setPlayhead(player.pos, false);
}

/** A channel's pattern: that channel alone, the region on it, its loop on and playing. */
async function loopPattern(ch, startTick, endTick, fraction = 0) {
  if (!current?.info.ppq) return;
  marked.clear();
  marked.add(ch);
  applyChannels();
  timeline.setRegion({ startTick, endTick }, true);
  applyLoop();
  const sec = current.info.tickToSec(startTick + (endTick - startTick) * fraction);
  if (!player.playing) await startPlaying(sec);
  else { player.seekSong(sec); timeline.updateLabels(); }
}

/** The fragments picked on a lane, one after the other, the first again after the last. */
function playFragments(ch) {
  const i = current.info;
  timeline.setRegion(null);
  player.setChain(timeline.pickedFragments(ch).map((f) => ({ startSec: i.tickToSec(f.at), endSec: i.tickToSec(f.at + f.ticks) })));
}

function paintPlayer() {
  const partAlone = loopMode && !!loopListen?.alone;   // not the loop: this player stays stopped
  const pos = partAlone ? 0 : loopMode ? player.songPosition % loopSecs() : player.songPosition;
  const dur = loopMode ? loopSecs() : audition !== null ? player.duration : current?.info.durationSec ?? 0;
  $('time').textContent = `${formatTime(pos)} / ${formatTime(dur)}`;
  paintBpm();
  $('pvPlay').textContent = player.playing && !partAlone ? '⏸' : '▶';
  paintFillListen();
  $('pvPlay').disabled = !current && audition === null && !loopMode;
  $('pvStop').disabled = !current && audition === null && !loopMode;
  paintCounters();   // stopped: the counters go
}

/**
 * Each frame: LUNA's session's tempo followed. New loop takes it as its own (its Tempo field
 * locked meanwhile). With no session, as it was.
 */
let tempoLocked = null;
function followLunaTempo() {
  const luna = lunaBpm();
  const field = $('loopPanel').querySelector('.lp-bpm');
  if (field && tempoLocked !== !!luna) {
    tempoLocked = !!luna;
    field.disabled = tempoLocked;
    field.title = tempoLocked ? "LUNA's session tempo: the loop plays at it, as it will in LUNA (change it there)" : "The loop's tempo";
  }
  if (loopMode && luna && Math.abs(loop.bpm - luna) > 0.01) {
    loop.bpm = luna;
    loopPanel.render();
    soundLoop();
  }
}

/** The tempo the preview plays at now: the loop's, or the file's as its tempo map says where the playhead is. */
function playingBpm() {
  if (loopMode) return loop.bpm;
  if (!current?.info.ppq) return 0;
  const i = current.info;
  const at = player.songPosition;
  let bpm = i.bpm;
  for (const t of i.tempoMap ?? []) { if (t.sec <= at + 1e-6) bpm = t.bpm; else break; }
  return bpm;
}

/** The meter heard now: the loop's, or the file's as its meter map says where the playhead is. */
function playingMeter() {
  if (loopMode) return loop.timeSig;
  if (!current?.info.ppq) return '';
  const i = current.info;
  const at = player.songPosition;
  let ts = i.timeSig;
  for (const m of i.meterMap ?? []) { if (m.sec <= at + 1e-6) ts = m.ts; else break; }
  return ts;
}

const bpmText = (b) => `${Math.round(b * 10) / 10}`;
let bpmShown = '';
/** Beside the time: the tempo heard, and LUNA's session tempo when it is another (the send plays at LUNA's). */
function paintBpm() {
  const bpm = playingBpm();
  const luna = session?.transport.tempo.value || 0;
  const differs = !!bpm && !!luna && Math.abs(luna - bpm) >= 0.5;
  const text = !bpm ? '– BPM' : differs ? `${bpmText(bpm)} BPM · LUNA ${bpmText(luna)}` : `${bpmText(bpm)} BPM`;
  const meter = playingMeter();
  const key = `${text}|${differs}|${meter}`;
  if (key === bpmShown) return;
  bpmShown = key;
  const changesTs = current?.info.timeSigChanges;
  $('meter').textContent = meter || '–';
  $('meter').title = !meter
    ? 'The meter of the song'
    : `Meter: ${meter}.${!loopMode && changesTs ? ` The file changes meter ${changesTs} time${changesTs > 1 ? 's' : ''}: shown where the playhead is.` : ''}`;
  const el = $('bpm');
  el.textContent = text;
  el.classList.toggle('differs', differs);
  const changes = !loopMode && current?.info.tempoChanges ? ` The file changes tempo ${current.info.tempoChanges} time${current.info.tempoChanges > 1 ? 's' : ''} (${bpmText(current.info.bpmMin)}–${bpmText(current.info.bpmMax)} BPM).` : '';
  el.title = !bpm
    ? 'The tempo the preview plays at'
    : `The preview plays at ${bpmText(bpm)} BPM${loopMode && luna ? " (the loop follows LUNA's session)" : ''}.${changes}${differs ? ` LUNA's session is at ${bpmText(luna)} BPM: what you send plays there at ${bpmText(luna)}, so it sounds ${luna > bpm ? 'faster' : 'slower'} than here. Set LUNA's tempo to ${bpmText(bpm)} to hear it the same.` : luna ? " LUNA's session is at the same tempo." : ''}`;
}

let playingKey = '';
(function tick() {
  if (player.playing) {
    paintPlayer();
    movePartCursor();
    if (exploringAlone()) explorer.setPlayhead(player.songPosition, true);
    else if (loopMode && loopListen?.id !== null && loopListen?.id !== undefined && explored) {
      const p = catalog.part(loopListen.id);
      const fraction = loopFragmentFraction();
      if (p.path === explored.part.path && fraction !== null) {
        const start = explored.info.barStartTick(p.loopStart);
        const end = explored.info.barStartTick(p.loopStart + p.loopBars);
        explorer.setPlayhead(explored.info.tickToSec(start + (end - start) * fraction), true);
      }
    }
    if (loopMode && loopListen?.alone) {
      loopPanel.showBar(null);
      loopPanel.count(null);
    } else if (loopMode) {
      // The bar, and the beat of it as the meter is counted (2/2 in halves, 6/8 in dotted quarters).
      const barSec = (barBeats(loop) * 60) / loop.bpm;
      const absoluteBar = Math.floor(player.songPosition / barSec + 1e-9);
      const bar = absoluteBar % loopBars(loop);
      const pulses = meterPulses(loop.timeSig);
      const beat = Math.min(pulses - 1, Math.floor(((player.songPosition - absoluteBar * barSec) / barSec) * pulses + 1e-9));
      loopPanel.showBar(bar);
      loopPanel.count({ beat: beat + 1, bar: bar + 1, lap: player.audibleLap * Math.round(player.duration / loopSecs()) + Math.floor(absoluteBar / loopBars(loop)) + 1 });
    } else if (audition === null) timeline.setPlayhead(player.songPosition, true);   // a part alone is not on this song
    followFragments();
    followFillChain();   // ▶▶ of Fill details: which proposal sounds
  }
  followLunaTempo();   // also stopped: LUNA's tempo may change
  paintBpm();
  // Re-mark result rows and lane labels whenever what is playing changes, whichever button changed it.
  const key = player.playing ? `${current?.path}|${player.channels ? [...player.channels].join(',') : 'all'}|${!!loopListen?.explore}` : '';
  if (key !== playingKey) {
    playingKey = key;
    partTable.renderSoon();
    timeline.updateLabels();
    explorer.updateLabels();
    if (!exploringAlone() || !player.playing) explorer.setPlayhead(0, false);
    paintPlayer();
  }
  requestAnimationFrame(tick);
})();
player.onEnd = () => { timeline.updateLabels(); paintPlayer(); };

// ── to LUNA ─────────────────────────────────────────────────────────────────────────────
// What goes is what you hear: the marked channels (none marked: all) over the region (none:
// the whole file), at LUNA's cursor and the session's tempo, to new tracks (one per channel)
// or to the track selected in LUNA (audio mixed on an audio track, notes on an instrument one).

const channelsForLuna = () => (marked.size ? [...marked].sort((a, b) => a - b) : current.info.channels.map((c) => c.channel));

/** The region as bridge.js takes it, or null for the whole file. */
function rangeForLuna() {
  const r = timeline.range;
  if (!r) return null;
  const d = timeline.describe();
  return { ...r, repeat: 1, label: `${d.from}-${d.to}` };
}

/** The selected LUNA track and what it takes: 'audio', 'midi' or null (with why). */
function selectedTarget() {
  const track = session?.focusedTrack.value;
  if (!track) return { track: null, kind: null, why: 'select a track in LUNA' };
  const type = track.trackType.value;
  if (type === 'audio') return { track, kind: 'audio' };
  if (type === 'instrument') return { track, kind: 'midi' };
  return { track, kind: null, why: `"${track.name.value}" is neither an audio nor an instrument track` };
}

/**
 * What applies to this send. Controls that do not are made invisible ("off") but keep their
 * room, so nothing in the card moves when New loop opens or the destination changes.
 */
function renderCompose() {
  $('kindGroup').classList.toggle('off', $('destSel').checked);   // a selected track's type decides
  // LUNA's own import (the whole file as MIDI) is the song's; ＋ New tracks, New loop's.
  $('importFile').classList.toggle('off', loopMode);
  $('newTracks').classList.toggle('off', !loopMode);
  $('addPicks').title = loopMode
    ? "One pass of the loop at LUNA's cursor, at the session's tempo: a track per instrument. The next send goes on after it, on the same tracks (＋ New tracks: new ones)"
    : "At LUNA's cursor, at the session's tempo";
  paintLoopFiles();
}

// ── the director (midi/director.js): how the analysed songs are arranged, phrase by phrase,
// for New loop's ✨ Fill and Arrange's ✨ Markov ─────────────────────────────────────────

let learned = { size: -1, model: null };

/** What the director has learned from the songs analysed (again when there are more). */
function directorModel() {
  if (learned.size !== catalog.files.length) {
    learned = { size: catalog.files.length, model: learn(catalog.files.filter((f) => f.ok && f.form?.length)) };
  }
  return learned.model;
}

/** Save loop and ⤓ MIDI: New loop's, once it is open (and, ⤓ MIDI, has something). */
function paintLoopFiles() {
  $('loopSave').disabled = !loopMode;
  $('loopSave').title = loopMode
    ? 'Save this loop as a .json file, with its notes, to open it again in a new tab'
    : 'Saves New loop: open it first';
  $('loopMidi').disabled = !(loopMode && loop.rows.length);
  $('loopMidi').title = loopMode
    ? 'Export what plays as a MIDI file (.mid), one pass of the loop: a track per instrument, at its tempo, for LUNA or any other DAW. To your Downloads folder'
    : 'Exports New loop as a MIDI file: open it first';
}

/** ⤓ MIDI: one pass of the loop, mute and solo as they are, as a MIDI file, to the Downloads folder. */
async function exportMidi() {
  if (!loopMode) throw new Error('Open New loop first.');
  if (!loop.rows.length) throw new Error('The loop is empty: drag a part onto it first.');
  // Named as Save loop names it: the same dialog, the loop's own name offered.
  const chosen = await askFileName(activeLoopTab?.saveName ?? loopFileName(), '.mid', { title: 'Export MIDI', ok: 'Export' });
  if (!chosen) { log.log('Not exported.'); return; }
  const song = loopSong(loop);   // mute and solo left out already
  const { bpm, timeSig } = loop;
  const names = loopTrackNames(loop);
  const bytes = smfOf(song, { bpm, timeSig, title: chosen, names });
  const name = `${chosen}.mid`;
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([bytes], { type: 'audio/midi' })), download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  log.ok(`Exported "${name}" to your Downloads folder: ${names.size} track${names.size === 1 ? '' : 's'}, ${Math.round(bpm)} BPM.`);
}

/** Render function for renderPart over the range of the song open, at the session's tempo. */
function renderer(range, status) {
  const i = current.info;
  // The session's tempo, so the audio lines up with LUNA's bars.
  const bpm = session.transport.tempo.value || i.bpm;
  return (channels, label) => renderPart({
    bank: sfEngine.bank,
    info: i,
    channels: new Set(channels),
    startTick: range ? range.startTick : 0,
    endTick: range ? range.endTick : i.lastTick,
    loopable: !!range,   // a region loops seamlessly in LUNA, like the preview's loop
    bpm,
    onProgress: (f) => status(`Rendering ${label}… ${Math.round(f * 100)} %`),
  });
}

async function addToLuna() {
  if (!session) throw new Error('Open a session in LUNA.');
  if (loopMode) {
    const status = (text) => { $('composeStatus').textContent = text; };
    sendingToLuna = true;
    try { await sendLoop(status); } finally { sendingToLuna = false; status(''); }
    renderSoundOptions();
    return;
  }
  if (!current) throw new Error('Choose a file first.');
  const { path, info: i } = current;
  if (i.smpte || !i.ppq) throw new Error('This file uses SMPTE time: it cannot be placed on bars.');
  const channels = channelsForLuna();
  const range = rangeForLuna();
  const at = session.transport.tick;
  const status = (text) => { $('composeStatus').textContent = text; };
  sendingToLuna = true;
  try {
    // What goes where, then a row per track under the column titles (bridge.js tableRow).
    const bpm = Math.round(session.transport.tempo.value || i.bpm);
    log.log(`${baseName(path)} → LUNA at ${session.musical.timeline.formatBarBeat(at)}, ${bpm} BPM`);
    log.log(SEND_HEAD);
    if ($('destSel').checked) {
      const t = selectedTarget();
      if (!t.kind) throw new Error(`Selected track: ${t.why}.`);
      if (t.kind === 'audio') {
        await loadSoundFont();
        const render = renderer(range, status);
        await addMixToTrack(session, i, path, t.track, channels, { at, range, log, onStep: status, render: () => render(channels, 'the audio') });
      } else {
        await addNotesToTrack(session, i, path, t.track, channels, { at, range, log });
      }
    } else {
      const withAudio = $('withAudio').checked;
      const withMidi = $('withMidi').checked;
      if (!withAudio && !withMidi) throw new Error('Tick "Sound", "MIDI" or both.');
      if (withAudio) {
        await loadSoundFont();
        await addStems(session, i, path, channels, {
          at, range, log, onStep: status,
          render: (ch) => renderer(range, status)([ch], `${channels.indexOf(ch) + 1}/${channels.length} · channel ${ch}`),
        });
      }
      if (withMidi) await addParts(session, i, path, channels.map((ch) => `ch:${ch}`), { at, range, log });
      if (withMidi && !withAudio) log.log('MIDI tracks sound with the instrument you load on them in LUNA (INST).');
    }
  } finally {
    sendingToLuna = false;
    status('');
  }
  renderSoundOptions();
}

async function importWhole() {
  if (!current) throw new Error('Choose a file first.');
  const reply = await session.importFile(current.path);
  log.ok(`LUNA is importing all of ${baseName(current.path)}${reply ? ` (${JSON.stringify(reply)})` : ''}.`);
}

// ── 🔗 Sync: New loop plays along with LUNA's session, on its bars ────────────────────────
// LUNA plays: the loop comes in where LUNA is, its bar 1 on the session's bar 1 and round again
// over it; LUNA stops: it stops. While both play, the loop is kept on LUNA's playhead (pushed many
// times a second): small drifts are nudged out, a jump (a seek in LUNA) is followed. `syncMs` moves
// the loop earlier (+) or later (−) against LUNA, for the delay between the page's sound and LUNA's.
// Every few seconds the log says how it goes: pushes, drift, corrections, the page's latency.

let lunaSync = prefs.get('lunaSync') === '1';
let syncMs = Number(prefs.get('syncMs')) || 0;
let syncDriven = false;     // the player was started by LUNA's play (and stops with it)
let lunaPush = null;        // LUNA's last playhead: { tick, at (performance.now ms) }
const SYNC_NUDGE = 0.015;   // s: a drift larger than this is nudged out
const SYNC_JUMP = 0.25;     // s: larger than this is a jump: the loop seeks there
let syncStats = null;       // what the log reports: { from, gaps: [ms], drift: [s], nudges, jumps }

const syncing = () => lunaSync && loopMode && !!session?.transport.playing.value && loop.rows.length > 0;

function onLunaLocation() {
  const now = performance.now();
  const tick = session?.transport.location.value?.tick;
  if (tick === undefined) return;
  if (syncStats && lunaPush && session.transport.playing.value) syncStats.gaps.push(now - lunaPush.at);
  lunaPush = { tick, at: now };
}

/** LUNA started or stopped: the loop with it. */
function onLunaPlaying() {
  if (!session) return;
  if (session.transport.playing.value) {
    lunaPush = { tick: session.transport.tick, at: performance.now() };   // it starts from its play start
    if (syncing()) void syncStart();   // the loop playing on its own or stopped: onto LUNA's bars
  } else if (syncDriven) {
    syncDriven = false;
    player.stop();
    loopPanel.showBar(null);
    loopPanel.count(null);
    reportSync();
    syncStats = null;
    paintPlayer();
  }
}

/** Where LUNA's playhead is now, in the loop's seconds (round and round from the session's bar 1), `syncMs` ahead. */
function lunaLoopSec() {
  if (!lunaPush) return null;
  const tl = session.musical.timeline;
  const bpm = session.transport.tempo.value || loop.bpm;
  const playing = session.transport.playing.value;
  const since = playing ? (performance.now() - lunaPush.at + syncMs) / 1000 : syncMs / 1000;
  const beats = (lunaPush.tick - tl.tickAtBar(1)) / Luna.TICKS_PER_BEAT + since * (bpm / 60);
  const loopBeats = loopBars(loop) * barBeats(loop);
  return ((((beats % loopBeats) + loopBeats) % loopBeats) * 60) / loop.bpm;
}

/** The loop's length in seconds, and a second wrapped into it. */
const loopSecs = () => (loopBars(loop) * barBeats(loop) * 60) / loop.bpm;
const wrapLoop = (s) => ((s % loopSecs()) + loopSecs()) % loopSecs();

/**
 * LUNA plays (or ▶, or 🔗 on, while it does): the loop goes where LUNA is, from where it was
 * stopped or, already playing on its own, jumping there.
 */
async function syncStart() {
  if (loopListen?.alone) { loopListen = null; soundLoop(); }
  const at = lunaLoopSec();
  if (at === null) return;
  const lts = session.transport.timeSignature.value;
  if (lts && `${lts.numerator}/${lts.denominator}` !== loop.timeSig) log.warn(`🔗 LUNA is in ${lts.numerator}/${lts.denominator} and the loop in ${loop.timeSig}: their bars do not fall together.`);
  syncStats = { from: performance.now(), gaps: [], drift: [], nudges: 0, jumps: 0 };
  syncDriven = true;
  // The player starts 50 ms ahead (play and seekSong alike).
  if (player.playing) player.seekSong(wrapLoop(at + 0.05));
  else await startPlaying(wrapLoop(at + 0.05));
  paintPlayer();
}

/** Each frame while synced: the loop kept on LUNA's playhead; the log every few seconds. */
function followLuna() {
  if (!syncDriven || !player.playing || !syncStats) return;
  const want = lunaLoopSec();
  if (want === null) return;
  const len = loopSecs();
  const d = ((((player.songPosition - want) % len) + len * 1.5) % len) - len / 2;   // ahead (+) or behind (−), wrapped
  syncStats.drift.push(d);
  if (Math.abs(d) > SYNC_JUMP) {
    player.seekSong(wrapLoop(want + 0.05));
    syncStats.jumps++;
  } else if (syncStats.drift.length % 8 === 0) {
    // Every third of a second or so: the mean of the last ones, so a push late does not shake it.
    const recent = syncStats.drift.slice(-8);
    const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
    if (Math.abs(mean) > SYNC_NUDGE) { player.nudge(mean); syncStats.nudges++; }
  }
  if (performance.now() - syncStats.from > 8000) reportSync();
}

// On the Worker's tick (preview/ticker.js), not the screen's frames nor a page timer: those stop
// or slow down when the Add On's window is out of sight, and the loop must keep on LUNA's bars.
every(followLuna);

/** The log: how the sync went since the last report (what to measure in LUNA). */
function reportSync() {
  const s = syncStats;
  const secs = s ? (performance.now() - s.from) / 1000 : 0;
  if (!s || s.drift.length < 10 || secs < 2) return;   // a stretch too short says nothing
  const gaps = [...s.gaps].sort((a, b) => a - b);
  const pct = (a, q) => a[Math.min(a.length - 1, Math.floor(a.length * q))] ?? 0;
  const drift = [...s.drift].map((x) => Math.abs(x) * 1000).sort((a, b) => a - b);
  log.log(`🔗 LUNA sync, ${secs.toFixed(0)} s: playhead from LUNA ${(gaps.length / secs).toFixed(0)} times a second (every ${Math.round(pct(gaps, 0.5))} ms, ${Math.round(pct(gaps, 0.95))} ms at worst) · loop off LUNA ${Math.round(pct(drift, 0.5))} ms (${Math.round(pct(drift, 0.95))} ms at worst) · ${s.nudges} nudges, ${s.jumps} jumps · page audio latency ${Math.round(player.outputLatency * 1000)} ms · offset ${syncMs} ms`);
  syncStats = { from: performance.now(), gaps: [], drift: [], nudges: 0, jumps: 0 };
}

/** 🔗 on or off, and its offset (from New loop's head). */
function setSync(on, ms = syncMs) {
  lunaSync = on;
  syncMs = ms;
  prefs.set('lunaSync', on ? '1' : '0');
  prefs.set('syncMs', String(ms));
  loopPanel.showSync(on, ms);
  if (on) {
    log.log(`🔗 Sync with LUNA on: press play in LUNA and the loop plays along, on its bars${session ? '' : ' (open a session in LUNA first)'}.`);
    if (!tickerInBackground()) log.warn('🔗 This window cannot keep time out of sight here (no Worker): keep MIDI Digger in view while LUNA plays.');
    if (syncing()) void syncStart();
  } else if (syncDriven) {
    syncDriven = false;
    reportSync();
    syncStats = null;
  }
}

// ── session and connection ──────────────────────────────────────────────────────────────

/** The header's session line; `warn` marks it (no session, LUNA not there) so it stands out. */
function showStatus(text, warn = false) {
  $('status').textContent = text;
  $('status').title = text;
  $('status').classList.toggle('none', warn);
}

const NO_SESSION = 'No session open in LUNA';

let releases = [];
async function bindSession() {
  for (const u of releases) u();
  releases = [];
  if (sessionFit) { sessionFit = null; paintFitNote(); searchParts(); }   // 🎯 read another session
  session = luna.sessions.current() ?? null;
  if (!session) {
    showStatus(NO_SESSION, true);
    $('status').title = 'Open or create a session in LUNA to send it tracks. The library and listening work without one.';
    renderSoundOptions();
    if (loopMode) soundLoop();
    return;
  }
  await session.ready();
  showStatus(session.name.value ?? session.uid);
  renderSoundOptions();
  if ($('soundSrc').value.startsWith('luna:')) void applySound();
  releases.push(session.tracks.onChange(() => { renderSoundOptions(); if (loopMode) soundLoop(); }));
  if (loopMode) soundLoop();
  // 🔗 Sync: LUNA's playhead and its play / stop, followed by New loop.
  lunaPush = null;
  releases.push(session.transport.location.onChange(onLunaLocation));
  releases.push(session.transport.playing.onChange(onLunaPlaying));
}

// ── what the preview sounds through ─────────────────────────────────────────────────────
// 'sf2': a soundfont in the page, the one shipped with the add-on unless the user chose
// another · 'sf2-default': back to the shipped one · 'simple': the small synth ·
// 'luna:<track id>': live MIDI to that LUNA track, heard with its own instrument.

// Shipped in the add-on folder, so the page reads it on Windows and on Mac alike (a page may
// always fetch its own files). Licence: sounds/GeneralUser-GS-LICENSE.txt.
const BUNDLED_SF2 = { url: 'sounds/GeneralUser-GS.sf2', name: 'GeneralUser GS' };
const sfEngine = new SoundFontEngine();
let sfLoading = null;
let sfLoadVersion = 0;
let loadedSoundFontId = null;
let lunaOut = null;
let lunaTarget = null;   // { sessionUid, trackUid }

/** The soundfont the user chose, or '' for the one shipped with the add-on. */
const sf2Path = () => prefs.get('sf2Path') || '';
const sf2Name = () => (sf2Path() ? baseName(sf2Path()).replace(/\.(sf2|sf3|dls)$/i, '') : BUNDLED_SF2.name);
const soundFontId = () => sf2Path() || 'builtin:GeneralUser-GS';

const silentOutput = { send() {}, silence() {} };
const trackOutputs = new Map();
let loopRouting = '[]';
let routingWarnings = '';

function soundFontPresets() {
  const presets = new Map();
  if (loadedSoundFontId !== soundFontId()) return presets;
  for (const row of loop.rows) {
    if (row.sound?.kind !== 'soundfont' || row.sound.bankId !== loadedSoundFontId) continue;
    const preset = findSoundFontPreset(sfEngine.bank, row.sound);
    if (preset) presets.set(channelOf(loop, row), preset);
  }
  return presets;
}

function clearLoopOutputs() {
  if (loopRouting !== '[]') {
    player.setChannelOutputs(new Map());
    loopRouting = '[]';
  }
  sfEngine.channelPresets.clear();
  routingWarnings = '';
}

/** Rebuild destinations only when the routing changes; missing sounds never play a substitute. */
function configureLoopOutputs() {
  const presets = soundFontPresets();
  const outputs = new Map();
  const warnings = [];
  const trackIds = new Set();
  for (const row of loop.rows) {
    const sound = row.sound;
    if (!sound) continue;
    const ch = channelOf(loop, row);
    if (sound.kind === 'soundfont') {
      if (presets.has(ch)) outputs.set(ch, sfEngine);
      else {
        outputs.set(ch, silentOutput);
        warnings.push(`${row.name}: SoundFont preset "${sound.name}" is unavailable; select its SoundFont and preset again.`);
      }
    } else if (sound.kind === 'luna') {
      const track = session?.uid === sound.sessionUid && session.tracks.byId(sound.trackUid);
      const conflictsWithDefault = player.out === lunaOut && lunaOut && lunaTarget?.sessionUid === sound.sessionUid
        && lunaTarget.trackUid === sound.trackUid && loop.rows.some((other) => !other.sound);
      if (!track || track.trackType.value !== 'instrument' || trackIds.has(sound.trackUid) || !luna || conflictsWithDefault) {
        outputs.set(ch, silentOutput);
        warnings.push(`${row.name}: LUNA track "${sound.trackName}" is unavailable or already used by another row or the default sound; choose an instrument track again.`);
        continue;
      }
      trackIds.add(sound.trackUid);
      const key = `${session.uid}:${track.id}`;
      if (!trackOutputs.has(key)) {
        const target = { sessionUid: session.uid, trackUid: track.id };
        const output = new LunaMidiOut(new Luna.SendMidi(luna), () => target, () => player.ctx.currentTime);
        output.onError = (error) => log.warn(`LUNA track "${sound.trackName}": ${error.code ?? error.message}`);
        trackOutputs.set(key, new LunaTrackOutput(output));
      }
      outputs.set(ch, trackOutputs.get(key));
    } else {
      outputs.set(ch, silentOutput);
      warnings.push(`${row.name}: unknown sound source; choose a sound again.`);
    }
  }
  // Where each channel goes. A SoundFont row counts by its bank, not its preset: another preset of
  // the same SoundFont goes to the same synth, and is changed there as it plays (below).
  const signature = JSON.stringify(loop.rows.filter((row) => row.sound).map((row) => [channelOf(loop, row),
    row.sound.kind === 'soundfont' ? { kind: 'soundfont', bankId: row.sound.bankId } : row.sound,
    row.sound.kind === 'soundfont' ? presets.has(channelOf(loop, row)) : outputs.get(channelOf(loop, row)) === silentOutput])
    .sort((a, b) => a[0] - b[0]));
  if (warnings.join('\n') !== routingWarnings) {
    routingWarnings = warnings.join('\n');
    for (const warning of warnings) log.warn(warning);
  }
  if (signature === loopRouting) {
    const before = sfEngine.channelPresets;
    sfEngine.channelPresets = presets;
    // A row given another preset while the loop plays: its channel changes now, no restart (its
    // next notes sound with it; the program change the loop sends each lap keeps it).
    if (player.playing && sfEngine.ready && sfEngine.ctx) {
      for (const [ch, preset] of presets) {
        if (before.get(ch) !== preset) sfEngine.send(sfEngine.ctx.currentTime, 0xc0 | ch, preset.program);
      }
    }
    return false;
  }
  if (player.playing) player.pause();
  sfEngine.channelPresets = presets;
  player.setChannelOutputs(outputs);
  loopRouting = signature;
  return true;
}

// ── Trying a row's sound in its dialog (ui/sound-tester.js) ─────────────────────────────
// On a channel of its own the loop does not use. While the dialog is open the loop is paused, to
// hear the sound alone; it goes on where it was when the dialog closes (with the sound applied, or
// the one the row had).
let rowSoundResume = null;   // where the loop was when the dialog paused it

function openRowSound(row) {
  if (player.playing && loopMode && !exploringAlone()) {
    rowSoundResume = player.songPosition;
    player.pause();
    paintPlayer();
  }
  soundPicker.open(row);
}

/** The preset the default sound gives a row: its program in bank 0 (a kit by its program). */
function defaultPreset(row) {
  const presets = sfEngine.bank?.presets ?? [];
  if (row.drums) return presets.find((p) => p.isGMGSDrum && p.program === (row.program ?? 0)) ?? presets.find((p) => p.isGMGSDrum);
  return presets.find((p) => !p.isDrum && p.program === row.program && p.bankMSB === 0 && p.bankLSB === 0)
    ?? presets.find((p) => !p.isDrum && p.program === row.program);
}

/** A voice for `sound` (null: the default) to try for `row`: see SoundTester. */
async function auditionVoice(row, sound) {
  player.ensureContext();
  if (sound?.kind === 'luna') throw new Error('Trying a LUNA track here is not available yet: apply it and hear it in the loop.');
  const occupied = new Set(loop.rows.map((r) => channelOf(loop, r)));
  const free = [15, 14, 13, 12, 11, 10, 8, 7, 6, 5, 4, 3, 2, 1, 0].find((c) => !occupied.has(c)) ?? 15;
  const now = () => player.ctx.currentTime;
  const heard = () => player.ctx.currentTime - player.outputLatency;
  // What has not sounded yet on that channel is dropped (a phrase stopped halfway).
  const unqueue = (ch) => { sfEngine.queue = sfEngine.queue.filter((m) => (m.bytes[0] & 15) !== ch || (m.bytes[0] & 0xf0) !== 0x90); };
  if (sound?.kind === 'soundfont') {
    await loadSoundFont();
    const preset = findSoundFontPreset(sfEngine.bank, sound);
    if (!preset) throw new Error(`"${sound.name}" is not in the SoundFont loaded now.`);
    const ch = free;
    sfEngine.force(ch, preset);
    sfEngine.send(now(), 0xb0 | ch, 7, 100);
    return {
      ch, program: preset.program, drums: !!(preset.isDrum || preset.isGMGSDrum), ...presetKeys(preset), now, heard,
      send: (t, b) => sfEngine.send(Math.max(t, now()), b[0], b[1], b[2] ?? 0),
      silence: () => { unqueue(ch); for (const b of [[64, 0], [123, 0], [120, 0]]) sfEngine.send(now(), 0xb0 | ch, b[0], b[1]); },
    };
  }
  // The default sound (soundfont, simple synth or LUNA track), as the row plays with it.
  const ch = row.drums ? 9 : free;
  if (!row.drums) player.sendMidi([0xc0 | ch, row.program ?? 0], now());
  player.sendMidi([0xb0 | ch, 7, 100], now());
  const preset = player.out === sfEngine && sfEngine.bank ? defaultPreset(row) : null;
  return {
    ch, program: row.program ?? 0, drums: !!row.drums, ...(preset ? presetKeys(preset) : { keys: null, roots: null }), now, heard,
    send: (t, b) => player.sendMidi(b, t),
    silence: () => { if (player.out === sfEngine) unqueue(ch); for (const b of [[64, 0], [123, 0]]) player.sendMidi([0xb0 | ch, ...b], now()); },
  };
}

/** The row's notes alone, as the loop plays them: [{ sec, len, pitch, vel }] over one lap, and its bars' length. */
function rowPart(row) {
  const beatsPerBar = barBeats(loop);
  const secPerBar = (beatsPerBar * 60) / loop.bpm;
  const song = loopSong({ ...loop, rows: [{ ...row, mute: false, solo: false }] });
  const open = new Map();
  const notes = [];
  for (const e of song.events) {
    if (e.type === 'on') { const n = { sec: e.sec, len: 0.1, pitch: e.a, vel: e.b }; notes.push(n); (open.get(e.a) ?? open.set(e.a, []).get(e.a)).push(n); }
    else if (e.type === 'off') { const n = open.get(e.a)?.shift(); if (n) n.len = Math.max(0.02, e.sec - n.sec); }
  }
  return { notes, durationSec: song.durationSec, secPerBar, beatsPerBar };
}

/** The loop's key as [pitch class, minor], or null. */
function loopKey() {
  // (The loop keeps its key as keyClass gives it, "7 mayor"; a name, "G mayor", is read too.)
  const m = /^(\d+) (mayor|menor)$/.exec(loop.key ?? '') ?? /^(\d+) (mayor|menor)$/.exec(keyClass(loop.key) ?? '');
  return m ? [Number(m[1]), m[2] === 'menor'] : null;
}

const soundTester = new SoundTester($('loopSoundDlg').querySelector('.loop-sound-test'), {
  connect: auditionVoice,
  getSound: () => soundPicker.chosen(),
  getKey: loopKey,
  getRowPart: rowPart,
});

/** A row's name for the instrument it now sounds with: the preset's, the LUNA track's, or (default sound) its General MIDI one. */
const rowNameOfSound = (row, sound) => (sound?.kind === 'soundfont' ? sound.name
  : sound?.kind === 'luna' ? sound.trackName
  : row.drums ? 'Drums' : GM_PROGRAMS[row.program]);

/** A row's sound may be this one: throws, saying why, when not. */
function checkRowSound(row, sound) {
  if (!loop.rows.includes(row)) throw new Error('The loop row has changed; choose its sound again.');
  if (sound?.kind === 'luna' && loop.rows.some((other) => other !== row && other.sound?.kind === 'luna'
    && other.sound.sessionUid === sound.sessionUid && other.sound.trackUid === sound.trackUid)) {
    throw new Error('That LUNA track is already assigned to another loop row.');
  }
  if (sound?.kind === 'luna' && player.out === lunaOut && lunaOut && lunaTarget?.sessionUid === sound.sessionUid
    && lunaTarget.trackUid === sound.trackUid && loop.rows.some((other) => other !== row && !other.sound)) {
    throw new Error('That LUNA track is already used by rows with the default sound.');
  }
}

const soundPicker = new LoopSoundPicker($('loopSoundDlg'), {
  getTracks: () => (session?.visibleTracks ?? []).filter((t) => t.trackType.value === 'instrument').map((t) => ({ id: t.id, name: t.name.value ?? t.id })),
  getSessionUid: () => session?.uid,
  getBank: () => sfEngine.bank,
  getBankId: soundFontId,
  loadBank: loadSoundFont,
  onApply(row, sound) {
    checkRowSound(row, sound);
    row.sound = sound;
    row.name = rowNameOfSound(row, sound) || row.name;   // its name follows its instrument
    recordLoop();
    loopPanel.render();
    soundLoop();
  },
  // Heard while choosing, the loop playing (not kept: Apply keeps it, one undo step; closing
  // without it puts back the row's sound, `restore`).
  onPreview(row, sound, { restore = false } = {}) {
    if (!loop.rows.includes(row)) return false;
    if (!restore && !player.playing) return false;
    if (!restore) checkRowSound(row, sound);
    if (JSON.stringify(row.sound ?? null) === JSON.stringify(sound ?? null)) return true;
    row.sound = sound;
    loopPanel.render();
    soundLoop();
    return true;
  },
  onError: (error) => log.fail(`Choose row sound: ${error.message}`),
  tester: soundTester,
  onClosed() {
    if (rowSoundResume === null) return;
    const at = rowSoundResume;
    rowSoundResume = null;
    if (loopMode && !exploringAlone()) void startPlaying(at);
  },
});

async function readSoundFont() {
  const path = sf2Path();
  if (path) return reader.read(path);
  const r = await fetch(BUNDLED_SF2.url);
  if (!r.ok) throw new Error(`${BUNDLED_SF2.url}: ${r.status}`);
  return new Uint8Array(await r.arrayBuffer());
}

/** The soundfont's state, as the "Sonido" menu's and the "…" button's tooltip. */
function showSoundFont(text) {
  $('soundSrc').title = `What the preview sounds with (and the audio sent to LUNA).\nSoundfont: ${text}`;
  $('sf2Choose').title = `Choose another soundfont (.sf2, .sf3 or .dls)\nNow: ${text}`;
}

/** Load the soundfont once (or again after the path changed). */
function loadSoundFont() {
  sfLoading ??= (async () => {
    const version = sfLoadVersion;
    const bankId = soundFontId();
    const name = sf2Name();
    const where = sf2Path() || 'shipped with the add-on';
    showSoundFont(`loading ${name}…`);
    try {
      player.ensureContext();
      const t0 = performance.now();
      const bytes = await readSoundFont();
      const loaded = await sfEngine.load(bytes, player.ctx.sampleRate, name, () => version === sfLoadVersion);
      if (!loaded) throw new Error('the SoundFont selection changed while it was loading');
      loadedSoundFontId = bankId;
      sfEngine.attach(player.ctx, player.ctx.destination);
      showSoundFont(`${name} · ${sfEngine.presets} sounds · loaded in ${Math.round(performance.now() - t0)} ms`);
      log.ok(`Preview soundfont: ${name}, ${where} (${sfEngine.presets} sounds).`);
    } catch (e) {
      if (version !== sfLoadVersion) throw e;
      showSoundFont(`could not load ${name}: ${e.message}`);
      log.warn(`Could not load the soundfont ${name}, ${where} (${e.message}). The preview uses the simple synth.`);
      if (version === sfLoadVersion) sfLoading = null;
      throw e;
    }
  })();
  return sfLoading;
}

/** Fill the "Sound" menu: soundfont, simple synth, and every instrument track of the session. */
function renderSoundOptions() {
  const sel = $('soundSrc');
  const saved = prefs.get('soundSrc') || 'sf2';
  sel.replaceChildren(new Option(`Soundfont (${sf2Name()})`, 'sf2'));
  if (sf2Path()) sel.append(new Option(`Shipped soundfont (${BUNDLED_SF2.name})`, 'sf2-default'));
  sel.append(new Option('Simple synth', 'simple'));
  for (const t of session?.visibleTracks ?? []) {
    if (t.trackType.value === 'instrument') sel.append(new Option(`LUNA: ${t.name.value ?? t.id}`, `luna:${t.id}`, false, false));
  }
  // A saved LUNA track is remembered by name (ids change between sessions).
  const want = saved.startsWith('luna-name:')
    ? [...sel.options].find((o) => o.text === `LUNA: ${saved.slice(10)}`)?.value
    : saved;
  sel.value = [...sel.options].some((o) => o.value === want) ? want : 'sf2';
}

async function applySound() {
  let v = $('soundSrc').value;
  if (v === 'sf2-default') {
    // Back to the soundfont shipped with the add-on.
    prefs.remove('sf2Path');
    sfLoadVersion++;
    sfLoading = null;
    loadedSoundFontId = null;
    sfEngine.silence();
    renderSoundOptions();
    $('soundSrc').value = v = 'sf2';
  }
  if (v === 'simple') {
    prefs.set('soundSrc', 'simple');
    player.setOutput(null);
  } else if (v === 'sf2') {
    prefs.set('soundSrc', 'sf2');
    const version = sfLoadVersion;
    try {
      await loadSoundFont();
      if (version === sfLoadVersion && $('soundSrc').value === 'sf2') player.setOutput(sfEngine);
    } catch {
      if (version === sfLoadVersion && $('soundSrc').value === 'sf2') player.setOutput(null);
    }
  } else if (v.startsWith('luna:') && session && luna) {
    const track = session.tracks.byId(v.slice(5));
    prefs.set('soundSrc', `luna-name:${track?.name.value ?? ''}`);
    player.ensureContext();
    lunaTarget = { sessionUid: session.uid, trackUid: v.slice(5) };
    lunaOut ??= new LunaMidiOut(new Luna.SendMidi(luna), () => lunaTarget, () => player.ctx.currentTime);
    lunaOut.onError = (e) => log.warn(`LUNA does not accept the live MIDI (${e.code ?? e.message}).`);
    player.setOutput(lunaOut);
    log.log(`The preview plays through the LUNA track "${track?.name.value}", with its instrument.`);
  }
  if (loopMode && !exploringAlone()) soundLoop();
  timeline.updateLabels();
  if (loopMode && !exploringAlone()) soundLoop();
  paintPlayer();
}

async function chooseSoundFont() {
  if (!luna || !(await luna.gui.available())) throw new Error('LUNA is not connected.');
  const [path] = await luna.gui.chooseFiles({ title: 'Choose a soundfont (.sf2, .sf3 or .dls)', filters: ['*.sf2;*.sf3;*.dls'], ...(sf2Path() ? { defaultPath: sf2Path() } : {}) });
  if (!path) return;
  prefs.set('sf2Path', path);
  sfLoadVersion++;
  sfLoading = null;
  loadedSoundFontId = null;
  sfEngine.silence();
  renderSoundOptions();
  await loadSoundFont();
  if ($('soundSrc').value === 'sf2') player.setOutput(sfEngine);
  if (loopMode && !exploringAlone()) soundLoop();
}

async function loadSaved() {
  try {
    let saved = await store.get('index');
    if (!saved) {
      saved = await readLegacyIndex();
      if (saved) { await store.set('index', saved); log.log('Folder index of the earlier prototype recovered.'); }
    }
    // The favourites kept (until LUNA forgets them; ⤓ Save in Favorites keeps a copy).
    const favs = await store.get('favorites').catch(() => null);
    if (favs?.items && Array.isArray(favs.collections)) {
      favorites = favs;
      renderFavorites();
      const n = Object.keys(favs.items).length;
      if (n) log.log(`${n.toLocaleString()} favourite${n === 1 ? '' : 's'} of yours loaded, in ${favs.collections.length} collection${favs.collections.length === 1 ? '' : 's'}.`);
    }
    const t0 = performance.now();
    const compacted = [];
    await store.forEachFile(
      async (r) => {
        if (catalog.addFile(r)) {
          compacted.push(r);
          if (compacted.length >= 100) await store.putFiles(compacted.splice(0));
        }
      },
      250,
      (loaded) => working(`Restoring saved fragments… ${loaded.toLocaleString()} files`),
    );
    await store.putFiles(compacted);
    const s = catalog.stats();
    if (s.files) log.ok(`Catalogue loaded: ${s.files.toLocaleString()} files, ${s.parts.toLocaleString()} parts, ${Math.round(performance.now() - t0)} ms.`);
    if (saved?.paths?.length) {
      const directory = await store.get('libraryDirectory');
      if (directory?.handle && sameRoot(directory.root, saved.root)) {
        try {
          const permission = await directory.handle.queryPermission({ mode: 'read' });
          reader.setDirectory(saved.root, directory.handle, permission);
        } catch (e) {
          log.warn(`Could not restore MIDI folder permission: ${e.message}. Select the folder again.`);
        }
      }
      setIndex(saved);   // the analysis waits for "Analyse" / "Resume"
    }
    else { showLibraryEmpty(true); showCatalogStatus(); }
  } catch (e) {
    log.warn(`Could not read the saved library (${e.message}).`);
  }
}

/**
 * Bottom margin the page keeps clear: LUNA's add-on window on Windows hides a band at the
 * bottom of the page; 40 px is what the user found right. "?safe=N" overrides it for testing.
 */
const SAFE_BOTTOM_PX = 40;
function applySafeBottom() {
  const param = Number(new URLSearchParams(location.search).get('safe'));
  const px = Number.isFinite(param) && param > 0 ? Math.min(200, param) : SAFE_BOTTOM_PX;
  document.documentElement.style.setProperty('--safe-bottom', `${px}px`);
}

/** The log as an accordion: folded by default (the bar shows its latest line), kept as left. */
function setLogOpen(open) {
  $('right').classList.toggle('log-closed', !open);
  document.body.classList.toggle('log-open', open);
  $('logToggle').textContent = open ? '▾ Log' : '▸ Log';
  $('logToggle').setAttribute('aria-expanded', String(open));
  prefs.set('logOpen', open ? '1' : '0');
  if (!open) return;
  if (loopMode && loop.rows.length) void logLoopNow().catch((e) => log.warn(`What the loop plays: ${e.message}`));
  $('log').scrollTop = $('log').scrollHeight;
}

// What New loop plays, as a table in the log (it is monospaced): a line per fragment.
const LOOP_COLUMNS = [20, 34, 5, 13];   // Row, File, Ch, Song bars; Pads takes the rest

/** "1–8, 13, 15–16": bars (from 0) as the pads number them, runs joined. */
function barsText(bars) {
  const runs = [];
  for (const b of [...bars].sort((x, y) => x - y)) {
    const last = runs.at(-1);
    if (last && b === last[1] + 1) last[1] = b;
    else runs.push([b, b]);
  }
  return runs.map(([a, z]) => (a === z ? `${a + 1}` : `${a + 1}–${z + 1}`)).join(', ');
}

/**
 * When the log opens in New loop: which files and fragments play in it. A line per fragment of
 * each row: its song, channel, the bars of the song it comes from and the pads it plays on
 * (those switched off left out). A fragment of no known song (an old saved loop): "–".
 */
async function logLoopNow() {
  log.head(`── The loop now: ${loop.rows.length} row${loop.rows.length > 1 ? 's' : ''}, ${loopBars(loop)} bars, ${Math.round(loop.bpm)} BPM, ${loop.timeSig}`);
  log.log(tableRow(['Row', 'File', 'Ch', 'Song bars', 'Pads'], LOOP_COLUMNS));
  for (const row of loop.rows) {
    // Its fragments, each once (as Arrange tells them apart), with the pads it plays on.
    const frags = new Map();
    for (const [at, clip] of [...row.clips].sort((a, b) => a[0] - b[0])) {
      const whole = clip.whole ?? clip;
      const what = whole.turn ? 'turn' : whole.src ? `${whole.src.path}|${whole.src.ch}|${whole.src.at}` : `notes:${whole.notes.length}:${whole.bars}`;
      if (!frags.has(what)) frags.set(what, { whole, pads: new Set() });
      const f = frags.get(what);
      if (whole.bars > f.whole.bars) f.whole = whole;
      for (let b = at; b < at + clip.bars; b++) if (!row.off.includes(b)) f.pads.add(b);
    }
    let first = true;
    for (const { whole, pads } of frags.values()) {
      let file = '–';
      let ch = '–';
      let songBars = '–';
      if (whole.turn) {
        // Fill's drum bars before a change: a turn of a song of the library.
        file = whole.name.replace(/ · turn$/, '');
        songBars = 'drum turns';
      } else if (whole.src) {
        file = baseName(whole.src.path);
        ch = String(whole.src.ch);
        try {
          const info = await parsedFile(whole.src.path);
          const from = Math.round(info.barOfTick(whole.src.at) * 100) / 100;
          songBars = !Number.isInteger(from) ? `from ${from}` : whole.bars > 1 ? `${from}–${from + whole.bars - 1}` : `${from}`;
        } catch { songBars = '(not found)'; }
      }
      const name = first ? `${row.name}${row.mute ? ' (M)' : ''}${row.locked ? ' 🔒' : ''}` : '';
      log.log(tableRow([name, file, ch, songBars, pads.size ? barsText(pads) : 'off'], LOOP_COLUMNS));
      first = false;
    }
  }
}

/**
 * New loop's heads stay at the top while the rows scroll (styles.css, position: sticky): the
 * tabs, then the toolbar under them, then the rows of bars and chords under that. Each sticks
 * below the ones above, so their heights are kept in CSS variables, measured again whenever they
 * change (the window narrower, the toolbar on two lines, the loop drawn anew).
 */
function keepHeadsInView() {
  const root = document.documentElement.style;
  const main = $('loopPanel').closest('main');
  const measure = () => {
    const tabs = $('workspaceTabs').getBoundingClientRect().height;
    const bar = $('loopToolbar').getBoundingClientRect().height;
    const count = $('loopPanel').querySelector('.lp-count')?.getBoundingClientRect().height ?? 0;
    root.setProperty('--stick-tabs', `${Math.round(tabs) + 5}px`);
    root.setProperty('--stick-toolbar', `${Math.round(bar)}px`);
    root.setProperty('--stick-bars', `${Math.round(count)}px`);
    main.classList.toggle('loop-heads-flow', tabs + bar + count >= main.clientHeight - 80);
  };
  const seen = new ResizeObserver(measure);
  for (const id of ['workspaceTabs', 'loopToolbar', 'loopPanel']) seen.observe($(id));
  seen.observe(main);
  measure();
  // Scrolled or not: the tabs' band (styles.css, main.scrolled) only while something can pass under them.
  const scrolled = () => main.classList.toggle('scrolled', main.scrollTop > 0);
  main.addEventListener('scroll', scrolled, { passive: true });
  scrolled();
}

function wire() {
  applySafeBottom();
  keepHeadsInView();
  wireFileMenu();
  wireFileDrops();
  wireFavorites();
  $('tab-favorites').onclick = () => showTab('favorites');
  $('tab-summary').onclick = () => showTab('summary');
  $('summaryRefresh').onclick = () => void act(null, 'Calculate Summary', () => calculateSummary(), false);
  $('summaryBars').onchange = () => renderSummary();
  wireSummaryFilters();
  $('tab-fill').onclick = () => selectFillReviewTab(null);
  $('closeGroupedFill').onclick = closeGroupedFillTab;
  $('favRegion').onclick = (e) => {
    const region = regionFavorites();
    if (region?.sigs) openCollectionsMenu(e, region);
  };
  // The ★ follows the region however it is set (dragged, a fragment chosen in Parts, cleared).
  const setRegion = timeline.setRegion.bind(timeline);
  timeline.setRegion = (...args) => { const r = setRegion(...args); paintRegionStar(); return r; };
  pageWired = true;
  $('revealFile').onclick = (e) => act(e.currentTarget, '📂 Show in Explorer', () => revealFile(selectedPath), false);
  setLogOpen(prefs.get('logOpen') === '1');
  $('lunaExportOpen').onclick = () => $('lunaExportDlg').showModal();
  $('lunaExportClose').onclick = () => $('lunaExportDlg').close();
  $('lunaExportDlg').addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { event.preventDefault(); $('lunaExportDlg').close(); }
  });
  $('logToggle').onclick = () => setLogOpen($('right').classList.contains('log-closed'));
  $('logClose').onclick = () => setLogOpen(false);
  initVerticalSplitter($('right').querySelector('main'), $('split-y'), $('right'));
  // Use the add-on window's title bar for the product version.
  /* eslint-disable no-undef -- defined by vite.config.js */
  if (typeof __VERSION__ === 'string') document.title = `MIDI Digger v${__VERSION__}`;
  /* eslint-enable no-undef */
  initSplitter($('lib'), $('split'), () => { fileTable.renderSoon(); partTable.renderSoon(); });
  $('tab-files').onclick = () => showTab('files');
  $('tab-parts').onclick = () => showTab('parts');
  // Parts' thumbnails drawn again, with or without their fragments.
  $('fFrags').onchange = () => { miniCache.clear(); failedMini.clear(); partTable.render(); };
  $('searchHelpClose').onclick = () => $('searchHelpDlg').close();
  // An example: into Parts' search.
  $('searchHelpDlg').querySelectorAll('[data-query]').forEach((button) => {
    button.onclick = () => {
      $('searchHelpDlg').close();
      $('fGesture').value = '';
      $('fText').value = button.dataset.query;
      clearTimeout(searchTimer);
      searchParts();
      $('fText').focus();
    };
  });
  $('filter').oninput = applyFileFilter;
  $('scan').onclick = (e) => act(e.currentTarget, 'Scan folder', scanFolder, false);
  $('chooseFolder').onclick = (e) => act(e.currentTarget, 'Choose folder', chooseFolder, false);
  $('allowMidi').onclick = (e) => act(e.currentTarget, 'Allow MIDI access', allowMidiAccess, false);
  $('midiAccessLater').onclick = () => $('midiAccessDlg').close();
  $('midiAccessReconnect').onclick = (e) => act(e.currentTarget, 'Allow MIDI access', async () => {
    $('midiAccessError').hidden = true;
    try {
      await allowMidiAccess();
    } catch (error) {
      $('midiAccessError').textContent = error.message;
      $('midiAccessError').hidden = false;
      throw error;
    }
  }, false);
  $('emptyChoose').onclick = (e) => act(e.currentTarget, 'Choose folder', chooseFolder, false);
  $('indexBtn').onclick = toggleIndexing;
  $('helpClose').onclick = () => $('helpDlg').close();
  const dataPlaying = (id, whole) => isPlayingPart(catalog.part(id)) && ((loopMode && !whole) || wholeChannel === whole);
  const dataViewer = new DataViewer($('dataDlg'), catalog, {
    draw: async (id, width, height, whole) => {
      const p = catalog.part(id);
      const cv = Object.assign(document.createElement('canvas'), { width, height });
      drawPartMini(cv, await parsedFile(p.path), p.ch, !whole && p.loopBars ? { at: p.atTick, ticks: p.ticks, n: p.frag } : null);
      return cv;
    },
    play: (id, whole) => {
      if (loopMode && !whole) void act(null, '▶ Listen', () => listenInLoop(id), false);   // as ▶ in Parts
      else if (whole) playChannel(id);
      else playPart(id);
    },
    playing: dataPlaying,
    sounding: () => player.playing || resumeOnLoad,   // a file still loading, to go on playing
    stop: () => stopPreview(),
    seek: (at, id, path) => void seekRow(at, id, path),
    // Where the row playing is in its song (0-1), for the thumbnail's red line; null: not it.
    position: (id, whole) => (dataPlaying(id, whole) ? heardFraction() : null),
    // A row of Files: the whole song, all its tracks over each other; ▶ plays it as Files does.
    drawFile: async (path, width, height) => {
      const cv = Object.assign(document.createElement('canvas'), { width, height });
      drawSongMini(cv, await parsedFile(path));
      return cv;
    },
    playFile: (path) => playFile(path),
    playingFile: (path) => playingFile(path),
    positionFile: (path) => (playingFile(path) ? heardFraction() : null),
    revealFile: (path) => act(null, 'Open folder', async () => {
      if (!luna || !(await luna.gui.available())) throw new Error('LUNA file access is not available.');
      await luna.gui.revealPath(path);
    }, false),
    openInTracks: (selection) => void act(null, 'Open in tracks', () => openDataSelection(selection), false),
    // ➜ LUNA: the row to the session at its cursor, as Send to LUNA's Sound / MIDI say.
    send: (id, whole) => act(null, 'Send to LUNA', () => sendRow(id, whole)),
    sendFile: (path) => act(null, 'Send to LUNA', () => sendRow(null, true, path)),
  }, { save: saveAnalysis, restore: restoreAnalysis });
  $('dataDlg').querySelector('.dv-help').onclick = () => $('helpDlg').showModal();
  // The licence, licensed: its window opens from Data (the toolbar shows only the trial and 🔒).
  $('dataDlg').querySelector('.dv-licence').onclick = () => openLicence();
  $('dataBtn').onclick = () => dataViewer.open();
  fillFilters();
  wireNoteClose();
  wireFillChainBar();

  // ▶ plays what the state says: the marked channels, looping the region when its loop is on.
  $('playAllFills').onclick = (e) => {
    // Playlists playing: all on to their next proposal; none: start them all.
    if (steppableFillChains().length) { stepAllFillChains(); return; }
    playAllFillsPending = true;
    void act(e.currentTarget, '▶▶ All Fill playlists', startAllFillChains, false).then(() => {
      playAllFillsPending = false;
      paintPlayAllFills();
    });
  };
  $('pvPlay').onclick = mainPlay;
  $('songTab').onclick = activateSongTab;
  $('newLoop').onclick = () => act(null, '+ New loop', startNewLoop, false);
  $('pvStop').onclick = stopPreview;
  $('soundSrc').onchange = () => void applySound();
  $('sf2Choose').onclick = (e) => act(e.currentTarget, 'Choose soundfont', chooseSoundFont, false);
  renderSoundOptions();
  // The soundfont loads at start (a fraction of a second) so the first ▶ already sounds with it.
  if ($('soundSrc').value === 'sf2') void applySound();
  // A card that does not fit scrolls sideways; the mouse wheel moves it too.
  for (const card of document.querySelectorAll('.deck > .card')) {
    card.addEventListener('wheel', (e) => {
      if (card.scrollWidth <= card.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.target.closest('select')) return;
      e.preventDefault();
      card.scrollLeft += e.deltaY;
    }, { passive: false });
  }
  for (const id of ['destNew', 'destSel']) $(id).addEventListener('change', renderCompose);
  $('undo').onclick = () => { if (loopMode) undoLoop(); };
  $('redo').onclick = () => { if (loopMode) redoLoop(); };
  // In New loop, the keys every program has: Ctrl+Z undo, Ctrl+Y (or Ctrl+Shift+Z) redo, and
  // Ctrl+C / X / V the selected pads as ⧉ Copy, ✂ Cut and 📋 Paste. Not while typing in a field or
  // with a dialog open; Copy, Cut and Paste only with pads selected (else the text's own).
  window.addEventListener('keydown', (e) => {
    if (!loopMode || !(e.ctrlKey || e.metaKey) || e.altKey) return;
    if (document.querySelector('dialog[open]') || e.target.closest?.('input, select, textarea, [contenteditable="true"]')) return;
    const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); undoLoop(); return; }
    if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); redoLoop(); return; }
    const tool = { c: '.lp-copy', x: '.lp-cut', v: '.lp-paste' }[k];
    if (tool && loopPanel.sel && !e.shiftKey) { e.preventDefault(); loopPanel.toolbar.querySelector(tool).click(); }
  });
  wirePartDrag();
  wireFragmentKeys();
  loopPanel.showSync(lunaSync, syncMs);
  // Save loop / Open loop: New loop's loop (an old Loop kit opens as one).
  $('loopSave').onclick = (e) => act(e.currentTarget, 'Save loop', saveLoop, false);
  $('loopOpen').onclick = (e) => act(e.currentTarget, 'Open loop', openSaved, false);
  $('fitSession').onclick = (e) => act(e.currentTarget, '🎯 Fit to session', readSessionFit);
  $('fitOff').onclick = stopSessionFit;
  $('loopMidi').onclick = (e) => act(e.currentTarget, 'Export MIDI', exportMidi, false);
  renderCompose();
  $('addPicks').onclick = (e) => act(e.currentTarget, 'Send to LUNA', addToLuna);
  $('importFile').onclick = (e) => act(e.currentTarget, 'Export whole file', importWhole);
  $('newTracks').onclick = () => {
    takeOut = null;
    log.log('The next send of the loop goes to new tracks, at LUNA’s cursor.');
  };
  paintPlayer();
}

async function connect() {
  wire();
  await loadSaved();   // the saved library shows at once, before LUNA answers
  // With a library to show, the page is the user's now. With none (LUNA cleared it when it
  // restarted) it stays under the veil until the folder is listed again, below.
  working(index ? null : 'Waiting for LUNA…');
  void offerStartupMidiAccess();
  for (;;) {
    try {
      luna = await Luna.connect();   // inside LUNA the page URL carries ?port=
      paintFileFacts();   // 📂 can show the file in Explorer now
      break;
    } catch (e) {
      showStatus(e instanceof Luna.NotRunning ? 'Waiting for LUNA…' : e.message, true);
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  Luna.bindShortcuts(luna);
  void startLicence().catch((e) => reportError(e, 'licence'));
  await luna.sessions.ready();
  luna.sessions.focused.onChange(bindSession);
  luna.sessions.items.onChange(bindSession);
  luna.status.onChange(() => {
    if (luna.status.value === 'disconnected') showStatus('Reconnecting to LUNA…', true);
    else if (luna.status.value === 'connected') showStatus(session?.name.value ?? NO_SESSION, !session);
  });
  await bindSession();
  log.log(`Connected to ${luna.engine ?? 'LUNA'}.`);
  if (!index) working('Loading the library…');
  try {
    await restoreLibrary();
  } finally {
    working(null);
  }
  void offerStartupMidiAccess();
}

// For LUNA's web inspector and automated checks: the live state, read-only by convention.
globalThis.MidiLibraryDebug = {
  setLogOpen,
  catalog, indexer, store, player, reader, timeline, marked, setIndex, selectFile, loopPattern, searchParts, showTab, openExploreFile, importSong, songFragmentsIntoLoop, openKitFile, get loop() { return loop; }, get loopPanel() { return loopPanel; }, loopSongOf: loopSong, padSpansOf: padSpans, contentKeyOf: contentKey, explorer, sfEngine, soundTester, dropFavorite, dropInLoop, set askEvery(n) { ASK_EVERY = n; }, toggleIndexing, get favorites() { return favorites; }, get loopUndoSteps() { return loopHistory.length; }, get partResults() { return partResults; }, get fillChain() { return fillChain; }, get fillChainCount() { return fillChains.size; }, get fillChainIndices() { return [...fillChains.values()].map((c) => ({ row: c.row.name, cur: c.cur?.index ?? null, next: c.next?.index ?? null, nextAt: c.next?.at ?? null, of: c.items.length })); }, get repeatTrace() { return repeatTrace; }, set repeatTrace(list) { repeatTrace = list; }, get explored() { return explored; }, get sessionFit() { return sessionFit; }, get licence() { return licence; }, get current() { return current; }, get session() { return session; } };

// ── the licence (src/licence.js): Files, Parts and Favorites free; the loops, a trial, then a key ──

const licence = createLicence({
  secrets: {
    get: (name) => (luna ? luna.secrets.get(name) : null),
    set: (name, value) => luna?.secrets.set(name, value),
    delete: (name) => luna?.secrets.delete(name),
  },
  prefs,
});

/** Every way into a loop goes through here (makeLoopTab): after the trial, only with a licence. */
function requireLoops() {
  if (!licence.loaded || licence.access().allowed) return;
  paintLicence();
  openLicence();
  const why = licence.access().keyEnded ? `The promotional key ended on ${licence.access().keyEnded}` : `The ${TRIAL_DAYS}-day loop trial has ended`;
  throw new Error(`${why}. Files, Parts and Favorites go on working; enter a licence key (or Buy…) to unlock the loops.`);
}

const daysText = (n) => `${n} day${n === 1 ? '' : 's'}`;

/**
 * The button left of the status: the trial's days, a promotional key's days, 🔒 when they are
 * over; nothing with a licence that never ends.
 */
function paintLicence() {
  const button = $('licenceBtn');
  if (!licence.loaded) { button.hidden = true; return; }
  const a = licence.access();
  const promo = a.reason === 'licensed' && a.daysLeft !== null;
  const owned = a.reason === 'licensed' && !promo;
  button.hidden = owned;   // licensed for good: nothing in the toolbar (▦ Data → ✓ Licence…)
  const inData = $('dataDlg').querySelector('.dv-licence');
  if (inData) inData.hidden = !owned;
  button.classList.toggle('over', !a.allowed);
  button.classList.toggle('owned', owned);
  button.textContent = !a.allowed ? '🔒 Unlock loops' : owned ? '✓ Licensed' : promo ? `Promo licence: ${daysText(a.daysLeft)} left` : `Loops trial: ${daysText(a.daysLeft)} left`;
  button.title = !a.allowed ? 'The loops are locked: click to buy or enter a licence key'
    : owned ? `Licensed to ${licence.licence.e}: click to see the licence`
      : promo ? `Your promotional key unlocks the loops until ${licence.licence.x}; then they need a licence. Click to buy`
        : 'The loops work for the trial; then they need a licence. Click to buy or enter a key';
}

function openLicence() {
  const a = licence.access();
  const owner = licence.licence?.e;
  const promo = a.reason === 'licensed' && a.daysLeft !== null;
  $('licenceText').textContent = a.reason === 'licensed'
    ? promo
      ? `A promotional licence for ${owner} unlocks the loops until ${licence.licence.x} (${daysText(a.daysLeft)} left; licence number ${licence.licence.n}). Buy a licence to keep them after that.`
      : `MIDI Digger ${licence.licence.v} is licensed to ${owner}. Licence number ${licence.licence.n}, issued ${licence.licence.d}. Thank you!`
    : a.keyEnded
      ? `The promotional key ended on ${a.keyEnded}. Enter a licence key to unlock the loops again.`
      : a.allowed
        ? `The loops are on trial: ${daysText(a.daysLeft)} left of ${TRIAL_DAYS}. Enter your licence key to keep them.`
        : `The ${TRIAL_DAYS}-day loop trial has ended. Enter your licence key to unlock the loops.`;
  $('licenceEnter').hidden = a.reason === 'licensed' && !promo;
  $('licenceRemove').hidden = a.reason !== 'licensed';
  $('licenceBuy').hidden = a.reason === 'licensed' && !promo;
  $('licenceError').hidden = true;
  resetLicenceRemove();
  if (!$('licenceDlg').open) $('licenceDlg').showModal();
  if (!$('licenceEnter').hidden) $('licenceKey').focus();
}

/** Remove from this computer back to its first step (asking again before it removes). */
function resetLicenceRemove() {
  const button = $('licenceRemove');
  button.classList.remove('confirm');
  button.textContent = 'Remove from this computer';
}

function licenceFailed(error) {
  $('licenceError').textContent = error.message;
  $('licenceError').hidden = false;
}

async function busyButton(button, label, work) {
  const text = button.textContent;
  button.disabled = true;
  button.textContent = label;
  try { await work(); } catch (e) { licenceFailed(e); } finally { button.disabled = false; button.textContent = text; }
}

function wireLicence() {
  $('licenceBtn').onclick = openLicence;
  $('licenceClose').onclick = () => $('licenceDlg').close();
  $('licenceBuy').onclick = () => {
    if (luna) void luna.gui.openUrl(BUY_URL).catch(() => window.open(BUY_URL, '_blank'));
    else window.open(BUY_URL, '_blank');
  };
  const activate = () => busyButton($('licenceActivate'), 'Checking…', async () => {
    await licence.activate($('licenceKey').value);
    $('licenceKey').value = '';
    paintLicence();
    openLicence();
    log.ok('🔓 MIDI Digger licensed on this computer: the loops are unlocked.');
  });
  $('licenceActivate').onclick = activate;
  $('licenceKey').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); void activate(); } };
  // Remove asks first, in the dialog itself: the first click says what it does, the second does it.
  $('licenceRemove').onclick = () => {
    const button = $('licenceRemove');
    if (!button.classList.contains('confirm')) {
      button.classList.add('confirm');
      button.textContent = 'Yes, remove it';
      $('licenceError').textContent = 'Remove the licence from this computer? The loops will be locked here until the key is entered again (keep your purchase email). Click "Yes, remove it" to confirm.';
      $('licenceError').hidden = false;
      return;
    }
    resetLicenceRemove();
    void removeLicence();
  };
  const removeLicence = () => busyButton($('licenceRemove'), 'Removing…', async () => {
    await licence.deactivate();
    paintLicence();
    openLicence();
    log.log('The licence was removed from this computer; the same key can be entered again here or on another of your computers.');
  });
}

/** Once LUNA answers (luna.secrets): what is kept (a kept key checked again), the trial started on a first run. */
async function startLicence() {
  await licence.load();
  paintLicence();
}

wireLicence();
void connect().catch((e) => { working(null); throw e; });

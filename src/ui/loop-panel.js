// The loop built from nothing, on the right panel: tempo, meter, key and length over a row of pads per
// instrument. Parts are dropped on a pad, or under the rows for a new instrument. It only shows
// and edits the loop (midi/loop.js); main.js makes it sound.

import { barChordText } from '../midi/chords.js';
import { EARLY, METERS, SWINGS, SWING_GRIDS, VELS, alignPads, barBeats, gridName, clearPads, copyPads, feelPads, feelText, heardNotes, loopBars, loopChords, moveBlock, moveRow, mutePads, padBars, meterPulses, padOff, pastePads, setMeter, shiftPads, tailPads, legatoPads, tuneLoop, MODES, modePads, timePads, lockToDrums, duplicateRows } from '../midi/loop.js';
import { esc } from './dom.js';
import { instrumentSvg } from './family-icons.js';
import { noteColor, octaveScale, pitchY } from './mini.js';

/** Where a clip comes from (its `src`): its file and, when known, the bars of the song it is. '' with none. */
export function sourceText(src) {
  if (!src?.path) return '';
  const file = src.path.split(/[\\/]/).pop();
  const bars = src.bar > 0 && src.bars > 0 ? (src.bars > 1 ? ` · bars ${src.bar}–${src.bar + src.bars - 1}` : ` · bar ${src.bar}`) : '';
  return `${file}${bars}`;
}

/** A menu that does something on choosing: its name first (no value), then its choices. */
const menu = (name, items) => `<option value="">${name}…</option>${items.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}`;

/** Swing's menu: straight, then the swings of 8ths and of 16ths ("grid:percent"). */
const SWING_MENU = `<option value="">Swing…</option><option value="0.25:50">Straight</option>${SWING_GRIDS.map((g) =>
  `<optgroup label="${gridName(g)}">${SWINGS.map((s) => `<option value="${g}:${s}">${gridName(g)} · ${s} %</option>`).join('')}</optgroup>`).join('')}`;

/** Mode's menu: the seven-note modes (by degree), those of fewer notes (to the nearest), and back. */
const MODE_MENU = '<option value="">Mode…</option>'
  + `<optgroup label="By degree">${['major', 'minor', 'harmonic', 'melodic', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian'].map((m) => `<option value="${m}">${MODES[m][0]}</option>`).join('')}</optgroup>`
  + `<optgroup label="Fewer notes (to the nearest)">${['majpent', 'minpent', 'blues'].map((m) => `<option value="${m}">${MODES[m][0]}</option>`).join('')}</optgroup>`
  + '<option value="original">Original</option>';

/** Tail's menu: from the pad on the left (held on), from the one on the right (pushed in early): "side:fraction of a bar". */
const TAIL_MENU = '<option value="">Tail…</option>'
  + `<optgroup label="◀ From left (tail)">${[['0.25', '1/4'], ['0.5', '2/4'], ['0.75', '3/4'], ['1', '4/4']].map(([v, t]) => `<option value="left:${v}">◀ ${t}</option>`).join('')}</optgroup>`
  + `<optgroup label="▶ From right (push)">${[['0.125', '1/8'], ['0.25', '1/4'], ['0.5', '2/4']].map(([v, t]) => `<option value="right:${v}">▶ ${t}</option>`).join('')}</optgroup>`
  + '<option value="none:0">No tail</option>'
  + '<optgroup label="⌒ Legato (pads with notes)"><option value="legato:1">⌒ Legato</option><option value="legato:0">No legato</option></optgroup>';

/** Arrange's patterns, in groups: value, name, what it does. */
const PATTERNS = [
  ['Energy', [
    ['loops', '▅▅▅▅ All together', 'Everything plays; the shortest loops come in last and go out first'],
    ['build', '▁▃▅▇ Build-up', 'In one after another (drums, bass, chords, melody), all ending together: the tension goes up'],
    ['builddown', '▇▅▃▁ Build-down', 'All together, then out one after another, melody first and drums last: the tension comes down'],
    ['breakdown', '▅▅▁▅ Breakdown', 'In one by one; halfway the drums and bass rest for a moment; out the way they came'],
    ['song', '▃▅▇▅▃ Arc', 'In one by one, all together at the top, out the way they came'],
  ]],
  ['Arranger styles', [
    ['fill', '▇▇▇▁ Groove with fill', 'Everything plays; the last bar of every four the drums alone, a fill-in into the next'],
    ['stop', '▇▁▇▁ Stop-time', 'Stop-time, as in rock and funk: a bar everything, a bar the drums alone'],
  ]],
  ['Learned', [
    ['markov', '✨ Markov', 'As the songs of your library are arranged: which rows play in each phrase of 4 bars, and a drum turn before a change. Again for another version; Safe / Normal / Daring next to Fill'],
  ]],
];
const PLAY = PATTERNS.flatMap(([, items]) => items).map(([v, t, tip]) => {
  const [mark, ...name] = t.split(' ');
  const label = v === 'markov' ? '🎲' : mark;
  return `<button class="lp-play" data-template="${v}" title="${name.join(' ')}: ${tip}. Arrange the current fragments, then try compatible library alternatives. Locked rows stay unchanged · ↶ to undo">${label}</button>`;
}).join('');

export const DARING =[['0.6', 'Safe'], ['1', 'Normal'], ['1.8', 'Daring']];
const LENGTHS = [['', 'Auto'], ['1', '1 bar'], ['2', '2 bars'], ['4', '4 bars'], ['8', '8 bars'], ['12', '12 bars'], ['16', '16 bars'], ['32', '32 bars']];
const TONICS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const KEYS = [...TONICS.map((t, k) => [`${k} mayor`, `${t} major`]), ...TONICS.map((t, k) => [`${k} menor`, `${t} minor`])];

export class LoopPanel {
  /**
   * `el`: the box to fill; `loop`: the loop; onChange({ restart }): it changed; onClose();
   * onExploreClose(): the track being explored taken away; onExploreOpenSong(): open its song;
   * onFill(daring): ✨ Fill;
   * onImport(): ⇡ Loop from song, the song being explored; onImportFragments(): ⇉ All fragments,
   * its instruments' fragments one after another; onArrange(template, daring): arrange
   * the rows as a pattern and try compatible alternatives; onSync(on, ms): 🔗 play along with LUNA, and
   * its offset.
   */
  constructor(el, loop, { onChange, onExploreClose, onExploreOpenSong = () => {}, onFill, onImport, onImportFragments = () => {}, onArrange, onSync, onWarning, onSound = () => {}, onFavorite = () => {}, favoriteOf = () => [], onSeekBar = () => {}, onSelection = null, playlistActive = () => false, toolbar = el }) {
    Object.assign(this, { el, loop, onChange, toolbar, onSeekBar, favoriteOf, onSelection, playlistActive });
    toolbar.innerHTML = `
      <div class="lp-head">
        <label>Tempo <input class="lp-bpm" type="number" min="40" max="240"></label>
        <label title="The bars of the loop. It takes the first part's">Meter <select class="lp-meter">${METERS.map((m) => `<option value="${m}">${m}</option>`).join('')}</select></label>
        <label>Key <select class="lp-key"><option value="">–</option>${KEYS.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></label>
        <label>Length <select class="lp-length">${LENGTHS.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></label>
        <button class="lp-sync" title="Play along with LUNA: press play in LUNA and the loop plays with your session, on its bars (the loop's bar 1 on the session's bar 1, round and round); LUNA stops, it stops. Hear the loop, or a part with ▶, over what you have recorded">🔗 LUNA</button>
        <label class="lp-sync-ms" title="Move the loop earlier (+) or later (−) against LUNA, in milliseconds, if it does not sound together with the session: the page's sound and LUNA's reach your speakers with different delays" hidden><input type="number" step="5" min="-500" max="500"> ms</label>
        <span class="lp-hint"></span>
        <span class="lp-play-group" title="Arrange the loop and try compatible library alternatives">${PLAY}</span>
        <button class="lp-fill" title="With pads selected, replace only those bars on each selected instrument, keeping its sound; without a selection, add one new instrument. Fill scores fragments for harmony, groove, duration, MIDI dynamics, activity, and learned song roles.">✨ Fill</button>
        <select class="lp-source" title="Where ✨ Fill and Arrange take fragments from: your whole library, or one of your ★ collections (any tempo, the loop's meter). From a collection a row keeps its sound and takes a favourite of its role"><option value="">Library</option></select>
        <select class="lp-daring" title="How strongly Fill and Markov Arrange follow role combinations found in analysed songs: Safe favors common roles; Daring allows less common roles">${DARING.map(([v, t]) => `<option value="${v}"${v === '1' ? ' selected' : ''}>${t}</option>`).join('')}</select>
      </div>
      <div class="lp-tools">
        <button class="lp-copy" title="Copy the selected pads (Ctrl+C)">⧉ Copy</button>
        <button class="lp-cut" title="Copy the selected pads and empty them (Ctrl+X)">✂ Cut</button>
        <button class="lp-paste" title="Paste what was copied, starting at the selected pad; the selection then moves on, to paste it again after it (Ctrl+V)">📋 Paste</button>
        <button class="lp-silence" title="Selected pads off (their notes stay), or on again">◐ On / off</button>
        <button class="lp-clear" title="Empty the selected pads (Delete)">✕ Clear</button>
        <button class="lp-align-left" title="Align the selected notes to the start as one block, keeping their rhythm and the timing between tracks. Swing and velocity are rendered into the notes.">⇤ Align left</button>
        <button class="lp-align-right" title="Align the selected notes to the end as one block, keeping their rhythm and the timing between tracks. Swing and velocity are rendered into the notes.">⇥ Align right</button>
        <button class="lp-down" title="The selected pads a semitone down, over the loop's key (never the drums)">▼ −1</button>
        <button class="lp-up" title="The selected pads a semitone up, over the loop's key (never the drums)">▲ +1</button>
        <button class="lp-oct-down" title="The selected pads an octave down (never the drums)">−8va</button>
        <button class="lp-oct-up" title="The selected pads an octave up (never the drums)">+8va</button>
        <select class="lp-mode" title="Mode: the selected pads in another mode of the loop's key, its tonic kept (D major to D minor, dorian, mixolydian…): each note by its degree, so the phrase keeps its shape and changes colour. Pentatonics and blues have fewer notes: each note goes to the nearest, which can change the melody, listen to it. Original puts the notes back. Needs the loop's Key; never the drums">${MODE_MENU}</select>
        <span class="lp-group" title="Time and groove of the selected bars">
        <button class="lp-half" title="Half time: the selected bars twice as slow (every note twice as long and as far apart), their first half filling them. For breakdowns. The drums too">½×</button>
        <button class="lp-double" title="Double time: the selected bars twice as fast, played twice to fill them. For build-ups and fills. The drums too">2×</button>
        <button class="lp-lockdrums" title="Lock to drums: in the selected bars, each note of the selected rows that starts within a 16th of a drum hit moves onto it, so the bass or the keys push and swing with the drums (their groove). The drums are the guide and do not move">🥁 Lock</button>
        </span>
        <button class="lp-layer" title="Layer: each selected row doubled right under it, the same pads and notes, to give it another sound (♪) or move it an octave (piano + pad, bass + sub). Not the drums">⊕ Layer</button>
        <select class="lp-swing" title="Swing for the selected pads, the drums too, as an MPC: 1/8 delays each second 8th of a pair (what most parts play), 1/16 each second 16th. 54 % barely, 66 % a triplet feel, 75 % a hard shuffle. Straight: as they came">${SWING_MENU}</select>
        <select class="lp-vel" title="How hard the selected pads play, the drums too: their notes' velocity times this">${menu('Velocity', VELS.map((v) => [v, `${Math.round(v * 100)} %`]))}</select>
        <select class="lp-tail" title="In every empty pad of the selection that follows or comes before a phrase (all the rows and bars selected), so a phrase does not stop or start abruptly. ◀ From left (tail): the notes the pad on the left ends with, held on 1/4 to 4/4 of it. ▶ From right (push): the notes the pad on the right starts with come in 1/8 to 2/4 of a bar early, an anticipation; in the last pad, bar 1's, a pickup as the loop goes round (bar 1 strikes them again). The same notes, not struck again; both on one pad if they do not meet; not the drums. Again on it to change it; No tail takes both away. ⌒ Legato, on pads with notes: at the end of each, the same note going on into the next pad is held, not struck again, and a gap of up to a beat before the bar line is closed (never past it); the notes inside stay as they are. No legato takes it away">${TAIL_MENU}</select>
      </div>
      <button type="button" class="lp-tools-toggle" aria-expanded="true" title="Hide loop tools to make room for the pads">▴ Hide tools</button>
    `;
    el.innerHTML = `
      <div class="lp-grid"></div>
      <div class="lp-explore">
        <div class="lp-explore-empty">Drop a part here to see its whole track: zoom, scroll and pick the bars you want</div>
        <div class="lp-explore-head" hidden>
          <span class="field-label">Explore</span><button type="button" class="lp-explore-name" title="Open this MIDI as a song"> </button>
          <span class="lp-explore-take" title="Drag the selected tracks onto a pad or under the rows. Several tracks create new rows at the same bar; drums use the existing drums row.">⠿ Drag the selection to the loop</span>
          <button class="lp-explore-import" title="Remix fragments from the tracks selected below (all of them when none is) into instrument rows. Press again for another variation; locked rows, and this song's rows of the tracks not selected, stay unchanged. Fragments use their row's sound (↶ to undo)" hidden>⇡ Loop from song</button>
          <button class="lp-explore-fragments" title="Each track selected below (all of them when none is) in a row of its own, its different fragments (as Fragments shows them, each once) one after another from bar 1, in the order the song plays them. One longer than the bars left is cut at the loop's end; when they run out, the rest of the row stays empty. Locked rows, and this song's rows of the tracks not selected, stay unchanged (↶ to undo)" hidden>⇉ All fragments</button>
          <button class="lp-explore-close" title="Empty this track">✕</button>
        </div>
        <div class="timeline lp-explore-lane" hidden></div>
      </div>`;
    this.grid = el.querySelector('.lp-grid');
    this.grid.tabIndex = 0;
    this.grid.setAttribute('aria-label', 'Loop pads; press Delete to empty the selected pads');
    this.explore = el.querySelector('.lp-explore');
    this.exploreLane = el.querySelector('.lp-explore-lane');
    this.exploreTake = el.querySelector('.lp-explore-take');
    el.querySelector('.lp-explore-close').onclick = onExploreClose;
    el.querySelector('.lp-explore-name').onclick = onExploreOpenSong;
    el.querySelector('.lp-explore-import').onclick = onImport;
    el.querySelector('.lp-explore-fragments').onclick = onImportFragments;
    const toolsToggle = toolbar.querySelector('.lp-tools-toggle');
    toolsToggle.onclick = () => {
      const collapsed = toolbar.classList.toggle('lp-tools-collapsed');
      toolsToggle.setAttribute('aria-expanded', String(!collapsed));
      toolsToggle.textContent = collapsed ? '▾ Show tools' : '▴ Hide tools';
      toolsToggle.title = collapsed ? 'Show loop tools' : 'Hide loop tools to make room for the pads';
    };
    this.source = toolbar.querySelector('.lp-source');
    this.source.onchange = () => this.source.classList.toggle('on', !!this.source.value);
    for (const b of toolbar.querySelectorAll('.lp-play')) b.onclick = () => onArrange(b.dataset.template, Number(toolbar.querySelector('.lp-daring').value) || 1, this.source.value);
    const changed = (restart) => { this.render(); onChange({ restart }); };
    toolbar.querySelector('.lp-bpm').onchange = (e) => {
      loop.bpm = Math.max(40, Math.min(240, Number(e.target.value) || loop.bpm));
      changed(true);
    };
    toolbar.querySelector('.lp-meter').onchange = (e) => {
      setMeter(loop, e.target.value);
      changed(true);
    };
    toolbar.querySelector('.lp-key').onchange = (e) => {
      loop.key = e.target.value;
      tuneLoop(loop);
      changed(false);
    };
    toolbar.querySelector('.lp-length').onchange = (e) => {
      loop.length = Number(e.target.value) || null;
      changed(false);
    };
    toolbar.querySelector('.lp-fill').onclick = () => onFill(Number(toolbar.querySelector('.lp-daring').value) || 1, this.sel, this.source.value);
    const syncMs = toolbar.querySelector('.lp-sync-ms input');
    toolbar.querySelector('.lp-sync').onclick = (e) => onSync(!e.currentTarget.classList.contains('on'), Number(syncMs.value) || 0);
    syncMs.onchange = () => onSync(true, Math.max(-500, Math.min(500, Number(syncMs.value) || 0)));
    this.grid.addEventListener('click', (e) => {
      const bar = e.target.closest('.pad-bar');
      if (bar) { onSeekBar(Number(bar.dataset.bar)); return; }
      const row = loop.rows[Number(e.target.closest('[data-row]')?.dataset.row)];
      if (!row) return;
      if (e.target.closest('.pad')) return;   // pads are selected (wireSelection)
      if (e.target.closest('.lp-sound')) { onSound(row); return; }
      if (e.target.closest('.lp-fav')) { onFavorite(row, e); return; }
      if (e.target.closest('.lp-mute')) row.mute = !row.mute;
      else if (e.target.closest('.lp-solo')) row.solo = !row.solo;
      else if (e.target.closest('.lp-remove')) loop.rows.splice(loop.rows.indexOf(row), 1);
      else if (e.target.closest('.lp-lock')) row.locked = !row.locked;
      else return;
      changed(false);
    });
    this.grid.addEventListener('input', (e) => {
      const row = loop.rows[Number(e.target.closest('[data-row]')?.dataset.row)];
      if (row && e.target.matches('.lp-volume')) { row.volume = Number(e.target.value); onChange({ restart: false, sliding: true }); }
    });
    // Let go: that is the change (for ↶).
    this.grid.addEventListener('change', (e) => {
      if (e.target.matches('.lp-volume')) onChange({ restart: false });
    });
    this.sel = null;       // the pads selected: { r0, r1, c0, c1 }
    this.copied = null;    // what Copy or Cut took (copyPads)
    this.wireSelection(() => changed(false));
    this.wireRowDrag(() => changed(false));
    const act = (fn) => () => { if (this.sel && fn(this.sel)) changed(false); else this.paintSel(); };
    toolbar.querySelector('.lp-copy').onclick = act((sel) => { this.copied = copyPads(loop, sel, this.unit); return false; });
    toolbar.querySelector('.lp-cut').onclick = act((sel) => { this.copied = copyPads(loop, sel, this.unit); return clearPads(loop, sel, this.unit); });
    const clear = act((sel) => clearPads(loop, sel, this.unit));
    toolbar.querySelector('.lp-clear').onclick = clear;
    this.grid.addEventListener('keydown', (e) => {
      if (e.target !== this.grid || e.key !== 'Delete' || e.ctrlKey || e.altKey || e.metaKey || e.shiftKey || e.repeat || !this.sel) return;
      e.preventDefault();
      clear();
    });
    toolbar.querySelector('.lp-silence').onclick = act((sel) => mutePads(loop, sel, this.unit));
    for (const direction of ['left', 'right']) {
      toolbar.querySelector(`.lp-align-${direction}`).onclick = act((sel) => {
        try { return alignPads(loop, sel, this.unit, direction); }
        catch (error) { onWarning(`Align ${direction}: ${error.message}`); return false; }
      });
    }
    toolbar.querySelector('.lp-down').onclick = act((sel) => shiftPads(loop, sel, this.unit, -1));
    toolbar.querySelector('.lp-up').onclick = act((sel) => shiftPads(loop, sel, this.unit, 1));
    toolbar.querySelector('.lp-oct-down').onclick = act((sel) => shiftPads(loop, sel, this.unit, -12));
    toolbar.querySelector('.lp-oct-up').onclick = act((sel) => shiftPads(loop, sel, this.unit, 12));
    toolbar.querySelector('.lp-half').onclick = act((sel) => timePads(loop, sel, this.unit, 2));
    toolbar.querySelector('.lp-double').onclick = act((sel) => timePads(loop, sel, this.unit, 0.5));
    toolbar.querySelector('.lp-lockdrums').onclick = act((sel) => {
      const { changed, why } = lockToDrums(loop, sel, this.unit);
      if (!changed) onWarning(`Lock to drums: ${why}.`);
      return changed;
    });
    toolbar.querySelector('.lp-layer').onclick = act((sel) => {
      const { added, why } = duplicateRows(loop, sel);
      if (why) onWarning(`Layer: ${why}.`);
      return added > 0;
    });
    const mode = toolbar.querySelector('.lp-mode');
    mode.onchange = () => {
      const value = mode.value;
      mode.value = '';
      act((sel) => {
        const { changed, why } = modePads(loop, sel, this.unit, value);
        if (why) onWarning(`Mode: ${why}.`);
        else if (changed && MODES[value]?.[1].length < 7) onWarning(`Mode: ${MODES[value][0]} has fewer notes than the phrase's scale: each note went to the nearest of it. Listen to it (↶ to undo, or Original).`);
        return changed;
      })();
    };
    // Swing and Velocity: a choice is done at once, and the menu shows its name again.
    const swing = toolbar.querySelector('.lp-swing');
    swing.onchange = () => {
      const [grid, value] = swing.value.split(':').map(Number);   // "0.5:66"; "0.25:50" straight
      swing.value = '';
      act((sel) => feelPads(loop, sel, this.unit, { swing: value, swingGrid: grid }))();
    };
    const vel = toolbar.querySelector('.lp-vel');
    vel.onchange = () => {
      const value = Number(vel.value);
      vel.value = '';
      act((sel) => feelPads(loop, sel, this.unit, { vel: value }))();
    };
    const tail = toolbar.querySelector('.lp-tail');
    tail.onchange = () => {
      const [side, amount] = tail.value.split(':');
      const value = Number(amount) || 0;
      tail.value = '';
      act((sel) => {
        if (side === 'legato') {
          const { done, why } = legatoPads(loop, sel, this.unit, value > 0);
          if (!done && why) onWarning(`Legato: ${why}.`);
          return done > 0;
        }
        const { done, why } = tailPads(loop, sel, this.unit, value, side);
        if (!done && why) onWarning(`Tail: ${why}.`);
        return done > 0;
      })();
    };
    toolbar.querySelector('.lp-paste').onclick = act((sel) => {
      if (!this.copied || !pastePads(loop, this.copied, { r: sel.r0, c: sel.c0 }, this.unit, this.cols)) return false;
      // Selected now: the next place, right after it, so Paste again goes on along the row.
      const { rows, cols } = this.copied;
      const c0 = Math.min(sel.c0 + cols, this.cols - 1);
      this.sel = { r0: sel.r0, r1: Math.min(sel.r0 + rows, loop.rows.length) - 1, c0, c1: Math.min(c0 + cols, this.cols) - 1 };
      return true;
    });
  }

  /**
   * Pads are chosen with the mouse, for the tools over them: a click selects one, a drag from a
   * pad not selected the pads between where it started and where it is (several rows too). A
   * drag from a selected pad takes the selection elsewhere, as the tiles of a sliding puzzle
   * (moveBlock). A click on the only pad selected lets it go; on one of several, keeps just it.
   * Shift + click (or drag), as in a DAW: everything from the pad clicked first (the anchor) to
   * this one, rows and bars.
   */
  wireSelection(changed) {
    let drag = null;
    this.anchor = null;   // the pad a selection started from: Shift + click reaches from it
    const cell = (e) => {
      const pad = document.elementFromPoint(e.clientX, e.clientY)?.closest('.lp-grid .pad');
      return pad && { r: Number(pad.dataset.row), c: Number(pad.dataset.col), pad };
    };
    const rect = (a, b) => ({ r0: Math.min(a.r, b.r), r1: Math.max(a.r, b.r), c0: Math.min(a.c, b.c), c1: Math.max(a.c, b.c) });
    const inside = (s, { r, c }) => !!s && r >= s.r0 && r <= s.r1 && c >= s.c0 && c <= s.c1;
    const shifted = (s, { dr, dc }) => ({ r0: s.r0 + dr, r1: s.r1 + dr, c0: s.c0 + dc, c1: s.c1 + dc });
    this.grid.addEventListener('contextmenu', (e) => {
      if (e.target.closest('.lp-grid .pad')) e.preventDefault();
    });
    this.grid.addEventListener('pointerdown', (e) => {
      const at = cell(e);
      if (e.button === 2) {
        if (!inside(this.sel, at)) return;
        const block = copyPads(this.loop, this.sel, this.unit);
        if (!block.cells.some((part) => part.clips.length)) return;
        e.preventDefault();
        drag = { mode: 'copy', at, x: e.clientX, y: e.clientY, ghost: null, to: null, block };
        return;
      }
      if (e.button !== 0 || !at) return;
      e.preventDefault();
      this.grid.focus({ preventScroll: true });
      const s = this.sel;
      if (e.shiftKey && s && this.anchor && this.anchor.r < this.loop.rows.length && this.anchor.c < this.cols) {
        drag = { mode: 'select', at: this.anchor };
        this.sel = rect(this.anchor, at);
        this.paintSel();
        return;
      }
      if (inside(s, at)) {
        drag = { mode: 'move', at, x: e.clientX, y: e.clientY, ghost: null, by: null, alone: s.r0 === s.r1 && s.c0 === s.c1 };
        return;
      }
      drag = { mode: 'select', at };
      this.anchor = { r: at.r, c: at.c };
      this.sel = rect(at, at);
      this.paintSel();
    });
    window.addEventListener('pointermove', (e) => {
      if (!drag) return;
      if (drag.mode === 'select') {
        const to = cell(e);
        if (!to) return;
        const next = rect(drag.at, to);
        if (JSON.stringify(next) === JSON.stringify(this.sel)) return;
        this.sel = next;
        this.paintSel();
        return;
      }
      if (!drag.ghost) {
        if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
        // The pad block held, floating; a badge says how many pads go with it.
        const box = drag.at.pad.getBoundingClientRect();
        const n = (this.sel.r1 - this.sel.r0 + 1) * (this.sel.c1 - this.sel.c0 + 1);
        drag.ghost = Object.assign(drag.at.pad.cloneNode(true), { className: 'pad on lp-pad-ghost' });
        if (n > 1) drag.ghost.append(Object.assign(document.createElement('b'), { textContent: `×${n}` }));
        drag.ghost.style.width = `${box.width}px`;
        drag.ghost.style.height = `${box.height}px`;
        document.body.append(drag.ghost);
        if (drag.mode === 'move') {
          for (const pad of this.grid.querySelectorAll('.pad.sel')) pad.classList.add('lifted');
        }
      }
      drag.ghost.style.left = `${e.clientX + 8}px`;
      drag.ghost.style.top = `${e.clientY + 8}px`;
      const to = cell(e);
      if (drag.mode === 'copy') drag.to = to;
      else drag.by = to && { dr: to.r - drag.at.r, dc: to.c - drag.at.c };
      const copyFits = drag.mode === 'copy' && to
        && to.r + drag.block.rows <= this.loop.rows.length
        && to.c + drag.block.cols <= this.cols;
      const copyEmpty = copyFits && drag.block.cells.every(({ dr, dc }) => {
        const row = this.loop.rows[to.r + dr];
        const bar = (to.c + dc) * this.unit;
        return !this.clipCovers(row, bar, this.unit) && !row.off.some((off) => off >= bar && off < bar + this.unit);
      });
      const where = copyEmpty
        ? { r0: to.r, r1: to.r + drag.block.rows - 1, c0: to.c, c1: to.c + drag.block.cols - 1 }
        : drag.by && shifted(this.sel, drag.by);
      for (const pad of this.grid.querySelectorAll('.pad')) {
        const cellAt = { r: Number(pad.dataset.row), c: Number(pad.dataset.col) };
        pad.classList.toggle('drop', drag.mode === 'move' && !!where && inside(where, cellAt));
        pad.classList.toggle('copy-drop', drag.mode === 'copy' && !!where && inside(where, cellAt));
      }
    });
    window.addEventListener('pointerup', () => {
      if (!drag) return;
      const d = drag;
      drag = null;
      if (d.mode === 'select') return;
      if (!d.ghost) {
        if (d.mode === 'copy') return;
        // A click on the selection: the only pad selected lets go; of several, just that one stays.
        this.sel = d.alone ? null : rect(d.at, d.at);
        this.anchor = this.sel ? { r: d.at.r, c: d.at.c } : null;
        this.paintSel();
        return;
      }
      d.ghost.remove();
      for (const pad of this.grid.querySelectorAll('.pad.lifted, .pad.drop, .pad.copy-drop')) pad.classList.remove('lifted', 'drop', 'copy-drop');
      if (d.mode === 'copy' && d.to && pastePads(this.loop, d.block, { r: d.to.r, c: d.to.c }, this.unit, this.cols, { allowDrumChange: true, onlyEmpty: true })) {
        this.sel = {
          r0: d.to.r,
          r1: d.to.r + d.block.rows - 1,
          c0: d.to.c,
          c1: d.to.c + d.block.cols - 1,
        };
        this.anchor = { r: this.sel.r0, c: this.sel.c0 };
        changed();
      } else if (d.mode === 'move' && d.by && moveBlock(this.loop, this.sel, d.by, this.unit, this.cols)) {
        this.sel = shifted(this.sel, d.by);
        this.anchor = { r: this.sel.r0, c: this.sel.c0 };
        changed();
      }
    });
  }

  /**
   * The rows in another order: a row's name dragged up or down with the left button, and let go
   * where it should go (a line shows the place: above a row, or under the last). It takes all its
   * pads and settings with it (moveRow).
   */
  wireRowDrag(changed) {
    let drag = null;
    const names = () => [...this.grid.querySelectorAll('.lp-name')];
    // The place a pointer at `y` points to: before the row whose middle is below it, or the end.
    const placeAt = (y) => {
      const list = names();
      const k = list.findIndex((el) => { const r = el.getBoundingClientRect(); return y < r.top + r.height / 2; });
      return k < 0 ? list.length : k;
    };
    const mark = (to) => {
      for (const el of this.grid.querySelectorAll('.row-drop-above, .row-drop-below')) el.classList.remove('row-drop-above', 'row-drop-below');
      if (to === null) return;
      const last = to >= this.loop.rows.length;
      const r = last ? this.loop.rows.length - 1 : to;
      for (const el of this.grid.querySelectorAll(`[data-row="${r}"]`)) el.classList.add(last ? 'row-drop-below' : 'row-drop-above');
    };
    this.grid.addEventListener('pointerdown', (e) => {
      const label = e.target.closest('.lp-name .pad-label');
      if (!label || e.button !== 0 || this.loop.rows.length < 2) return;
      e.preventDefault();
      drag = { from: Number(label.closest('.lp-name').dataset.row), y: e.clientY, moving: false, to: null };
    });
    window.addEventListener('pointermove', (e) => {
      if (!drag) return;
      if (!drag.moving) {
        if (Math.abs(e.clientY - drag.y) < 6) return;
        drag.moving = true;
        document.body.classList.add('lp-row-dragging');
        for (const el of this.grid.querySelectorAll(`[data-row="${drag.from}"]`)) el.classList.add('row-lifted');
      }
      const to = placeAt(e.clientY);
      drag.to = to === drag.from || to === drag.from + 1 ? null : to;
      mark(drag.to);
    });
    window.addEventListener('pointerup', () => {
      if (!drag) return;
      const d = drag;
      drag = null;
      document.body.classList.remove('lp-row-dragging');
      mark(null);
      for (const el of this.grid.querySelectorAll('.row-lifted')) el.classList.remove('row-lifted');
      if (d.moving && d.to !== null && moveRow(this.loop, d.from, d.to)) {
        this.sel = null;
        this.anchor = null;
        changed();
      }
    });
  }

  /** The selection lit on the pads, and the tools it allows. */
  paintSel() {
    const s = this.sel;
    for (const pad of this.grid.querySelectorAll('.pad')) {
      const r = Number(pad.dataset.row);
      const c = Number(pad.dataset.col);
      pad.classList.toggle('sel', !!s && r >= s.r0 && r <= s.r1 && c >= s.c0 && c <= s.c1);
    }
    const full = !!s && [...this.grid.querySelectorAll('.pad.sel.on')].length > 0;
    for (const k of ['copy', 'cut', 'silence', 'clear', 'align-left', 'align-right', 'swing', 'vel']) this.toolbar.querySelector(`.lp-${k}`).disabled = !full;
    const tunable = [...this.grid.querySelectorAll('.pad.sel.on')].some((pad) => !this.loop.rows[Number(pad.dataset.row)]?.drums);
    for (const k of ['down', 'up', 'oct-down', 'oct-up']) this.toolbar.querySelector(`.lp-${k}`).disabled = !tunable;
    this.toolbar.querySelector('.lp-paste').disabled = !s || !this.copied;
    this.onSelection?.(s);
  }

  /**
   * The key a pad sounds in, short ("F", "Gm"), when it is not the loop's: one moved on its own
   * (▼ ▲) or, with no key for the loop (–), each its own; "?" when its song's is unknown. Null
   * in the loop's key. Named in the loop's mode: a part in C minor in Eb major is in Eb major.
   */
  padKey(row, bar, unit) {
    const [, clip] = [...row.clips].find(([at, c]) => at < bar + unit && at + c.bars > bar) ?? [];
    const shift = clip?.shift ?? 0;
    const from = this.loop.key || clip?.key;
    if (!clip || (this.loop.key && !shift)) return null;
    if (!from) return '?';
    const [pc, mode] = from.split(' ');
    const label = KEYS.find(([v]) => v === `${(((Number(pc) + shift) % 12) + 12) % 12} ${mode}`)?.[1] ?? '?';
    return label.replace(' major', '').replace(' minor', 'm');
  }

  /** A pad's tooltip: what it plays, the key it came in and the key it sounds in. */
  padAbout(row, bar, unit) {
    const [, clip] = [...row.clips].find(([at, c]) => at < bar + unit && at + c.bars > bar) ?? [];
    if (!clip) return '';
    const feel = `${feelText(clip) ? ` · ${feelText(clip)}` : ''}${clip.mode && MODES[clip.mode] ? ` · mode ${MODES[clip.mode][0].toLowerCase()}` : ''}`;
    const from = sourceText((clip.whole ?? clip).src);
    const source = from ? `\nFrom ${from}` : '';
    if (row.drums) return `${clip.name}${feel}${source}`;
    const keyName = (k) => KEYS.find(([v]) => v === k)?.[1] ?? 'unknown key';
    const moved = (clip.transpose ?? 0) + (clip.shift ?? 0);
    const own = clip.shift ? ` (${clip.shift > 0 ? '+' : '−'}${Math.abs(clip.shift)} its own)` : '';
    return `${clip.name} · from ${keyName(clip.key)} · ${moved ? `plays ${moved > 0 ? '+' : '−'}${Math.abs(moved)} semitones` : 'plays as it was'}${this.loop.key ? `, in ${keyName(this.loop.key)}` : ''}${own}${feel}${source}`;
  }

  /** Where a row's pads come from, each once (file and its bars), for the row's name. */
  rowSources(row) {
    const seen = new Set();
    for (const [, clip] of [...row.clips].sort((a, b) => a[0] - b[0])) {
      const text = sourceText((clip.whole ?? clip).src);
      if (text) seen.add(text);
    }
    return [...seen];
  }

  /**
   * What a pad shows: the notes of the clips in its bars, an SVG, at
   * the heights of its row's octaves (`scale`, octaveScale), as they sound.
   */
  padNotes(row, bar, unit, scale) {
    const beats = barBeats(this.loop);
    const rects = [];
    const { h } = scale;
    for (const [at, clip] of row.clips) {
      const shift = row.drums ? 0 : (clip.transpose ?? 0) + (clip.shift ?? 0);
      const clipEnd = (at + clip.bars - bar) * beats;   // where the clip stops, from the pad's start
      for (const n of heardNotes(clip)) {   // as they sound: swung, harder or softer
        // A note played just before the pad's first bar line is its downbeat (EARLY).
        const raw = at * beats + n.beat - bar * beats;
        if (raw >= unit * beats - EARLY) continue;
        // A note from an earlier pad still sounding in this one (held, a sustained sound): drawn
        // from the pad's edge to where it stops, or its clip does.
        const end = Math.min(raw + n.len, clipEnd);
        if (raw < -EARLY && end <= 0) continue;
        const beat = Math.max(0, raw);
        const x = (beat / (unit * beats)) * 100;
        const w = Math.max(1.5, Math.min(100 - x, ((end - beat) / (unit * beats)) * 100));
        const y = pitchY(n.pitch + shift, scale);
        rects.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${noteColor(n.pitch + shift, n.vel, row.drums)}"/>`);
      }
    }
    return rects.length ? `<svg viewBox="0 0 100 100" preserveAspectRatio="none">${rects.join('')}</svg>` : '';
  }

  /** The sources of ✨ Fill and Arrange: the library and these collections ([{ id, name, n }]); the choice kept while it is there. */
  setSources(collections) {
    const was = this.source.value;
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    this.source.innerHTML = `<option value="">Library</option>${collections.map((c) => `<option value="${esc(c.id)}">★ ${esc(c.name)} (${c.n})</option>`).join('')}`;
    this.source.value = collections.some((c) => c.id === was) ? was : '';
    this.source.classList.toggle('on', !!this.source.value);
  }

  render() {
    const { loop } = this;
    this.toolbar.querySelector('.lp-bpm').value = loop.bpm;
    this.toolbar.querySelector('.lp-meter').value = loop.timeSig;
    this.toolbar.querySelector('.lp-key').value = loop.key;
    this.toolbar.querySelector('.lp-length').value = loop.length ?? '';
    const unit = padBars(loop);
    const cols = Math.ceil(loopBars(loop) / unit);
    this.unit = unit;
    this.cols = cols;
    this.grid.style.setProperty('--cols', cols);
    const counter = '<div class="lp-count"><span class="cd-beats"></span><b class="cd-bar"></b><span class="cd-lap" title="Times round the loop"></span></div>';
    // A wider gap before each phrase of 4 bars after the first: 1–4, 5–8, 9–12…
    const phrase = (bar) => (bar > 0 && bar % 4 === 0 ? ' phrase' : '');
    const head = `${counter}${Array.from({ length: cols }, (_, c) => `<span class="pad-bar${phrase(c * unit)}" data-col="${c}" data-bar="${c * unit}" title="Go to bar ${c * unit + 1}">${c * unit + 1}</span>`).join('')}`;
    // The chords that sound in each bar (the loop's harmony, as its first harmonic row plays it,
    // moved to the loop's key and by its pads), over the pads; none known: no row.
    const harmony = loopChords(loop);
    const perBar = barBeats(loop);
    const chordOf = (c) => barChordText(harmony.slice(Math.floor(c * unit * perBar + 1e-9), Math.floor((c + 1) * unit * perBar + 1e-9)));
    const chordCells = Array.from({ length: cols }, (_, c) => chordOf(c));
    const chords = chordCells.some(Boolean)
      ? `<span class="chord-label"></span>${chordCells.map((t, c) => `<span class="pad-chord${phrase(c * unit)}" data-col="${c}">${esc(t)}</span>`).join('')}`
      : '';
    const rows = loop.rows.map((row, r) => {
      // One scale for the row: all its notes, as they sound.
      const scale = octaveScale([...row.clips.values()].flatMap((clip) => {
        const shift = row.drums ? 0 : (clip.transpose ?? 0) + (clip.shift ?? 0);
        return clip.notes.map((n) => n.pitch + shift);
      }));
      const pads = Array.from({ length: cols }, (_, c) => {
        const bar = c * unit;
        const on = this.clipCovers(row, bar, unit);
        const key = on && !row.drums ? this.padKey(row, bar, unit) : null;
        const tied = !row.drums && Array.from({ length: unit }, (_, k) => bar + k).some((b) => row.legato?.includes(b));
        const badge = (key ? `<b class="pad-shift">${key}</b>` : '') + (tied ? '<b class="pad-legato" title="⌒ Legato into the next pad">⌒</b>' : '');
        return `<i class="pad${on ? ' on' : ''}${on && padOff(row, bar, unit) ? ' off' : ''}${phrase(bar)}" data-row="${r}" data-bar="${bar}" data-col="${c}"${on ? ` title="${esc(this.padAbout(row, bar, unit))}"` : ''}>${on ? this.padNotes(row, bar, unit, scale) + badge : ''}</i>`;
      }).join('');
      const soundName = row.sound?.kind === 'soundfont' ? row.sound.name : row.sound?.kind === 'luna' ? `LUNA: ${row.sound.trackName}` : 'Default sound';
      const fav = this.favoriteOf(row);   // the collections holding this row as it sounds
      const sources = this.rowSources(row);
      const from = sources.length ? `\nFrom ${sources.slice(0, 8).join('\n     ')}${sources.length > 8 ? `\n     and ${sources.length - 8} more` : ''}` : '';
      return `<div class="lp-name" data-row="${r}"><span class="lp-title"><span class="lp-icon" aria-hidden="true">${instrumentSvg(row.drums, row.program)}</span><span class="pad-label" title="${esc(row.name)} · drag up or down to put this row elsewhere${esc(from)}">${esc(row.name)}</span><span class="lp-playlist" title="Playlist active: this row's pads change as the proposals play" aria-label="Playlist active"${this.playlistActive(row) ? '' : ' hidden'}>▶▶</span>
        <button class="lp-fav${fav.length ? ' on' : ''}" title="${fav.length ? `In favourites: ${esc(fav.join(', '))}\n` : ''}Keep this row as a favourite, as it sounds now">${fav.length ? '★' : '☆'}</button></span>
        <span class="lp-ctl">
          <span class="lp-ctl-buttons"><button class="lp-sound${row.sound ? ' on' : ''}" title="♪ ${esc(soundName)} · choose this row's instrument (its name follows it)" aria-label="Choose this row's instrument">♪</button><button class="lp-mute${row.mute ? ' on' : ''}" title="Mute">M</button><button class="lp-solo${row.solo ? ' on' : ''}" title="Solo">S</button>
          <button class="lp-lock${row.locked ? ' on' : ''}" title="${row.locked ? 'Locked: Loop from song, Arrange and Fill leave this row as it is (click: unlock)' : 'Lock: Loop from song, Arrange and Fill leave this row as it is'}">${row.locked ? '🔒' : '🔓'}</button>
          <button class="lp-remove" title="Take this instrument out">✕</button></span>
          <input class="lp-volume" type="range" min="0" max="100" value="${row.volume}" title="Volume">
        </span></div>${pads}`;
    }).join('');
    const empty = !loop.rows.length;
    this.grid.innerHTML = `${head}${chords}${rows}<div class="lp-new" data-new="1">${empty ? 'Drop a part here' : '+ Drop a part here for another instrument'}</div>`;
    // The selection, inside the pads there are now (rows taken out, a shorter loop).
    const s = this.sel;
    if (s && (s.r0 >= loop.rows.length || s.c0 >= cols)) this.sel = null;
    else if (s) this.sel = { ...s, r1: Math.min(s.r1, loop.rows.length - 1), c1: Math.min(s.c1, cols - 1) };
    this.toolbar.querySelector('.lp-tools').hidden = empty;
    this.paintSel();
    this.col = undefined;
    this.counted = null;
    this.count(this.position);
  }

  paintPlaylists() {
    for (const name of this.grid.querySelectorAll('.lp-name')) {
      const row = this.loop.rows[Number(name.dataset.row)];
      name.querySelector('.lp-playlist').hidden = !row || !this.playlistActive(row);
    }
  }

  /** 🔗 on or off, and its offset in ms beside it while on. */
  showSync(on, ms) {
    this.toolbar.querySelector('.lp-sync').classList.toggle('on', on);
    this.toolbar.querySelector('.lp-sync-ms').hidden = !on;
    this.toolbar.querySelector('.lp-sync-ms input').value = String(ms);
  }

  /**
   * The counter: `at` { beat, bar, lap } (from 1) while playing, null
   * stopped: how long the loop is.
   */
  count(at) {
    this.position = at;
    const bars = loopBars(this.loop);
    const beats = meterPulses(this.loop.timeSig);   // as the meter is counted: 2/2 two, 6/8 two
    const key = at ? `${at.beat}|${at.bar}|${at.lap}|${bars}|${beats}` : `${bars}|${beats}`;
    if (key === this.counted) return;
    this.counted = key;
    const [dots, bar, lap] = this.grid.querySelector('.lp-count').children;
    dots.innerHTML = Array.from({ length: beats }, (_, k) => k + 1).map((b) => `<i class="${b === 1 ? 'down' : ''}${at?.beat === b ? ' now' : ''}"></i>`).join('');
    bar.innerHTML = at ? `${at.bar}<small> / ${bars} bars</small>` : `${bars}<small> bars</small>`;
    bar.title = `The loop lasts ${bars} bars, then starts again`;
    lap.textContent = at ? `×${at.lap}` : '';
  }

  clipCovers(row, bar, unit) {
    for (const [at, c] of row.clips) if (at < bar + unit && bar < at + c.bars) return true;
    return false;
  }

  /**
   * The track being explored: `name`, or null for the empty box. `selected`: bars are picked to
   * take. `song`: a whole song is explored (chosen in Files), so it can be imported whole.
   */
  showExplore(name, selected = false, song = false) {
    this.el.querySelector('.lp-explore-empty').hidden = name !== null;
    this.el.querySelector('.lp-explore-head').hidden = name === null;
    this.el.querySelector('.lp-explore-name').textContent = name ?? '';
    this.exploreTake.classList.toggle('off', !selected);
    this.el.querySelector('.lp-explore-import').hidden = !song;
    this.el.querySelector('.lp-explore-fragments').hidden = !song;
  }

  /** Where a part dropped at a point of the screen goes: { row, bar }, { added: true }, { explore: true } or null. */
  dropAt(x, y) {
    const el = document.elementFromPoint(x, y);
    const pad = el?.closest('.lp-grid .pad');
    if (pad) return { row: this.loop.rows[Number(pad.dataset.row)], bar: Number(pad.dataset.bar) };
    if (el?.closest('.lp-new')) return { added: true };
    return el?.closest('.lp-explore') ? { explore: true } : null;
  }

  /** Light up where a part would land (`to` as dropAt gives it), all the `bars` it takes. */
  showDrop(to, bars = 1, newRows = false) {
    for (const el of this.el.querySelectorAll('.pad.drop, .lp-new.drop, .lp-explore.drop')) el.classList.remove('drop');
    if (!to) return;
    if (to.explore) { this.explore.classList.add('drop'); return; }
    if (to.added) { this.grid.querySelector('.lp-new').classList.add('drop'); return; }
    if (newRows) this.grid.querySelector('.lp-new').classList.add('drop');
    const r = this.loop.rows.indexOf(to.row);
    for (const pad of this.grid.querySelectorAll(`.pad[data-row="${r}"]`)) {
      const bar = Number(pad.dataset.bar);
      if (bar >= to.bar && bar < to.bar + bars) pad.classList.add('drop');
    }
  }

  /** The bar playing, lit on the pads (null: none). */
  showBar(bar) {
    const col = bar === null ? null : Math.floor(bar / this.unit);
    if (col === this.col) return;
    this.col = col;
    for (const el of this.grid.querySelectorAll('[data-col]')) el.classList.toggle('now', Number(el.dataset.col) === col);
  }
}

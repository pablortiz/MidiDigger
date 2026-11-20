import { GM_FAMILIES } from '../midi/gm.js';

/**
 * Choose the default output, a preset from the active SoundFont, or an existing LUNA track. What is
 * chosen in the list is heard at once (`onPreview`, the loop playing); Apply keeps it, Cancel or Esc
 * puts back the sound the row had.
 */
export class LoopSoundPicker {
  constructor(dialog, { getTracks, getSessionUid, getBank, getBankId, loadBank, onApply, onPreview = () => {}, onError, tester = null, onClosed = () => {} }) {
    Object.assign(this, { dialog, getTracks, getSessionUid, getBank, getBankId, loadBank, onApply, onPreview, onError, tester, onClosed });
    this.source = dialog.querySelector('.loop-sound-source');
    this.search = dialog.querySelector('.loop-sound-search');
    this.family = dialog.querySelector('.loop-sound-family');
    this.family.add(new Option('All GM families', ''));
    this.family.append(...GM_FAMILIES.map((name, i) => new Option(name, String(i))));
    this.list = dialog.querySelector('.loop-sound-list');
    this.hint = dialog.querySelector('.loop-sound-hint');
    this.choices = dialog.querySelector('.loop-sound-choices');
    this.apply = dialog.querySelector('.loop-sound-apply');
    this.source.onchange = () => {
      void this.refresh().then(() => this.tester?.update());
      if (this.source.value === 'default') this.previewSoon();
    };
    this.search.oninput = () => this.populate();
    this.family.onchange = () => this.populate();
    this.list.onchange = () => { this.apply.disabled = !this.list.value; this.previewSoon(); void this.tester?.update(); };
    dialog.querySelector('.loop-sound-cancel').onclick = () => dialog.close();
    this.apply.onclick = () => this.commit();
    // Closed without Apply (Cancel, Esc): the row's own sound again, if another was being heard.
    dialog.addEventListener('close', () => {
      clearTimeout(this.previewTimer);
      this.tester?.close();
      if (!this.applied && this.previewed) {
        try { this.onPreview(this.row, this.original, { restore: true }); } catch (error) { this.onError(error); }
      }
      this.previewed = false;
      this.onClosed();
    });
  }

  /** The sound chosen in the dialog, as a row keeps it; undefined when nothing usable is chosen. */
  chosen() {
    const kind = this.source.value;
    if (kind === 'soundfont') {
      const preset = this.getBank()?.presets[Number(this.list.value)];
      if (!preset || this.list.value === '') return undefined;
      return { kind, bankId: this.getBankId(), name: preset.name, program: preset.program,
        bankMSB: preset.bankMSB, bankLSB: preset.bankLSB, isDrum: preset.isDrum, isGMGSDrum: preset.isGMGSDrum };
    }
    if (kind === 'luna') {
      const track = this.getTracks().find((item) => item.id === this.list.value);
      return track ? { kind, sessionUid: this.getSessionUid(), trackUid: track.id, trackName: track.name } : undefined;
    }
    return null;
  }

  /** Heard at once, a moment after the choice settles (arrows run through the list). */
  previewSoon() {
    clearTimeout(this.previewTimer);
    this.previewTimer = setTimeout(() => {
      if (!this.dialog.open) return;
      const sound = this.chosen();
      if (sound === undefined) return;
      try { if (this.onPreview(this.row, sound) !== false) this.previewed = true; } catch (error) { this.hint.textContent = error.message; }
    }, 120);
  }

  open(row) {
    this.row = row;
    this.original = row.sound ?? null;
    this.applied = false;
    this.previewed = false;
    this.dialog.querySelector('.loop-sound-row').textContent = row.name;
    this.source.value = row.sound?.kind ?? 'default';
    this.search.value = '';
    this.family.value = '';
    this.dialog.showModal();
    void this.refresh().then(() => this.tester?.open(row));
  }

  async refresh() {
    const turn = this.turn = (this.turn ?? 0) + 1;
    const source = this.source.value;
    this.choices.hidden = source === 'default';
    this.search.hidden = source !== 'soundfont';
    this.family.hidden = source !== 'soundfont' || this.row.drums;
    this.apply.disabled = source !== 'default';
    if (source === 'default') return;
    this.list.replaceChildren();
    if (source === 'soundfont') {
      this.hint.textContent = 'Loading SoundFont…';
      try { await this.loadBank(); }
      catch (error) {
        if (turn === this.turn) { this.hint.textContent = `Could not load SoundFont: ${error.message}`; this.onError(error); }
        return;
      }
    }
    if (turn === this.turn && this.dialog.open) this.populate();
  }

  populate() {
    const sound = this.row.sound;
    this.list.replaceChildren();
    if (this.source.value === 'soundfont') {
      const bank = this.getBank();
      if (!bank) return;
      const words = this.search.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
      bank.presets.forEach((preset, index) => {
        if (preset.isDrum !== this.row.drums) return;
        if (this.family.value !== '' && preset.program >> 3 !== Number(this.family.value)) return;
        const label = `${preset.name} · bank ${preset.bankMSB}:${preset.bankLSB} · program ${preset.program}`;
        if (!words.every((word) => label.toLowerCase().includes(word))) return;
        this.list.add(new Option(label, String(index)));
      });
      if (sound?.kind === 'soundfont' && sound.bankId === this.getBankId()) {
        const index = bank.presets.findIndex((p) => p.name === sound.name && p.bankMSB === sound.bankMSB
          && p.bankLSB === sound.bankLSB && p.program === sound.program && p.isGMGSDrum === sound.isGMGSDrum);
        if (index >= 0) this.list.value = String(index);
      }
      this.hint.textContent = `${this.list.options.length} ${this.row.drums ? 'drum kits' : 'presets'} in the current SoundFont.`;
    } else {
      for (const track of this.getTracks()) this.list.add(new Option(track.name, track.id));
      if (sound?.kind === 'luna' && sound.sessionUid === this.getSessionUid()) this.list.value = sound.trackUid;
      this.hint.textContent = this.list.options.length
        ? 'Existing instrument tracks; their plugins and presets are not changed.'
        : 'No LUNA instrument tracks available. Connect to a session with an instrument track.';
    }
    this.apply.disabled = !this.list.value;
  }

  commit() {
    clearTimeout(this.previewTimer);
    const sound = this.chosen();
    if (sound === undefined) {
      if (this.source.value === 'luna') this.hint.textContent = 'That track is no longer available.';
      return;
    }
    try { this.onApply(this.row, sound); this.applied = true; this.dialog.close(); }
    catch (error) { this.hint.textContent = error.message; this.onError(error); }
  }
}

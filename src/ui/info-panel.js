// The selected file's facts and the notes for LUNA, written to the log when the file opens
// (the screen keeps the timeline). The channels themselves (preview, marking, listening,
// loops) live in the timeline, so nothing here repeats them.

import { formatDuration, formatTime, keyLabel } from '../midi/parser.js';
import { lunaNotes } from '../midi/parts.js';
import { partFeatures, songKeyOf } from '../midi/features.js';
import { baseName } from '../library/scanner.js';

export class InfoPanel {
  constructor(log) {
    this.log = log;
    this.info = null;
    this.features = new Map();
  }

  /** Forget the file; a message (why it could not open) goes to the log as an error. */
  clear(message = '') {
    this.info = null;
    this.features = new Map();
    if (message) this.log.fail(message);
  }

  /** Log the facts; keeps each channel's features (role, loops...) for the timeline. */
  render(info, path) {
    this.info = info;
    this.features = new Map(info.channels.map((c) => [c.channel, partFeatures(info, c.channel)]));
    const i = info;
    const found = songKeyOf(i);
    const key = found && (found === i.key ? keyLabel(found) : `${keyLabel(found)} (estimated from the notes)`);
    const bpm = i.tempoChanges ? `${Math.round(i.bpm)} (${Math.round(i.bpmMin)} to ${Math.round(i.bpmMax)}, ${i.tempoChanges} changes)` : `${Math.round(i.bpm * 10) / 10}`;
    const kv = [
      ['Length', `${formatDuration(i.durationSec)} · ~${Math.ceil(i.bars)} bars`],
      ['Tempo', `${bpm} BPM`],
      ['Meter / key', `${i.timeSig}${i.timeSigChanges ? ` (+${i.timeSigChanges})` : ''}${key ? ` · ${key}` : ''}`],
      ['Format', `${i.format} · ${i.trackCount} track${i.trackCount === 1 ? '' : 's'} · ${i.smpte ? 'SMPTE' : `${i.ppq} PPQ`}${i.standard ? ` · ${i.standard}` : ''}`],
      ['Notes', `${i.notes.toLocaleString()} in ${i.channels.length} channels`],
    ];
    if (i.copyright) kv.push(['Copyright', i.copyright]);
    if (i.texts.length) kv.push(['Text', i.texts.slice(0, 2).join(' · ')]);
    if (i.markers.length) kv.push(['Markers', i.markers.slice(0, 6).map((m) => `${formatTime(m.sec)} ${m.text}`).join(' · ') + (i.markers.length > 6 ? ' …' : '')]);
    if (i.lyrics) kv.push(['Lyrics', `${i.lyrics} events`]);
    this.log.head(`── ${baseName(path)}`);
    for (const [k, v] of kv) this.log.log(`${k.padEnd(14)}${v}`);
    for (const n of lunaNotes(i)) this.log.warn(`• ${n}`);
  }
}

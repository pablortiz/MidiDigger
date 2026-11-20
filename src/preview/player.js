// Preview player. Plays a parsed file's events with a small Web Audio synth (one patch per
// General MIDI family, synthesized drums on channel 10): no sample files, works from file://.
//
// Like midiGrid's playback.js, the scheduler walks the song in its own time and reads its
// settings live on every pass (every 25 ms, 150 ms ahead), so changing them while it plays
// never restarts it:
//   loop      a region [start, end) in song seconds, repeated until stopped (null: none)
//   channels  which channels sound (a Set of 1-16, or null for all)
//   compact   skip silences: start at the first note, shorten gaps over 2 s to 0.5 s
//
// Where it sounds: its own small synth (no output set), or an output that takes raw MIDI at a
// context time: the SoundFont engine (sf-engine.js) or a LUNA track (luna-out.js).

import { every } from './ticker.js';

// Per GM family (program >> 3): oscillator, envelope (attack s, decay time constant s,
// sustain level 0..1, release s), low-pass cutoff in Hz, detune in cents for a second voice.
const PATCHES = [
  { wave: 'triangle', attack: 0.004, decay: 0.9, sustain: 0.12, release: 0.25, cutoff: 3500 },          // piano
  { wave: 'sine', attack: 0.002, decay: 0.45, sustain: 0, release: 0.3, cutoff: 6000 },                 // chromatic percussion
  { wave: 'square', attack: 0.01, decay: 0.2, sustain: 0.75, release: 0.08, cutoff: 2200 },             // organ
  { wave: 'sawtooth', attack: 0.003, decay: 0.6, sustain: 0.08, release: 0.2, cutoff: 2600 },           // guitar
  { wave: 'triangle', attack: 0.005, decay: 0.5, sustain: 0.45, release: 0.1, cutoff: 900 },            // bass
  { wave: 'sawtooth', attack: 0.08, decay: 0.4, sustain: 0.8, release: 0.3, cutoff: 3000, detune: 6 },  // strings
  { wave: 'sawtooth', attack: 0.12, decay: 0.4, sustain: 0.8, release: 0.45, cutoff: 2400, detune: 9 }, // ensemble, choir
  { wave: 'sawtooth', attack: 0.04, decay: 0.3, sustain: 0.8, release: 0.15, cutoff: 2000 },            // brass
  { wave: 'square', attack: 0.03, decay: 0.3, sustain: 0.8, release: 0.1, cutoff: 1800 },               // reed
  { wave: 'sine', attack: 0.05, decay: 0.3, sustain: 0.85, release: 0.15, cutoff: 5000 },               // pipe
  { wave: 'square', attack: 0.01, decay: 0.3, sustain: 0.8, release: 0.1, cutoff: 4000, detune: 4 },    // synth lead
  { wave: 'sawtooth', attack: 0.3, decay: 0.5, sustain: 0.8, release: 0.6, cutoff: 1500, detune: 10 },  // synth pad
  { wave: 'triangle', attack: 0.1, decay: 0.6, sustain: 0.6, release: 0.5, cutoff: 3000, detune: 7 },   // synth effects
  { wave: 'sawtooth', attack: 0.003, decay: 0.5, sustain: 0.05, release: 0.2, cutoff: 2800 },           // ethnic
  { wave: 'sine', attack: 0.002, decay: 0.25, sustain: 0, release: 0.15, cutoff: 5000 },                // percussive
  { wave: 'triangle', attack: 0.02, decay: 0.4, sustain: 0.3, release: 0.3, cutoff: 3000 },             // sound effects
];
const MAX_VOICES = 64;
const LOOKAHEAD_S = 0.15;
const LOOKAHEAD_HIDDEN_S = 0.6;   // the window out of sight: ticks may come late, more is scheduled ahead
const GAP_MAX = 2;      // skip silences: gaps longer than this…
const GAP_KEEP = 0.5;   // …are shortened to this

export class PreviewPlayer {
  constructor() {
    this.ctx = null;
    this.info = null;
    this.events = [];
    this.loop = null;          // { start, end } song seconds
    this.channels = null;      // Set of 1-16, or null for all
    this.compact = true;
    this.pos = 0;              // song second while stopped or paused
    this.playing = false;
    this.idx = 0;
    this.offset = 0;           // context time = song second + offset
    this.untick = null;         // stops the scheduler's tick (ticker.js)
    this.voices = new Map();
    this.out = null;           // { send(t, status, d1, d2), silence(heldKeys, channels) } or null for the built-in synth
    this.channelOutputs = new Map();
    this.held = new Set();     // notes sounding on the output (channel·128 + note)
    this.onEnd = null;
    // Told when playing starts (context time of song second s, offset), stops (context time)
    // and when live changes come in (channels 1-16, or null for all; context time; offset).
    this.onStart = null;
    this.onStop = null;
    this.onCut = null;
    this.lap = 0;              // laps of the loop scheduled so far
    this.cuts = [];            // live changes waiting: { ch, lap, sec, events, quiet } (morph)
    this.target = null;        // the song they lead to
    this.gains = new Array(16).fill(1);   // each channel's volume over the song's own (setGain)
    this.resetChannels();
  }

  /** Channel `ch` (1-16) louder or softer than the song has it: `gain` times its volume, at once. */
  setGain(ch, gain) {
    const c = ch - 1;
    if (this.gains[c] === gain) return;
    this.gains[c] = gain;
    const out = this.outputFor(c);
    if (out && this.playing) out.send(this.ctx.currentTime, 0xb0 | c, 7, this.cc7(c));
  }

  /** The volume (CC 7) channel `c` (0-15) goes out with: the song's, times its gain. */
  cc7(c) { return Math.max(0, Math.min(127, Math.round(this.ch[c].volume * this.gains[c] * 127))); }

  resetChannels() {
    this.ch = Array.from({ length: 16 }, () => ({ program: 0, bankMsb: 0, bankLsb: 0, volume: 100 / 127, expression: 1, pan: 0, sustain: false, held: new Set() }));
  }

  /** Sound through `out` (or the built-in synth with null); keeps playing from the same point. */
  setOutput(out) {
    if (out === this.out) return;
    const was = this.playing;
    const s = this.songPosition;
    if (was) this.pause();
    this.out = out;
    if (was) void this.play(s);
  }

  outputFor(channel) { return this.channelOutputs.has(channel) ? this.channelOutputs.get(channel) : this.out; }

  /** Replace the per-channel destinations, silencing the old ones before switching. */
  setChannelOutputs(outputs) {
    const was = this.playing;
    const s = this.songPosition;
    if (was) this.pause();
    this.channelOutputs = new Map(outputs);
    if (was) void this.play(s);
  }

  /** Channels (0-15) the loaded file uses. */
  usedChannels() { return (this.info?.channels ?? []).map((c) => c.channel - 1); }

  ensureContext() {
    if (this.ctx) return;
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.6;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);
    const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.noise = noise;
  }

  /** A new file: stopped at its start, every setting kept. */
  load(info) {
    this.stop();
    this.info = info;
    this.events = info.events;
    this.loop = null;
    this.chain = null;
    this.pos = 0;
  }

  get duration() { return this.info?.durationSec ?? 0; }

  /** The song second being heard (or where it will start). */
  get songPosition() {
    if (!this.playing) return this.pos;
    let s = this.ctx.currentTime - this.offset;
    // A loop lap scheduled ahead moves the offset early: still in the previous lap.
    if (this.chain && this.ctx.currentTime < this.lapPendingUntil) s = this.ctx.currentTime - this.chainOffset;
    else if (this.loop && s < this.loop.start) s += this.loop.end - this.loop.start;
    return Math.max(0, Math.min(Math.max(this.duration, this.loop?.end ?? 0), s));
  }

  audible(e) { return !this.channels || this.channels.has(e.ch + 1); }

  /** First note-on at or after `sec` on the audible channels (for skipping silence). */
  firstNoteAfter(sec) {
    for (const e of this.events) if (e.type === 'on' && e.sec >= sec && this.audible(e)) return e.sec;
    return sec;
  }

  // ── transport ─────────────────────────────────────────────────────────────────────────

  /** Play from `fromSong` (default: where it stopped). Inside the loop when one is on. */
  async play(fromSong = null) {
    if (!this.info || !this.events.length) return;
    this.ensureContext();
    await this.ctx.resume();
    let s = fromSong ?? this.pos;
    if (this.loop) {
      if (s < this.loop.start || s >= this.loop.end) s = this.loop.start;
    } else {
      if (s >= this.duration) s = 0;
      if (this.compact) s = this.firstNoteAfter(s);   // straight to the music
    }
    if (this.playing) this.allOff();
    this.startFrom(s);
  }

  /** (Re)start scheduling at song second s. */
  startFrom(s) {
    this.untick?.();
    this.settle();
    this.lap = 0;
    this.resetChannels();
    let i = 0;
    // Programs and controllers before s, for every channel (one unmuted later sounds right).
    for (; i < this.events.length && this.events[i].sec < s; i++) {
      const e = this.events[i];
      if (e.type === 'pc' || e.type === 'cc') this.handle(e, this.ctx.currentTime, true);
    }
    this.idx = i;
    {
      const t = this.ctx.currentTime + 0.01;
      for (const c of this.usedChannels()) {
        const out = this.outputFor(c);
        if (!out) continue;
        const st = this.ch[c];
        out.send(t, 0xb0 | c, 0, st.bankMsb);
        out.send(t, 0xb0 | c, 32, st.bankLsb);
        out.send(t, 0xc0 | c, st.program, 0);
        out.send(t, 0xb0 | c, 7, this.cc7(c));
        out.send(t, 0xb0 | c, 11, Math.round(st.expression * 127));
        out.send(t, 0xb0 | c, 10, Math.max(0, Math.min(127, Math.round(st.pan * 64 + 64))));
      }
    }
    this.offset = this.ctx.currentTime + 0.05 - s;
    this.active = 0;
    this.silenceFrom = s;
    this.lapPendingUntil = 0;
    this.playing = true;
    this.onStart?.(this.offset + s, this.offset);
    this.untick = every(() => this.pump());   // every 25 ms, in sight or not (ticker.js)
    this.pump();
  }

  pause() {
    if (!this.playing) return;
    this.pos = this.songPosition;
    this.playing = false;
    this.untick?.();
    this.untick = null;
    this.allOff();
    this.settle();
    this.onStop?.(this.ctx.currentTime);
  }

  stop() {
    this.pause();
    this.pos = this.loop ? this.loop.start : 0;
  }

  /**
   * Move what plays `sec` later (earlier when negative) without stopping, to follow another clock
   * (LUNA's): only what is scheduled from now on moves.
   */
  nudge(sec) {
    if (!this.playing || !sec) return;
    this.offset += sec;
    if (this.chainOffset !== undefined) this.chainOffset += sec;
  }

  /** The page's audio delay to the speakers, in seconds (what the browser reports; 0 when it does not). */
  get outputLatency() {
    return (this.ctx?.baseLatency ?? 0) + (this.ctx?.outputLatency ?? 0);
  }

  /** Jump to a song second; keeps playing when it was. */
  seekSong(sec) {
    if (!this.playing) { this.pos = Math.max(0, Math.min(this.duration, sec)); return; }
    this.allOff();
    let s = sec;
    if (this.loop && (s < this.loop.start || s >= this.loop.end)) s = this.loop.start;
    this.startFrom(s);
  }

  // ── live settings ─────────────────────────────────────────────────────────────────────

  /**
   * Loop a region { startSec, endSec }, or none with null. While playing it carries on: only
   * when the playhead falls outside the new region does it jump to its start.
   */
  setLoop(range) {
    const was = this.loop;
    const s = this.songPosition;
    this.chain = null;
    this.loop = range ? { start: range.startSec, end: Math.max(range.startSec + 0.05, range.endSec) } : null;
    if (!this.playing) {
      if (this.loop && (this.pos < this.loop.start || this.pos >= this.loop.end)) this.pos = this.loop.start;
      return;
    }
    if (!this.loop) {
      // Loop off: if a lap was already scheduled ahead, carry on from where we are.
      if (was && this.ctx.currentTime < this.lapPendingUntil) { this.allOff(); this.startFrom(s); }
      return;
    }
    if (s < this.loop.start || s >= this.loop.end || this.ctx.currentTime < this.lapPendingUntil) {
      this.allOff();
      this.startFrom(s >= this.loop.start && s < this.loop.end ? s : this.loop.start);
    }
  }

  /**
   * Regions [{ startSec, endSec }] played one after the other, the first again after the last.
   * Carries on in the region it is in, if any. Each is a loop of one lap, so the playhead stays
   * on the song.
   */
  setChain(list) {
    const s = this.songPosition;
    const at = Math.max(0, list.findIndex((r) => s >= r.startSec && s < r.endSec));
    this.setLoop(list[at]);
    this.chain = list.map((r) => ({ start: r.startSec, end: Math.max(r.startSec + 0.05, r.endSec) }));
    this.chainAt = at;
  }

  /** Which channels sound; notes of channels taken out stop at once. */
  setChannels(channels) {
    this.channels = channels && channels.size ? new Set(channels) : null;
    if (!this.playing) return;
    const t = this.ctx.currentTime;
    const gone = (key) => this.channels && !this.channels.has((key >> 7) + 1);
    for (const key of [...this.held]) if (gone(key)) { this.outputFor(key >> 7)?.send(t, 0x80 | (key >> 7), key & 127, 0); this.held.delete(key); }
    for (const key of [...this.voices.keys()]) if (gone(key)) this.release(key, t);
    this.active = this.held.size + this.voices.size;
  }

  // ── live changes (New loop changed while it plays: in at the next bar) ──────────────────

  /** The loop lap being heard (the scheduler may already be in the next one). */
  get audibleLap() { return this.playing && this.ctx.currentTime < this.lapPendingUntil ? this.lap - 1 : this.lap; }

  /**
   * Turn the looping song into `song` without stopping: each channel at its own moment.
   * `cuts`: [{ ch (1-16), at (song seconds from the start of the lap being heard; at or past
   * the loop's end is the next lap), quiet }]. At a cut that channel's notes still sounding stop
   * and it plays on with `song`'s events. A song of another length takes over at the next lap.
   * `quiet` cuts only bring a channel in line with `song`, hurry() leaves them where they are.
   * `whole` (a song of another length): it all comes in at the first cut instead, carrying on
   * at the same point of the new song's bars, rather than waiting for the next lap.
   */
  morph(song, cuts, { whole = false } = {}) {
    if (!this.playing || !this.loop) { this.load(song); return; }
    this.target = song;
    const len = this.loop.end - this.loop.start;
    const sameLength = Math.abs(song.durationSec - this.duration) < 1e-6;
    const lap = this.audibleLap;
    if (!sameLength && whole) {
      // Only the length changes (every cut quiet): it still comes in, at the first of them.
      const loud = cuts.some((c) => !c.quiet) ? cuts.filter((c) => !c.quiet) : cuts;
      const at = Math.min(...loud.map((c) => c.at));
      const n = Math.floor(at / len + 1e-9);
      const chans = loud.map((c) => c.ch);
      this.cuts = [{ whole: true, chans, lap: lap + n, sec: Math.max(0, at - n * len) }];
      return;
    }
    // A channel still on its way that this change does not name goes on coming in, now to
    // `song`: losing it would leave it playing what it should have stopped.
    const named = new Set(cuts.map((c) => c.ch - 1));
    const onTheWay = this.cuts.filter((c) => !c.whole && !named.has(c.ch)).map((c) => ({ ...c, events: song.events.filter((e) => e.ch === c.ch) }));
    this.cuts = cuts.map((c) => {
      const at = sameLength ? c.at : len;   // another length: everything at the next lap
      const n = Math.floor(at / len + 1e-9);
      return { ch: c.ch - 1, lap: lap + n, sec: Math.max(0, at - n * len), quiet: c.quiet, events: song.events.filter((e) => e.ch === c.ch - 1) };
    }).concat(onTheWay).sort((a, b) => a.lap - b.lap || a.sec - b.sec);
    if (sameLength) this.info = song;
    // The next lap already scheduled: it takes the new length now.
    else if (lap < this.lap) { this.info = song; this.loop = { start: 0, end: song.durationSec }; }
  }

  /** Waiting changes that are not `quiet` come in at song second `sec` of the heard lap, if sooner. */
  hurry(sec) {
    const lap = this.audibleLap;
    for (const c of this.cuts) if (!c.quiet && (c.lap > lap || c.sec > sec)) { c.lap = lap; c.sec = sec; }
    this.cuts.sort((a, b) => a.lap - b.lap || a.sec - b.sec);
  }

  /** Channels (1-16) still waiting for their change, quiet ones left out. */
  waiting() { return new Set(this.cuts.filter((c) => !c.quiet).flatMap((c) => (c.whole ? c.chans : [c.ch + 1]))); }

  /** Stopped mid-change: straight to the song it was leading to. */
  settle() {
    if (!this.target) return;
    const song = this.target;
    this.target = null;
    this.cuts = [];
    this.info = song;
    this.events = song.events;
    if (this.loop) this.loop = { start: 0, end: song.durationSec };
  }

  /** A whole new song at context time t, on at the same point of its bars (morph `whole`). */
  applyWhole(cut, t) {
    const song = this.target;
    for (const k of this.held) this.outputFor(k >> 7)?.send(t, 0x80 | (k >> 7), k & 127, 0);
    for (const c of this.usedChannels()) this.outputFor(c)?.send(t, 0xb0 | c, 64, 0);
    this.held.clear();
    for (const k of [...this.voices.keys()]) this.release(k, t);
    for (const st of this.ch) { st.held.clear(); st.sustain = false; }
    const sec = cut.sec % song.durationSec;
    this.info = song;
    this.events = song.events;
    this.loop = { start: 0, end: song.durationSec };
    this.target = null;
    this.cuts = [];
    // Programs and controllers as they stand there.
    for (const e of this.events) {
      if (e.sec >= sec) break;
      if (e.type === 'pc' || e.type === 'cc') this.handle(e, t, !this.audible(e));
    }
    this.offset += cut.sec - sec;
    this.idx = this.events.findIndex((e) => e.sec >= sec);
    if (this.idx < 0) this.idx = this.events.length;
    this.onCut?.(null, t, this.offset);
  }

  /** One channel's change, at context time t (see morph). */
  applyCut(cut, t) {
    if (cut.whole) { this.applyWhole(cut, t); return; }
    const c = cut.ch;
    const out = this.outputFor(c);
    if (out) {
      for (const k of [...this.held]) if ((k >> 7) === c) { out.send(t, 0x80 | c, k & 127, 0); this.held.delete(k); }
      out.send(t, 0xb0 | c, 64, 0);
    }
    for (const k of [...this.voices.keys()]) if ((k >> 7) === c) this.release(k, t);
    this.ch[c].held.clear();
    this.ch[c].sustain = false;
    // The new part's program and controllers, as they stand where it comes in.
    for (const e of cut.events) {
      if (e.sec >= cut.sec) break;
      if (e.type === 'pc' || e.type === 'cc') this.handle(e, t, !this.audible(e));
    }
    this.events = this.events.filter((e) => e.ch !== c).concat(cut.events).sort((x, y) => x.sec - y.sec || x.rank - y.rank);
    this.idx = this.events.findIndex((e) => e.sec >= cut.sec);
    if (this.idx < 0) this.idx = this.events.length;
    if (!this.cuts.length && this.target) { this.info = this.target; this.target = null; }
    this.onCut?.([c + 1], t, this.offset);
  }

  // ── scheduler ─────────────────────────────────────────────────────────────────────────

  pump() {
    const now = this.ctx.currentTime;
    for (let guard = 0; guard < 64; guard++) {
      const ahead = globalThis.document?.hidden ? LOOKAHEAD_HIDDEN_S : LOOKAHEAD_S;
    const limit = now + ahead - this.offset;   // song second scheduled up to
      const end = this.loop ? this.loop.end : Infinity;
      for (;;) {
        // A live change due before the next event (or already late): it comes in first.
        const cut = this.cuts[0];
        const next = this.idx < this.events.length ? this.events[this.idx].sec : Infinity;
        if (cut && (cut.lap < this.lap || (cut.lap === this.lap && cut.sec <= next && cut.sec < limit && cut.sec < end))) {
          this.cuts.shift();
          this.applyCut(cut, Math.max(now, cut.sec + this.offset));
          continue;
        }
        if (this.idx >= this.events.length) break;
        const e = this.events[this.idx];
        if (e.sec >= end || e.sec >= limit) break;
        this.idx++;
        const audible = this.audible(e);
        if (e.type === 'pc' || e.type === 'cc') { this.handle(e, Math.max(now, e.sec + this.offset), !audible); continue; }
        if (!audible) continue;
        if (e.type === 'on') this.active++;
        else if (e.type === 'off' && this.active > 0 && --this.active === 0) this.silenceFrom = e.sec;
        this.handle(e, Math.max(now, e.sec + this.offset), false);
      }
      if (this.loop && limit >= this.loop.end) {
        // Loop end inside the look-ahead: what sounds there stops, and the next lap begins.
        const wrapAt = Math.max(now, this.loop.end + this.offset);
        for (const k of this.held) this.outputFor(k >> 7)?.send(wrapAt, 0x80 | (k >> 7), k & 127, 0);
        for (const c of this.usedChannels()) this.outputFor(c)?.send(wrapAt, 0xb0 | c, 64, 0);
        this.held.clear();
        for (const k of [...this.voices.keys()]) this.release(k, wrapAt);
        for (const st of this.ch) st.held.clear();
        if (this.chain) {
          // The next region of the chain, straight after this one.
          this.chainAt = (this.chainAt + 1) % this.chain.length;
          const next = this.chain[this.chainAt];
          this.chainOffset = this.offset;
          this.offset += this.loop.end - next.start;
          this.loop = next;
        } else this.offset += this.loop.end - this.loop.start;
        this.lap++;
        // A live change to a song of another length: the next lap is already the new one's.
        if (this.target && !this.cuts[0]?.whole && Math.abs(this.target.durationSec - this.duration) > 1e-6) {
          this.info = this.target;
          this.loop = { start: 0, end: this.target.durationSec };
        }
        this.lapPendingUntil = wrapAt;
        this.idx = this.events.findIndex((x) => x.sec >= this.loop.start);
        if (this.idx < 0) this.idx = this.events.length;
        this.active = 0;
        continue;
      }
      if (this.compact && !this.loop && this.active === 0) {
        // Skip silences: when nothing sounds and the next note is far, bring it closer.
        let next = null;
        for (let i = this.idx; i < this.events.length; i++) {
          const x = this.events[i];
          if (x.type === 'on' && this.audible(x)) { next = x; break; }
        }
        if (next && next.sec - this.silenceFrom > GAP_MAX && limit >= this.silenceFrom + GAP_KEEP) {
          this.offset = this.silenceFrom + GAP_KEEP + this.offset - next.sec;
          this.silenceFrom = next.sec;
          continue;
        }
      }
      break;
    }
    if (!this.loop && this.idx >= this.events.length && now - this.offset > this.duration + 0.3) {
      this.stop();
      this.onEnd?.();
    }
  }

  // ── synth ─────────────────────────────────────────────────────────────────────────────

  /**
   * One MIDI message (bytes) at context time t, through the channel's output as a song's would go
   * (the default sound: soundfont, simple synth or LUNA track): a sound tried outside the song.
   */
  sendMidi(bytes, t) {
    this.ensureContext();
    const kind = bytes[0] & 0xf0;
    const type = kind === 0x90 && bytes[2] > 0 ? 'on' : kind === 0x80 || kind === 0x90 ? 'off' : kind === 0xc0 ? 'pc' : kind === 0xb0 ? 'cc' : null;
    if (type) this.handle({ type, ch: bytes[0] & 15, a: bytes[1], b: bytes[2] ?? 0 }, Math.max(t, this.ctx.currentTime), false);
  }

  handle(e, t, stateOnly) {
    const st = this.ch[e.ch];
    const out = this.outputFor(e.ch);
    if (out) {
      // An external synth: keep the channel state (for starting mid-song) and pass the message on.
      if (e.type === 'pc') st.program = e.a;
      else if (e.type === 'cc') {
        if (e.a === 0) st.bankMsb = e.b;
        else if (e.a === 32) st.bankLsb = e.b;
        else if (e.a === 7) st.volume = e.b / 127;
        else if (e.a === 11) st.expression = e.b / 127;
        else if (e.a === 10) st.pan = (e.b - 64) / 64;
      }
      if (stateOnly) return;
      const key = e.ch * 128 + e.a;
      if (e.type === 'on') { this.held.add(key); out.send(t, 0x90 | e.ch, e.a, e.b); }
      else if (e.type === 'off') { this.held.delete(key); out.send(t, 0x80 | e.ch, e.a, 0); }
      else if (e.type === 'pc') out.send(t, 0xc0 | e.ch, e.a, 0);
      else if (e.type === 'cc') out.send(t, 0xb0 | e.ch, e.a, e.a === 7 ? this.cc7(e.ch) : e.b);
      return;
    }
    if (e.type === 'pc') st.program = e.a;
    else if (e.type === 'cc') {
      if (e.a === 0) st.bankMsb = e.b;
      else if (e.a === 32) st.bankLsb = e.b;
      else if (e.a === 7) st.volume = e.b / 127;
      else if (e.a === 11) st.expression = e.b / 127;
      else if (e.a === 10) st.pan = (e.b - 64) / 64;
      else if (e.a === 64) {
        st.sustain = e.b >= 64;
        if (!st.sustain && !stateOnly) { for (const k of st.held) this.release(k, t); st.held.clear(); }
      } else if (e.a === 121) { st.volume = 100 / 127; st.expression = 1; st.pan = 0; st.sustain = false; }
      else if (e.a === 123 && !stateOnly) for (const k of [...this.voices.keys()]) if ((k >> 7) === e.ch) this.release(k, t);
    } else if (e.type === 'on') this.noteOn(e.ch, e.a, e.b, t);
    else if (e.type === 'off') {
      const key = e.ch * 128 + e.a;
      if (st.sustain) st.held.add(key);
      else this.release(key, t);
    }
  }

  noteOn(c, note, vel, t) {
    const ctx = this.ctx;
    const st = this.ch[c];
    const amp = (vel / 127) ** 1.6 * st.volume * this.gains[c] * st.expression * 0.32;
    if (amp <= 0.0005) return;
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.max(-1, Math.min(1, st.pan));
    pan.connect(this.master);
    if (c === 9) { this.drum(note, amp, t, pan); return; }

    const key = c * 128 + note;
    this.release(key, t);
    if (this.voices.size >= MAX_VOICES) this.release(this.voices.keys().next().value, t);
    const P = PATCHES[st.program >> 3];
    const freq = 440 * 2 ** ((note - 69) / 12);
    const out = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = Math.min(P.cutoff + freq * 2, 16000);
    filter.connect(out).connect(pan);
    const oscs = (P.detune ? [-P.detune, P.detune] : [0]).map((cents) => {
      const o = ctx.createOscillator();
      o.type = P.wave;
      o.frequency.value = freq;
      o.detune.value = cents;
      o.connect(filter);
      o.start(t);
      return o;
    });
    const level = P.detune ? amp * 0.7 : amp;
    const g = out.gain;
    g.setValueAtTime(0, t);
    g.linearRampToValueAtTime(level, t + P.attack);
    g.setTargetAtTime(level * P.sustain, t + P.attack, P.decay / 3);
    // Decaying patches end by themselves; sustained ones wait for note-off.
    const auto = P.sustain === 0 ? t + P.attack + P.decay * 2 : t + 30;
    for (const o of oscs) o.stop(auto);
    this.voices.set(key, { out, oscs, release: P.release });
    oscs[0].onended = () => { if (this.voices.get(key)?.out === out) this.voices.delete(key); pan.disconnect(); };
  }

  release(key, t) {
    const v = this.voices.get(key);
    if (!v) return;
    this.voices.delete(key);
    const g = v.out.gain;
    if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(t);
    else g.cancelScheduledValues(t);
    g.setTargetAtTime(0, t, v.release / 4);
    for (const o of v.oscs) { try { o.stop(t + v.release * 1.5); } catch { /* already stopping */ } }
  }

  allOff() {
    const outputs = new Map();
    for (const c of this.usedChannels()) {
      const out = this.outputFor(c);
      if (out) {
        if (!outputs.has(out)) outputs.set(out, []);
        outputs.get(out).push(c);
      }
    }
    for (const [out, channels] of outputs) out.silence([...this.held].filter((key) => channels.includes(key >> 7)), channels);
    this.held.clear();
    const t = this.ctx?.currentTime ?? 0;
    for (const key of [...this.voices.keys()]) {
      const v = this.voices.get(key);
      this.voices.delete(key);
      v.out.gain.cancelScheduledValues(t);
      v.out.gain.setTargetAtTime(0, t, 0.01);
      for (const o of v.oscs) { try { o.stop(t + 0.05); } catch { /* already stopping */ } }
    }
    for (const st of this.ch) st.held.clear();
  }

  /** GM drum kit, synthesized: kick, snare, toms, hats, cymbals, everything else a click. */
  drum(note, amp, t, dest) {
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.connect(dest);
    const tone = (f0, f1, len, level, wave = 'sine') => {
      const o = ctx.createOscillator();
      o.type = wave;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f1, t + len * 0.6);
      const g = ctx.createGain();
      g.gain.setValueAtTime(level, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + len + 0.02);
    };
    const noise = (type, freq, len, level) => {
      const s = ctx.createBufferSource();
      s.buffer = this.noise;
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(level, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + len);
      s.connect(f).connect(g).connect(out);
      s.start(t, Math.random());
      s.stop(t + len + 0.02);
    };
    if (note === 35 || note === 36) tone(150, 45, 0.3, amp * 2.2);
    else if (note >= 37 && note <= 40) { noise('bandpass', 1800, 0.18, amp * 1.6); tone(220, 160, 0.08, amp * 0.8, 'triangle'); }
    else if ([41, 43, 45, 47, 48, 50].includes(note)) tone(70 + (note - 41) * 14, 50 + (note - 41) * 8, 0.35, amp * 1.6);
    else if (note === 42 || note === 44) noise('highpass', 7000, 0.05, amp * 0.9);
    else if (note === 46) noise('highpass', 7000, 0.3, amp * 0.8);
    else if ([49, 52, 55, 57].includes(note)) noise('highpass', 5000, 1.1, amp * 0.8);
    else if (note === 51 || note === 53 || note === 59) noise('highpass', 6500, 0.5, amp * 0.6);
    else noise('bandpass', 3000, 0.08, amp);
  }
}

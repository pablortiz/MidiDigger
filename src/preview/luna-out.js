// Preview through a LUNA track: the player's MIDI goes live to that track's instrument with
// Luna.SendMidi (measured in LUNA 3.1.1: accepted with the track neither armed nor monitored,
// about 0.3 ms a round trip). send_midi has no timestamp, so each message waits in a queue and
// leaves at its time; the player schedules ahead on the AudioContext clock as for its synth.

import { every } from './ticker.js';

const FLUSH_MS = 2;   // how often the queue is checked (browsers clamp to about 4 ms)

export class LunaMidiOut {
  /**
   * sendMidi: a Luna.SendMidi. target(): { sessionUid, trackUid } or null.
   * clock(): seconds on the player's AudioContext.
   */
  constructor(sendMidi, target, clock) {
    Object.assign(this, { sendMidi, target, clock });
    this.queue = [];
    this.timer = 0;
    this.untick = null;   // the Worker's tick too: a page timer is slowed to once a second out of sight
    this.failed = false;
    this.onError = null;
  }

  /** Queue one message for context time t. */
  send(t, status, d1, d2 = 0) {
    const q = this.queue;
    const msg = { t, status, d1, d2 };
    let i = q.length;
    while (i > 0 && q[i - 1].t > t) i--;   // keep time order (messages mostly arrive in order)
    q.splice(i, 0, msg);
    if (!this.timer) this.timer = setInterval(() => this.flush(), FLUSH_MS);
    this.untick ??= every(() => this.flush());
  }

  flush() {
    const now = this.clock();
    const to = this.target();
    while (this.queue.length && this.queue[0].t <= now + 0.002) {
      const m = this.queue.shift();
      if (!to) continue;
      this.sendMidi.sendMidi(to.sessionUid, to.trackUid, m.status, m.d1, m.d2).catch((e) => {
        if (!this.failed) { this.failed = true; this.onError?.(e); }
      });
    }
    if (!this.queue.length) this.stopTimers();
  }

  /** Drop what has not left yet. */
  clear() {
    this.queue = [];
    this.stopTimers();
  }

  stopTimers() {
    clearInterval(this.timer);
    this.timer = 0;
    this.untick?.();
    this.untick = null;
  }

  /** Now: note-offs for `held` keys (channel·128+note) and All Notes Off on `channels`. */
  silence(held, channels) {
    this.clear();
    const to = this.target();
    if (!to) return;
    const send = (s, a, b) => this.sendMidi.sendMidi(to.sessionUid, to.trackUid, s, a, b).catch(() => {});
    for (const key of held) send(0x80 | (key >> 7), key & 127, 0);
    for (const ch of channels) {
      send(0xb0 | ch, 64, 0);    // sustain off
      send(0xb0 | ch, 123, 0);   // all notes off
    }
  }
}

/** A loop row plays the track's existing instrument without changing its preset. */
export class LunaTrackOutput {
  constructor(output) { this.output = output; }

  send(t, status, d1, d2) {
    const type = status & 0xf0;
    if (type === 0xc0 || (type === 0xb0 && (d1 === 0 || d1 === 32))) return;
    this.output.send(t, type, d1, d2);
  }

  silence(held) {
    this.output.silence(held.map((key) => key & 127), [0]);
  }
}

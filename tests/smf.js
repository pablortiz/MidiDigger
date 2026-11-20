// Building Standard MIDI Files for tests.

/** A Standard MIDI File from tracks of [delta, ...bytes] events. */
export function smf(format, ppq, tracks) {
  const vlq = (n) => { const out = [n & 0x7f]; while ((n >>= 7)) out.unshift((n & 0x7f) | 0x80); return out; };
  const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  const bytes = [...'MThd'].map((c) => c.charCodeAt(0)).concat(u32(6), [0, format, 0, tracks.length, ppq >> 8, ppq & 255]);
  for (const events of tracks) {
    const body = events.flatMap(([delta, ...rest]) => [...vlq(delta), ...rest]).concat([0, 0xff, 0x2f, 0]);
    bytes.push(...[...'MTrk'].map((c) => c.charCodeAt(0)), ...u32(body.length), ...body);
  }
  return new Uint8Array(bytes);
}

export const meta = (type, data) => [0xff, type, data.length, ...data];
export const str = (s) => [...s].map((c) => c.charCodeAt(0));

/**
 * Events for one channel from notes [tick, pitch, lengthTicks, velocity], as [delta, ...]
 * with note-ons and note-offs interleaved in time order.
 */
export function noteEvents(channel, notes) {
  const ev = [];
  for (const [tick, pitch, len, vel = 100] of notes) {
    ev.push({ tick, bytes: [0x90 | channel, pitch, vel], order: 1 });
    ev.push({ tick: tick + len, bytes: [0x80 | channel, pitch, 0], order: 0 });
  }
  ev.sort((a, b) => a.tick - b.tick || a.order - b.order);
  let last = 0;
  return ev.map((e) => { const d = e.tick - last; last = e.tick; return [d, ...e.bytes]; });
}

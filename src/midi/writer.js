// A Standard MIDI File (format 1) of what plays: a song as the preview plays it (events with
// their second, as loopSong and lanesSong give them), one track per channel, named, its sound
// (Program Change) at its start; the tempo and the meter on the first track. Any DAW opens it.

const PPQ = 480;

/** A number as a MIDI variable-length quantity. */
function vlq(n) {
  const bytes = [n & 0x7f];
  for (let v = n >> 7; v > 0; v >>= 7) bytes.unshift((v & 0x7f) | 0x80);
  return bytes;
}

const text = (s) => [...new TextEncoder().encode(s)];

/** A track chunk from [tick, bytes] events (sorted), ended. */
function track(events) {
  const body = [];
  let last = 0;
  for (const [tick, bytes] of events) {
    body.push(...vlq(Math.max(0, tick - last)), ...bytes);
    last = Math.max(last, tick);
  }
  body.push(0x00, 0xff, 0x2f, 0x00);
  const n = body.length;
  return [0x4d, 0x54, 0x72, 0x6b, (n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff, ...body];
}

const meta = (type, data) => [0xff, type, ...vlq(data.length), ...data];

/**
 * The file's bytes. `song`: { events: [{ sec, rank?, type: 'on'|'off'|'pc'|'cc', ch, a, b }] }
 * (ch 0-15); `bpm`, `timeSig` ("4/4"), `title`; `names`: Map ch (0-15) -> track name;
 * `channels`: those to write (all by default). Notes are placed by their second at `bpm`.
 */
export function smfOf(song, { bpm, timeSig = '4/4', title = '', names = new Map(), channels = null }) {
  const ticksAt = (sec) => Math.round((sec * bpm * PPQ) / 60);
  const [num, den] = timeSig.split('/').map(Number);
  const tempo = Math.round(60e6 / bpm);
  const first = [
    [0, meta(0x03, text(title))],
    [0, meta(0x51, [(tempo >> 16) & 0xff, (tempo >> 8) & 0xff, tempo & 0xff])],
    [0, meta(0x58, [num || 4, Math.round(Math.log2(den || 4)), 24, 8])],
  ];
  const byChannel = new Map();
  for (const e of [...song.events].sort((x, y) => x.sec - y.sec || (x.rank ?? 0) - (y.rank ?? 0))) {
    if (channels && !channels.has(e.ch)) continue;
    const bytes = e.type === 'on' ? [0x90 | e.ch, e.a, Math.max(1, e.b)]
      : e.type === 'off' ? [0x80 | e.ch, e.a, 0]
        : e.type === 'pc' ? [0xc0 | e.ch, e.a]
          : e.type === 'cc' ? [0xb0 | e.ch, e.a, e.b] : null;
    if (!bytes) continue;
    if (!byChannel.has(e.ch)) byChannel.set(e.ch, []);
    byChannel.get(e.ch).push([ticksAt(e.sec), bytes]);
  }
  // Only channels that play notes: a channel with a sound and no note is left out.
  const tracks = [...byChannel].filter(([, evs]) => evs.some(([, b]) => (b[0] & 0xf0) === 0x90)).sort((a, b) => a[0] - b[0])
    .map(([ch, evs]) => track([[0, meta(0x03, text(names.get(ch) ?? `Channel ${ch + 1}`))], ...evs]));
  const head = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 1, 0, tracks.length + 1, (PPQ >> 8) & 0xff, PPQ & 0xff];
  return new Uint8Array([...head, ...track(first), ...tracks.flat()]);
}

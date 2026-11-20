// Standard MIDI File parser: what the library and LUNA care about, the tempo and meter maps
// (ticks <-> seconds <-> bars), and a time-sorted event list for the preview player.

/**
 * Parse a Standard MIDI File (also inside a RIFF/RMID wrapper). Throws when the bytes are
 * not MIDI (the library holds HTML error pages saved as .mid).
 */
export function parseMidi(input) {
  const d = input instanceof Uint8Array ? input : new Uint8Array(input);
  let p = 0;
  const scanLimit = Math.min(d.length - 4, 2048);
  while (p <= scanLimit && !(d[p] === 0x4d && d[p + 1] === 0x54 && d[p + 2] === 0x68 && d[p + 3] === 0x64)) p++;
  if (p > scanLimit) throw new Error('Not a MIDI file (no MThd header).');
  const u32 = () => { const v = ((d[p] << 24) >>> 0) + (d[p + 1] << 16) + (d[p + 2] << 8) + d[p + 3]; p += 4; return v; };
  const u16 = () => { const v = (d[p] << 8) | d[p + 1]; p += 2; return v; };
  const vlq = () => { let v = 0, b; do { b = d[p++]; v = (v * 128) + (b & 0x7f); } while (b & 0x80 && p < d.length); return v; };
  const text = (bytes) => String.fromCharCode(...bytes.subarray(0, 200)).replace(/\0+$/, '').trim();

  p += 4;
  const headerLen = u32();
  const headerEnd = p + headerLen;
  const format = u16();
  const declaredTracks = u16();
  const division = u16();
  p = headerEnd;
  const smpte = (division & 0x8000) !== 0;
  const ppq = smpte ? 0 : division;
  const secPerTickSmpte = smpte ? 1 / ((256 - (division >> 8)) * (division & 0xff)) : 0;

  const tracks = [];
  const tempos = [];
  const timeSigs = [];
  const keySigs = [];
  const markers = [];
  const texts = [];
  const events = [];
  const bends = [];   // pitch bend, apart from `events`: only an analysis saved with MIDI events keeps it
  const channels = new Map();
  let copyright = '';
  let lyrics = 0;
  let sysex = 0;
  let standard = '';
  let lastTick = 0;
  const chan = (c) => {
    if (!channels.has(c)) channels.set(c, { channel: c + 1, notes: 0, min: 127, max: 0, programs: [], bankMsb: null, bankLsb: null, tracks: new Set() });
    return channels.get(c);
  };

  while (tracks.length < declaredTracks && p + 8 <= d.length) {
    const id = String.fromCharCode(d[p], d[p + 1], d[p + 2], d[p + 3]);
    p += 4;
    const len = u32();
    const end = Math.min(p + len, d.length);
    if (id !== 'MTrk') { p = end; continue; }
    const ti = tracks.length;
    const tr = { index: ti + 1, name: '', instrument: '', notes: 0, channels: new Set() };
    let tick = 0;
    let running = 0;
    while (p < end) {
      tick += vlq();
      let status = d[p];
      if (status & 0x80) p++;
      else if (running) status = running;
      else break; // corrupt: data byte with no running status
      if (status === 0xff) {
        running = 0;
        const type = d[p++];
        const n = vlq();
        const data = d.subarray(p, p + n);
        p += n;
        if (type === 0x03 && !tr.name) tr.name = text(data);
        else if (type === 0x04 && !tr.instrument) tr.instrument = text(data);
        else if (type === 0x02 && !copyright) copyright = text(data);
        else if (type === 0x01 && texts.length < 10 && data.length) texts.push(text(data));
        else if (type === 0x05) lyrics++;
        else if (type === 0x06) markers.push({ tick, text: text(data) });
        else if (type === 0x51 && n >= 3) tempos.push({ tick, uspq: (data[0] << 16) | (data[1] << 8) | data[2] });
        else if (type === 0x58 && n >= 2) timeSigs.push({ tick, num: data[0] || 4, den: 2 ** data[1] });
        else if (type === 0x59 && n >= 2) keySigs.push({ tick, sf: (data[0] << 24) >> 24, minor: data[1] === 1 });
        else if (type === 0x2f) break;
      } else if (status === 0xf0 || status === 0xf7) {
        running = 0;
        const n = vlq();
        const s = d.subarray(p, p + n);
        p += n;
        sysex++;
        if (s[0] === 0x7e && s[2] === 0x09 && (s[3] === 0x01 || s[3] === 0x03)) standard ||= s[3] === 0x03 ? 'GM2' : 'GM';
        else if (s[0] === 0x41 && s[2] === 0x42 && s[3] === 0x12 && s[4] === 0x40 && s[5] === 0x00 && s[6] === 0x7f) standard = 'GS';
        else if (s[0] === 0x43 && s[2] === 0x4c && s[3] === 0x00 && s[4] === 0x00 && s[5] === 0x7e) standard = 'XG';
      } else {
        running = status;
        const kind = status & 0xf0;
        const c = status & 0x0f;
        const a = d[p++];
        const b = kind === 0xc0 || kind === 0xd0 ? 0 : d[p++];
        if (kind === 0x90 && b > 0) {
          const ch = chan(c);
          ch.notes++;
          ch.min = Math.min(ch.min, a);
          ch.max = Math.max(ch.max, a);
          ch.tracks.add(ti + 1);
          tr.notes++;
          tr.channels.add(c + 1);
          events.push({ tick, rank: 3, type: 'on', ch: c, a, b, tr: ti + 1 });
        } else if (kind === 0x80 || kind === 0x90) {
          events.push({ tick, rank: 2, type: 'off', ch: c, a, b: 0, tr: ti + 1 });
        } else if (kind === 0xc0) {
          const ch = chan(c);
          if (ch.programs.at(-1) !== a) ch.programs.push(a);
          events.push({ tick, rank: 0, type: 'pc', ch: c, a, b: 0 });
        } else if (kind === 0xb0) {
          const ch = chan(c);
          if (a === 0 && ch.bankMsb === null) ch.bankMsb = b;
          if (a === 32 && ch.bankLsb === null) ch.bankLsb = b;
          // Bank select (0, 32), volume, pan, expression, sustain, reset and all-notes-off: what a
          // General MIDI synth (the soundfont preview, a LUNA instrument) needs to sound right.
          if ([0, 7, 10, 11, 32, 64, 121, 123].includes(a)) events.push({ tick, rank: 1, type: 'cc', ch: c, a, b });
        } else if (kind === 0xe0) {
          bends.push({ tick, ch: c, value: a | (b << 7) });   // 0–16383, 8192 at rest
        }
      }
    }
    lastTick = Math.max(lastTick, tick);
    tracks.push(tr);
    p = end;
  }

  // Tempo map: ticks -> seconds.
  tempos.sort((x, y) => x.tick - y.tick);
  if (!tempos.length || tempos[0].tick > 0) tempos.unshift({ tick: 0, uspq: 500000 });
  const segs = [];
  let secAt = 0;
  for (let i = 0; i < tempos.length; i++) {
    if (i > 0) secAt += ((tempos[i].tick - tempos[i - 1].tick) * tempos[i - 1].uspq) / 1e6 / ppq;
    segs.push({ tick: tempos[i].tick, sec: secAt, uspq: tempos[i].uspq });
  }
  const tickToSec = (tick) => {
    if (smpte) return tick * secPerTickSmpte;
    if (!ppq) return 0;
    let lo = 0, hi = segs.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (segs[mid].tick <= tick) lo = mid; else hi = mid - 1; }
    const s = segs[lo];
    return s.sec + ((tick - s.tick) * s.uspq) / 1e6 / ppq;
  };

  const secToTick = (sec) => {
    if (smpte) return sec / secPerTickSmpte;
    if (!ppq) return 0;
    let lo = 0, hi = segs.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (segs[mid].sec <= sec) lo = mid; else hi = mid - 1; }
    const s = segs[lo];
    return s.tick + ((sec - s.sec) * 1e6 * ppq) / s.uspq;
  };

  // Meter map: bars are numbered from 1 at tick 0, following every time signature change.
  timeSigs.sort((x, y) => x.tick - y.tick);
  const meters = [...timeSigs];
  if (!meters.length || meters[0].tick > 0) meters.unshift({ tick: 0, num: 4, den: 4 });
  const barLen = (m) => (ppq * 4 * m.num) / m.den;
  const msegs = [];
  for (const m of meters) {
    const prev = msegs.at(-1);
    const bar = prev ? prev.bar + Math.round((m.tick - prev.tick) / barLen(prev)) : 1;
    if (prev && prev.tick === m.tick) msegs.pop();
    msegs.push({ tick: m.tick, num: m.num, den: m.den, bar });
  }
  const barStartTick = (bar) => {
    if (!ppq) return 0;
    let s = msegs[0];
    for (const m of msegs) { if (m.bar <= bar) s = m; else break; }
    return Math.round(s.tick + (bar - s.bar) * barLen(s));
  };
  /** Bar position of a tick as a number: 3.5 is halfway through bar 3. */
  const barOfTick = (tick) => {
    if (!ppq) return 1;
    let s = msegs[0];
    for (const m of msegs) { if (m.tick <= tick) s = m; else break; }
    return s.bar + (tick - s.tick) / barLen(s);
  };

  events.sort((x, y) => x.tick - y.tick || x.rank - y.rank);
  for (const e of events) e.sec = tickToSec(e.tick);
  const bpms = tempos.map((t) => 60e6 / t.uspq);
  const ts = meters[0];
  const ks = keySigs.sort((x, y) => x.tick - y.tick)[0];
  const chList = [...channels.values()].filter((c) => c.notes > 0).sort((x, y) => x.channel - y.channel)
    .map((c) => ({ ...c, tracks: [...c.tracks] }));

  return {
    format,
    trackCount: tracks.length,
    ppq,
    smpte,
    durationSec: tickToSec(lastTick),
    lastTick,
    bars: ppq ? barOfTick(lastTick) - 1 : 0,
    bpm: bpms[0],
    bpmMin: Math.min(...bpms),
    bpmMax: Math.max(...bpms),
    tempoChanges: tempos.length - 1,
    tempoMap: tempos.map((t) => ({ sec: tickToSec(t.tick), bpm: 60e6 / t.uspq })),   // [{ sec, bpm }], in order
    tempos: segs.map((s) => ({ tick: s.tick, uspq: s.uspq })),   // [{ tick, uspq }] from tick 0, in order
    bends: bends.sort((x, y) => x.tick - y.tick),   // [{ tick, ch (0-15), value }], in order
    timeSig: `${ts.num}/${ts.den}`,
    timeSigChanges: Math.max(0, msegs.length - 1),
    meterMap: msegs.map((m) => ({ sec: tickToSec(m.tick), ts: `${m.num}/${m.den}` })),   // [{ sec, ts }], in order
    key: ks ? keyName(ks.sf, ks.minor) : '',
    standard,
    sysex,
    copyright,
    texts,
    lyrics,
    markers: markers.map((m) => ({ sec: tickToSec(m.tick), text: m.text })),
    notes: chList.reduce((n, c) => n + c.notes, 0),
    channels: chList,
    tracks: tracks.map((t) => ({ ...t, channels: [...t.channels].sort((x, y) => x - y) })),
    events,
    tickToSec,
    secToTick,
    barStartTick,
    barOfTick,
  };
}

/**
 * A key as shown: "C major", "A minor". Keys are stored as keyName writes them ("C mayor",
 * "A menor"), so catalogues built before the English UI stay valid.
 */
export function keyLabel(key) {
  return (key ?? '').replace(/ mayor$/, ' major').replace(/ menor$/, ' minor');
}

export function keyName(sf, minor) {
  const major = ['Cb', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
  const minr = ['Ab', 'Eb', 'Bb', 'F', 'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#'];
  const i = sf + 7;
  if (i < 0 || i > 14) return '';
  return minor ? `${minr[i]} menor` : `${major[i]} mayor`;
}

/** "3:07" */
export function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '–';
  const s = Math.floor(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** "5 min 02 s", or "48 s" under a minute. */
export function formatDuration(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '–';
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  return m ? `${m} min ${String(s % 60).padStart(2, '0')} s` : `${s} s`;
}

/** "A4", "C#2" for a MIDI note number. */
export function noteName(n) {
  return `${['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][n % 12]}${Math.floor(n / 12) - 1}`;
}

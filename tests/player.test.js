import { afterEach, describe, expect, it } from 'vitest';
import { PreviewPlayer } from '../src/preview/player.js';
import { LunaTrackOutput } from '../src/preview/luna-out.js';

// A song the player loops: one note per second on each channel, `pitch` + the second.
const song = (pitches, seconds = 8) => {
  const events = [];
  for (const [ch, pitch] of pitches) {
    for (let s = 0; s < seconds; s++) {
      events.push({ type: 'on', ch, a: pitch + s, b: 100, sec: s, rank: 1 });
      events.push({ type: 'off', ch, a: pitch + s, b: 0, sec: s + 0.5, rank: 0 });
    }
  }
  events.sort((x, y) => x.sec - y.sec || x.rank - y.rank);
  return { events, durationSec: seconds, channels: pitches.map(([ch]) => ({ channel: ch + 1 })) };
};

/** A player on a fake clock and a MIDI output that records what it sends. */
function rig(first) {
  const p = new PreviewPlayer();
  const sent = [];
  p.ctx = { currentTime: 0, resume: async () => {} };
  p.out = { send: (t, status, a) => sent.push({ t, status, a }), silence: () => {} };
  p.load(first);
  p.loop = { start: 0, end: first.durationSec };
  p.startFrom(0);
  p.untick?.();   // the test drives pump() on its own clock
  const run = (until) => { for (let t = p.ctx.currentTime; t <= until; t += 0.025) { p.ctx.currentTime = t; p.pump(); } };
  // Note-ons as [song second, channel, note].
  const ons = () => sent.filter((m) => (m.status & 0xf0) === 0x90).map((m) => [Math.round((m.t - 0.05) * 100) / 100, m.status & 15, m.a]);
  return { p, run, ons };
}

let player;
afterEach(() => player?.untick?.());

describe('PreviewPlayer chain of regions', () => {
  it('keeps the playhead moving through a loop that extends beyond the last event', () => {
    const { p, run } = rig(song([[0, 60]], 2));
    player = p;
    p.setLoop({ startSec: 0, endSec: 4 });
    run(3);
    expect(p.songPosition).toBeGreaterThan(2.5);
    expect(p.songPosition).toBeLessThan(4);
  });

  it('plays them one after the other, then the first again, with no gap', () => {
    const { p, run, ons } = rig(song([[0, 60]], 8));
    player = p;
    p.setChain([{ startSec: 1, endSec: 3 }, { startSec: 5, endSec: 6 }]);
    run(6.2);
    // Seconds of the song: the first note was already out; the last was scheduled ahead.
    expect(ons().map((n) => n[2] - 60).slice(0, 8)).toEqual([0, 1, 2, 5, 1, 2, 5, 1]);
  });

  it('keeps the playhead on the song, and a plain loop ends the chain', () => {
    const { p, run } = rig(song([[0, 60]], 8));
    player = p;
    p.setChain([{ startSec: 1, endSec: 3 }, { startSec: 5, endSec: 6 }]);
    run(2.5);
    expect(p.songPosition).toBeGreaterThanOrEqual(5);
    expect(p.songPosition).toBeLessThan(6);
    p.setLoop({ startSec: 0, endSec: 2 });
    expect(p.chain).toBe(null);
  });
});

describe('PreviewPlayer live changes', () => {
  it('brings multiple playlist rows in at the same cut without stopping', () => {
    const { p, run, ons } = rig(song([[0, 40], [1, 50]]));
    player = p;
    run(0.5);
    p.morph(song([[0, 80], [1, 90]]), [{ ch: 1, at: 2 }, { ch: 2, at: 2 }], { whole: true });
    run(3.2);
    expect(ons().filter(([, ch]) => ch === 0).slice(0, 4)).toEqual([[0, 0, 40], [1, 0, 41], [2, 0, 82], [3, 0, 83]]);
    expect(ons().filter(([, ch]) => ch === 1).slice(0, 4)).toEqual([[0, 1, 50], [1, 1, 51], [2, 1, 92], [3, 1, 93]]);
    expect(p.playing).toBe(true);
  });

  it('brings separately queued playlist rows in together at the next loop boundary', () => {
    const { p, run, ons } = rig(song([[0, 40], [1, 50], [2, 60]], 4));
    player = p;
    run(1.5);
    p.morph(song([[0, 80], [1, 50], [2, 60]], 4), [{ ch: 1, at: 4 }]);
    p.morph(song([[0, 80], [1, 90], [2, 60]], 4), [{ ch: 2, at: 4 }]);
    p.morph(song([[0, 80], [1, 90], [2, 100]], 4), [{ ch: 3, at: 4 }]);
    run(4.5);
    expect(ons().filter(([t]) => t === 4).sort((a, b) => a[1] - b[1])).toEqual([[4, 0, 80], [4, 1, 90], [4, 2, 100]]);
  });

  it('routes each channel independently and silences each destination on stop', () => {
    const p = new PreviewPlayer();
    const calls = [];
    const output = (name) => ({
      send: (t, status, a, b) => calls.push([name, status, a, b]),
      silence: (held, channels) => calls.push([name, held, channels]),
    });
    p.ctx = { currentTime: 0 };
    p.info = { channels: [{ channel: 1 }, { channel: 2 }] };
    p.out = output('default');
    p.setChannelOutputs(new Map([[1, output('second')]]));
    p.handle({ type: 'on', ch: 0, a: 60, b: 100 }, 0, false);
    p.handle({ type: 'on', ch: 1, a: 64, b: 90 }, 0, false);
    p.allOff();
    expect(calls).toEqual([
      ['default', 0x90, 60, 100], ['second', 0x91, 64, 90],
      ['default', [60], [0]], ['second', [192], [1]],
    ]);
  });

  it('does not send bank or program changes to an existing LUNA instrument track', () => {
    const calls = [];
    const out = new LunaTrackOutput({
      send: (...args) => calls.push(args),
      silence: (...args) => calls.push(args),
    });
    out.send(1, 0xc3, 5, 0);
    out.send(1, 0xb3, 0, 1);
    out.send(1, 0xb3, 32, 2);
    out.send(1, 0x93, 60, 100);
    out.silence([3 * 128 + 60], [3]);
    expect(calls).toEqual([[1, 0x90, 60, 100], [[60], [0]]]);
  });

  it('changes each channel at its own moment, keeping time, without stopping', () => {
    const { p, run, ons } = rig(song([[0, 40], [9, 60]]));
    player = p;
    run(1.2);
    // Channel 1 changes at second 4, channel 10 at the next lap (second 8 = 0 of lap 2).
    p.morph(song([[0, 80], [9, 90]]), [{ ch: 1, at: 4 }, { ch: 10, at: 8 }]);
    expect(p.waiting()).toEqual(new Set([1, 10]));
    run(9.6);
    const ch1 = ons().filter(([, c]) => c === 0).map(([, , a]) => a);
    expect(ch1.slice(0, 10)).toEqual([40, 41, 42, 43, 84, 85, 86, 87, 80, 81]);
    const drums = ons().filter(([, c]) => c === 9).map(([, , a]) => a);
    expect(drums.slice(0, 10)).toEqual([60, 61, 62, 63, 64, 65, 66, 67, 90, 91]);
    expect(p.waiting().size).toBe(0);
    // Time kept: one note a second all through.
    expect(ons().filter(([, c]) => c === 0).map(([t]) => t).slice(0, 10)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('does not lose a channel on its way when another change comes first', () => {
    const { p, run, ons } = rig(song([[0, 40], [1, 50]]));
    player = p;
    run(0.5);
    // Channel 2 goes at second 2; before that, a change that does not name it.
    const onlyFirst = song([[0, 40]]);
    p.morph(onlyFirst, [{ ch: 2, at: 2 }]);
    run(1.2);
    p.morph(onlyFirst, [{ ch: 1, at: 4 }]);
    run(4.2);
    const second = ons().filter(([, c]) => c === 1).map(([t]) => t);
    expect(second).toEqual([0, 1]);   // it stopped where it should
  });

  it('keeps independent playlist changes at their own cuts while another row changes', () => {
    const { p, run, ons } = rig(song([[0, 40], [1, 50], [9, 60]]));
    player = p;
    run(0.5);
    p.morph(song([[0, 40], [1, 50], [9, 90]]), [{ ch: 10, at: 4 }]);
    p.morph(song([[0, 80], [1, 50], [9, 90]]), [{ ch: 1, at: 2 }]);
    p.morph(song([[0, 80], [1, 70], [9, 90]]), [{ ch: 2, at: 3 }]);
    run(4.5);
    expect(ons().filter(([, ch]) => ch === 0).map(([, , note]) => note).slice(0, 5)).toEqual([40, 41, 82, 83, 84]);
    expect(ons().filter(([, ch]) => ch === 1).map(([, , note]) => note).slice(0, 5)).toEqual([50, 51, 52, 73, 74]);
    expect(ons().filter(([, ch]) => ch === 9).map(([, , note]) => note).slice(0, 5)).toEqual([60, 61, 62, 63, 94]);
  });

  it('brings the waiting changes in sooner when hurried', () => {
    const { p, run, ons } = rig(song([[0, 40]]));
    player = p;
    run(0.5);
    p.morph(song([[0, 80]]), [{ ch: 1, at: 6 }]);
    p.hurry(2);
    run(3.2);
    expect(ons().map(([, , a]) => a)).toEqual([40, 41, 82, 83]);
  });

  it('takes a song of another length at once, on at the same point, when asked to', () => {
    const { p, run, ons } = rig(song([[0, 40]], 4));
    player = p;
    run(1.2);
    // At second 3 the 2-second song comes in at its second 1 (3 mod 2), and loops on.
    p.morph(song([[0, 80]], 2), [{ ch: 1, at: 3 }], { whole: true });
    expect(p.waiting()).toEqual(new Set([1]));
    run(6.2);
    expect(ons().map(([t, , a]) => [t, a])).toEqual([[0, 40], [1, 41], [2, 42], [3, 81], [4, 80], [5, 81], [6, 80]]);
    expect(p.waiting().size).toBe(0);
  });

  it('takes a song of another length at the next lap', () => {
    const { p, run, ons } = rig(song([[0, 40]], 4));
    player = p;
    run(1.2);
    p.morph(song([[0, 80]], 2), [{ ch: 1, at: 1.5 }]);
    run(8.2);
    expect(ons().map(([t, , a]) => [t, a])).toEqual([[0, 40], [1, 41], [2, 42], [3, 43], [4, 80], [5, 81], [6, 80], [7, 81], [8, 80]]);
  });
});

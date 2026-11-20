import { describe, expect, it } from 'vitest';
import { PHRASE, ROLE_BIT, compose, drumTurns, formOf, learn, rolesText, seeded } from '../src/midi/director.js';
import { arrangement } from '../src/midi/parts.js';

// A file of 4/4 bars of 4 ticks a beat (16 a bar), bar 1 from tick 0.
const file = (bars) => ({ ppq: 4, bars, barOf: (t) => Math.floor(t / 16) + 1, barStart: (b) => (b - 1) * 16 });
// A note every beat over bars [from, to] (1-based).
const steady = (from, to, pitch = 60) => Array.from({ length: (to - from + 1) * 4 }, (_, k) => ({ start: (from - 1) * 16 + k * 4, stop: (from - 1) * 16 + k * 4 + 4, pitch }));

describe('the director', () => {
  it('reads a song as phrases of 4 bars: the roles that play in most of each', () => {
    const channels = [
      { role: 'drums', notes: steady(1, 16, 36) },
      { role: 'bass', notes: steady(5, 16, 40) },
      { role: 'melody', notes: steady(9, 12, 72) },
    ];
    const { form } = formOf(channels, file(16));
    const D = ROLE_BIT.drums, B = ROLE_BIT.bass, M = ROLE_BIT.melody;
    expect(form).toEqual([D, D | B, D | B | M, D | B]);
    expect(rolesText(D | B | M)).toBe('drums + bass + melody');
  });

  it('finds the drum bars of their own: away from the groove and back', () => {
    const groove = (bar) => [0, 8].map((s) => ({ start: (bar - 1) * 16 + s, pitch: 36 }));
    const fill = (bar) => [0, 2, 4, 6, 8, 10, 12, 14].map((s) => ({ start: (bar - 1) * 16 + s, pitch: 45 }));
    const notes = [1, 2, 3, 5, 6, 7].flatMap(groove).concat(fill(4));
    expect(drumTurns(notes, file(8))).toEqual([4]);
  });

  it('learns how pieces start and go on, and walks it among the roles there are', () => {
    const D = ROLE_BIT.drums, B = ROLE_BIT.bass, C = ROLE_BIT.chords;
    const model = learn([
      { form: [D, D | B, D | B | C, D | B | C], turns: [0, 1, 1, 0] },
      { form: [D, D | B, D | B | C, D | B], turns: [0, 1, 0, 0] },
    ]);
    expect(model.songs).toBe(2);
    expect(model.start[D]).toBe(2);
    expect(model.next[D][D | B]).toBe(2);
    expect(model.turnOnChange).toBeCloseTo(2 / 5);   // 5 changes, 2 of them after a turn
    expect(model.turnOnStay).toBe(1);   // the one phrase that stays ends on a turn
    // Only drums and bass in the loop: never chords; and the whole band somewhere.
    const { form } = compose(model, D | B, 4, { rand: seeded(7) });
    expect(form.every((m) => m > 0 && (m & ~(D | B)) === 0)).toBe(true);
    expect(form).toContain(D | B);
    // The same seed, the same piece.
    expect(compose(model, D | B | C, 6, { rand: seeded(3) })).toEqual(compose(model, D | B | C, 6, { rand: seeded(3) }));
  });

  it('lays out the kit as the Markov pattern: phrases of 4 bars, the drums alone before a turn', () => {
    const lanes = [{ ch: 10, role: 'drums', bars: 4 }, { ch: 2, role: 'bass', bars: 4 }];
    const D = ROLE_BIT.drums, B = ROLE_BIT.bass;
    const model = learn([{ form: [D, D | B, D | B, D | B], turns: [1, 0, 0, 0] }]);
    const plan = arrangement(lanes, 'markov', 16, { model, daring: 0.3, seed: 1 });
    const bars = plan.sections.reduce((n, s) => n + s.bars, 0);
    expect(bars).toBe(16);
    expect(PHRASE).toBe(4);
    // Every bar has the drums; the bass only in phrases the piece gives it.
    expect(plan.sections.every((s) => s.channels.includes(10))).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { copyFingerprintGrid, fingerprintBars } from '../src/ui/fill-fingerprint.js';

describe('Fill comparison fingerprints', () => {
  it('keeps an independent snapshot and displays pitch classes per step and per bar', () => {
    const source = new Uint16Array([1, 0, (1 << 4) | (1 << 7), 1 << 1, 0, 0]);
    const grid = copyFingerprintGrid(source, 3);
    source[0] = 0;
    expect(fingerprintBars(grid, 'pitch')).toEqual(['1:C 3:E+G', '1:C#']);
  });

  it('shows rhythm positions per bar, including silent and partial bars', () => {
    const grid = copyFingerprintGrid(new Uint8Array([0, 1, 0, 0, 0, 0, 1]), 3);
    expect(fingerprintBars(grid, 'hits')).toEqual(['2', '–', '1']);
    expect(copyFingerprintGrid(null, 3)).toBeNull();
    expect(copyFingerprintGrid(new Uint8Array([1]), 0)).toBeNull();
  });
});

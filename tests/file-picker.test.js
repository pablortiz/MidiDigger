import { afterEach, describe, expect, it, vi } from 'vitest';
import { chooseFile } from '../src/ui/file-picker.js';

afterEach(() => vi.unstubAllGlobals());

describe('file picker', () => {
  it('returns the selected file without looking up its path', async () => {
    const file = { name: 'analysis.mdig' };
    const input = { files: [file], click() { this.onchange(); } };
    vi.stubGlobal('document', { createElement: () => input });
    await expect(chooseFile('.mdig,.json')).resolves.toBe(file);
    expect(input.accept).toBe('.mdig,.json');
  });

  it('returns null on cancellation and propagates picker errors', async () => {
    const input = { files: [], click() { this.oncancel(); } };
    vi.stubGlobal('document', { createElement: () => input });
    await expect(chooseFile('.json')).resolves.toBeNull();
    input.click = () => { throw new Error('Picker unavailable'); };
    await expect(chooseFile('.json')).rejects.toThrow('Picker unavailable');
  });
});

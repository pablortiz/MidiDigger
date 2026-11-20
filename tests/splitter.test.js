import { afterEach, describe, expect, it, vi } from 'vitest';
import { initVerticalSplitter } from '../src/ui/splitter.js';

class Element {
  constructor(rect = {}) {
    this.style = {};
    this.classList = { add: vi.fn(), remove: vi.fn() };
    this.listeners = new Map();
    this.rect = rect;
    this.nextElementSibling = null;
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  removeEventListener(type) {
    this.listeners.delete(type);
  }

  setPointerCapture() {}

  getBoundingClientRect() {
    return {
      top: this.rect.top ?? 0,
      bottom: this.rect.bottom ?? 0,
      height: this.style.flexBasis ? parseFloat(this.style.flexBasis) : (this.rect.height ?? 0),
    };
  }

  fire(type, event = {}) {
    this.listeners.get(type)?.(event);
  }
}

describe('vertical splitter', () => {
  const values = new Map();

  afterEach(() => {
    values.clear();
    vi.unstubAllGlobals();
  });

  function setup() {
    vi.stubGlobal('localStorage', {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    });
    vi.stubGlobal('getComputedStyle', (element) => ({ minHeight: `${element.minHeight ?? 0}px` }));
    const panel = new Element({ top: 100, height: 300 });
    const split = new Element({ height: 7 });
    const log = new Element();
    const container = new Element({ bottom: 900 });
    split.nextElementSibling = log;
    return { panel, split, container };
  }

  it('restores a saved height', () => {
    values.set('midi-library.rightHeight', '420');
    const { panel, split, container } = setup();

    initVerticalSplitter(panel, split, container);

    expect(panel.style.flexBasis).toBe('420px');
  });

  it('resizes within the available space and saves the height', () => {
    const { panel, split, container } = setup();
    initVerticalSplitter(panel, split, container);

    split.fire('pointerdown', { preventDefault() {}, pointerId: 1 });
    split.fire('pointermove', { clientY: 500 });
    expect(panel.style.flexBasis).toBe('400px');
    split.fire('pointermove', { clientY: 900 });
    expect(panel.style.flexBasis).toBe('793px');
    split.fire('pointerup');

    expect(values.get('midi-library.rightHeight')).toBe('793');
    expect(split.listeners.has('pointermove')).toBe(false);
  });

  it('allows the upper panel to shrink without a minimum height', () => {
    const { panel, split, container } = setup();
    initVerticalSplitter(panel, split, container);

    split.fire('pointerdown', { preventDefault() {}, pointerId: 1 });
    split.fire('pointermove', { clientY: 105 });

    expect(panel.style.flexBasis).toBe('5px');
  });

  it('resets to the default height on double click', () => {
    const { panel, split, container } = setup();
    initVerticalSplitter(panel, split, container);
    panel.style.flexBasis = '420px';
    values.set('midi-library.rightHeight', '420');

    split.fire('dblclick');

    expect(panel.style.flexBasis).toBe('');
    expect(values.has('midi-library.rightHeight')).toBe(false);
  });
});

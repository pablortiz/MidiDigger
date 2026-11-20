// The draggable divider between the library panel and the right panel. Its width is kept
// across openings; a double click goes back to the default.

import { prefs } from './dom.js';

export function initSplitter(panel, split, onResize = () => {}) {
  const saved = Number(prefs.get('leftWidth'));
  if (saved > 0) panel.style.width = `${saved}px`;
  split.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    split.setPointerCapture(e.pointerId);
    split.classList.add('drag');
    const left = panel.getBoundingClientRect().left;
    const move = (ev) => {
      panel.style.width = `${Math.max(300, Math.min(window.innerWidth - 380, ev.clientX - left))}px`;
      onResize();
    };
    const up = () => {
      split.removeEventListener('pointermove', move);
      split.removeEventListener('pointerup', up);
      split.classList.remove('drag');
      prefs.set('leftWidth', String(Math.round(panel.getBoundingClientRect().width)));
    };
    split.addEventListener('pointermove', move);
    split.addEventListener('pointerup', up);
  });
  split.addEventListener('dblclick', () => {
    panel.style.width = '';
    prefs.remove('leftWidth');
    onResize();
  });
}

export function initVerticalSplitter(panel, split, container) {
  const saved = Number(prefs.get('rightHeight'));
  if (saved > 0) panel.style.flexBasis = `${saved}px`;

  split.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    split.setPointerCapture(e.pointerId);
    split.classList.add('drag');
    const top = panel.getBoundingClientRect().top;
    const move = (ev) => {
      const available = container.getBoundingClientRect().bottom - top - split.getBoundingClientRect().height;
      const minPanel = parseFloat(getComputedStyle(panel).minHeight) || 0;
      const minLog = parseFloat(getComputedStyle(split.nextElementSibling).minHeight) || 0;
      const maxPanel = Math.max(minPanel, available - minLog);
      panel.style.flexBasis = `${Math.max(minPanel, Math.min(maxPanel, ev.clientY - top))}px`;
    };
    const up = () => {
      split.removeEventListener('pointermove', move);
      split.removeEventListener('pointerup', up);
      split.removeEventListener('pointercancel', up);
      split.classList.remove('drag');
      prefs.set('rightHeight', String(Math.round(panel.getBoundingClientRect().height)));
    };
    split.addEventListener('pointermove', move);
    split.addEventListener('pointerup', up);
    split.addEventListener('pointercancel', up);
  });
  split.addEventListener('dblclick', () => {
    panel.style.flexBasis = '';
    prefs.remove('rightHeight');
  });
}

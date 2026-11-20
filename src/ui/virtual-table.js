// A table that can hold hundreds of thousands of rows: every row stays in memory, only the
// visible ones are in the DOM. Used for the file list and the part search results.

export class VirtualTable {
  /**
   * body: the scrolling element; it gets a spacer and a rows layer.
   * renderRow(item, el): fill a row element. key(item): identity for selection.
   * onVisible(items): called with the rows on screen after each render.
   * onError(error, item): a row could not be drawn (it says so in its place).
   */
  constructor(body, { rowHeight = 22, renderRow, key = (x) => x, onClick, onDblClick, onVisible, onError }) {
    Object.assign(this, { body, rowHeight, renderRow, key, onVisible, onError });
    this.items = [];
    this.selected = null;
    this.spacer = document.createElement('div');
    this.layer = document.createElement('div');
    this.layer.className = 'vt-rows';
    body.append(this.spacer, this.layer);
    this.queued = false;
    body.addEventListener('scroll', () => this.renderSoon());
    new ResizeObserver(() => this.renderSoon()).observe(body);
    const rowOf = (e) => e.target.closest('.vt-row');
    this.layer.addEventListener('click', (e) => { const r = rowOf(e); if (r) onClick?.(this.items[Number(r.dataset.i)], e); });
    this.layer.addEventListener('dblclick', (e) => { const r = rowOf(e); if (r) onDblClick?.(this.items[Number(r.dataset.i)], e); });
  }

  setItems(items, { keepScroll = false } = {}) {
    this.items = items;
    if (!keepScroll) this.body.scrollTop = 0;
    this.render();
  }

  select(key) {
    this.selected = key;
    this.renderSoon();
  }

  /** Scroll just enough for row `index` to be seen whole. */
  reveal(index) {
    const top = index * this.rowHeight;
    const bottom = top + this.rowHeight;
    if (top < this.body.scrollTop) this.body.scrollTop = top;
    else if (bottom > this.body.scrollTop + this.body.clientHeight) this.body.scrollTop = bottom - this.body.clientHeight;
  }

  renderSoon() {
    if (this.queued) return;
    this.queued = true;
    requestAnimationFrame(() => { this.queued = false; this.render(); });
  }

  render() {
    const h = this.rowHeight;
    const start = Math.max(0, Math.floor(this.body.scrollTop / h) - 5);
    const end = Math.min(this.items.length, start + Math.ceil(this.body.clientHeight / h) + 10);
    this.spacer.style.height = `${this.items.length * h}px`;
    const frag = document.createDocumentFragment();
    for (let i = start; i < end; i++) {
      const item = this.items[i];
      const row = document.createElement('div');
      let selected = false;
      try { selected = this.key(item) === this.selected; } catch { /* the row says it, below */ }
      row.className = `vt-row${selected ? ' sel' : ''}`;
      row.style.top = `${i * h}px`;
      row.dataset.i = String(i);
      // One row that cannot be drawn says so in its place: the others, and the list, still are.
      try {
        this.renderRow(item, row);
      } catch (error) {
        row.replaceChildren();
        row.classList.add('vt-error');
        row.textContent = `This row could not be drawn: ${error.message}`;
        this.onError?.(error, item);
      }
      frag.append(row);
    }
    this.layer.replaceChildren(frag);
    this.onVisible?.(this.items.slice(start, end));
  }
}

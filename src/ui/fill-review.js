/** The Fill results of a loop tab, each once (one of the grouped results opened in its own tab is the same). */
export function fillReviewGroups(tab) {
  return tab ? [...new Set([...(tab.fillReview ?? []), ...tab.fillReviewTabs.map(({ group }) => group)])] : [];
}

export function closeGroupedFillReview(tab, endChain, completed) {
  const groups = tab.fillReview ?? [];
  tab.fillReview = null;
  for (const group of groups) {
    endChain(group);
    completed.delete(group);
  }
}

/** Whether the visible Fill tables still reflect which results are in the loop. */
export function fillTablesNeedRefresh(body, resultRows, instrumentRows, rowOf, inLoop) {
  for (const tr of body.querySelectorAll('[data-fill-result]')) {
    const group = resultRows[Number(tr.dataset.fillResult)];
    const shouldList = !!(group.instruments || rowOf(group));
    if (shouldList !== !!tr.querySelector('[data-fill-list]')) return true;
  }
  for (const tr of body.querySelectorAll('[data-fill-instrument]')) {
    const { inst } = instrumentRows[Number(tr.dataset.fillInstrument)];
    if (inLoop(inst) !== !!tr.querySelector('[data-fill-list]')) return true;
  }
  return false;
}

/** Resolve a result's row without mistaking another surviving result's row for a deleted one. */
export function fillReviewRow(group, rows, groups, order) {
  if (rows.includes(group.row)) return group.row;
  const was = group.added ? order(group).map((c) => ({ program: c.program, drums: c.role === 'drums' })) : [group.row];
  const at = rows[group.index];
  const claimed = groups.some((other) => other !== group && other.row === at);
  if (at && !claimed && was.some((w) => w && at.program === w.program && !!at.drums === !!w.drums)) return at;
  const drums = group.row ? !!group.row.drums : group.chosen?.role === 'drums';
  return drums ? rows.find((row) => row.drums && !groups.some((other) => other !== group && other.row === row)) ?? null : null;
}

/**
 * What ▶▶ play all starts: per row of the loop, the latest result with two proposals or more,
 * leaving rows whose playlist already plays. `rowOf(group)`: its row in the loop, or null when it
 * was deleted: then it is left out (▶▶ never puts instruments back in the loop).
 */
export function playableFillGroups(groups, rowOf, active, order) {
  const activeRows = new Set([...active.values()].map((chain) => chain.row));
  const byRow = new Map();
  for (const group of groups) {
    const row = rowOf(group);
    if (row && !activeRows.has(row) && order(group).length >= 2) byRow.set(row, group);
  }
  return [...byRow.values()];
}

export function nextFillChainIndex(current, count) {
  return (current.resume ?? current.index + 1) % count;
}

/** Bars from the bar containing a change to the next loop boundary. */
export function fillChainPass(length, start) {
  return length - (start % length);
}

/** ⏮ / ⏭ (and ▶▶ on all): `step` on from `index`, round the list as the playlist goes: after the last, the first. */
export function stepFillChainIndex(index, step, count) {
  return count > 0 ? (((index + step) % count) + count) % count : 0;
}

export function rememberFillReviewRows(tab, rows) {
  for (const group of fillReviewGroups(tab)) {
    group.reviewRowIndex = rows.indexOf(group.row);
  }
}

export function restoreFillReviewRows(tab, rows, completed) {
  for (const group of fillReviewGroups(tab)) {
    group.row = rows[group.reviewRowIndex] ?? null;
    const chain = completed.get(group);
    if (chain) chain.row = group.row;
  }
}

export function wirePlaylistControls(element, group, focus, actions) {
  for (const button of element.querySelectorAll('[data-chain-act]')) {
    button.onclick = () => {
      focus(group);
      actions[button.dataset.chainAct](button);
    };
  }
}

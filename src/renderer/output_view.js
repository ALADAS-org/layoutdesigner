// =====================================================================================
// output_view.js — the Output tab: lines of the shown sources (renderer, ESM) — N0.5
// =====================================================================================
// Contract: docs/contracts/OUTPUT_PANEL.md §4. In N0.5 there is a single source, so
// every source is shown, without tags and without a selector (the selector is N0.6).
// The view follows new lines while it is scrolled to the bottom.
// =====================================================================================

import { formatLine } from './output_sources.js';

/**
 * @param {HTMLElement} el
 * @param {ReturnType<typeof import('./output_sources.js').createOutput>} output
 */
export function createOutputView(el, output) {
  el.classList.add('OutputView');
  let pending = false;

  function render() {
    pending = false;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
    const withSource = output.sources().length > 1;
    const doc = el.ownerDocument;
    const rows = output.lines().map((line) => {
      const row = doc.createElement('div');
      row.className = `OutputLine is-${line.level}`;
      row.textContent = formatLine(line, { withSource });
      return row;
    });
    el.replaceChildren(...rows);
    if (atBottom) el.scrollTop = el.scrollHeight;
  }

  // Several lines in a row cost one render.
  output.onChange(() => {
    if (pending) return;
    pending = true;
    queueMicrotask(render);
  });
  render();
}

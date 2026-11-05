// =====================================================================================
// output_view.js — the Output tab: lines of the checked sources (renderer, ESM)
// =====================================================================================
// Contract: docs/contracts/OUTPUT_PANEL.md §4 (selector built in N0.6, PLUGIN_API.md §14).
// - Source selector, in the tab row, with the Output tab only, and only when there are
//   several sources: closed value « n / m sources », a check box per source in its list.
//   A new source is checked by default; at least one source stays checked.
// - Source tags on the lines when several sources are shown.
// - The view follows new lines while it is scrolled to the bottom; a new line appends a
//   row (TD-3 repaid) — the view is rebuilt only when the choice of sources changes.
// =====================================================================================

import { formatLine } from './output_sources.js';

/** @typedef {import('./output_sources.js').StoredLine} StoredLine */

/** @typedef {(checked: number, total: number) => string} SummaryOf */
/** @type {SummaryOf} The selector exists only with ≥ 2 sources, so the plural always applies. */
const englishSummary = (checked, total) => `${checked} / ${total} sources`;

/**
 * Pure: the selector's state. Sources are listed in order of their first line.
 * @param {string[]} sources
 * @param {ReadonlySet<string>} unchecked the sources the user unchecked
 * @param {SummaryOf} [summaryOf] the closed value, localised
 */
export function selectorState(sources, unchecked, summaryOf = englishSummary) {
  const checked = sources.filter((s) => !unchecked.has(s));
  return {
    visible: sources.length > 1,
    checked,
    summary: summaryOf(checked.length, sources.length),
    withSource: checked.length > 1,
    /** The last checked source cannot be unchecked. @param {string} source */
    canUncheck: (source) => checked.length > 1 || !checked.includes(source)
  };
}

/**
 * @param {HTMLElement} el the Output view
 * @param {ReturnType<typeof import('./output_sources.js').createOutput>} output
 * @param {{ tools?: HTMLElement, summaryOf?: SummaryOf }} [options] tools: where the
 *   source selector goes; summaryOf: its closed value (« n / m sources »), localised
 */
export function createOutputView(el, output, { tools, summaryOf = englishSummary } = {}) {
  el.classList.add('OutputView');
  const doc = el.ownerDocument;
  /** @type {Set<string>} */
  const unchecked = new Set(); // new sources are checked by default
  /** @type {Map<number, HTMLElement>} */
  const rows = new Map();
  let state = selectorState(output.sources(), unchecked, summaryOf);

  // ---- selector
  const selector = doc.createElement('div');
  selector.className = 'OutputSources';
  const button = doc.createElement('button');
  button.type = 'button';
  button.className = 'OutputSourcesButton';
  button.setAttribute('aria-haspopup', 'true');
  button.setAttribute('aria-expanded', 'false');
  const list = doc.createElement('div');
  list.className = 'OutputSourcesList';
  list.hidden = true;
  selector.append(button, list);
  tools?.append(selector);

  /** @param {boolean} open */
  const setOpen = (open) => {
    list.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
  };
  button.addEventListener('click', () => setOpen(list.hidden !== false));
  doc.addEventListener('mousedown', (event) => {
    if (!selector.contains(/** @type {Node | null} */ (event.target))) setOpen(false);
  });
  selector.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !list.hidden) {
      setOpen(false);
      button.focus();
      event.stopPropagation();
    }
  });

  function renderSelector() {
    selector.hidden = !state.visible;
    button.textContent = `${state.summary} ▾`;
    button.title = state.checked.join(', ');
    list.replaceChildren(
      ...output.sources().map((source) => {
        const label = doc.createElement('label');
        const box = doc.createElement('input');
        box.type = 'checkbox';
        box.value = source;
        box.checked = state.checked.includes(source);
        box.disabled = !state.canUncheck(source);
        box.addEventListener('change', () => {
          if (box.checked) unchecked.delete(source);
          else unchecked.add(source);
          renderAll();
          /** @type {HTMLElement | null} */ (list.querySelector(`input[value="${CSS.escape(source)}"]`))?.focus();
        });
        label.append(box, doc.createTextNode(` ${source}`));
        return label;
      })
    );
  }

  // ---- lines
  /** @param {StoredLine} line */
  function rowOf(line) {
    const row = doc.createElement('div');
    row.className = `OutputLine is-${line.level}`;
    row.textContent = formatLine(line, { withSource: state.withSource });
    rows.set(line.seq, row);
    return row;
  }
  const atBottom = () => el.scrollTop + el.clientHeight >= el.scrollHeight - 2;

  function renderAll() {
    const follow = atBottom();
    state = selectorState(output.sources(), unchecked, summaryOf);
    rows.clear();
    el.replaceChildren(...output.lines().filter((l) => state.checked.includes(l.source)).map(rowOf));
    renderSelector();
    if (follow) el.scrollTop = el.scrollHeight;
  }

  output.onChange((line, { removed, atEnd }) => {
    const follow = atBottom();
    const before = state;
    state = selectorState(output.sources(), unchecked, summaryOf);
    if (removed !== null) {
      rows.get(removed.seq)?.remove();
      rows.delete(removed.seq);
    }
    // A new source, a change of tags, or a line arriving out of time order: rebuild.
    if (!atEnd || before.withSource !== state.withSource || before.checked.length !== state.checked.length) {
      renderAll();
      return;
    }
    if (state.checked.includes(line.source)) el.append(rowOf(line));
    if (before.summary !== state.summary) renderSelector();
    if (follow) el.scrollTop = el.scrollHeight;
  });
  renderAll();
}

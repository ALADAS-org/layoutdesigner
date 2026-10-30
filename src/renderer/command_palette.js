// =====================================================================================
// command_palette.js — command palette overlay (renderer, ESM)
// =====================================================================================
// Contract: docs/contracts/ACTION_COMMAND.md §7.
// Lists Actions (never Commands) by label, filters as the user types; Enter or click
// runs the highlighted entry, arrows move, Esc (or a click outside) closes.
// Labels are localised through `labelOf` (contract §13); colours come from the theme
// tokens (theme.css).
// =====================================================================================

export const PALETTE_ACTION_ID = 'view.commandPalette';

const englishLabel = (action) => action.label;

// Pure: the Actions sorted by displayed label, alphabetically for `locale`
// (PO decision: no fixed order that puts « Quit » first).
export function sortByLabel(actions, labelOf = englishLabel, locale = 'en') {
  const collator = new Intl.Collator(locale, { sensitivity: 'base' });
  return [...actions].sort((a, b) => collator.compare(labelOf(a), labelOf(b)));
}

// Pure: index of the entry highlighted when the list is (re)built: the first one,
// except an Action listed in `noPreselect` (e.g. app.quit — PO decision: never one
// Enter away from quitting); then nothing is highlighted (-1) until ↓ / ↑ is pressed.
export function initialSelection(entries, noPreselect = []) {
  if (entries.length === 0 || noPreselect.includes(entries[0].id)) return -1;
  return 0;
}

// Pure: Actions whose (displayed) label contains `query`, case-insensitive, minus
// `excludeId`.
export function filterActions(actions, query, excludeId, labelOf = englishLabel) {
  const q = (query || '').trim().toLowerCase();
  return actions.filter((a) => a.id !== excludeId && labelOf(a).toLowerCase().includes(q));
}

// options: { labelOf(action) → displayed label, locale (sort order), ariaLabel, placeholder,
//            noPreselect: Action ids never highlighted automatically,
//            anchor: () => element — when visible, the panel opens right over it
//            (the toolbar's command center, as in VS Code) }
export function createCommandPalette(
  registry,
  doc,
  {
    labelOf = englishLabel,
    locale = 'en',
    ariaLabel = 'Command palette',
    placeholder = '',
    noPreselect = [],
    anchor = () => null
  } = {}
) {
  const overlay = doc.createElement('div');
  overlay.id = 'command-palette';
  overlay.className = 'CommandPalette';
  overlay.hidden = true;

  const panel = doc.createElement('div');
  panel.className = 'CommandPalettePanel';

  const input = doc.createElement('input');
  input.type = 'text';
  input.className = 'CommandPaletteInput';
  input.setAttribute('aria-label', ariaLabel);
  input.placeholder = placeholder;
  input.autocomplete = 'off';
  input.spellcheck = false;

  const list = doc.createElement('ul');
  list.className = 'CommandPaletteList';
  list.setAttribute('role', 'listbox');

  panel.append(input, list);
  overlay.append(panel);
  doc.body.append(overlay);

  let entries = [];
  let selected = 0;

  function render() {
    list.replaceChildren(
      ...entries.map((action, i) => {
        const item = doc.createElement('li');
        item.className = 'CommandPaletteItem';
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', String(i === selected));
        item.dataset.actionId = action.id;
        item.textContent = labelOf(action);
        item.addEventListener('click', () => runEntry(i));
        return item;
      })
    );
  }

  function refresh() {
    entries = sortByLabel(filterActions(registry.list(), input.value, PALETTE_ACTION_ID, labelOf), labelOf, locale);
    selected = initialSelection(entries, noPreselect);
    render();
  }

  // Over the anchor when it is visible; otherwise the CSS default (centred, near the top).
  function place() {
    const el = anchor();
    const rect = el && el.getClientRects().length > 0 ? el.getBoundingClientRect() : null;
    overlay.classList.toggle('is-anchored', rect !== null);
    if (rect === null) return;
    const width = Math.min(Math.max(rect.width, 480), doc.documentElement.clientWidth - 16);
    panel.style.top = `${rect.top}px`;
    panel.style.left = `${rect.left + rect.width / 2}px`;
    panel.style.width = `${width}px`;
  }

  function open() {
    place();
    overlay.hidden = false;
    input.value = '';
    refresh();
    input.focus();
  }

  function close() {
    overlay.hidden = true;
  }

  function isOpen() {
    return !overlay.hidden;
  }

  function runEntry(i) {
    const action = entries[i];
    if (!action) return;
    close();
    registry.trigger(action.id);
  }

  input.addEventListener('input', refresh);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' && entries.length > 0) {
      selected = Math.min(selected + 1, entries.length - 1);
      render();
      event.preventDefault();
    } else if (event.key === 'ArrowUp' && entries.length > 0) {
      selected = selected < 0 ? entries.length - 1 : Math.max(selected - 1, 0);
      render();
      event.preventDefault();
    } else if (event.key === 'Enter') {
      runEntry(selected);
      event.preventDefault();
    } else if (event.key === 'Escape') {
      close();
      event.preventDefault();
    }
  });
  // A click on the backdrop (outside the panel) closes the palette.
  overlay.addEventListener('mousedown', (event) => {
    if (event.target === overlay) close();
  });

  return { open, close, isOpen, toggle: () => (isOpen() ? close() : open()) };
}

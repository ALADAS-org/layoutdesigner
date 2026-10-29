// =====================================================================================
// command_palette.js — command palette overlay (renderer, ESM)
// =====================================================================================
// Contract: docs/contracts/ACTION_COMMAND.md §7.
// Lists Actions (never Commands) by label, filters as the user types; Enter or click
// runs the highlighted entry, arrows move, Esc (or a click outside) closes.
// Minimal styling (command_palette.css); its look belongs to the N0.3 theming.
// =====================================================================================

export const PALETTE_ACTION_ID = 'view.commandPalette';

// Pure: Actions whose label contains `query` (case-insensitive), minus `excludeId`.
export function filterActions(actions, query, excludeId) {
  const q = (query || '').trim().toLowerCase();
  return actions.filter((a) => a.id !== excludeId && a.label.toLowerCase().includes(q));
}

export function createCommandPalette(registry, doc) {
  const overlay = doc.createElement('div');
  overlay.id = 'command-palette';
  overlay.className = 'CommandPalette';
  overlay.hidden = true;

  const panel = doc.createElement('div');
  panel.className = 'CommandPalettePanel';

  const input = doc.createElement('input');
  input.type = 'text';
  input.className = 'CommandPaletteInput';
  input.setAttribute('aria-label', 'Command palette');
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
        item.textContent = action.label;
        item.addEventListener('click', () => runEntry(i));
        return item;
      })
    );
  }

  function refresh() {
    entries = filterActions(registry.list(), input.value, PALETTE_ACTION_ID);
    selected = 0;
    render();
  }

  function open() {
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
    registry
      .run(action.id)
      .then((reply) => {
        if (reply && reply.ok === false) console.error(reply.error.message);
      })
      .catch((err) => console.error(err));
  }

  input.addEventListener('input', refresh);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' && entries.length > 0) {
      selected = Math.min(selected + 1, entries.length - 1);
      render();
      event.preventDefault();
    } else if (event.key === 'ArrowUp' && entries.length > 0) {
      selected = Math.max(selected - 1, 0);
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

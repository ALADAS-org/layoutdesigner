// =====================================================================================
// main_toolbar.js — main toolbar (renderer, ESM) — N0.3
// =====================================================================================
// Each control names an Action (data-action) and triggers only that Action. Tooltip:
// "<label> (<shortcut>)", as in Illustrator. The command center (VS Code) also shows
// the shortcut of its Action.
// =====================================================================================

// Pure: tooltip text of a toolbar button.
export function tooltipOf(label, shortcut) {
  return shortcut ? `${label} (${shortcut})` : label;
}

// options: { actions (ActionRegistry), labelOf(action) → displayed label }
export function createToolbar(root, { actions, labelOf }) {
  for (const control of root.querySelectorAll('[data-action]')) {
    const action = actions.get(control.dataset.action);
    if (action === undefined) {
      throw new Error(`Toolbar control refers to unknown Action '${control.dataset.action}'`);
    }
    const label = labelOf(action);
    control.title = tooltipOf(label, action.shortcut);
    control.setAttribute('aria-label', label);
    const shortcut = control.querySelector('.CommandCenterShortcut');
    if (shortcut) shortcut.textContent = action.shortcut || '';
    control.addEventListener('click', () => actions.trigger(action.id));
  }
}

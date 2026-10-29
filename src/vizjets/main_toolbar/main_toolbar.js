// =====================================================================================
// main_toolbar.js — main toolbar (renderer, ESM) — N0.3
// =====================================================================================
// Each button names an Action (data-action) and triggers only that Action. Tooltip:
// "<label> (<shortcut>)", as in Illustrator.
// =====================================================================================

// Pure: tooltip text of a toolbar button.
export function tooltipOf(label, shortcut) {
  return shortcut ? `${label} (${shortcut})` : label;
}

// options: { actions (ActionRegistry), labelOf(action) → displayed label }
export function createToolbar(root, { actions, labelOf }) {
  for (const button of root.querySelectorAll('.ToolbarButton')) {
    const action = actions.get(button.dataset.action);
    if (action === undefined) {
      throw new Error(`Toolbar button refers to unknown Action '${button.dataset.action}'`);
    }
    const label = labelOf(action);
    button.title = tooltipOf(label, action.shortcut);
    button.setAttribute('aria-label', label);
    button.addEventListener('click', () => actions.trigger(action.id));
  }
}

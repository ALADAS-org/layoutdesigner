// =====================================================================================
// plugins_menu.js — the Plugins menu, built from the plugin Actions (renderer, ESM)
// =====================================================================================
// Contract: docs/contracts/PLUGIN_API.md §8.1 (Inkscape's Extensions menu).
// - Every plugin Action; Actions sharing a `menuGroup` form one submenu of that name
//   (by theme, not by plugin); the others sit directly in the menu.
// - Order: submenus first, sorted by name, then the ungrouped entries; inside each,
//   sorted by label (as the palette). One level of submenu only.
// - No plugin Action: no Plugins menu.
// The menu is markup for menubar.js, which fills the labels and wires the keyboard.
// =====================================================================================

/** @typedef {import('../types/contracts').Action} Action */

/**
 * Pure: the menu's structure, or null when there is no plugin Action.
 * @param {Action[]} pluginActions
 * @param {(action: Action) => string} labelOf
 * @param {string} [locale]
 * @returns {{ groups: { name: string, actions: Action[] }[], ungrouped: Action[] } | null}
 */
export function pluginsMenuModel(pluginActions, labelOf, locale = 'en') {
  if (pluginActions.length === 0) return null;
  const collator = new Intl.Collator(locale, { sensitivity: 'base' });
  const byLabel = (/** @type {Action} */ a, /** @type {Action} */ b) => collator.compare(labelOf(a), labelOf(b));
  /** @type {Map<string, Action[]>} */
  const groups = new Map();
  /** @type {Action[]} */
  const ungrouped = [];
  for (const a of pluginActions) {
    if (a.menuGroup === undefined) ungrouped.push(a);
    else groups.set(a.menuGroup, [...(groups.get(a.menuGroup) ?? []), a]);
  }
  return {
    groups: [...groups.entries()]
      .sort(([x], [y]) => collator.compare(x, y))
      .map(([name, actions]) => ({ name, actions: actions.sort(byLabel) })),
    ungrouped: ungrouped.sort(byLabel)
  };
}

/**
 * Inserts the Plugins menu into the menu bar, before Help (the last menu on the left).
 * @param {HTMLElement} nav the `.Menubar` element
 * @param {ReturnType<typeof pluginsMenuModel>} model
 * @param {string} title the menu title (label `Plugins`)
 */
export function insertPluginsMenu(nav, model, title) {
  if (model === null) return;
  const doc = nav.ownerDocument;
  /** @param {string} tag @param {string} className @param {Record<string, string>} [attrs] */
  const el = (tag, className, attrs = {}) => {
    const e = doc.createElement(tag);
    e.className = className;
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    return e;
  };
  /** @param {Action} a */
  const leaf = (a) => el('button', 'MenubarItem', { role: 'menuitem', 'data-action': a.id });

  const menu = el('div', 'MenubarMenu MenubarMenu--plugins');
  const titleButton = el('button', 'MenubarTitle', { role: 'menuitem', 'aria-haspopup': 'true', 'aria-expanded': 'false' });
  titleButton.textContent = title;
  const dropdown = el('div', 'MenubarDropdown', { role: 'menu' });
  dropdown.hidden = true;
  for (const group of model.groups) {
    const wrapper = el('div', 'MenubarSubmenu');
    const entry = el('button', 'MenubarItem MenubarSubmenuEntry', { role: 'menuitem', 'aria-haspopup': 'true', 'aria-expanded': 'false' });
    const label = el('span', 'MenubarItemLabel');
    label.textContent = group.name;
    const arrow = el('span', 'MenubarSubmenuArrow');
    arrow.textContent = '›';
    entry.append(label, arrow);
    const sub = el('div', 'MenubarDropdown MenubarSubDropdown', { role: 'menu' });
    sub.hidden = true;
    sub.append(...group.actions.map(leaf));
    wrapper.append(entry, sub);
    dropdown.append(wrapper);
  }
  if (model.groups.length > 0 && model.ungrouped.length > 0) dropdown.append(el('div', 'MenubarSeparator', { role: 'separator' }));
  dropdown.append(...model.ungrouped.map(leaf));
  menu.append(titleButton, dropdown);
  nav.insertBefore(menu, nav.querySelector('.MenubarMenu--right'));
}

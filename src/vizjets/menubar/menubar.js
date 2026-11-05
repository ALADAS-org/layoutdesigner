// =====================================================================================
// menubar.js — HTML menu bar (renderer, ESM) — N0.3
// =====================================================================================
// Replaces Electron's native menu. Structure comes from menubar.html; each entry names
// an Action (data-action) and triggers only that Action (contract §13).
// Behaviour follows Illustrator / Windows menus:
//   - a click on a title opens its menu; while a menu is open, hovering another title
//     opens that one instead; a click outside closes;
//   - F10, or Alt pressed and released alone, gives the keyboard focus to the bar;
//   - Left / Right move between menus, Down / Enter / Space open a menu,
//     Up / Down move between entries, Enter / Space run the entry,
//     Esc closes the menu (then, pressed again, leaves the bar).
// Submenus (N0.6, PLUGIN_API.md §8.1 — the Plugins menu is their witness): a submenu
// entry shows › on the right; it opens on hover, on click, or with → / Enter / Space;
// ← or Esc closes it and returns to its entry; ↑ / ↓ move inside it. One level only.
// =====================================================================================

// Pure: index after moving by `delta` in a circular list of `length` entries.
/** @param {number} index @param {number} delta @param {number} length */
export function cycleIndex(index, delta, length) {
  if (length <= 0) return -1;
  return (((index + delta) % length) + length) % length;
}

/**
 * @param {HTMLElement} root
 * @param {{ actions: import('../../renderer/action_registry.js').ActionRegistry,
 *           labelOf: (action: import('../../types/contracts').Action) => string }} options
 */
export function createMenubar(root, { actions, labelOf }) {
  const doc = root.ownerDocument;
  const win = /** @type {Window} */ (doc.defaultView);
  const nav = /** @type {HTMLElement} */ (root.querySelector('.Menubar'));
  const menus = [...nav.querySelectorAll('.MenubarMenu')].map((el) => {
    const dropdown = /** @type {HTMLElement} */ (el.querySelector('.MenubarDropdown'));
    return {
      el,
      title: /** @type {HTMLElement} */ (el.querySelector('.MenubarTitle')),
      dropdown,
      // The entries the keyboard walks through: the menu's own (leaves and submenu
      // entries), not those inside its submenus.
      items: /** @type {HTMLElement[]} */ ([...dropdown.querySelectorAll(':scope > .MenubarItem, :scope > .MenubarSubmenu > .MenubarItem')])
    };
  });
  /** @param {Element | null} el @returns {HTMLElement | null} the submenu dropdown holding el */
  const subOf = (el) => /** @type {HTMLElement | null} */ (el?.closest('.MenubarSubDropdown') ?? null);
  /** @param {HTMLElement} entry a submenu entry @returns {HTMLElement} its dropdown */
  const subDropdownOf = (entry) => /** @type {HTMLElement} */ (entry.nextElementSibling);
  /** @param {HTMLElement} dropdown */
  const leavesOf = (dropdown) => /** @type {HTMLElement[]} */ ([...dropdown.querySelectorAll(':scope > .MenubarItem')]);
  const closeSubmenus = () => {
    for (const d of /** @type {NodeListOf<HTMLElement>} */ (nav.querySelectorAll('.MenubarSubDropdown'))) d.hidden = true;
    for (const e of nav.querySelectorAll('.MenubarSubmenuEntry')) e.setAttribute('aria-expanded', 'false');
  };
  /** @param {HTMLElement} entry @param {boolean} focusFirst */
  function openSubmenu(entry, focusFirst) {
    closeSubmenus();
    subDropdownOf(entry).hidden = false;
    entry.setAttribute('aria-expanded', 'true');
    if (focusFirst) leavesOf(subDropdownOf(entry))[0]?.focus();
  }

  // Fill each entry from its Action: label on the left, shortcut on the right.
  for (const item of /** @type {NodeListOf<HTMLElement>} */ (nav.querySelectorAll('.MenubarItem[data-action]'))) {
    const action = actions.get(String(item.dataset.action));
    if (action === undefined) {
      throw new Error(`Menu entry refers to unknown Action '${item.dataset.action}'`);
    }
    const label = doc.createElement('span');
    label.className = 'MenubarItemLabel';
    label.textContent = labelOf(action);
    const shortcut = doc.createElement('span');
    shortcut.className = 'MenubarItemShortcut';
    shortcut.textContent = action.shortcut || '';
    item.replaceChildren(label, shortcut);
  }

  let openIndex = -1;

  function close() {
    if (openIndex < 0) return;
    const menu = menus[openIndex];
    closeSubmenus();
    menu.dropdown.hidden = true;
    menu.title.setAttribute('aria-expanded', 'false');
    menu.el.classList.remove('is-open');
    openIndex = -1;
  }

  /** @param {number} index @param {boolean} focusFirstItem */
  function open(index, focusFirstItem) {
    close();
    const menu = menus[index];
    openIndex = index;
    menu.dropdown.hidden = false;
    menu.title.setAttribute('aria-expanded', 'true');
    menu.el.classList.add('is-open');
    if (focusFirstItem && menu.items.length > 0) menu.items[0].focus();
    else menu.title.focus();
  }

  // Close and give the focus back to the document.
  function leave() {
    close();
    const active = doc.activeElement;
    if (active instanceof HTMLElement && nav.contains(active)) active.blur();
  }

  /** @param {HTMLElement} item */
  function activate(item) {
    leave();
    actions.trigger(String(item.dataset.action));
  }

  function toggleKeyboardFocus() {
    if (nav.contains(doc.activeElement)) leave();
    else menus[0].title.focus();
  }

  menus.forEach((menu, index) => {
    menu.title.addEventListener('click', () => (openIndex === index ? close() : open(index, false)));
    menu.title.addEventListener('mouseenter', () => {
      if (openIndex >= 0 && openIndex !== index) open(index, false);
    });
    for (const item of menu.items) {
      if (item.classList.contains('MenubarSubmenuEntry')) {
        item.addEventListener('click', () => openSubmenu(item, true));
        item.addEventListener('mouseenter', () => { item.focus(); openSubmenu(item, false); });
      } else {
        item.addEventListener('click', () => activate(item));
        item.addEventListener('mouseenter', () => { closeSubmenus(); item.focus(); });
      }
    }
    for (const sub of /** @type {NodeListOf<HTMLElement>} */ (menu.dropdown.querySelectorAll('.MenubarSubDropdown'))) {
      for (const leaf of leavesOf(sub)) {
        leaf.addEventListener('click', () => activate(leaf));
        leaf.addEventListener('mouseenter', () => leaf.focus());
      }
    }
  });

  nav.addEventListener('keydown', (event) => {
    const active = /** @type {HTMLElement} */ (doc.activeElement);
    // Inside a submenu: ↑ / ↓ move, ← / Esc go back to its entry, Enter / Space run.
    const sub = subOf(active);
    if (sub !== null) {
      const leaves = leavesOf(sub);
      const entry = /** @type {HTMLElement} */ (sub.previousElementSibling);
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        leaves[cycleIndex(leaves.indexOf(active), event.key === 'ArrowDown' ? 1 : -1, leaves.length)].focus();
      } else if (event.key === 'ArrowLeft' || event.key === 'Escape') {
        closeSubmenus();
        entry.focus();
      } else if (event.key === 'Enter' || event.key === ' ') {
        activate(active);
      } else if (event.key === 'ArrowRight') {
        // As Windows menus: → in a submenu goes to the next menu.
        const index = menus.findIndex((m) => m.items.includes(entry));
        open(cycleIndex(index, 1, menus.length), true);
      } else {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const titleIndex = menus.findIndex((m) => m.title === active);
    const itemMenuIndex = menus.findIndex((m) => m.items.includes(active));
    const current = titleIndex >= 0 ? titleIndex : itemMenuIndex;
    if (current < 0) return;
    // A submenu entry: → / Enter / Space open its submenu.
    if (active.classList.contains('MenubarSubmenuEntry') && ['ArrowRight', 'Enter', ' '].includes(event.key)) {
      openSubmenu(active, true);
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowLeft': {
        const next = cycleIndex(current, event.key === 'ArrowRight' ? 1 : -1, menus.length);
        if (openIndex >= 0) open(next, true);
        else menus[next].title.focus();
        break;
      }
      case 'ArrowDown':
      case 'ArrowUp': {
        if (titleIndex >= 0) {
          open(titleIndex, true);
        } else {
          const items = menus[itemMenuIndex].items;
          const next = cycleIndex(items.indexOf(active), event.key === 'ArrowDown' ? 1 : -1, items.length);
          items[next].focus();
        }
        break;
      }
      case 'Enter':
      case ' ': {
        if (titleIndex >= 0) open(titleIndex, true);
        else activate(active);
        break;
      }
      case 'Escape': {
        if (openIndex >= 0) {
          const title = menus[openIndex].title;
          close();
          title.focus();
        } else {
          leave();
        }
        break;
      }
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
  });

  // Focus leaving the bar (Tab, click elsewhere) closes the open menu.
  nav.addEventListener('focusout', (event) => {
    if (!nav.contains(/** @type {Node | null} */ (event.relatedTarget))) close();
  });
  doc.addEventListener('mousedown', (event) => {
    if (!nav.contains(/** @type {Node | null} */ (event.target))) close();
  });

  // F10, or Alt alone (pressed and released with no other key in between).
  let altAlone = false;
  win.addEventListener(
    'keydown',
    (event) => {
      altAlone = event.key === 'Alt' && !event.ctrlKey && !event.shiftKey && !event.metaKey;
      if (event.key === 'F10' && !event.ctrlKey && !event.altKey && !event.shiftKey && !event.metaKey) {
        event.preventDefault();
        toggleKeyboardFocus();
      }
    },
    true
  );
  win.addEventListener(
    'keyup',
    (event) => {
      if (event.key === 'Alt' && altAlone) {
        event.preventDefault();
        toggleKeyboardFocus();
      }
      altAlone = false;
    },
    true
  );

  return { open: (/** @type {number} */ index) => open(index, false), close, isOpen: () => openIndex >= 0 };
}

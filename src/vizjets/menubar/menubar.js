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
// =====================================================================================

// Pure: index after moving by `delta` in a circular list of `length` entries.
export function cycleIndex(index, delta, length) {
  if (length <= 0) return -1;
  return (((index + delta) % length) + length) % length;
}

// options: { actions (ActionRegistry), labelOf(action) → displayed label }
export function createMenubar(root, { actions, labelOf }) {
  const doc = root.ownerDocument;
  const win = doc.defaultView;
  const nav = root.querySelector('.Menubar');
  const menus = [...nav.querySelectorAll('.MenubarMenu')].map((el) => ({
    el,
    title: el.querySelector('.MenubarTitle'),
    dropdown: el.querySelector('.MenubarDropdown'),
    items: [...el.querySelectorAll('.MenubarItem')]
  }));

  // Fill each entry from its Action: label on the left, shortcut on the right.
  for (const menu of menus) {
    for (const item of menu.items) {
      const action = actions.get(item.dataset.action);
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
  }

  let openIndex = -1;

  function close() {
    if (openIndex < 0) return;
    const menu = menus[openIndex];
    menu.dropdown.hidden = true;
    menu.title.setAttribute('aria-expanded', 'false');
    menu.el.classList.remove('is-open');
    openIndex = -1;
  }

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
    if (nav.contains(doc.activeElement)) doc.activeElement.blur();
  }

  function activate(item) {
    leave();
    actions.trigger(item.dataset.action);
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
      item.addEventListener('click', () => activate(item));
      item.addEventListener('mouseenter', () => item.focus());
    }
  });

  nav.addEventListener('keydown', (event) => {
    const active = doc.activeElement;
    const titleIndex = menus.findIndex((m) => m.title === active);
    const itemMenuIndex = menus.findIndex((m) => m.items.includes(active));
    const current = titleIndex >= 0 ? titleIndex : itemMenuIndex;
    if (current < 0) return;

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
    if (!nav.contains(event.relatedTarget)) close();
  });
  doc.addEventListener('mousedown', (event) => {
    if (!nav.contains(event.target)) close();
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

  return { open: (index) => open(index, false), close, isOpen: () => openIndex >= 0 };
}

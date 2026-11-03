// =====================================================================================
// bottom_panel.js — bottom panel: splitter, fold button, tabs (renderer, ESM) — N0.5
// =====================================================================================
// Contract: docs/contracts/OUTPUT_PANEL.md §1–§3.
// - Spans the document area only (the Calques column is beside it, full height).
// - First launch: **folded** on tab Output (PO decision 2026-11-03); once unfolded,
//   body height = 18.75 % of the window height (a quarter reduced by 25 %).
//   Nothing is remembered between sessions (PO decision).
// - Folded: the tab row stays visible; a click on a tab unfolds the panel.
// - Limits: body ≥ about three lines of text; the document area keeps ≥ 100 px.
// - The height is kept as a fraction of the window height, so it follows a resize.
// =====================================================================================

import { installSplitter } from '../../renderer/splitter.js';

/** @typedef {'output' | 'debugConsole' | 'terminal'} PanelTab */

/** @type {readonly PanelTab[]} */
export const TABS = ['output', 'debugConsole', 'terminal'];
/** @type {PanelTab} */
export const INITIAL_TAB = 'output';
export const INITIAL_FOLDED = true;
export const INITIAL_FRACTION = 0.1875;
export const MIN_BODY_PX = 60;
export const DOCUMENT_MIN_PX = 100;

// Pure: the body height to display, in px, for a wanted height and the room available.
// `room` = workspace height − tab row − splitter. The minimum wins over the maximum
// when the window is too small for both.
/** @param {number} wanted @param {number} room */
export function clampBodyHeight(wanted, room) {
  const max = room - DOCUMENT_MIN_PX;
  return Math.round(Math.max(MIN_BODY_PX, Math.min(wanted, max)));
}

/**
 * @template {Element} E
 * @param {ParentNode} root
 * @param {string} selector
 * @returns {E}
 */
function required(root, selector) {
  const el = root.querySelector(selector);
  if (el === null) throw new Error(`Bottom panel: missing '${selector}'`);
  return /** @type {E} */ (el);
}

/**
 * @param {HTMLElement} host
 * @param {{ win?: Window, workspace: HTMLElement }} options — workspace: the element
 *   whose height is shared with the document area
 */
export function createBottomPanel(host, { win = window, workspace }) {
  /** @type {HTMLElement} */ const root = required(host, '.BottomPanel');
  /** @type {HTMLElement} */ const splitter = required(root, '.BottomPanelSplitter');
  /** @type {HTMLElement} */ const tabRow = required(root, '.BottomPanelTabRow');
  /** @type {HTMLButtonElement} */ const foldButton = required(root, '.BottomPanelFold');
  /** @type {SVGPathElement} */ const arrow = required(root, '.BottomPanelArrow');
  /** @type {HTMLElement} */ const body = required(root, '.BottomPanelBody');
  const tabs = /** @type {HTMLElement[]} */ ([...root.querySelectorAll('.BottomPanelTab')]);
  const views = /** @type {HTMLElement[]} */ ([...root.querySelectorAll('.BottomPanelView')]);

  let folded = INITIAL_FOLDED;
  /** @type {PanelTab} */
  let active = INITIAL_TAB;
  let fraction = INITIAL_FRACTION;

  const room = () => workspace.clientHeight - tabRow.offsetHeight - splitter.offsetHeight;

  function layout() {
    root.classList.toggle('is-folded', folded);
    foldButton.setAttribute('aria-expanded', String(!folded));
    arrow.setAttribute('d', folded ? 'M4 2 L8 6 L4 10' : 'M2 4 L6 8 L10 4');
    body.style.height = `${clampBodyHeight(fraction * win.innerHeight, room())}px`;
    for (const tab of tabs) {
      const on = tab.dataset.tab === active;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
    }
    for (const view of views) view.hidden = view.dataset.tab !== active;
  }

  const panel = {
    isFolded: () => folded,
    activeTab: () => active,
    bodyHeight: () => body.offsetHeight,
    fold() { folded = true; layout(); },
    unfold() { folded = false; layout(); },
    toggle() { folded = !folded; layout(); },
    /** @param {string} tab */
    show(tab) {
      if (!TABS.includes(/** @type {PanelTab} */ (tab))) throw new Error(`Unknown panel tab '${tab}'`);
      active = /** @type {PanelTab} */ (tab);
      folded = false;
      layout();
    },
    /** @param {PanelTab} tab @returns {HTMLElement} */
    view: (tab) => /** @type {HTMLElement} */ (views.find((v) => v.dataset.tab === tab))
  };

  foldButton.addEventListener('click', () => panel.toggle());
  for (const tab of tabs) tab.addEventListener('click', () => panel.show(String(tab.dataset.tab)));
  installSplitter(splitter, {
    axis: 'y',
    start: () => body.offsetHeight,
    resize: (size) => {
      fraction = clampBodyHeight(size, room()) / win.innerHeight;
      layout();
    }
  });
  win.addEventListener('resize', layout);

  layout();
  return panel;
}

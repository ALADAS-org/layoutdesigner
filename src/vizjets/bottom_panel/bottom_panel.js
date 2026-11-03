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

export const TABS = ['output', 'debugConsole', 'terminal'];
export const INITIAL_TAB = 'output';
export const INITIAL_FOLDED = true;
export const INITIAL_FRACTION = 0.1875;
export const MIN_BODY_PX = 60;
export const DOCUMENT_MIN_PX = 100;

// Pure: the body height to display, in px, for a wanted height and the room available.
// `room` = workspace height − tab row − splitter. The minimum wins over the maximum
// when the window is too small for both.
export function clampBodyHeight(wanted, room) {
  const max = room - DOCUMENT_MIN_PX;
  return Math.round(Math.max(MIN_BODY_PX, Math.min(wanted, max)));
}

// options: { win (window), workspace (element whose height is shared with the document) }
export function createBottomPanel(host, { win = window, workspace }) {
  const root = host.querySelector('.BottomPanel');
  const splitter = root.querySelector('.BottomPanelSplitter');
  const tabRow = root.querySelector('.BottomPanelTabRow');
  const foldButton = root.querySelector('.BottomPanelFold');
  const arrow = root.querySelector('.BottomPanelArrow');
  const body = root.querySelector('.BottomPanelBody');
  const tabs = [...root.querySelectorAll('.BottomPanelTab')];
  const views = [...root.querySelectorAll('.BottomPanelView')];

  let folded = INITIAL_FOLDED;
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
    show(tab) {
      if (!TABS.includes(tab)) throw new Error(`Unknown panel tab '${tab}'`);
      active = tab;
      folded = false;
      layout();
    },
    view: (tab) => views.find((v) => v.dataset.tab === tab)
  };

  foldButton.addEventListener('click', () => panel.toggle());
  for (const tab of tabs) tab.addEventListener('click', () => panel.show(tab.dataset.tab));
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

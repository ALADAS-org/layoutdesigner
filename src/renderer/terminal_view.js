// =====================================================================================
// terminal_view.js — the Terminal tab (renderer, ESM) — N0.5 step 7
// =====================================================================================
// Contract: docs/contracts/OUTPUT_PANEL.md §6. xterm.js shows a shell that runs in
// main (node-pty, window.ld.pty). xterm.js and its fit add-on are loaded as classic
// scripts by index.html (globals `Terminal`, `FitAddon`), like jQuery.
// - The shell starts the first time the tab is shown (it needs a visible size).
// - The terminal follows the panel's size (fit add-on → pty resize) and the theme.
// - A shell that ends (exit…) is replaced at once by a new one, screen cleared — a new
//   context (PO decision 2026-11-04) — with an `info` line in Output; a shell that ends
//   less than a second after its start, twice in a row, is not restarted: the error is
//   shown in red, with an `error` line in Output (no restart loop).
// =====================================================================================

import { log } from './journal.js';

export const QUICK_EXIT_MS = 1000;
export const QUICK_EXITS_TO_STOP = 2;

/**
 * Pure: after a shell ended, what to do. `quickExits` counts the shells in a row that
 * ended less than QUICK_EXIT_MS after their start, this one included.
 * @param {number} lifetimeMs @param {number} previousQuickExits
 * @returns {{ restart: boolean, quickExits: number }}
 */
export function afterExit(lifetimeMs, previousQuickExits) {
  const quickExits = lifetimeMs < QUICK_EXIT_MS ? previousQuickExits + 1 : 0;
  return { restart: quickExits < QUICK_EXITS_TO_STOP, quickExits };
}

/** xterm.js colours from the theme tokens (theme.css). @param {Document} doc */
function themeOf(doc) {
  const css = doc.defaultView?.getComputedStyle(doc.documentElement);
  const token = (/** @type {string} */ name) => css?.getPropertyValue(name).trim() || undefined;
  return {
    background: token('--ld-panel-bg'),
    foreground: token('--ld-chrome-fg'),
    cursor: token('--ld-chrome-fg'),
    selectionBackground: token('--ld-highlight-bg')
  };
}

/**
 * @param {HTMLElement} el  the Terminal tab's view
 * @param {{ pty: import('../types/contracts').PtyBridge, now?: () => number }} options
 */
export function createTerminalView(el, { pty, now = Date.now }) {
  const doc = el.ownerDocument;
  const win = /** @type {Window} */ (doc.defaultView);
  el.classList.add('TerminalView');
  const host = doc.createElement('div');
  host.className = 'TerminalHost';
  el.append(host);

  const term = new win.Terminal({
    fontFamily: 'Consolas, "Cascadia Mono", monospace',
    fontSize: 12,
    cursorBlink: true,
    theme: themeOf(doc)
  });
  const fit = new win.FitAddon.FitAddon();
  term.loadAddon(fit);
  let opened = false;

  /** @type {number | null} */
  let session = null;
  let startedAt = 0;
  let quickExits = 0;

  async function startShell() {
    const { cols, rows } = term;
    startedAt = now();
    session = await pty.start({ cols, rows });
  }

  pty.onData((id, data) => {
    if (id === session) term.write(data);
  });
  pty.onExit((id, exitCode) => {
    if (id !== session) return;
    session = null;
    const next = afterExit(now() - startedAt, quickExits);
    quickExits = next.quickExits;
    if (next.restart) {
      log('info', `Terminal: shell ended (code ${exitCode}), a new one started`);
      term.reset(); // a new context: screen and scrollback cleared
      startShell();
    } else {
      const message = `The shell ended at once ${QUICK_EXITS_TO_STOP} times in a row (code ${exitCode}): not restarted.`;
      term.write(`\r\n\x1b[31m${message}\x1b[0m\r\n`);
      log('error', `Terminal: ${message}`);
    }
  });
  term.onData((/** @type {string} */ data) => {
    if (session !== null) pty.write(session, data);
  });
  term.onResize((/** @type {{ cols: number, rows: number }} */ { cols, rows }) => {
    if (session !== null) pty.resize(session, cols, rows);
  });

  function refit() {
    if (!opened || el.offsetParent === null) return; // hidden: nothing to measure
    fit.fit();
  }
  new ResizeObserver(refit).observe(el);
  // The theme is the value of <html data-theme>: follow it.
  new MutationObserver(() => { term.options.theme = themeOf(doc); })
    .observe(doc.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  return {
    /** Called each time the tab is shown: the first time opens xterm and starts the shell. */
    async show() {
      if (!opened) {
        term.open(host);
        opened = true;
        refit();
        await startShell();
      } else {
        refit();
      }
      term.focus();
    }
  };
}

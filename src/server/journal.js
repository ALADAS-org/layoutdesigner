// =====================================================================================
// journal.js — the main process's explicit journal (Electron main, CJS) — N0.5
// =====================================================================================
// Contract: docs/contracts/OUTPUT_PANEL.md §4, §7. `log(level, message)` writes a line
// under the source « Layout Designer » and still to the console (the terminal that
// launched the application). Only what the code chooses to trace reaches the Output
// panel; console.* is not redirected (PO decision).
// Lines are kept (history) so that traces written before the window is ready — start-
// up, preferences — reach the renderer when it subscribes.
// No Electron import here, so it is unit-testable without Electron.
// =====================================================================================
'use strict';

const LEVELS = ['info', 'warn', 'error'];
const APP_SOURCE = 'Layout Designer';

// options: { out (console-like), now () → epoch ms }
function createJournal({ out = console, now = Date.now } = {}) {
  const lines = [];
  const sinks = new Set();

  function log(level, message) {
    if (!LEVELS.includes(level)) throw new TypeError(`Invalid log level: '${level}'`);
    const line = { source: APP_SOURCE, level, time: now(), message: String(message) };
    lines.push(line);
    out[level === 'info' ? 'log' : level](line.message);
    for (const sink of sinks) sink(line);
  }

  return {
    log,
    history: () => lines.slice(),
    // sink(line) receives every later line; returns the unsubscribe function.
    subscribe(sink) {
      sinks.add(sink);
      return () => sinks.delete(sink);
    }
  };
}

const journal = createJournal();

module.exports = { LEVELS, APP_SOURCE, createJournal, journal, log: (level, message) => journal.log(level, message) };

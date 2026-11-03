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

/** @type {readonly string[]} */
const LEVELS = ['info', 'warn', 'error'];
const APP_SOURCE = 'Layout Designer';

/** @typedef {import('../types/contracts').LogLevel} LogLevel */
/** @typedef {import('../types/contracts').OutputLine} OutputLine */
/** @typedef {Pick<Console, 'log' | 'warn' | 'error'>} ConsoleLike */

/**
 * @param {{ out?: ConsoleLike, now?: () => number }} [options]
 */
function createJournal({ out = console, now = Date.now } = {}) {
  /** @type {OutputLine[]} */
  const lines = [];
  /** @type {Set<(line: OutputLine) => void>} */
  const sinks = new Set();

  /**
   * @param {LogLevel} level
   * @param {unknown} message
   */
  function log(level, message) {
    if (!LEVELS.includes(level)) throw new TypeError(`Invalid log level: '${level}'`);
    /** @type {OutputLine} */
    const line = { source: APP_SOURCE, level, time: now(), message: String(message) };
    lines.push(line);
    out[level === 'info' ? 'log' : level](line.message);
    for (const sink of sinks) sink(line);
  }

  return {
    log,
    history: () => lines.slice(),
    /**
     * sink(line) receives every later line; returns the unsubscribe function.
     * @param {(line: OutputLine) => void} sink
     */
    subscribe(sink) {
      sinks.add(sink);
      return () => sinks.delete(sink);
    }
  };
}

const journal = createJournal();

/** @param {LogLevel} level @param {unknown} message */
const log = (level, message) => journal.log(level, message);

module.exports = { LEVELS, APP_SOURCE, createJournal, journal, log };

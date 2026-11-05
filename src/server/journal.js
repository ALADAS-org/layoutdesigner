// =====================================================================================
// journal.js — the main process's explicit journal (Electron main, CJS) — N0.5
// =====================================================================================
// Contract: docs/contracts/OUTPUT_PANEL.md §4, §7. `log(level, message)` writes a line
// under the source « Layout Designer » and still to the console (the terminal that
// launched the application). Only what the code chooses to trace reaches the Output
// panel; console.* is not redirected (PO decision).
// Lines are kept (history) so that traces written before the window is ready — start-
// up, preferences — reach the renderer when it subscribes.
// Since N0.6 every line carries its source: `log()` writes under « Layout Designer »,
// `source(name).log()` under a server plugin's identifier (PLUGIN_API.md §14 2). At
// most MAX_LINES_PER_SOURCE lines are kept per source (TD-3).
// No Electron import here, so it is unit-testable without Electron.
// =====================================================================================
'use strict';

/** @type {readonly string[]} */
const LEVELS = ['info', 'warn', 'error'];
const APP_SOURCE = 'Layout Designer';
const MAX_LINES_PER_SOURCE = 1000;

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
   * @param {string} [source]
   */
  function log(level, message, source = APP_SOURCE) {
    if (!LEVELS.includes(level)) throw new TypeError(`Invalid log level: '${level}'`);
    /** @type {OutputLine} */
    const line = { source, level, time: now(), message: String(message) };
    lines.push(line);
    // Cap per source: drop that source's oldest line.
    if (lines.filter((l) => l.source === source).length > MAX_LINES_PER_SOURCE) {
      lines.splice(lines.findIndex((l) => l.source === source), 1);
    }
    out[level === 'info' ? 'log' : level](source === APP_SOURCE ? line.message : `[${source}] ${line.message}`);
    for (const sink of sinks) sink(line);
  }

  return {
    log,
    /** @param {string} name @returns {{ log: (level: LogLevel, message: unknown) => void }} */
    source: (name) => ({ log: (level, message) => log(level, message, name) }),
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

module.exports = { LEVELS, APP_SOURCE, MAX_LINES_PER_SOURCE, createJournal, journal, log };

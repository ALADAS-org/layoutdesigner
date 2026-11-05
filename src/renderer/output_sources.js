// =====================================================================================
// output_sources.js — Output lines and their sources (renderer, ESM) — N0.5
// =====================================================================================
// Contract: docs/contracts/OUTPUT_PANEL.md §4.
// - A source is whoever writes traces: the application (« Layout Designer »), later
//   each plugin (N0.6). Every line carries its source, a level, a time and a message.
// - Lines are kept in time order, so that the view can mix sources.
// - The only way to write: output.source(name).append(level, message).
// - N0.6 (TD-3 repaid): at most MAX_LINES_PER_SOURCE lines are kept per source — the
//   oldest line of that source goes — and listeners learn which line was added and
//   which was dropped, so that the view appends a row instead of rebuilding.
// =====================================================================================

/** @typedef {import('../types/contracts').LogLevel} LogLevel */
/** @typedef {import('../types/contracts').OutputLine} OutputLine */
/** @typedef {Readonly<OutputLine & { seq: number }>} StoredLine */

/** @type {readonly string[]} */
export const LEVELS = ['info', 'warn', 'error'];
export const APP_SOURCE = 'Layout Designer';
/** Same cap as main's journal (src/server/journal.js). */
export const MAX_LINES_PER_SOURCE = 1000;

/** @typedef {(line: StoredLine, change: { removed: StoredLine | null, atEnd: boolean }) => void} OutputListener */

export function createOutput({ maxLinesPerSource = MAX_LINES_PER_SOURCE } = {}) {
  /** @type {StoredLine[]} */
  const lines = [];
  /** @type {Map<string, number>} */
  const counts = new Map();
  /** @type {Set<OutputListener>} */
  const listeners = new Set();
  let seq = 0;

  /**
   * line: { source, level, time (epoch ms), message } — e.g. received from main.
   * @param {OutputLine} line
   */
  function add({ source, level, time, message }) {
    if (typeof source !== 'string' || source === '') throw new TypeError('Output line needs a source');
    if (!LEVELS.includes(level)) throw new TypeError(`Invalid log level: '${level}'`);
    const line = Object.freeze({ source, level, time: Number(time), message: String(message), seq: seq++ });
    // Insert in time order (a main-side line may arrive after a later renderer line).
    let i = lines.length;
    while (i > 0 && lines[i - 1].time > line.time) i -= 1;
    lines.splice(i, 0, line);
    const atEnd = i === lines.length - 1;
    const count = (counts.get(source) ?? 0) + 1;
    /** @type {StoredLine | null} */
    let removed = null;
    if (count > maxLinesPerSource) {
      const oldest = lines.findIndex((l) => l.source === source);
      removed = lines.splice(oldest, 1)[0];
    } else {
      counts.set(source, count);
    }
    for (const listener of listeners) listener(line, { removed, atEnd });
  }

  return {
    add,
    /** @param {string} name */
    source: (name) => ({
      /** @param {LogLevel} level @param {unknown} message @param {number} [time] */
      append: (level, message, time = Date.now()) => add({ source: name, level, time, message: String(message) })
    }),
    lines: () => lines.slice(),
    /** The sources that wrote, in order of their first line. */
    sources: () => [...counts.keys()],
    /** @param {OutputListener} listener */
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}

// The application's single Output.
export const output = createOutput();

/** @param {number} n */
const pad = (n) => String(n).padStart(2, '0');

// Pure: local time to the second, HH:MM:SS.
/** @param {number} time */
export function formatTime(time) {
  const d = new Date(time);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// Pure: « [info]  23:18:04  Labels loaded: fr » (the validated mock-up); with several
// sources shown (from N0.6) the source follows the time: « … 14:19:02  [ld-x]  Hello ».
/** @param {OutputLine} line @param {{ withSource?: boolean }} [options] */
export function formatLine(line, { withSource = false } = {}) {
  const source = withSource ? `[${line.source}]  ` : '';
  return `[${line.level}]  ${formatTime(line.time)}  ${source}${line.message}`;
}

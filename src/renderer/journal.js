// =====================================================================================
// journal.js — the renderer's explicit journal (ESM) — N0.5
// =====================================================================================
// Contract: docs/contracts/OUTPUT_PANEL.md §4. log(level, message) writes under the
// source « Layout Designer » in the Output panel and still to the console (DevTools).
// console.* is not redirected: only what the code chooses to trace reaches Output.
// =====================================================================================

import { output, APP_SOURCE } from './output_sources.js';

const app = output.source(APP_SOURCE);

export function log(level, message) {
  app.append(level, message);
  console[level === 'info' ? 'log' : level](message);
}

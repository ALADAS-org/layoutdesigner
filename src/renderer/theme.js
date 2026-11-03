// =====================================================================================
// theme.js — predefined themes (renderer, ESM)
// =====================================================================================
// Two predefined themes, 'light' and 'dark' — dark by default (Product Owner
// decisions, N0.3). A theme is
// the value of <html data-theme="…">; theme.css maps it to the --ld-* colour tokens.
// =====================================================================================

/** @typedef {'light' | 'dark'} Theme */

/** @type {readonly string[]} */
export const THEMES = Object.freeze(['light', 'dark']);
/** @type {Theme} */
export const DEFAULT_THEME = 'dark';

/** @param {string} current @returns {Theme} */
export function nextTheme(current) {
  return current === 'dark' ? 'light' : 'dark';
}

/** @param {Document} doc @param {string} theme */
export function applyTheme(doc, theme) {
  if (!THEMES.includes(theme)) throw new TypeError(`Unknown theme '${theme}'`);
  doc.documentElement.dataset.theme = theme;
}

/** @param {Document} doc @returns {string} */
export function currentTheme(doc) {
  return doc.documentElement.dataset.theme || DEFAULT_THEME;
}

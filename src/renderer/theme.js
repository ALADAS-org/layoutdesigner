// =====================================================================================
// theme.js — predefined themes (renderer, ESM)
// =====================================================================================
// Two predefined themes, 'light' and 'dark' (Product Owner decision, N0.3). A theme is
// the value of <html data-theme="…">; theme.css maps it to the --ld-* colour tokens.
// =====================================================================================

export const THEMES = Object.freeze(['light', 'dark']);
export const DEFAULT_THEME = 'light';

export function nextTheme(current) {
  return current === 'dark' ? 'light' : 'dark';
}

export function applyTheme(doc, theme) {
  if (!THEMES.includes(theme)) throw new TypeError(`Unknown theme '${theme}'`);
  doc.documentElement.dataset.theme = theme;
}

export function currentTheme(doc) {
  return doc.documentElement.dataset.theme || DEFAULT_THEME;
}

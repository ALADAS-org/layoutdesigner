// =====================================================================================
// i18n.js — localisation of labels (renderer, ESM)
// =====================================================================================
// One flat JSON file per language: src/i18n/LD_Labels_<xx>.json (xx = 'en', 'fr').
// Keys follow the electron-boilerplate-cjs / Cryptocalc style: "File", "File/Quit".
// The locale to start with comes from main (Command i18n.startupInfo: --lang switch →
// preferences → system locale); a locale whose language has no label file falls back
// to English. The available languages are the label files present.
// Lookup order: chosen language → English → the fallback given by the caller → key.
// =====================================================================================

export const DEFAULT_LANGUAGE = 'en';

/** @typedef {Record<string, string>} Labels */
/** @typedef {(key: string | undefined, fallback?: string) => string} Translate */

// 'fr-BE' → 'fr' when 'fr' is available; otherwise → 'en'.
/** @param {string | undefined} locale @param {string[]} available */
export function pickLanguage(locale, available) {
  const base = String(locale || '').toLowerCase().split(/[-_]/)[0];
  return available.includes(base) ? base : DEFAULT_LANGUAGE;
}

// Relative to src/index.html.
/** @param {string} lang */
export function labelsUrl(lang) {
  return `i18n/LD_Labels_${lang}.json`;
}

/** @param {Labels} labels @param {Labels} [englishLabels] @returns {Translate} */
export function createTranslator(labels, englishLabels = {}) {
  return (key, fallback) => {
    if (key !== undefined) {
      if (Object.hasOwn(labels, key)) return labels[key];
      if (Object.hasOwn(englishLabels, key)) return englishLabels[key];
    }
    return fallback !== undefined ? fallback : String(key);
  };
}

// Returns { labels, englishLabels } for `lang`. Uses fetch (local files only).
/**
 * @param {string} lang
 * @param {(url: string) => Promise<Labels>} [fetchJson]
 * @returns {Promise<{ labels: Labels, englishLabels: Labels }>}
 */
export async function loadLabels(lang, fetchJson = defaultFetchJson) {
  const englishLabels = await fetchJson(labelsUrl(DEFAULT_LANGUAGE));
  const labels = lang === DEFAULT_LANGUAGE ? englishLabels : await fetchJson(labelsUrl(lang));
  return { labels, englishLabels };
}

/** @param {string} url @returns {Promise<Labels>} */
async function defaultFetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Cannot load '${url}' (HTTP ${response.status})`);
  return response.json();
}

// Fills every element of `root` marked with data-label-key (text) or
// data-aria-label-key (aria-label). The markup's own text is the fallback.
/** @param {ParentNode} root @param {Translate} t */
export function localizeTree(root, t) {
  for (const el of root.querySelectorAll('[data-label-key]')) {
    el.textContent = t(/** @type {HTMLElement} */ (el).dataset.labelKey, el.textContent ?? undefined);
  }
  for (const el of /** @type {NodeListOf<HTMLElement>} */ (root.querySelectorAll('[data-aria-label-key]'))) {
    el.setAttribute('aria-label', t(el.dataset.ariaLabelKey, el.getAttribute('aria-label') || undefined));
  }
}

// Fills {name} placeholders: format('{category}: {label}', { category, label }).
/** @param {string} template @param {Record<string, string>} values */
export function format(template, values) {
  return template.replace(/\{(\w+)\}/g, (match, name) => (Object.hasOwn(values, name) ? values[name] : match));
}

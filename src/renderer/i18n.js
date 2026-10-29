// =====================================================================================
// i18n.js — localisation of labels (renderer, ESM)
// =====================================================================================
// One flat JSON file per language: src/i18n/LD_Labels_<xx>.json (xx = 'en', 'fr').
// Keys follow the electron-boilerplate-cjs / Cryptocalc style: "File", "File/Quit".
// The language comes from the system locale (navigator.language, which Electron's
// --lang switch overrides); anything unsupported falls back to English.
// Lookup order: chosen language → English → the fallback given by the caller → key.
// =====================================================================================

export const SUPPORTED_LANGUAGES = Object.freeze(['en', 'fr']);
export const DEFAULT_LANGUAGE = 'en';

// 'fr-BE' → 'fr'; unsupported or empty → 'en'.
export function pickLanguage(locale) {
  const base = String(locale || '').toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LANGUAGES.includes(base) ? base : DEFAULT_LANGUAGE;
}

// Relative to src/index.html.
export function labelsUrl(lang) {
  return `i18n/LD_Labels_${lang}.json`;
}

export function createTranslator(labels, englishLabels = {}) {
  return (key, fallback) => {
    if (key !== undefined) {
      if (Object.hasOwn(labels, key)) return labels[key];
      if (Object.hasOwn(englishLabels, key)) return englishLabels[key];
    }
    return fallback !== undefined ? fallback : key;
  };
}

// Returns { labels, englishLabels } for `lang`. Uses fetch (local files only).
export async function loadLabels(lang, fetchJson = defaultFetchJson) {
  const englishLabels = await fetchJson(labelsUrl(DEFAULT_LANGUAGE));
  const labels = lang === DEFAULT_LANGUAGE ? englishLabels : await fetchJson(labelsUrl(lang));
  return { labels, englishLabels };
}

async function defaultFetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Cannot load '${url}' (HTTP ${response.status})`);
  return response.json();
}

// Fills every element of `root` marked with data-label-key (text) or
// data-aria-label-key (aria-label). The markup's own text is the fallback.
export function localizeTree(root, t) {
  for (const el of root.querySelectorAll('[data-label-key]')) {
    el.textContent = t(el.dataset.labelKey, el.textContent);
  }
  for (const el of root.querySelectorAll('[data-aria-label-key]')) {
    el.setAttribute('aria-label', t(el.dataset.ariaLabelKey, el.getAttribute('aria-label') || undefined));
  }
}

// Fills {name} placeholders: format('{category}: {label}', { category, label }).
export function format(template, values) {
  return template.replace(/\{(\w+)\}/g, (match, name) => (Object.hasOwn(values, name) ? values[name] : match));
}

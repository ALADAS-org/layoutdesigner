// Unit tests — localisation (N0.4, merged into N0.3): language choice, lookup order,
// tree localisation, and the consistency of the LD_Labels_<xx>.json files.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  DEFAULT_LANGUAGE, pickLanguage, labelsUrl, createTranslator, loadLabels, localizeTree, format
} from '../../../../src/renderer/i18n.js';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../src');
// The label files present in src/i18n — the available languages.
const LANGUAGES = fs.readdirSync(path.join(SRC, 'i18n'))
  .map((f) => /^LD_Labels_([a-z]{2,3})\.json$/.exec(f)).filter(Boolean).map((m) => m[1]).sort();
const readLabels = (lang) => JSON.parse(fs.readFileSync(path.join(SRC, labelsUrl(lang)), 'utf8'));

describe('pickLanguage', () => {
  test.each([
    ['fr', 'fr'], ['fr-BE', 'fr'], ['fr_FR', 'fr'], ['FR-fr', 'fr'],
    ['en-US', 'en'], ['de-DE', 'en'], ['', 'en'], [undefined, 'en']
  ])('%p → %p', (locale, lang) => {
    expect(pickLanguage(locale, ['en', 'fr'])).toBe(lang);
  });
});

test('pickLanguage only picks an available language', () => {
  expect(pickLanguage('fr-FR', ['en'])).toBe('en');
  expect(pickLanguage('de', ['de', 'en'])).toBe('de');
});

describe('createTranslator', () => {
  const t = createTranslator({ File: 'Fichier' }, { File: 'File', Help: 'Help' });

  test('chosen language first, then English, then the fallback, then the key', () => {
    expect(t('File')).toBe('Fichier');
    expect(t('Help')).toBe('Help');
    expect(t('Missing', 'Fallback')).toBe('Fallback');
    expect(t('Missing')).toBe('Missing');
    expect(t(undefined, 'Quit')).toBe('Quit');
  });

  test('ignores inherited properties', () => {
    expect(t('toString', 'x')).toBe('x');
  });
});

describe('loadLabels', () => {
  test('loads English as the fallback, and the chosen language', async () => {
    const urls = [];
    const fetchJson = async (url) => { urls.push(url); return { url }; };
    const { labels, englishLabels } = await loadLabels('fr', fetchJson);
    expect(urls).toEqual(['i18n/LD_Labels_en.json', 'i18n/LD_Labels_fr.json']);
    expect(labels.url).toBe('i18n/LD_Labels_fr.json');
    expect(englishLabels.url).toBe('i18n/LD_Labels_en.json');
  });

  test('loads English only once when English is chosen', async () => {
    const urls = [];
    const { labels, englishLabels } = await loadLabels('en', async (url) => { urls.push(url); return {}; });
    expect(urls).toEqual(['i18n/LD_Labels_en.json']);
    expect(labels).toBe(englishLabels);
  });
});

describe('localizeTree', () => {
  const element = (dataset, text = '', attrs = {}) => ({
    dataset, textContent: text,
    getAttribute: (name) => attrs[name] ?? null,
    setAttribute: (name, value) => { attrs[name] = value; },
    attrs
  });

  test('fills data-label-key text and data-aria-label-key attributes', () => {
    const title = element({ labelKey: 'File' }, 'File');
    const unknown = element({ labelKey: 'Nope' }, 'Kept');
    const nav = element({ ariaLabelKey: 'Aria/Menubar' }, '', { 'aria-label': 'Main menu' });
    const root = {
      querySelectorAll: (selector) =>
        selector === '[data-label-key]' ? [title, unknown] : [nav]
    };
    localizeTree(root, createTranslator({ File: 'Fichier', 'Aria/Menubar': 'Menu principal' }));
    expect(title.textContent).toBe('Fichier');
    expect(unknown.textContent).toBe('Kept');
    expect(nav.attrs['aria-label']).toBe('Menu principal');
  });
});

describe('LD_Labels_<xx>.json files', () => {
  test('English (the default) and French are present', () => {
    expect(DEFAULT_LANGUAGE).toBe('en');
    expect(LANGUAGES).toEqual(['en', 'fr']);
  });

  test('each file names its language', () => {
    expect(readLabels('en')['Language/Name']).toBe('English');
    expect(readLabels('fr')['Language/Name']).toBe('Français');
  });

  test('every language has exactly the English keys, with non-empty strings', () => {
    const englishKeys = Object.keys(readLabels('en')).sort();
    for (const lang of LANGUAGES) {
      const labels = readLabels(lang);
      expect(Object.keys(labels).sort()).toEqual(englishKeys);
      for (const value of Object.values(labels)) {
        expect(typeof value).toBe('string');
        expect(value.trim()).not.toBe('');
      }
    }
  });

  test('every key used by the GUI exists in English', () => {
    const files = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(html|js)$/.test(entry.name)) files.push(full);
      }
    };
    walk(SRC);
    const used = new Set();
    const patterns = [
      /data-(?:aria-)?label-key="([^"]+)"/g, // markup
      /(?:labelKey|categoryKey):\s*'([^']+)'/g, // Action descriptors
      /\bt\('([^']+)'/g                       // direct lookups
    ];
    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8');
      for (const re of patterns) for (const m of text.matchAll(re)) used.add(m[1]);
    }
    expect(used.size).toBeGreaterThan(10);
    const english = readLabels('en');
    expect([...used].filter((key) => !Object.hasOwn(english, key))).toEqual([]);
  });
});

describe('format', () => {
  test('fills {name} placeholders, leaves unknown ones', () => {
    expect(format('{category}: {label}', { category: 'Help', label: 'About' })).toBe('Help: About');
    expect(format('{category} : {label}', { category: 'Aide', label: 'À propos' })).toBe('Aide : À propos');
    expect(format('{a} {b}', { a: 1 })).toBe('1 {b}');
  });
});

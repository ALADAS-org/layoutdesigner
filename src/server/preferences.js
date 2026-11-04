// =====================================================================================
// preferences.js — user preferences file (Electron main, CJS)
// =====================================================================================
// One JSON object, src/config/preferences.json (Product Owner decision). The file is
// created on first write and is not versioned (.gitignore). The LD_PREFERENCES_PATH
// environment variable points elsewhere — the end-to-end tests use it so they never
// touch the developer's own preferences.
// Defaults (N0.5 step 6, docs/contracts/PREFERENCES.md §3): the versioned file
// src/config/preferences.default.json lists every preference with its default value
// (`language: null` = the system language). A reset copies it over the user's file,
// after keeping the replaced file as <file>.bak.
// No Electron import here, so it is unit-testable without Electron.
// =====================================================================================
'use strict';

const fs = require('fs');
const path = require('path');
const { log } = require('./journal.js');

const DEFAULT_PREFERENCES_PATH = path.join(__dirname, '..', 'config', 'preferences.json');
const DEFAULTS_PATH = path.join(__dirname, '..', 'config', 'preferences.default.json');

/** Known keys are typed; other keys are kept as they are. `language: null` = system. */
/** @typedef {{ language?: string | null, theme?: string, [key: string]: unknown }} Preferences */

/** The two predefined themes (N0.3), dark by default; remembered since N0.5. */
const THEMES = ['light', 'dark'];
const DEFAULT_THEME = 'dark';

/** Pure: the theme a preferences object asks for, the default when absent or unknown. @param {Preferences} prefs */
function themeOf(prefs) {
  return typeof prefs.theme === 'string' && THEMES.includes(prefs.theme) ? prefs.theme : DEFAULT_THEME;
}
/** @typedef {'ok' | 'missing' | 'invalid'} PreferencesStatus */

/** @param {NodeJS.ProcessEnv} [env] @returns {string} */
function preferencesPath(env = process.env) {
  return env.LD_PREFERENCES_PATH || DEFAULT_PREFERENCES_PATH;
}

/**
 * Reads the file without writing anything to the journal.
 * @param {string} file
 * @returns {{ status: PreferencesStatus, prefs: Preferences, error?: string }}
 */
function inspectPreferences(file) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (e) {
    const err = /** @type {NodeJS.ErrnoException} */ (e);
    if (err.code === 'ENOENT') return { status: 'missing', prefs: {} };
    return { status: 'invalid', prefs: {}, error: `Cannot read preferences '${file}': ${err.message}` };
  }
  try {
    const prefs = JSON.parse(text);
    if (prefs !== null && typeof prefs === 'object' && !Array.isArray(prefs)) return { status: 'ok', prefs };
  } catch (err) {
    return { status: 'invalid', prefs: {}, error: `Invalid preferences '${file}': ${/** @type {Error} */ (err).message}` };
  }
  return { status: 'invalid', prefs: {}, error: `Invalid preferences '${file}': not a JSON object` };
}

/**
 * Missing file → {}. Unreadable or not a JSON object → {} with a warning, so a broken
 * preferences file never prevents the application from starting.
 * @param {string} file
 * @returns {Preferences}
 */
function readPreferences(file) {
  const { prefs, error } = inspectPreferences(file);
  if (error !== undefined) log('warn', error);
  return prefs;
}

/** @param {string} file @param {Preferences} prefs */
function writePreferences(file, prefs) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(prefs, null, 2) + '\n', 'utf8');
}

/**
 * The defaults, read from preferences.default.json (a fresh copy each time).
 * @param {string} [defaultsFile]
 * @returns {Preferences}
 */
function readDefaults(defaultsFile = DEFAULTS_PATH) {
  return JSON.parse(fs.readFileSync(defaultsFile, 'utf8'));
}

/**
 * Reset: the current file (valid or not) is kept as <file>.bak — only the latest copy —
 * then the defaults are written.
 * @param {string} file
 * @param {string} [defaultsFile]
 * @returns {{ backup: string | null, prefs: Preferences }}
 */
function resetPreferences(file, defaultsFile = DEFAULTS_PATH) {
  const prefs = readDefaults(defaultsFile);
  let backup = null;
  if (fs.existsSync(file)) {
    backup = `${file}.bak`;
    fs.copyFileSync(file, backup);
  }
  writePreferences(file, prefs);
  return { backup, prefs };
}

module.exports = {
  THEMES,
  DEFAULT_THEME,
  themeOf,
  DEFAULT_PREFERENCES_PATH,
  DEFAULTS_PATH,
  preferencesPath,
  inspectPreferences,
  readPreferences,
  writePreferences,
  readDefaults,
  resetPreferences
};

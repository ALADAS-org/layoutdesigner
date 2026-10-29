// =====================================================================================
// preferences.js — user preferences file (Electron main, CJS)
// =====================================================================================
// One JSON object, src/config/preferences.json (Product Owner decision). The file is
// created on first write and is not versioned (.gitignore). The LD_PREFERENCES_PATH
// environment variable points elsewhere — the end-to-end tests use it so they never
// touch the developer's own preferences.
// No Electron import here, so it is unit-testable without Electron.
// =====================================================================================
'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_PREFERENCES_PATH = path.join(__dirname, '..', 'config', 'preferences.json');

function preferencesPath(env = process.env) {
  return env.LD_PREFERENCES_PATH || DEFAULT_PREFERENCES_PATH;
}

// Missing file → {}. Unreadable or not a JSON object → {} with a warning, so a broken
// preferences file never prevents the application from starting.
function readPreferences(file) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    console.warn(`Cannot read preferences '${file}': ${err.message}`);
    return {};
  }
  try {
    const prefs = JSON.parse(text);
    if (prefs !== null && typeof prefs === 'object' && !Array.isArray(prefs)) return prefs;
  } catch (err) {
    console.warn(`Invalid preferences '${file}': ${err.message}`);
    return {};
  }
  console.warn(`Invalid preferences '${file}': not a JSON object`);
  return {};
}

function writePreferences(file, prefs) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(prefs, null, 2) + '\n', 'utf8');
}

module.exports = { DEFAULT_PREFERENCES_PATH, preferencesPath, readPreferences, writePreferences };

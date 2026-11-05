// Shared launcher for the end-to-end tests.
// - The language is forced with Electron's --lang switch, so the expected labels do not
//   depend on the locale of the machine running the tests (lang: null omits it).
// - Preferences go to a temporary file (LD_PREFERENCES_PATH), never to the developer's
//   own src/config/preferences.json.
// - Plugins (N0.6): by default an empty temporary folder (LD_PLUGINS_PATH), so the core
//   tests do not depend on the plugins/ folder; `plugins` names another folder —
//   PLUGINS_DIR (the repo's plugins/) or a folder a test prepared.
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { _electron: electron } = require('@playwright/test');

const ROOT = path.join(__dirname, '..', '..', '..');
const PLUGINS_DIR = path.join(ROOT, 'plugins');

// A fresh, empty temporary preferences path.
function tempPreferencesPath() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ld-prefs-')), 'preferences.json');
}

async function launch({ lang = 'en', prefsFile = tempPreferencesPath(), plugins = fs.mkdtempSync(path.join(os.tmpdir(), 'ld-plugins-')) } = {}) {
  // '.' starts Electron on package.json "main" — the same entry as `npm start`.
  const args = lang === null ? ['.'] : ['.', `--lang=${lang}`];
  const app = await electron.launch({
    args,
    cwd: ROOT,
    env: { ...process.env, LD_PREFERENCES_PATH: prefsFile, LD_PLUGINS_PATH: plugins }
  });
  const win = await app.firstWindow();
  await win.waitForLoadState('load');
  // The GUI is ready once the menu bar entries have been filled from the Actions.
  await win.locator('.MenubarItem[data-action="file.quit"] .MenubarItemLabel').waitFor({ state: 'attached' });
  return { app, win, prefsFile };
}

// Resolves with the exit code when the application process ends.
function exitCode(app) {
  return new Promise((resolve) => app.process().once('exit', (code) => resolve(code)));
}

module.exports = { ROOT, PLUGINS_DIR, launch, exitCode, tempPreferencesPath };

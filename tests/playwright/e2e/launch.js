// Shared launcher for the end-to-end tests.
// The language is forced with Electron's --lang switch, so the expected labels do not
// depend on the locale of the machine running the tests.
'use strict';

const path = require('path');
const { _electron: electron } = require('@playwright/test');

const ROOT = path.join(__dirname, '..', '..', '..');

async function launch({ lang = 'en' } = {}) {
  // '.' starts Electron on package.json "main" — the same entry as `npm start`.
  const app = await electron.launch({ args: ['.', `--lang=${lang}`], cwd: ROOT });
  const win = await app.firstWindow();
  await win.waitForLoadState('load');
  // The GUI is ready once the menu bar entries have been filled from the Actions.
  await win.locator('.MenubarItem[data-action="app.quit"] .MenubarItemLabel').waitFor({ state: 'attached' });
  return { app, win };
}

// Resolves with the exit code when the application process ends.
function exitCode(app) {
  return new Promise((resolve) => app.process().once('exit', (code) => resolve(code)));
}

module.exports = { ROOT, launch, exitCode };

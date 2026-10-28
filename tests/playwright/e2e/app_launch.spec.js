// End-to-end test — the application starts and opens one secure, empty main window.
'use strict';

const path = require('path');
const { test, expect, _electron: electron } = require('@playwright/test');

const ROOT = path.join(__dirname, '..', '..', '..');

let app;

test.beforeAll(async () => {
  // '.' starts Electron on package.json "main" — the same entry as `npm start`.
  app = await electron.launch({ args: ['.'], cwd: ROOT });
});

test.afterAll(async () => {
  if (app) await app.close();
});

test('opens exactly one main window titled "Layout Designer"', async () => {
  const win = await app.firstWindow();
  await win.waitForLoadState('domcontentloaded');
  expect(await win.title()).toBe('Layout Designer');
  expect(app.windows()).toHaveLength(1);
});

test('renderer has no Node.js access', async () => {
  const win = await app.firstWindow();
  const exposed = await win.evaluate(() => ({
    require: typeof require,
    process: typeof process
  }));
  expect(exposed).toEqual({ require: 'undefined', process: 'undefined' });
});

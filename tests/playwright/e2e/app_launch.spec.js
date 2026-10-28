// End-to-end test — the application starts with one secure main window and a minimal
// preload bridge (docs/contracts/ACTION_COMMAND.md §5).
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

test('the preload bridge exposes only window.ld.invokeCommand', async () => {
  const win = await app.firstWindow();
  const bridge = await win.evaluate(() => ({
    ldKeys: Object.keys(window.ld),
    invokeType: typeof window.ld.invokeCommand,
    ipcRenderer: typeof window.ipcRenderer
  }));
  expect(bridge).toEqual({ ldKeys: ['invokeCommand'], invokeType: 'function', ipcRenderer: 'undefined' });
});

test('an unknown Command id comes back as ok: false', async () => {
  const win = await app.firstWindow();
  const reply = await win.evaluate(() => window.ld.invokeCommand('nope.nothing'));
  expect(reply.ok).toBe(false);
  expect(reply.error.message).toMatch(/Unknown Command 'nope.nothing'/);
});

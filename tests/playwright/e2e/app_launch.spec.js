// End-to-end test — the application starts with one secure main window and a minimal
// preload bridge (docs/contracts/ACTION_COMMAND.md §5).
'use strict';

const { test, expect } = require('@playwright/test');
const { launch } = require('./launch.js');

let app;

test.beforeAll(async () => {
  ({ app } = await launch());
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

// N0.5 adds onOutput (step 4) and pty (step 7) — docs/contracts/OUTPUT_PANEL.md §7;
// still no generic ipcRenderer.
test('the preload bridge exposes only invokeCommand, onOutput and pty', async () => {
  const win = await app.firstWindow();
  const bridge = await win.evaluate(() => ({
    ldKeys: Object.keys(window.ld).sort(),
    ptyKeys: Object.keys(window.ld.pty).sort(),
    ipcRenderer: typeof window.ipcRenderer
  }));
  expect(bridge).toEqual({
    ldKeys: ['invokeCommand', 'onOutput', 'pty'],
    ptyKeys: ['kill', 'onData', 'onExit', 'resize', 'start', 'write'],
    ipcRenderer: 'undefined'
  });
});

test('an unknown Command id comes back as ok: false', async () => {
  const win = await app.firstWindow();
  const reply = await win.evaluate(() => window.ld.invokeCommand('nope.nothing'));
  expect(reply.ok).toBe(false);
  expect(reply.error.message).toMatch(/Unknown Command 'nope.nothing'/);
});

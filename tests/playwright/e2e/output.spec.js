// End-to-end test — N0.5 step 4: the Output tab shows the application's own traces
// from both processes (docs/contracts/OUTPUT_PANEL.md §4).
'use strict';

const fs = require('fs');
const { test, expect } = require('@playwright/test');
const { launch, tempPreferencesPath } = require('./launch.js');

const TIME = '\\d\\d:\\d\\d:\\d\\d';

test.describe('Output', () => {
  let app;
  let win;

  test.beforeAll(async () => {
    const prefsFile = tempPreferencesPath();
    fs.writeFileSync(prefsFile, '{ not json');
    ({ app, win } = await launch({ prefsFile }));
    await win.keyboard.press('Control+Shift+U');
  });

  test.afterAll(async () => {
    if (app) await app.close();
  });

  const lines = () => win.locator('#panel_output .OutputLine');

  test('shows traces from main (start-up) and from the renderer (labels, Actions)', async () => {
    await expect(lines().filter({ hasText: 'Layout Designer 0.0.0 started' })).toHaveCount(1);
    await expect(lines().filter({ hasText: 'Labels loaded: en' })).toHaveCount(1);
    await expect(lines().filter({ hasText: /\d+ Actions registered/ })).toHaveCount(1);
  });

  test('lines follow the mock-up format, without a source tag (single source)', async () => {
    const first = await lines().first().textContent();
    expect(first).toMatch(new RegExp(`^\\[info\\]  ${TIME}  Layout Designer 0\\.0\\.0 started`));
    for (const text of await lines().allTextContents()) {
      expect(text).toMatch(new RegExp(`^\\[(info|warn|error)\\]  ${TIME}  `));
      expect(text).not.toContain('[Layout Designer]');
    }
  });

  test('main-side lines come first: the view is in time order', async () => {
    const texts = await lines().allTextContents();
    const started = texts.findIndex((t) => t.includes('started'));
    const labels = texts.findIndex((t) => t.includes('Labels loaded'));
    expect(started).toBeLessThan(labels);
  });

  test('an invalid preferences file gives a warn line, in the warn colour', async () => {
    const warn = lines().filter({ hasText: 'Invalid preferences' });
    await expect(warn).toHaveCount(1);
    await expect(warn).toHaveClass(/is-warn/);
    await expect(warn).toHaveText(new RegExp(`^\\[warn\\]  ${TIME}  `));
  });

  test('a failed Command gives an error line, in the error colour', async () => {
    await app.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler('ld:command:invoke');
      ipcMain.handle('ld:command:invoke', () => ({ ok: false, error: { message: 'Injected failure' } }));
    });
    await win.locator('.ToolbarButton[data-action="view.toggleDevTools"]').click();
    const error = lines().filter({ hasText: 'Injected failure' });
    await expect(error).toHaveCount(1);
    await expect(error).toHaveClass(/is-error/);
  });

  test('no source selector in N0.5', async () => {
    await expect(win.locator('.BottomPanelTabRow select, .BottomPanelTabRow .SourceSelector')).toHaveCount(0);
  });
});

test('a line written by main after start-up reaches the Output tab', async () => {
  const prefsFile = tempPreferencesPath();
  fs.writeFileSync(prefsFile, '{ not json');
  const { app, win } = await launch({ prefsFile });
  try {
    const warns = win.locator('#panel_output .OutputLine', { hasText: 'Invalid preferences' });
    await expect(warns).toHaveCount(1); // at start-up, from the history
    // prefs.setLanguage reads the (still invalid) file again: main's journal writes a
    // second warn line, sent live to the renderer.
    await win.evaluate(() => window.ld.invokeCommand('prefs.setLanguage', { language: 'en' }));
    await expect(warns).toHaveCount(2);
  } finally {
    await app.close();
  }
});

// End-to-end test — command palette and the two N0.2 witness Actions
// (docs/contracts/ACTION_COMMAND.md §7, §10).
'use strict';

const path = require('path');
const { test, expect, _electron: electron } = require('@playwright/test');

const ROOT = path.join(__dirname, '..', '..', '..');

async function launch() {
  const app = await electron.launch({ args: ['.'], cwd: ROOT });
  const win = await app.firstWindow();
  await win.waitForLoadState('load');
  return { app, win };
}

test.describe('command palette', () => {
  let app;
  let win;

  test.beforeAll(async () => {
    ({ app, win } = await launch());
  });

  test.afterAll(async () => {
    if (app) await app.close();
  });

  const palette = () => win.locator('#command-palette');
  const input = () => win.locator('.CommandPaletteInput');
  const items = () => win.locator('.CommandPaletteItem');

  test('is hidden at start-up', async () => {
    await expect(palette()).toBeHidden();
  });

  test('Ctrl+Shift+P opens it, focused, listing Actions but not itself', async () => {
    await win.keyboard.press('Control+Shift+P');
    await expect(palette()).toBeVisible();
    await expect(input()).toBeFocused();
    await expect(items()).toHaveText(['Quit']);
  });

  test('typing filters the list', async () => {
    await input().fill('zzz');
    await expect(items()).toHaveCount(0);
    await input().fill('QUI');
    await expect(items()).toHaveText(['Quit']);
    await expect(items().first()).toHaveAttribute('aria-selected', 'true');
  });

  test('Esc closes it', async () => {
    await input().press('Escape');
    await expect(palette()).toBeHidden();
  });

  test('Ctrl+Shift+P toggles it, and reopening starts from an empty filter', async () => {
    await win.keyboard.press('Control+Shift+P');
    await expect(palette()).toBeVisible();
    await expect(input()).toHaveValue('');
    await win.keyboard.press('Control+Shift+P');
    await expect(palette()).toBeHidden();
  });

  test('a click outside the panel closes it', async () => {
    await win.keyboard.press('Control+Shift+P');
    await expect(palette()).toBeVisible();
    await win.mouse.click(5, 5);
    await expect(palette()).toBeHidden();
  });
});

test.describe('alias Action app.quit', () => {
  test('choosing Quit in the palette closes the application', async () => {
    const { app, win } = await launch();
    const exited = new Promise((resolve) => app.process().once('exit', (code) => resolve(code)));
    await win.keyboard.press('Control+Shift+P');
    await win.locator('.CommandPaletteInput').fill('quit');
    await expect(win.locator('.CommandPaletteItem')).toHaveText(['Quit']);
    // The application may close before Playwright finishes the key press: ignore that.
    win.keyboard.press('Enter').catch(() => {});
    expect(await exited).toBe(0);
  });
});

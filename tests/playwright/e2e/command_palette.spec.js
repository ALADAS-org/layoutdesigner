// End-to-end test — command palette and the two N0.2 witness Actions
// (docs/contracts/ACTION_COMMAND.md §7, §10).
'use strict';

const { test, expect } = require('@playwright/test');
const { launch, exitCode } = require('./launch.js');

// Palette entries read "Category: Label", as in VS Code.
const ALL_BUT_PALETTE = [
  'File: Quit',
  'View: Light / Dark Theme',
  'View: Show / Hide Developer Tools',
  'Preferences: Choose Language…',
  'Help: About Layout Designer…'
];

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
    await expect(items()).toHaveText(ALL_BUT_PALETTE);
  });

  test('typing filters the list', async () => {
    await input().fill('zzz');
    await expect(items()).toHaveCount(0);
    await input().fill('QUI');
    await expect(items()).toHaveText(['File: Quit']);
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
    const exited = exitCode(app);
    await win.keyboard.press('Control+Shift+P');
    await win.locator('.CommandPaletteInput').fill('quit');
    await expect(win.locator('.CommandPaletteItem')).toHaveText(['File: Quit']);
    // The application may close before Playwright finishes the key press: ignore that.
    win.keyboard.press('Enter').catch(() => {});
    expect(await exited).toBe(0);
  });
});

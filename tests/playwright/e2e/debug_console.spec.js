// End-to-end test — N0.5 step 5: the Debug Console (docs/contracts/OUTPUT_PANEL.md §5).
'use strict';

const path = require('path');
const { test, expect } = require('@playwright/test');
const { launch, ROOT } = require('./launch.js');

test.describe('Debug Console', () => {
  let app;
  let win;

  test.beforeAll(async () => {
    ({ app, win } = await launch());
    await win.keyboard.press('Control+Shift+Y');
  });

  test.afterAll(async () => {
    if (app) await app.close();
  });

  const input = () => win.locator('.DebugConsoleInput');
  const lines = () => win.locator('.DebugConsoleLine');
  const last = () => lines().last();
  async function type(text) {
    await input().fill(text);
    await input().press('Enter');
  }

  test('showing the tab gives the focus to the input; a welcome line', async () => {
    await expect(input()).toBeFocused();
    await expect(lines().first()).toHaveText('Type help for the list of commands.');
  });

  test('help lists the Actions as the palette does, each with its id', async () => {
    await type('help');
    await expect(lines().filter({ hasText: 'Console commands: help, clear, pwd' })).toHaveCount(1);
    await expect(lines().filter({ hasText: 'View: Light / Dark Theme' })).toHaveText('View: Light / Dark Theme  view.toggleTheme');
    await expect(lines().filter({ hasText: 'Debug Console: Clear' })).toHaveText('Debug Console: Clear  debugConsole.clear');
  });

  test('clear empties the transcript, its own line included (as VS Code)', async () => {
    await type('clear');
    await expect(lines()).toHaveCount(0);
  });

  test('an Action id runs that Action and says OK', async () => {
    const before = await win.evaluate(() => document.documentElement.dataset.theme);
    await type('view.toggleTheme');
    await expect(last()).toHaveText('OK');
    expect(await win.evaluate(() => document.documentElement.dataset.theme)).not.toBe(before);
    await type('view.toggleTheme');
  });

  test('pwd, ls and cd work on folders, starting in the application folder', async () => {
    await type('pwd');
    await expect(last()).toHaveText(ROOT);
    await type('ls');
    await expect(lines().filter({ hasText: /^src\/$/ })).toHaveCount(1);
    await expect(lines().filter({ hasText: /^package\.json$/ })).toHaveCount(1);
    await type('cd src');
    await expect(last()).toHaveText(path.join(ROOT, 'src'));
    await type('cd ..');
    await expect(last()).toHaveText(ROOT);
    await type('cd src/i18n');
    await type('cd');
    await expect(last()).toHaveText(ROOT); // cd alone: back to the application folder
  });

  test('errors are red, with a warn line in Output', async () => {
    await type('nope.nothing');
    await expect(last()).toHaveText("Unknown command 'nope.nothing'. Type help.");
    await expect(last()).toHaveClass(/is-error/);
    await type('cd nowhere');
    await expect(last()).toHaveText(/No such folder/);
    await expect(last()).toHaveClass(/is-error/);
    await type('view.toggleTheme please');
    await expect(last()).toHaveText(/Unexpected argument 'please'/);
    const output = win.locator('#panel_output .OutputLine');
    await expect(output.filter({ hasText: "Debug Console: unknown command 'nope.nothing'" })).toHaveClass(/is-warn/);
    await expect(output.filter({ hasText: 'debugConsole.setFolder failed' })).toHaveClass(/is-error/);
  });

  test('↑ / ↓ go through the history', async () => {
    await type('pwd');
    await input().press('ArrowUp');
    await expect(input()).toHaveValue('pwd');
    await input().press('ArrowUp');
    await expect(input()).toHaveValue('view.toggleTheme please');
    await input().press('ArrowDown');
    await expect(input()).toHaveValue('pwd');
    await input().fill('');
  });

  test('Tab completes words and Action ids', async () => {
    await input().fill('view.toggleT');
    await input().press('Tab');
    await expect(input()).toHaveValue('view.toggleTheme ');
    await expect(input()).toBeFocused();
    await input().fill('cl');
    await input().press('Tab');
    await expect(input()).toHaveValue('clear ');
    // Several matches (help, help.about): their common prefix, and the list is shown.
    await input().fill('hel');
    await input().press('Tab');
    await expect(input()).toHaveValue('help');
    await input().press('Tab');
    await expect(lines().last()).toHaveText('help   help.about');
    await input().fill('');
  });
});

test('the console words are in the palette and show the Debug Console', async () => {
  const { app, win } = await launch();
  try {
    await win.keyboard.press('Control+Shift+P');
    await win.locator('.CommandPaletteInput').fill('show folder');
    await expect(win.locator('.CommandPaletteItem')).toHaveText(['Debug Console: Show Folder']);
    await win.keyboard.press('Enter');
    await expect(win.locator('.BottomPanelTab[data-tab="debugConsole"]')).toHaveAttribute('aria-selected', 'true');
    await expect(win.locator('.DebugConsoleLine').last()).toHaveText(require('./launch.js').ROOT);
  } finally {
    await app.close();
  }
});

test('French labels of the Debug Console', async () => {
  const { app, win } = await launch({ lang: 'fr' });
  try {
    await win.keyboard.press('Control+Shift+Y');
    await expect(win.locator('.DebugConsoleLine').first()).toHaveText('Tapez help pour la liste des commandes.');
    await win.locator('.DebugConsoleInput').fill('nope');
    await win.locator('.DebugConsoleInput').press('Enter');
    await expect(win.locator('.DebugConsoleLine').last()).toHaveText('Commande inconnue « nope ». Tapez help.');
  } finally {
    await app.close();
  }
});

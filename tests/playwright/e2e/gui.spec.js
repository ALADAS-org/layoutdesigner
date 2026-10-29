// End-to-end test — N0.3 HTML GUI: menu bar, toolbar, status bar, About dialog, themes
// (docs/contracts/ACTION_COMMAND.md §13).
'use strict';

const { test, expect } = require('@playwright/test');
const { launch, exitCode } = require('./launch.js');
const { version } = require('../../../package.json');

test.describe('menu bar', () => {
  let app;
  let win;

  test.beforeAll(async () => {
    ({ app, win } = await launch());
  });

  test.afterAll(async () => {
    if (app) await app.close();
  });

  const title = (name) => win.locator('.MenubarTitle', { hasText: name });
  const dropdownOf = (name) => win.locator('.MenubarMenu', { has: title(name) }).locator('.MenubarDropdown');
  const item = (actionId) => win.locator(`.MenubarItem[data-action="${actionId}"]`);

  test('replaces the native menu, with File, View and Help — Help on the right', async () => {
    expect(await app.evaluate(({ Menu }) => Menu.getApplicationMenu())).toBeNull();
    await expect(win.locator('.MenubarTitle')).toHaveText(['File', 'View', 'Help']);
    const view = await title('View').boundingBox();
    const help = await title('Help').boundingBox();
    const width = await win.evaluate(() => document.documentElement.clientWidth);
    expect(help.x).toBeGreaterThan(view.x + view.width + 100);
    expect(Math.round(help.x + help.width)).toBe(width);
  });

  test('entries show the label and shortcut of their Action', async () => {
    await expect(item('app.quit').locator('.MenubarItemLabel')).toHaveText('Quit');
    await expect(item('app.quit').locator('.MenubarItemShortcut')).toHaveText('Ctrl+Q');
    await expect(item('view.commandPalette').locator('.MenubarItemShortcut')).toHaveText('Ctrl+Shift+P');
    await expect(item('help.about').locator('.MenubarItemLabel')).toHaveText('About Layout Designer…');
  });

  test('a click opens a menu; hovering another title switches; a click outside closes', async () => {
    await expect(dropdownOf('File')).toBeHidden();
    await title('File').click();
    await expect(dropdownOf('File')).toBeVisible();
    await title('View').hover();
    await expect(dropdownOf('View')).toBeVisible();
    await expect(dropdownOf('File')).toBeHidden();
    await win.mouse.click(600, 400);
    await expect(dropdownOf('View')).toBeHidden();
  });

  test('a second click on the open title closes it', async () => {
    await title('Help').click();
    await expect(dropdownOf('Help')).toBeVisible();
    await title('Help').click();
    await expect(dropdownOf('Help')).toBeHidden();
  });

  test('hovering a title does nothing while no menu is open', async () => {
    await title('View').hover();
    await expect(dropdownOf('View')).toBeHidden();
  });

  test('keyboard: F10, arrows, Esc', async () => {
    await win.mouse.click(600, 400);
    await win.keyboard.press('F10');
    await expect(title('File')).toBeFocused();
    await win.keyboard.press('ArrowRight');
    await expect(title('View')).toBeFocused();
    await expect(dropdownOf('View')).toBeHidden();
    await win.keyboard.press('ArrowDown');
    await expect(dropdownOf('View')).toBeVisible();
    await expect(item('view.commandPalette')).toBeFocused();
    await win.keyboard.press('ArrowDown');
    await expect(item('view.toggleTheme')).toBeFocused();
    await win.keyboard.press('ArrowUp');
    await win.keyboard.press('ArrowUp'); // wraps to the last entry
    await expect(item('dev.toggleDevTools')).toBeFocused();
    await win.keyboard.press('ArrowLeft'); // previous menu, opened, first entry focused
    await expect(dropdownOf('File')).toBeVisible();
    await expect(item('app.quit')).toBeFocused();
    await win.keyboard.press('ArrowLeft'); // wraps to Help
    await expect(dropdownOf('Help')).toBeVisible();
    await win.keyboard.press('Escape');
    await expect(dropdownOf('Help')).toBeHidden();
    await expect(title('Help')).toBeFocused();
    await win.keyboard.press('Escape');
    await expect(title('Help')).not.toBeFocused();
  });

  test('keyboard: Alt alone gives the focus to the bar, and takes it back', async () => {
    await win.keyboard.press('Alt');
    await expect(title('File')).toBeFocused();
    await win.keyboard.press('Alt');
    await expect(title('File')).not.toBeFocused();
  });

  test('keyboard: Enter on an entry runs its Action once', async () => {
    await win.keyboard.press('F10');
    await win.keyboard.press('ArrowRight');
    await win.keyboard.press('Enter');
    await expect(item('view.commandPalette')).toBeFocused();
    await win.keyboard.press('Enter');
    await expect(dropdownOf('View')).toBeHidden();
    await expect(win.locator('#command-palette')).toBeVisible();
    await win.keyboard.press('Escape');
    await expect(win.locator('#command-palette')).toBeHidden();
  });
});

test.describe('themes', () => {
  let app;
  let win;

  test.beforeAll(async () => {
    ({ app, win } = await launch());
  });

  test.afterAll(async () => {
    if (app) await app.close();
  });

  const theme = () => win.evaluate(() => document.documentElement.dataset.theme);
  const menubarColor = () =>
    win.evaluate(() => getComputedStyle(document.querySelector('.Menubar')).backgroundColor);

  test('starts dark; View › Light / Dark Theme switches to light and back', async () => {
    expect(await theme()).toBe('dark');
    const dark = await menubarColor();
    await win.locator('.MenubarTitle', { hasText: 'View' }).click();
    await win.locator('.MenubarItem[data-action="view.toggleTheme"]').click();
    expect(await theme()).toBe('light');
    expect(await menubarColor()).not.toBe(dark);
    await win.locator('.MenubarTitle', { hasText: 'View' }).click();
    await win.locator('.MenubarItem[data-action="view.toggleTheme"]').click();
    expect(await theme()).toBe('dark');
    expect(await menubarColor()).toBe(dark);
  });
});

test.describe('About dialog', () => {
  let app;
  let win;

  test.beforeAll(async () => {
    ({ app, win } = await launch());
  });

  test.afterAll(async () => {
    if (app) await app.close();
  });

  const dialog = () => win.locator('.ui-dialog.LdDialog');

  test('Help › About opens a modal dialog with the version from package.json', async () => {
    await expect(dialog()).toBeHidden();
    await win.locator('.MenubarTitle', { hasText: 'Help' }).click();
    await win.locator('.MenubarItem[data-action="help.about"]').click();
    await expect(dialog()).toBeVisible();
    await expect(dialog().locator('.ui-dialog-title')).toHaveText('About Layout Designer');
    await expect(dialog().locator('.AboutVersion')).toHaveText(version);
    await expect(dialog().locator('.AboutAuthor')).toHaveText('© JeanArt & Echopraxium');
    await expect(win.locator('.ui-widget-overlay')).toBeVisible();
  });

  test('OK closes it', async () => {
    await dialog().getByRole('button', { name: 'OK' }).click();
    await expect(dialog()).toBeHidden();
  });

  test('F1 opens it, and the menu entry shows F1', async () => {
    await expect(win.locator('.MenubarItem[data-action="help.about"] .MenubarItemShortcut')).toHaveText('F1');
    await win.keyboard.press('F1');
    await expect(dialog()).toBeVisible();
    await dialog().getByRole('button', { name: 'OK' }).click();
    await expect(dialog()).toBeHidden();
  });

  test('the palette entry "Help: About Layout Designer…" opens it', async () => {
    await win.keyboard.press('Control+Shift+P');
    await win.locator('.CommandPaletteInput').fill('help: about');
    await expect(win.locator('.CommandPaletteItem')).toHaveText(['Help: About Layout Designer…']);
    await win.keyboard.press('Enter');
    await expect(dialog()).toBeVisible();
    await win.keyboard.press('Escape');
    await expect(dialog()).toBeHidden();
  });

  test('Esc closes it too', async () => {
    await win.locator('.MenubarTitle', { hasText: 'Help' }).click();
    await win.locator('.MenubarItem[data-action="help.about"]').click();
    await expect(dialog()).toBeVisible();
    await win.keyboard.press('Escape');
    await expect(dialog()).toBeHidden();
  });
});

test.describe('toolbar and status bar', () => {
  let app;
  let win;

  test.beforeAll(async () => {
    ({ app, win } = await launch());
  });

  test.afterAll(async () => {
    if (app) await app.close();
  });

  const button = (actionId) => win.locator(`.ToolbarButton[data-action="${actionId}"]`);
  const devToolsOpen = () =>
    app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.isDevToolsOpened());

  const commandCenter = () => win.locator('.CommandCenter');

  test('a wrench button and a command center, with "label (shortcut)" tooltips', async () => {
    await expect(win.locator('.ToolbarButton')).toHaveCount(1);
    await expect(button('dev.toggleDevTools')).toHaveAttribute('title', 'Show / Hide Developer Tools (Ctrl+Shift+I)');
    await expect(commandCenter()).toHaveAttribute('data-action', 'view.commandPalette');
    await expect(commandCenter()).toHaveAttribute('title', 'Command Palette (Ctrl+Shift+P)');
    await expect(commandCenter().locator('.CommandCenterText')).toHaveText('Search actions');
    await expect(commandCenter().locator('.CommandCenterShortcut')).toHaveText('Ctrl+Shift+P');
  });

  test('the command center sits in the middle of the toolbar', async () => {
    const box = await commandCenter().boundingBox();
    const width = await win.evaluate(() => document.documentElement.clientWidth);
    expect(Math.abs(box.x + box.width / 2 - width / 2)).toBeLessThan(4);
  });

  test('clicking the command center opens the palette right over it', async () => {
    const center = await commandCenter().boundingBox();
    await commandCenter().click();
    await expect(win.locator('#command-palette')).toBeVisible();
    await expect(win.locator('.CommandPaletteInput')).toBeFocused();
    await expect(win.locator('.CommandPaletteInput')).toHaveAttribute('placeholder', 'Search actions');
    const panel = await win.locator('.CommandPalettePanel').boundingBox();
    expect(Math.abs(panel.y - center.y)).toBeLessThan(2);
    expect(Math.abs(panel.x + panel.width / 2 - (center.x + center.width / 2))).toBeLessThan(2);
    expect(panel.width).toBeGreaterThanOrEqual(center.width - 1);
    await win.keyboard.press('Escape');
    await expect(win.locator('#command-palette')).toBeHidden();
  });

  test('the wrench button shows and hides the developer tools', async () => {
    expect(await devToolsOpen()).toBe(false);
    await button('dev.toggleDevTools').click();
    await expect.poll(devToolsOpen).toBe(true);
    await button('dev.toggleDevTools').click();
    await expect.poll(devToolsOpen).toBe(false);
  });

  test('Ctrl+Shift+I does the same', async () => {
    await win.keyboard.press('Control+Shift+I');
    await expect.poll(devToolsOpen).toBe(true);
    await win.keyboard.press('Control+Shift+I');
    await expect.poll(devToolsOpen).toBe(false);
  });

  test('a failed Command shows its message in the status bar, as an error', async () => {
    const message = win.locator('#status_bar_message');
    await expect(message).toHaveText('');
    // Fault injection at the IPC boundary: every Command now fails.
    await app.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler('ld:command:invoke');
      ipcMain.handle('ld:command:invoke', () => ({ ok: false, error: { message: 'Injected failure' } }));
    });
    await button('dev.toggleDevTools').click();
    await expect(message).toHaveText('Injected failure');
    await expect(message).toHaveClass(/is-error/);
  });
});

test.describe('quitting', () => {
  test('File › Quit closes the application', async () => {
    const { app, win } = await launch();
    const exited = exitCode(app);
    await win.locator('.MenubarTitle', { hasText: 'File' }).click();
    // The application may close before Playwright finishes the click: ignore that.
    win.locator('.MenubarItem[data-action="app.quit"]').click().catch(() => {});
    expect(await exited).toBe(0);
  });

  test('Ctrl+Q closes the application (native menu gone)', async () => {
    const { app, win } = await launch();
    const exited = exitCode(app);
    win.keyboard.press('Control+Q').catch(() => {});
    expect(await exited).toBe(0);
  });
});

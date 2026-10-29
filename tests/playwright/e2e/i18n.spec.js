// End-to-end test — localisation of the labels (N0.4, merged into N0.3):
// src/i18n/LD_Labels_<xx>.json, language from the system locale (forced with --lang).
'use strict';

const { test, expect } = require('@playwright/test');
const { launch } = require('./launch.js');

test.describe('French (--lang=fr)', () => {
  let app;
  let win;

  test.beforeAll(async () => {
    ({ app, win } = await launch({ lang: 'fr' }));
  });

  test.afterAll(async () => {
    if (app) await app.close();
  });

  test('menus, entries and tooltips are in French', async () => {
    expect(await win.evaluate(() => document.documentElement.lang)).toBe('fr');
    await expect(win.locator('.MenubarTitle')).toHaveText(['Fichier', 'Affichage', 'Aide']);
    await expect(win.locator('.MenubarItem[data-action="app.quit"] .MenubarItemLabel')).toHaveText('Quitter');
    await expect(win.locator('.ToolbarButton[data-action="view.commandPalette"]'))
      .toHaveAttribute('title', 'Palette de commandes (Ctrl+Shift+P)');
    await expect(win.locator('.Menubar')).toHaveAttribute('aria-label', 'Menu principal');
  });

  test('the palette lists and filters the French labels', async () => {
    await win.keyboard.press('Control+Shift+P');
    await win.locator('.CommandPaletteInput').fill('quit');
    await expect(win.locator('.CommandPaletteItem')).toHaveText(['Quitter']);
    await win.keyboard.press('Escape');
  });

  test('the About dialog is in French', async () => {
    await win.locator('.MenubarTitle', { hasText: 'Aide' }).click();
    await win.locator('.MenubarItem[data-action="help.about"]').click();
    const dialog = win.locator('.ui-dialog.LdDialog');
    await expect(dialog.locator('.ui-dialog-title')).toHaveText('À propos de Layout Designer');
    await expect(dialog).toContainText('Licence MIT');
    await win.keyboard.press('Escape');
  });
});

test('an unsupported language falls back to English (--lang=de)', async () => {
  const { app, win } = await launch({ lang: 'de' });
  try {
    expect(await win.evaluate(() => document.documentElement.lang)).toBe('en');
    await expect(win.locator('.MenubarTitle')).toHaveText(['File', 'View', 'Help']);
  } finally {
    await app.close();
  }
});

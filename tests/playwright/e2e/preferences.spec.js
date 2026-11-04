// End-to-end test — N0.5 step 6: Edit › Preferences… (docs/contracts/PREFERENCES.md):
// the dialog after Inkscape (Interface / System, changes applied at once, Close), the
// language saved at once with the restart warning, the reset with its confirmation and
// backup, the start-up warning for an invalid file. Replaces the N0.3 language dialog test.
'use strict';

const fs = require('fs');
const { test, expect } = require('@playwright/test');
const { launch, tempPreferencesPath } = require('./launch.js');

const MENUS_EN = ['File', 'Edit', 'View', 'Help'];
const MENUS_FR = ['Fichier', 'Édition', 'Affichage', 'Aide'];

const dialog = (win) => win.locator('.ui-dialog.LdPreferencesDialog');
const select = (win) => dialog(win).locator('.PreferencesLanguage');
const category = (win, name) => dialog(win).locator(`.PreferencesCategory[data-category="${name}"]`);
const toast = (win) => win.locator('.iziToast.LdModalToast');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

/**
 * Closes the modal toast with the button of that value, once it is fully shown, and
 * waits for that toast to be gone (another one may follow at once).
 */
async function answer(win, value) {
  const button = toast(win).locator(`button[data-value="${value}"]`);
  await expect(button).toBeVisible();
  const shown = await toast(win).elementHandle();
  await button.click();
  await shown.waitForElementState('hidden');
}

test.describe('the Preferences dialog', () => {
  const prefsFile = tempPreferencesPath();
  let app;
  let win;
  const cspViolations = [];

  test.beforeAll(async () => {
    ({ app, win } = await launch({ prefsFile }));
    win.on('console', (m) => { if (/Content Security Policy/.test(m.text())) cspViolations.push(m.text()); });
  });

  test.afterAll(async () => {
    if (app) await app.close();
  });

  test('Edit › Preferences… shows Ctrl+K; Ctrl+K opens the dialog on Interface', async () => {
    await expect(win.locator('.MenubarTitle')).toHaveText(MENUS_EN);
    const item = win.locator('.MenubarItem[data-action="edit.choosePreferences"]');
    await expect(item.locator('.MenubarItemLabel')).toHaveText('Preferences…');
    await expect(item.locator('.MenubarItemShortcut')).toHaveText('Ctrl+K');
    await win.keyboard.press('Control+K');
    await expect(dialog(win)).toBeVisible();
    await expect(dialog(win).locator('.ui-dialog-title')).toHaveText('Preferences');
    await expect(dialog(win).locator('.PreferencesCategory')).toHaveText(['Interface', 'System']);
    await expect(category(win, 'interface')).toHaveAttribute('aria-selected', 'true');
    await expect(dialog(win).locator('.ui-dialog-buttonpane').getByRole('button', { name: 'Close' })).toBeVisible();
    await expect(dialog(win).locator('.ui-dialog-buttonpane').getByRole('button', { name: 'OK' })).toHaveCount(0); // changes apply at once
  });

  test('Interface: « System language » first, then the languages; no file yet = system', async () => {
    await expect(select(win).locator('option')).toHaveText(['System language', 'English', 'Français']);
    await expect(select(win)).toHaveValue('');
    expect(fs.existsSync(prefsFile)).toBe(false);
  });

  test('choosing a language saves it at once and shows a centred, modal restart warning', async () => {
    await select(win).selectOption('fr');
    await expect(toast(win)).toBeVisible();
    await expect(toast(win).locator('.iziToast-title')).toHaveText('Restart required');
    await expect(toast(win)).toHaveClass(/iziToast-color-orange/); // a warning stays orange
    expect(await toast(win).locator('.iziToast-message').innerText())
      .toBe('The new language will be applied\nwhen Layout Designer restarts.');
    expect(readJson(prefsFile)).toEqual({ language: 'fr' });

    // Centred in the window (once its opening animation is over), with a modal overlay.
    const size = await win.evaluate(() => ({ w: document.documentElement.clientWidth, h: document.documentElement.clientHeight }));
    await expect.poll(async () => {
      const box = await toast(win).boundingBox();
      return Math.abs(box.x + box.width / 2 - size.w / 2) < 4 && Math.abs(box.y + box.height / 2 - size.h / 2) < 40;
    }).toBe(true);
    await expect(win.locator('.iziToast-overlay')).toBeVisible();
    // The OK button is focused, the PO's warning icon at 44 px.
    await expect(toast(win).getByRole('button', { name: 'OK' })).toBeFocused();
    const icon = toast(win).locator('img.iziToast-icon');
    await expect(icon).toHaveAttribute('src', '../assets/icons/warning_icn.png');
    await expect.poll(() => icon.evaluate((img) => [img.complete && img.naturalWidth > 0, Math.round(img.getBoundingClientRect().width)]))
      .toEqual([true, 44]);
    // The message is split into two lines of balanced length.
    const widths = await toast(win).locator('.iziToast-message').evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const lines = new Map();
      for (const r of range.getClientRects()) lines.set(Math.round(r.top), (lines.get(Math.round(r.top)) || 0) + r.width);
      return [...lines.values()];
    });
    expect(widths).toHaveLength(2);
    expect(Math.min(...widths) / Math.max(...widths)).toBeGreaterThan(0.85);
    await answer(win, 'ok');
    await expect(dialog(win)).toBeVisible(); // the dialog stays open
  });

  test('« System language » saves null', async () => {
    await select(win).selectOption('');
    await answer(win, 'ok');
    expect(readJson(prefsFile)).toEqual({ language: null });
    await select(win).selectOption('fr');
    await answer(win, 'ok');
  });

  test('Interface: the theme, applied at once and remembered, no restart warning', async () => {
    const theme = dialog(win).locator('.PreferencesTheme');
    await expect(theme.locator('option')).toHaveText(['Dark', 'Light']);
    await expect(theme).toHaveValue('dark');
    await theme.selectOption('light');
    await expect.poll(() => win.evaluate(() => document.documentElement.dataset.theme)).toBe('light');
    await expect.poll(() => readJson(prefsFile).theme).toBe('light');
    await win.waitForTimeout(300);
    await expect(toast(win)).toHaveCount(0);
    await theme.selectOption('dark');
    await expect.poll(() => readJson(prefsFile).theme).toBe('dark');
  });

  test('System: the preferences file and Reset preferences', async () => {
    await category(win, 'system').click();
    await expect(category(win, 'system')).toHaveAttribute('aria-selected', 'true');
    await expect(dialog(win).locator('.PreferencesFile')).toHaveText(prefsFile);
    await expect(dialog(win).locator('.PreferencesReset')).toHaveText('Reset preferences');
  });

  test('Reset asks first; Cancel changes nothing', async () => {
    await dialog(win).locator('.PreferencesReset').click();
    await expect(toast(win).locator('.iziToast-title')).toHaveText('Reset preferences');
    await answer(win, 'cancel');
    expect(readJson(prefsFile)).toEqual({ language: 'fr', theme: 'dark' });
    expect(fs.existsSync(`${prefsFile}.bak`)).toBe(false);
  });

  test('Reset OK: the file is kept as .bak, the defaults are written, a line in Output', async () => {
    fs.writeFileSync(prefsFile, JSON.stringify({ language: 'fr', theme: 'light' }));
    await win.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
    await dialog(win).locator('.PreferencesReset').click();
    await answer(win, 'ok');
    await answer(win, 'ok'); // the language changed (fr → system): restart warning
    expect(readJson(`${prefsFile}.bak`)).toEqual({ language: 'fr', theme: 'light' });
    expect(await win.evaluate(() => document.documentElement.dataset.theme)).toBe('dark'); // at once
    expect(readJson(prefsFile)).toEqual({ language: null, theme: 'dark' });
    await category(win, 'interface').click();
    await expect(select(win)).toHaveValue('');
    await dialog(win).locator('.ui-dialog-buttonpane').getByRole('button', { name: 'Close' }).click();
    await expect(dialog(win)).toBeHidden();
    await win.keyboard.press('Control+Shift+U');
    await expect(win.locator('#panel_output .OutputLine', { hasText: 'previous file kept as' })).toHaveCount(1);
    expect(cspViolations).toEqual([]); // dialog and toasts load nothing the CSP blocks
  });

  test('the palette keeps « Choose Language… », opening the dialog on the language', async () => {
    await win.keyboard.press('Control+Shift+P');
    await win.locator('.CommandPaletteInput').fill('language');
    await expect(win.locator('.CommandPaletteItem')).toHaveText(['Preferences: Choose Language…']);
    await win.keyboard.press('Enter');
    await expect(dialog(win)).toBeVisible();
    await expect(category(win, 'interface')).toHaveAttribute('aria-selected', 'true');
    await expect(select(win)).toBeFocused();
    await win.keyboard.press('Escape');
    await expect(dialog(win)).toBeHidden();
  });

  test('the old language dialog is gone', async () => {
    await expect(win.locator('.LanguageDialogSelect')).toHaveCount(0);
  });
});

test('the chosen language applies after a restart (no --lang switch)', async () => {
  const prefsFile = tempPreferencesPath();
  let { app, win } = await launch({ prefsFile });
  try {
    await win.keyboard.press('Control+K');
    await select(win).selectOption('fr');
    await answer(win, 'ok');
    await expect(win.locator('.MenubarTitle')).toHaveText(MENUS_EN); // until the restart
    await app.close();
    ({ app, win } = await launch({ lang: null, prefsFile }));
    await expect(win.locator('.MenubarTitle')).toHaveText(MENUS_FR);
  } finally {
    await app.close();
  }
});

test('the theme is remembered: View › Light / Dark Theme saves it, a restart keeps it', async () => {
  const prefsFile = tempPreferencesPath();
  let { app, win } = await launch({ prefsFile });
  try {
    expect(await win.evaluate(() => document.documentElement.dataset.theme)).toBe('dark'); // default
    await win.evaluate(() => document.querySelector('.MenubarItem[data-action="view.toggleTheme"]').click());
    await expect.poll(() => fs.existsSync(prefsFile) && readJson(prefsFile).theme).toBe('light');
    await app.close();
    ({ app, win } = await launch({ prefsFile }));
    expect(await win.evaluate(() => document.documentElement.dataset.theme)).toBe('light');
    await win.keyboard.press('Control+K');
    await expect(dialog(win).locator('.PreferencesTheme')).toHaveValue('light');
  } finally {
    await app.close();
  }
});

test('the --lang switch wins over the preferences file', async () => {
  const prefsFile = tempPreferencesPath();
  fs.writeFileSync(prefsFile, JSON.stringify({ language: 'fr' }));
  const { app, win } = await launch({ lang: 'en', prefsFile });
  try {
    await expect(win.locator('.MenubarTitle')).toHaveText(MENUS_EN);
  } finally {
    await app.close();
  }
});

test.describe('an invalid preferences file at start-up', () => {
  /** @param {string} prefsFile */
  async function start(prefsFile) {
    fs.writeFileSync(prefsFile, '{ not json');
    return launch({ lang: null, prefsFile });
  }

  test('start-up goes on (system language) and a warning offers Reset or Ignore', async () => {
    const prefsFile = tempPreferencesPath();
    const { app, win } = await start(prefsFile);
    try {
      const locale = await app.evaluate(({ app: electronApp }) => electronApp.getLocale());
      await expect(win.locator('.MenubarTitle')).toHaveText(locale.toLowerCase().startsWith('fr') ? MENUS_FR : MENUS_EN);
      await expect(toast(win)).toBeVisible();
      await expect(toast(win).locator('button')).toHaveCount(2);
      // An error: the PO's error icon, not the warning one.
      await expect(toast(win).locator('img.iziToast-icon')).toHaveAttribute('src', '../assets/icons/error_icn.png');
      await expect(toast(win)).toHaveClass(/iziToast-color-red/); // pale red background
      await answer(win, 'ignore');
      expect(fs.readFileSync(prefsFile, 'utf8')).toBe('{ not json'); // left as it is
      expect(fs.existsSync(`${prefsFile}.bak`)).toBe(false);
    } finally {
      await app.close();
    }
  });

  test('Reset: no second confirmation; backup and defaults', async () => {
    const prefsFile = tempPreferencesPath();
    const { app, win } = await start(prefsFile);
    try {
      await answer(win, 'reset');
      await expect.poll(() => fs.existsSync(`${prefsFile}.bak`)).toBe(true);
      expect(fs.readFileSync(`${prefsFile}.bak`, 'utf8')).toBe('{ not json');
      expect(readJson(prefsFile)).toEqual({ language: null, theme: 'dark' });
      await expect(toast(win)).toHaveCount(0); // language unchanged (system): no restart warning
    } finally {
      await app.close();
    }
  });

  test('a missing file gives no warning', async () => {
    const { app, win } = await launch({ lang: null, prefsFile: tempPreferencesPath() });
    try {
      await expect(win.locator('.MenubarTitle')).toHaveCount(4);
      await win.waitForTimeout(500);
      await expect(toast(win)).toHaveCount(0);
    } finally {
      await app.close();
    }
  });
});

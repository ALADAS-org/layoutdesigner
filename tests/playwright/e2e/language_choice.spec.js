// End-to-end test — Preferences: Choose Language… (N0.3): jQuery UI dialog listing the
// label files, preference saved in the preferences file, iziToast warning, applied at
// the next start.
'use strict';

const fs = require('fs');
const { test, expect } = require('@playwright/test');
const { launch, tempPreferencesPath } = require('./launch.js');

const dialog = (win) => win.locator('.ui-dialog.LdDialog', { has: win.locator('.LanguageDialogSelect') });

async function openLanguageDialog(win) {
  await win.locator('.CommandCenter').click();
  await win.locator('.CommandPaletteInput').fill('language');
  await expect(win.locator('.CommandPaletteItem')).toHaveText(['Preferences: Choose Language…']);
  await win.keyboard.press('Enter');
  await expect(dialog(win)).toBeVisible();
}

test.describe('choosing French', () => {
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

  test('the dialog lists the available languages, the current one selected', async () => {
    await openLanguageDialog(win);
    await expect(dialog(win).locator('.ui-dialog-title')).toHaveText('Choose Language');
    await expect(dialog(win).locator('option')).toHaveText(['English', 'Français']);
    await expect(dialog(win).locator('.LanguageDialogSelect')).toHaveValue('en');
  });

  test('Cancel saves nothing and shows no warning', async () => {
    await dialog(win).locator('.LanguageDialogSelect').selectOption('fr');
    await dialog(win).getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog(win)).toBeHidden();
    await expect(win.locator('.iziToast')).toHaveCount(0);
    expect(fs.existsSync(prefsFile)).toBe(false);
  });

  test('OK saves the choice and shows a centred, modal restart warning', async () => {
    await openLanguageDialog(win);
    await dialog(win).locator('.LanguageDialogSelect').selectOption('fr');
    await dialog(win).getByRole('button', { name: 'OK' }).click();
    await expect(dialog(win)).toBeHidden();
    const toast = win.locator('.iziToast.LdModalToast');
    await expect(toast).toBeVisible();
    await expect(toast.locator('.iziToast-title')).toHaveText('Restart required');
    await expect(toast.locator('.iziToast-message')).toContainText('applied when Layout Designer restarts');
    expect(JSON.parse(fs.readFileSync(prefsFile, 'utf8'))).toEqual({ language: 'fr' });

    // Centred in the window (once its opening animation is over), with a modal overlay.
    const size = await win.evaluate(() => ({ w: document.documentElement.clientWidth, h: document.documentElement.clientHeight }));
    await expect.poll(async () => {
      const box = await toast.boundingBox();
      return Math.abs(box.x + box.width / 2 - size.w / 2) < 4 && Math.abs(box.y + box.height / 2 - size.h / 2) < 40;
    }).toBe(true);
    await expect(win.locator('.iziToast-overlay')).toBeVisible();

    // Two lines (title above message), OK alone on the line below, focused.
    const ok = toast.getByRole('button', { name: 'OK' });
    await expect.poll(async () => {
      const title = await toast.locator('.iziToast-title').boundingBox();
      const message = await toast.locator('.iziToast-message').boundingBox();
      const okBox = await ok.boundingBox();
      return message.y >= title.y + title.height - 1 && okBox.y >= message.y + message.height - 1;
    }).toBe(true);
    await expect(ok).toBeFocused();
    expect(cspViolations).toEqual([]); // dialog and toast load nothing the CSP blocks
  });

  test('a wrapped message is split into two lines of balanced length', async () => {
    const widths = await win.locator('.LdModalToast .iziToast-message').evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      // One rectangle per line box; merge fragments that share a line.
      const lines = new Map();
      for (const r of range.getClientRects()) {
        const key = Math.round(r.top);
        lines.set(key, (lines.get(key) || 0) + r.width);
      }
      return [...lines.values()];
    });
    if (widths.length === 2) {
      expect(Math.min(...widths) / Math.max(...widths)).toBeGreaterThan(0.75);
    } else {
      expect(widths.length).toBe(1); // short enough to fit on one line
    }
  });

  test('the warning stays until OK is pressed', async () => {
    const toast = win.locator('.iziToast.LdModalToast');
    await win.waitForTimeout(1000);
    await expect(toast).toBeVisible();
    await toast.getByRole('button', { name: 'OK' }).click();
    await expect(toast).toHaveCount(0);
    await expect(win.locator('.iziToast-overlay')).toBeHidden();
  });

  test('the running interface keeps its language until the restart', async () => {
    await expect(win.locator('.MenubarTitle')).toHaveText(['File', 'View', 'Help']);
  });

  test('after a restart (no --lang switch) the interface is in French', async () => {
    await app.close();
    ({ app, win } = await launch({ lang: null, prefsFile }));
    await expect(win.locator('.MenubarTitle')).toHaveText(['Fichier', 'Affichage', 'Aide']);
  });
});

test('the --lang switch wins over the preferences file', async () => {
  const prefsFile = tempPreferencesPath();
  fs.writeFileSync(prefsFile, JSON.stringify({ language: 'fr' }));
  const { app, win } = await launch({ lang: 'en', prefsFile });
  try {
    await expect(win.locator('.MenubarTitle')).toHaveText(['File', 'View', 'Help']);
  } finally {
    await app.close();
  }
});

test('a broken preferences file does not prevent start-up (system language used)', async () => {
  const prefsFile = tempPreferencesPath();
  fs.writeFileSync(prefsFile, '{ not json');
  const { app, win } = await launch({ lang: null, prefsFile });
  try {
    // No --lang switch: the expected labels follow the locale of the test machine.
    const locale = await app.evaluate(({ app: electronApp }) => electronApp.getLocale());
    const expected = locale.toLowerCase().startsWith('fr') ? ['Fichier', 'Affichage', 'Aide'] : ['File', 'View', 'Help'];
    await expect(win.locator('.MenubarTitle')).toHaveText(expected);
  } finally {
    await app.close();
  }
});

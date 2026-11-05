// End-to-end test — N0.6 plugins (docs/contracts/PLUGIN_API.md §12, §14, §15).
// Witnesses: the two dummy plugins of plugins/, copied into a temporary folder so that a
// broken plugin can be added beside them; the core tests run with no plugin (launch.js).
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { launch, PLUGINS_DIR, tempPreferencesPath } = require('./launch.js');

const SERVER = 'LayoutDesigner.dummy-server';
const RENDERER = 'LayoutDesigner.dummy-renderer';
const BROKEN = 'LayoutDesigner.broken-demo';

/** A temporary plugins folder: the repo's plugins, plus a broken one if asked. */
function pluginsFolder({ broken = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ld-plugins-'));
  fs.cpSync(PLUGINS_DIR, dir, { recursive: true });
  if (broken) {
    // Its entry file is missing: rejected at discovery.
    fs.mkdirSync(path.join(dir, 'broken-demo'));
    fs.writeFileSync(path.join(dir, 'broken-demo', 'package.json'), JSON.stringify({
      name: 'broken-demo', publisher: 'LayoutDesigner', displayName: 'Broken Demo', version: '1.0.0',
      'ld-plugin-type': 'server', main: 'index.js', keywords: ['demo', 'test']
    }));
  }
  return dir;
}

const title = (win, name) => win.locator('.MenubarTitle', { hasText: name });
const lines = (win) => win.locator('#panel_output .OutputLine');

test.describe('plugins', () => {
  let app;
  let win;

  test.beforeAll(async () => {
    ({ app, win } = await launch({ plugins: pluginsFolder({ broken: true }) }));
  });

  test.afterAll(async () => {
    if (app) await app.close();
  });

  test('a Plugins menu, last on the left, before Help', async () => {
    await expect(win.locator('.MenubarTitle')).toHaveText(['File', 'Edit', 'View', 'Plugins', 'Help']);
  });

  test('Plugins › Demo by mouse: both entries, sorted by label; each writes under its source', async () => {
    await title(win, 'Plugins').click();
    const entry = win.locator('.MenubarSubmenuEntry', { hasText: 'Demo' });
    await expect(entry).toBeVisible();
    await expect(entry.locator('.MenubarSubmenuArrow')).toHaveText('›');
    await entry.hover();
    const sub = win.locator('.MenubarSubDropdown');
    await expect(sub).toBeVisible();
    await expect(sub.locator('.MenubarItemLabel')).toHaveText(['Hello from the renderer', 'Hello from the server']);
    await sub.locator('.MenubarItem', { hasText: 'Hello from the server' }).click();
    await expect(sub).toBeHidden();
    await expect(lines(win).filter({ hasText: /Hello from a server plugin \(Node\.js \d+/ })).toHaveCount(1);
  });

  test('Plugins › Demo by keyboard: → opens the submenu, ← closes it, Enter runs', async () => {
    await win.mouse.move(400, 300); // away from the menus: hovering an entry focuses it
    await win.keyboard.press('F10');
    await win.keyboard.press('ArrowLeft'); // Help (the bar cycles)…
    await win.keyboard.press('ArrowLeft'); // …then Plugins
    await expect(title(win, 'Plugins')).toBeFocused();
    await win.keyboard.press('ArrowDown');
    const entry = win.locator('.MenubarSubmenuEntry', { hasText: 'Demo' });
    await expect(entry).toBeFocused();
    await win.keyboard.press('ArrowRight');
    const sub = win.locator('.MenubarSubDropdown');
    await expect(sub).toBeVisible();
    await expect(sub.locator('.MenubarItem').first()).toBeFocused();
    await win.keyboard.press('ArrowLeft');
    await expect(sub).toBeHidden();
    await expect(entry).toBeFocused();
    await win.keyboard.press('ArrowRight');
    await win.keyboard.press('Enter'); // Hello from the renderer
    await expect(win.locator('.MenubarDropdown').first()).toBeHidden();
    await expect(lines(win).filter({ hasText: 'Hello from a renderer plugin' })).toHaveCount(1);
  });

  test('the palette lists both Actions under « Plugins: », and filters on the plugin id', async () => {
    await win.keyboard.press('Control+Shift+P');
    await win.locator('.CommandPaletteInput').fill('LayoutDesigner.dummy');
    await expect(win.locator('.CommandPaletteItem')).toHaveText([/^Plugins: Hello from the renderer/, /^Plugins: Hello from the server/]);
    await win.keyboard.press('Escape');
  });

  test('Output: loading lines, a source per plugin, the selector and source tags', async () => {
    await win.keyboard.press('Control+Shift+U');
    await expect(lines(win).filter({ hasText: `Plugin ${SERVER} loaded (server)` })).toHaveCount(1);
    await expect(lines(win).filter({ hasText: `Plugin ${RENDERER} loaded (renderer)` })).toHaveCount(1);
    const button = win.locator('.OutputSourcesButton');
    await expect(button).toBeVisible();
    await expect(button).toHaveText('3 / 3 sources ▾');
    // Several sources shown: each line carries its source tag.
    await expect(lines(win).filter({ hasText: `[${SERVER}]  Hello from a server plugin` })).toHaveCount(1);
    await button.click();
    const boxes = win.locator('.OutputSourcesList input');
    await expect(boxes).toHaveCount(3);
    await win.locator(`.OutputSourcesList input[value="Layout Designer"]`).uncheck();
    await win.locator(`.OutputSourcesList input[value="${SERVER}"]`).uncheck();
    await expect(button).toHaveText('1 / 3 sources ▾');
    // At least one source stays checked; with a single one shown, no tags.
    await expect(win.locator(`.OutputSourcesList input[value="${RENDERER}"]`)).toBeDisabled();
    await expect(lines(win)).toHaveText([/^\[info\]  \d\d:\d\d:\d\d  Hello from a renderer plugin$/]);
    await win.locator(`.OutputSourcesList input[value="Layout Designer"]`).check();
    await win.locator(`.OutputSourcesList input[value="${SERVER}"]`).check();
    await win.keyboard.press('Escape');
    await expect(win.locator('.OutputSourcesList')).toBeHidden();
  });

  test('the selector is shown with the Output tab only', async () => {
    await win.keyboard.press('Control+Shift+Y');
    await expect(win.locator('.OutputSourcesButton')).toBeHidden();
    await win.keyboard.press('Control+Shift+U');
    await expect(win.locator('.OutputSourcesButton')).toBeVisible();
  });

  test('a broken plugin: status bar and error line; the others still work', async () => {
    const message = `Plugin '${BROKEN}' not loaded: entry 'index.js' not found`;
    await expect(win.locator('.StatusBarMessage')).toHaveText(message);
    await expect(lines(win).filter({ hasText: message })).toHaveClass(/is-error/);
  });

  test('Preferences › Plugins: one row per plugin, with id · kind, tags and state', async () => {
    await win.keyboard.press('Control+K');
    const category = win.locator('.PreferencesCategory[data-category="plugins"]');
    await expect(win.locator('.PreferencesCategory:visible')).toHaveText(['Interface', 'Plugins', 'System']);
    await category.click();
    const rows = win.locator('.PreferencesPlugin');
    await expect(rows.locator('.PreferencesPluginName')).toHaveText(['Broken Demo', 'Dummy Renderer', 'Dummy Server']);
    const server = win.locator(`.PreferencesPlugin[data-plugin="${SERVER}"]`);
    await expect(server.locator('.PreferencesPluginId')).toHaveText(`${SERVER} · server`);
    await expect(server.locator('.PreferencesPluginTag')).toHaveText(['demo', 'hello', 'node']);
    await expect(server.locator('.PreferencesPluginState')).toHaveText('loaded');
    const broken = win.locator(`.PreferencesPlugin[data-plugin="${BROKEN}"] .PreferencesPluginState`);
    await expect(broken).toHaveText('failed');
    await expect(broken).toHaveAttribute('title', "entry 'index.js' not found");
    await win.keyboard.press('Escape');
  });
});

test.describe('plugins: enable / disable at the next start', () => {
  test('a plugin disabled in Preferences is not loaded at the next start', async () => {
    const plugins = pluginsFolder();
    const prefsFile = tempPreferencesPath();
    let { app, win } = await launch({ plugins, prefsFile });
    await win.keyboard.press('Control+K');
    await win.locator('.PreferencesCategory[data-category="plugins"]').click();
    const row = () => win.locator(`.PreferencesPlugin[data-plugin="${SERVER}"]`);
    await row().locator('input').uncheck();
    await expect(row().locator('.PreferencesPluginState')).toHaveText('disabled (at the next start)');
    await win.locator('.iziToast.LdModalToast button').click(); // restart warning
    expect(JSON.parse(fs.readFileSync(prefsFile, 'utf8')).disabledPlugins).toEqual([SERVER]);
    await app.close();

    ({ app, win } = await launch({ plugins, prefsFile }));
    try {
      await win.keyboard.press('Control+Shift+U');
      await expect(lines(win).filter({ hasText: `Plugin ${SERVER} disabled` })).toHaveCount(1);
      await title(win, 'Plugins').click();
      await win.locator('.MenubarSubmenuEntry', { hasText: 'Demo' }).hover();
      await expect(win.locator('.MenubarSubDropdown .MenubarItemLabel')).toHaveText(['Hello from the renderer']);
      await win.keyboard.press('Escape');
      await win.keyboard.press('Escape');
      await win.keyboard.press('Control+K');
      await win.locator('.PreferencesCategory[data-category="plugins"]').click();
      await expect(row().locator('input')).not.toBeChecked();
      await expect(row().locator('.PreferencesPluginState')).toHaveText('disabled');
    } finally {
      await app.close();
    }
  });
});

test.describe('no plugin', () => {
  test('no Plugins menu and no Plugins category', async () => {
    const { app, win } = await launch(); // an empty plugins folder
    try {
      await expect(win.locator('.MenubarTitle')).toHaveText(['File', 'Edit', 'View', 'Help']);
      await win.keyboard.press('Control+K');
      await expect(win.locator('.PreferencesCategory:visible')).toHaveText(['Interface', 'System']);
      await expect(win.locator('.OutputSourcesButton')).toBeHidden();
    } finally {
      await app.close();
    }
  });
});

// End-to-end test — N0.6 bis, dependencies between plugins
// (docs/contracts/PLUGIN_DEPENDENCIES.md §9, §10). Tag @N0.6bis: filter with
// `npx playwright test --grep @N0.6bis` (roadmap lot).
// Witnesses: the three dummy plugins of plugins/, copied into a temporary folder; a cycle
// is a test fixture only.
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { test, expect } = require('@playwright/test');
const { launch, PLUGINS_DIR, tempPreferencesPath } = require('./launch.js');

const SERVER = 'LayoutDesigner.dummy-server';
const GREETER = 'LayoutDesigner.dummy-greeter';
const BLOCKED = `Cannot load '${GREETER}' because it depends on '${SERVER}', which is disabled.`;

/** The three witnesses, plus two plugins on a cycle if asked. */
function pluginsFolder({ cycle = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ld-plugins-'));
  for (const witness of ['dummy-greeter', 'dummy-renderer', 'dummy-server']) {
    fs.cpSync(path.join(PLUGINS_DIR, witness), path.join(dir, witness), { recursive: true });
  }
  if (cycle) {
    for (const [name, other] of [['cycle-a', 'cycle-b'], ['cycle-b', 'cycle-a']]) {
      fs.mkdirSync(path.join(dir, name));
      fs.writeFileSync(path.join(dir, name, 'package.json'), JSON.stringify({
        name, publisher: 'Test', version: '1.0.0', 'ld-plugin-type': 'server',
        pluginDependencies: { [`Test.${other}`]: '^1.0.0' }
      }));
      fs.writeFileSync(path.join(dir, name, 'index.js'), 'module.exports = function () {};');
    }
  }
  return dir;
}

const lines = (win) => win.locator('#panel_output .OutputLine');
const row = (win, id) => win.locator(`.PreferencesPlugin[data-plugin="${id}"]`);

async function openPluginsPreferences(win) {
  await win.keyboard.press('Control+K');
  await win.locator('.PreferencesCategory[data-category="plugins"]').click();
}

/** Bulk action (Gmail-like): select the rows, choose the action, Apply. */
async function bulk(win, ids, action) {
  for (const id of ids) await row(win, id).locator('input').check();
  await win.locator('.PreferencesPluginsAction').selectOption(action);
  await win.locator('.PreferencesPluginsApply').click();
}

test.describe('plugin dependencies @N0.6bis', () => {
  test('the dependent witness: in Plugins › Demo, it reuses dummy-server\'s exports; topological order', async () => {
    const { app, win } = await launch({ plugins: pluginsFolder() });
    try {
      await win.locator('.MenubarTitle', { hasText: 'Plugins' }).click();
      await win.locator('.MenubarSubmenuEntry', { hasText: 'Demo' }).hover();
      const sub = win.locator('.MenubarSubDropdown');
      await expect(sub.locator('.MenubarItemLabel')).toHaveText(['Hello from a dependent plugin', 'Hello from the renderer', 'Hello from the server']);
      await sub.locator('.MenubarItem', { hasText: 'Hello from a dependent plugin' }).click();
      await win.keyboard.press('Control+Shift+U');
      await expect(lines(win).filter({ hasText: /\[LayoutDesigner\.dummy-greeter\]  Hello from a plugin that depends on dummy-server \(Node\.js \d+/ })).toHaveCount(1);
      // Loaded lines: the prerequisite before its dependent, whatever the folder order.
      const loaded = await lines(win).filter({ hasText: /Plugin LayoutDesigner\.\S+ loaded/ }).allTextContents();
      expect(loaded.map((l) => /Plugin (\S+) loaded/.exec(l)?.[1])).toEqual([SERVER, GREETER, 'LayoutDesigner.dummy-renderer']);
    } finally {
      await app.close();
    }
  });

  test('Preferences › Plugins: disabling dummy-server asks about dummy-greeter; blocked at the next start', async () => {
    const plugins = pluginsFolder();
    const prefsFile = tempPreferencesPath();
    let { app, win } = await launch({ plugins, prefsFile });
    await openPluginsPreferences(win);
    await expect(win.locator('.PreferencesPluginsApply')).toBeDisabled();
    await bulk(win, [SERVER], 'disable');
    const confirm = win.locator('.LdPluginsConfirm');
    await expect(confirm).toBeVisible();
    await expect(confirm.locator('.PreferencesPluginsConfirmMessage')).toHaveText('Disabling « Dummy Server » will keep these plugins from loading:');
    await expect(confirm.locator('.PreferencesPluginsConfirmList li')).toHaveText(['Dummy Greeter']);
    const also = confirm.locator('.PreferencesPluginsConfirmAlso input');
    await expect(also).toBeChecked();
    await also.uncheck(); // this plugin only: the dependent will be blocked
    await confirm.locator('.ui-dialog-buttonpane button', { hasText: 'Apply' }).click();
    await expect(row(win, SERVER).locator('.PreferencesPluginState')).toHaveText('disabled (at the next start)');
    await expect(row(win, GREETER).locator('.PreferencesPluginState')).toHaveText('loaded');
    await win.locator('.iziToast.LdModalToast button').click(); // restart warning
    expect(JSON.parse(fs.readFileSync(prefsFile, 'utf8')).disabledPlugins).toEqual([SERVER]);
    await app.close();

    ({ app, win } = await launch({ plugins, prefsFile }));
    try {
      await expect(win.locator('.StatusBarMessage')).toHaveText(BLOCKED);
      await expect(win.locator('.StatusBarMessage')).toHaveClass(/is-warn/);
      await win.keyboard.press('Control+Shift+U');
      await expect(lines(win).filter({ hasText: BLOCKED })).toHaveClass(/is-warn/);
      await win.locator('.MenubarTitle', { hasText: 'Plugins' }).click();
      await win.locator('.MenubarSubmenuEntry', { hasText: 'Demo' }).hover();
      await expect(win.locator('.MenubarSubDropdown .MenubarItemLabel')).toHaveText(['Hello from the renderer']);
      await win.keyboard.press('Escape');
      await win.keyboard.press('Escape');
      await win.keyboard.press('Control+Shift+P');
      await win.locator('.CommandPaletteInput').fill(GREETER);
      await expect(win.locator('.CommandPaletteItem')).toHaveCount(0);
      await win.keyboard.press('Escape');

      await openPluginsPreferences(win);
      const state = row(win, GREETER).locator('.PreferencesPluginState');
      await expect(state).toHaveText('blocked');
      await expect(state).toHaveAttribute('title', BLOCKED);
      // Enabling the dependent offers its disabled prerequisite.
      await bulk(win, [GREETER], 'enable');
      const confirm = win.locator('.LdPluginsConfirm');
      await expect(confirm.locator('.PreferencesPluginsConfirmMessage')).toHaveText('These disabled plugins are needed by « Dummy Greeter »:');
      await expect(confirm.locator('.PreferencesPluginsConfirmList li')).toHaveText(['Dummy Server']);
      await confirm.locator('.ui-dialog-buttonpane button', { hasText: 'Apply' }).click();
      await expect(row(win, SERVER).locator('.PreferencesPluginState')).toHaveText('enabled (at the next start)');
      await win.locator('.iziToast.LdModalToast button').click();
      expect(JSON.parse(fs.readFileSync(prefsFile, 'utf8')).disabledPlugins).toEqual([]);
    } finally {
      await app.close();
    }
  });

  test('select all, then a partial selection: Disable with no confirmation when nobody is left blocked', async () => {
    const prefsFile = tempPreferencesPath();
    const { app, win } = await launch({ plugins: pluginsFolder(), prefsFile });
    try {
      await openPluginsPreferences(win);
      await win.locator('.PreferencesPluginsSelectAll').check();
      await expect(win.locator('.PreferencesPluginsCount')).toHaveText('3 selected');
      await win.locator(`.PreferencesPlugin[data-plugin="${SERVER}"] input`).uncheck();
      await expect(win.locator('.PreferencesPluginsSelectAll')).toHaveJSProperty('indeterminate', true);
      await win.locator('.PreferencesPluginsAction').selectOption('disable');
      await win.locator('.PreferencesPluginsApply').click(); // greeter + renderer: nobody left blocked
      await win.locator('.iziToast.LdModalToast button').click();
      expect(JSON.parse(fs.readFileSync(prefsFile, 'utf8')).disabledPlugins).toEqual([GREETER, 'LayoutDesigner.dummy-renderer']);
      await expect(win.locator('.PreferencesPluginsApply')).toBeDisabled(); // selection cleared
    } finally {
      await app.close();
    }
  });

  test('Output follows new lines by default, also after the panel was folded; scrolling up stops it', async () => {
    // Fixed at the N0.6 bis Design gate (PO, 2026-11-06): the demos' lines were hidden below.
    const { app, win } = await launch({ plugins: pluginsFolder() });
    try {
      await win.setViewportSize({ width: 1000, height: 650 });
      await win.keyboard.press('Control+Shift+U'); // the start-up lines arrived while folded
      const view = win.locator('.OutputView');
      const atBottom = () => view.evaluate((el) => el.scrollTop + el.clientHeight >= el.scrollHeight - 2);
      const run = async (id) => {
        await win.keyboard.press('Control+Shift+P');
        await win.locator('.CommandPaletteInput').fill(id);
        await win.keyboard.press('Enter');
      };
      await expect.poll(atBottom).toBe(true);
      for (const id of [`${SERVER}.hello`, `${GREETER}.hello`, 'LayoutDesigner.dummy-renderer.hello']) {
        await run(id);
        await expect.poll(atBottom).toBe(true);
      }
      await view.evaluate((el) => { el.scrollTop = 0; el.dispatchEvent(new Event('scroll')); });
      await run(`${SERVER}.hello`);
      await expect(lines(win).filter({ hasText: 'Hello from a server plugin' })).toHaveCount(2);
      expect(await atBottom()).toBe(false); // the user scrolled up: the view stays there
      await view.evaluate((el) => { el.scrollTop = el.scrollHeight; el.dispatchEvent(new Event('scroll')); });
      await run(`${GREETER}.hello`);
      await expect.poll(atBottom).toBe(true); // back at the bottom: it follows again
    } finally {
      await app.close();
    }
  });

  test('a cycle is refused with its path; the other plugins load', async () => {
    const { app, win } = await launch({ plugins: pluginsFolder({ cycle: true }) });
    try {
      await win.keyboard.press('Control+Shift+U');
      await expect(lines(win).filter({ hasText: "Cannot load 'Test.cycle-a' because of a dependency cycle: Test.cycle-a → Test.cycle-b → Test.cycle-a." })).toHaveCount(1);
      await expect(lines(win).filter({ hasText: `Plugin ${GREETER} loaded (server)` })).toHaveCount(1);
    } finally {
      await app.close();
    }
  });
});

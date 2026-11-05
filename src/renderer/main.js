// =====================================================================================
// main.js — renderer entry point (ESM)
// =====================================================================================
// Start-up order: labels (language) → vizjets' HTML → Actions → GUI components.
// Actions (docs/contracts/ACTION_COMMAND.md §10, §13):
//   - view.commandPalette  client  Ctrl+Shift+P (as in VS Code)
//   - file.quit            alias   Ctrl+Q (as in Illustrator) → Command app.quit
//   - view.toggleTheme     client  light ↔ dark, remembered in the preferences (N0.5)
//   - view.toggleDevTools  alias   Ctrl+Shift+I → Command dev.toggleDevTools
//   - edit.choosePreferences client Ctrl+K (as Illustrator) — the Preferences dialog (N0.5)
//   - preferences.chooseLanguage client  the Preferences dialog, on the language
//   - help.about           client  F1 — opens the About dialog
//   - view.togglePanel     client  Ctrl+J — folds / unfolds the bottom panel (N0.5)
//   - view.showOutput      client  Ctrl+Shift+U — unfolds the panel on Output
//   - view.showDebugConsole client Ctrl+Shift+Y — … on Debug Console
//   - view.showTerminal    client  Ctrl+Shift+T — … on Terminal (PO: same key everywhere)
// Each Action has a category (its menu); the palette shows "Category: Label". Action ids
// are prefixed by that category (ACTION_COMMAND.md §13.9); Command ids are not.
// Plugins (N0.6, PLUGIN_API.md §3): loaded after the core Actions and before the menu
// bar, toolbar and shortcuts, which read the registry; then the Plugins menu.
// =====================================================================================

import { ActionRegistry } from './action_registry.js';
import { installShortcuts } from './shortcuts.js';
import { createCommandPalette, PALETTE_ACTION_ID } from './command_palette.js';
import { pickLanguage, loadLabels, createTranslator, localizeTree, format } from './i18n.js';
import { applyTheme, currentTheme, nextTheme } from './theme.js';
import { loadVizjets } from './vizjet_loader.js';
import { createMenubar } from '../vizjets/menubar/menubar.js';
import { createToolbar } from '../vizjets/main_toolbar/main_toolbar.js';
import { createStatusBar } from '../vizjets/status_bar/status_bar.js';
import { createAboutDialog } from '../vizjets/about_dialog/about_dialog.js';
import { createPreferencesDialog } from '../vizjets/preferences_dialog/preferences_dialog.js';
import { createBottomPanel } from '../vizjets/bottom_panel/bottom_panel.js';
import { output } from './output_sources.js';
import { createOutputView } from './output_view.js';
import { log } from './journal.js';
import { createDebugConsole } from './debug_console.js';
import { createTerminalView } from './terminal_view.js';
import { createToaster } from './toast.js';
import { loadPlugins } from './plugin_loader.js';
import { pluginsMenuModel, insertPluginsMenu } from './plugins_menu.js';

/** @typedef {import('../types/contracts').Action} Action */

/**
 * The element of index.html with that id — its absence is a defect of the page.
 * @param {string} id
 * @returns {HTMLElement}
 */
const byId = (id) => {
  const el = document.getElementById(id);
  if (el === null) throw new Error(`index.html: missing element '#${id}'`);
  return el;
};

/**
 * Start-up reads one Command directly (no UI trigger involved — contract §13.8).
 * @param {string} id
 * @param {unknown} [args]
 * @returns {Promise<unknown>}
 */
async function command(id, args) {
  const reply = await window.ld.invokeCommand(id, args);
  if (!reply.ok) throw new Error(reply.error.message);
  return reply.value;
}

// ---- language and labels
const { locale, languages } = /** @type {{ locale: string, languages: import('../types/contracts').LanguageInfo[] }} */ (
  await command('i18n.startupInfo')
);
const lang = pickLanguage(locale, languages.map((l) => l.code));
const { labels, englishLabels } = await loadLabels(lang);
const t = createTranslator(labels, englishLabels);
document.documentElement.lang = lang;
log('info', `Labels loaded: ${lang}`);

// ---- vizjets
await loadVizjets(document);
localizeTree(document.body, t);
// The remembered theme — dark by default (preferences.default.json).
applyTheme(document, /** @type {{ theme: string }} */ (await command('prefs.info')).theme);

// ---- Actions
const actions = new ActionRegistry({
  invokeCommand: (id, args) => window.ld.invokeCommand(id, args)
});
/** @param {Action} action */
const labelOf = (action) => t(action.labelKey, action.label);
/** @param {Action} action */
const paletteLabelOf = (action) =>
  action.categoryKey === undefined
    ? labelOf(action)
    : format(t('Palette/Entry', '{category}: {label}'), { category: t(action.categoryKey), label: labelOf(action) });

const statusBar = createStatusBar(byId('status_bar'));
actions.onFailure((message) => statusBar.showError(message));

const palette = createCommandPalette(actions, document, {
  labelOf: paletteLabelOf,
  locale: lang,
  noPreselect: ['file.quit'],
  ariaLabel: t('Aria/CommandPalette'),
  placeholder: t('Toolbar/SearchCommands'),
  anchor: () => document.querySelector('.CommandCenter')
});
const { version } = await (await fetch('../package.json')).json();
const aboutDialog = createAboutDialog(byId('about_dialog'), { t, version });
const toaster = createToaster();

// ---- Preferences (docs/contracts/PREFERENCES.md): one dialog, changes applied at once.
/**
 * @typedef {{ file: string, status: 'ok' | 'missing' | 'invalid', language: string | null, theme: string,
 *             disabledPlugins: string[] }} PrefsInfo
 */
/** Applies a theme at once and remembers it (no restart). @param {string} theme */
async function setTheme(theme) {
  applyTheme(document, theme);
  await command('prefs.setTheme', { theme });
}
const prefsInfo = async () => /** @type {PrefsInfo} */ (await command('prefs.info'));
const restartWarning = () =>
  toaster.modalWarning(t('Language/RestartTitle'), t('Language/RestartMessage'), t('Dialog/OK', 'OK'));
/** Resets with no confirmation; shows the restart warning when the language changed. */
async function resetPreferences() {
  const before = await prefsInfo();
  const state = /** @type {{ language: string | null, theme: string, disabledPlugins: string[] }} */ (await command('prefs.reset'));
  applyTheme(document, state.theme); // at once; the language and the plugins need a restart
  if (state.language !== before.language || String(state.disabledPlugins) !== String(before.disabledPlugins)) await restartWarning();
  return state;
}
const preferencesDialog = createPreferencesDialog(byId('preferences_dialog'), {
  t,
  onLanguage: async (language) => {
    await command('prefs.setLanguage', { language });
    await restartWarning();
  },
  onTheme: setTheme,
  onReset: async () => {
    const answer = await toaster.modalChoice(t('Preferences/ResetTitle', 'Reset preferences'),
      t('Preferences/ResetMessage', 'Reset all preferences to their defaults?'), [
        { label: t('Dialog/OK', 'OK'), value: 'ok' },
        { label: t('Dialog/Cancel', 'Cancel'), value: 'cancel', primary: false }
      ]);
    return answer === 'ok' ? resetPreferences() : null;
  },
  // A change applies at the next start (PLUGIN_API.md §15), as the language.
  onPluginEnabled: async (id, enabled) => {
    await command('prefs.setPluginEnabled', { id, enabled });
    await toaster.modalWarning(t('Language/RestartTitle'), t('Plugin/RestartMessage'), t('Dialog/OK', 'OK'));
  }
});
/** @typedef {import('../vizjets/preferences_dialog/preferences_dialog.js').PluginRow} PluginRow */
/** @type {Map<string, { state: 'loaded' | 'failed', reason?: string }>} */
let pluginOutcome = new Map();
/** Each plugin, its state at this start and whether it is enabled for the next one. */
async function pluginRows() {
  const listed = /** @type {Array<Omit<PluginRow, 'enabled' | 'state'> & { state: string }>} */ (await command('plugins.list'));
  const { disabledPlugins } = await prefsInfo();
  return listed.map((p) => {
    const done = pluginOutcome.get(p.id);
    // A plugin main left pending is a renderer plugin; the renderer says how it went.
    const state = /** @type {PluginRow['state']} */ (done?.state === 'failed' ? 'failed' : p.state === 'pending' ? done?.state ?? 'failed' : p.state);
    return { ...p, state, reason: done?.reason ?? p.reason, enabled: !disabledPlugins.includes(p.id) };
  });
}
/** @param {{ category?: 'interface' | 'plugins' | 'system', focusLanguage?: boolean }} [options] */
async function openPreferences(options) {
  const { file, language } = await prefsInfo();
  preferencesDialog.open({ languages, language, theme: currentTheme(document), file, plugins: await pluginRows() }, options);
}
const bottomPanel = createBottomPanel(byId('bottom_panel'), { workspace: byId('workspace') });
createOutputView(bottomPanel.view('output'), output, {
  tools: bottomPanel.tools('output'),
  summaryOf: (checked, total) => format(t('Output/Sources', '{checked} / {total} sources'), { checked: String(checked), total: String(total) })
});
// Main-side lines (start-up, preferences…): those written so far, then every new one.
await window.ld.onOutput((line) => output.add(line));
const debugConsole = createDebugConsole(bottomPanel.view('debugConsole'), {
  actions,
  paletteLabelOf,
  locale: lang,
  t,
  invokeCommand: (id, args) => window.ld.invokeCommand(id, args),
  appFolder: /** @type {string} */ (await command('fs.appFolder'))
});
const terminalView = createTerminalView(bottomPanel.view('terminal'), { pty: window.ld.pty });
bottomPanel.onShow((tab) => {
  if (tab === 'debugConsole') debugConsole.focus();
  if (tab === 'terminal') terminalView.show();
});

actions.register({
  id: PALETTE_ACTION_ID,
  label: 'Command Palette',
  labelKey: 'View/CommandPalette',
  categoryKey: 'View',
  shortcut: 'Ctrl+Shift+P',
  run: async () => palette.toggle()
});
actions.register({
  id: 'file.quit',
  label: 'Quit',
  labelKey: 'File/Quit',
  categoryKey: 'File',
  shortcut: 'Ctrl+Q',
  command: 'app.quit'
});
actions.register({
  id: 'view.toggleTheme',
  label: 'Light / Dark Theme',
  labelKey: 'View/ToggleTheme',
  categoryKey: 'View',
  run: async () => setTheme(nextTheme(currentTheme(document)))
});
actions.register({
  id: 'view.toggleDevTools',
  label: 'Show / Hide Developer Tools',
  labelKey: 'View/ToggleDevTools',
  categoryKey: 'View',
  shortcut: 'Ctrl+Shift+I',
  command: 'dev.toggleDevTools'
});
actions.register({
  id: 'preferences.chooseLanguage',
  label: 'Choose Language…',
  labelKey: 'Language/Choose',
  categoryKey: 'Preferences',
  // As VS Code's « Configure Display Language »: the Preferences dialog, on the language.
  run: async () => openPreferences({ category: 'interface', focusLanguage: true })
});
actions.register({
  id: 'edit.choosePreferences',
  label: 'Preferences…',
  labelKey: 'Edit/Preferences',
  categoryKey: 'Edit',
  shortcut: 'Ctrl+K',
  run: async () => openPreferences({ category: 'interface' })
});
actions.register({
  id: 'help.about',
  label: 'About Layout Designer…',
  labelKey: 'Help/About',
  categoryKey: 'Help',
  shortcut: 'F1',
  run: async () => aboutDialog.open()
});

// Bottom panel (docs/contracts/OUTPUT_PANEL.md §8): VS Code names and keys, except the
// Terminal — Ctrl+Shift+T, the same on every keyboard (PO decision, AZERTY).
actions.register({
  id: 'view.togglePanel',
  label: 'Show / Hide Panel',
  labelKey: 'View/TogglePanel',
  categoryKey: 'View',
  shortcut: 'Ctrl+J',
  run: async () => bottomPanel.toggle()
});
for (const [tab, name, shortcut] of [
  ['output', 'Output', 'Ctrl+Shift+U'],
  ['debugConsole', 'DebugConsole', 'Ctrl+Shift+Y'],
  ['terminal', 'Terminal', 'Ctrl+Shift+T']
]) {
  actions.register({
    id: `view.show${name}`,
    label: name === 'DebugConsole' ? 'Debug Console' : name,
    labelKey: `View/Show${name}`,
    categoryKey: 'View',
    shortcut,
    run: async () => bottomPanel.show(tab)
  });
}

// Debug Console (OUTPUT_PANEL.md §5): its short words are Actions of the category
// « Debug Console », listed in the palette too (PO decision 2026-11-04). Run from the
// palette, they show the Debug Console to print their result there.
/** @type {Array<[string, string, string, (args?: unknown) => unknown]>} */
const debugConsoleActions = [
  ['showHelp', 'Help', 'Help', () => debugConsole.showHelp()],
  ['clear', 'Clear', 'Clear', () => debugConsole.clear()],
  ['showFolder', 'ShowFolder', 'Show Folder', () => debugConsole.showFolder()],
  ['listFolder', 'ListFolder', 'List Folder', (args) => debugConsole.listFolder(args)],
  ['setFolder', 'SetFolder', 'Change Folder', (args) => debugConsole.setFolder(args)]
];
for (const [name, key, label, work] of debugConsoleActions) {
  actions.register({
    id: `debugConsole.${name}`,
    label,
    labelKey: `DebugConsole/${key}`,
    categoryKey: 'DebugConsole',
    run: async (args) => {
      bottomPanel.show('debugConsole');
      return work(args);
    }
  });
}

// ---- Plugins (PLUGIN_API.md §3, §7, §8): a faulty plugin never stops the start-up.
pluginOutcome = await loadPlugins(
  /** @type {import('./plugin_loader.js').PluginsStartupInfo} */ (await command('plugins.startupInfo')),
  { actions, output, log, onFailure: (message) => statusBar.showError(message) }
);
const pluginIds = /** @type {{ id: string }[]} */ (await command('plugins.list')).map((p) => p.id);
const pluginActions = actions.list().filter((a) => pluginIds.some((id) => a.id.startsWith(`${id}.`)));
insertPluginsMenu(/** @type {HTMLElement} */ (byId('menubar').querySelector('.Menubar')),
  pluginsMenuModel(pluginActions, labelOf, lang), t('Plugins'));

// ---- GUI components
createMenubar(byId('menubar'), { actions, labelOf });
createToolbar(byId('main_toolbar'), { actions, labelOf });
installShortcuts(actions, window);
log('info', `${actions.list().length} Actions registered`);

// An invalid preferences file: say so, and offer the reset (PREFERENCES.md §3 bis).
if ((await prefsInfo()).status === 'invalid') {
  toaster
    .modalChoice(t('Preferences/InvalidTitle', 'Invalid preferences'),
      t('Preferences/InvalidMessage', 'The preferences file cannot be read; the defaults are used.'), [
        { label: t('Dialog/Reset', 'Reset'), value: 'reset' },
        { label: t('Dialog/Ignore', 'Ignore'), value: 'ignore', primary: false }
      ], { icon: 'error' }) // an error, not a warning (PO, 2026-11-04)
    .then(async (answer) => {
      if (answer === 'reset') await resetPreferences();
      else log('info', 'Invalid preferences ignored; the warning comes back at the next launch');
    });
}

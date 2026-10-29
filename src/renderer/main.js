// =====================================================================================
// main.js — renderer entry point (ESM)
// =====================================================================================
// Start-up order: labels (language) → vizjets' HTML → Actions → GUI components.
// Actions (docs/contracts/ACTION_COMMAND.md §10, §13):
//   - view.commandPalette  client  Ctrl+Shift+P (as in VS Code)
//   - app.quit             alias   Ctrl+Q (as in Illustrator)
//   - view.toggleTheme     client  light ↔ dark
//   - dev.toggleDevTools   alias   Ctrl+Shift+I
//   - prefs.chooseLanguage client  language dialog → Command prefs.setLanguage → toast
//   - help.about           client  F1 — opens the About dialog
// Each Action has a category (its menu); the palette shows "Category: Label".
// =====================================================================================

import { ActionRegistry } from './action_registry.js';
import { installShortcuts } from './shortcuts.js';
import { createCommandPalette, PALETTE_ACTION_ID } from './command_palette.js';
import { pickLanguage, loadLabels, createTranslator, localizeTree, format } from './i18n.js';
import { applyTheme, currentTheme, nextTheme, DEFAULT_THEME } from './theme.js';
import { loadVizjets } from './vizjet_loader.js';
import { createMenubar } from '../vizjets/menubar/menubar.js';
import { createToolbar } from '../vizjets/main_toolbar/main_toolbar.js';
import { createStatusBar } from '../vizjets/status_bar/status_bar.js';
import { createAboutDialog } from '../vizjets/about_dialog/about_dialog.js';
import { createLanguageDialog } from '../vizjets/language_dialog/language_dialog.js';
import { createToaster } from './toast.js';

const byId = (id) => document.getElementById(id);

// Start-up reads one Command directly (no UI trigger involved — contract §13.8).
async function command(id, args) {
  const reply = await window.ld.invokeCommand(id, args);
  if (!reply.ok) throw new Error(reply.error.message);
  return reply.value;
}

// ---- language and labels
const { locale, languages } = await command('i18n.startupInfo');
const lang = pickLanguage(locale, languages.map((l) => l.code));
const { labels, englishLabels } = await loadLabels(lang);
const t = createTranslator(labels, englishLabels);
document.documentElement.lang = lang;

// ---- vizjets
await loadVizjets(document);
localizeTree(document.body, t);
applyTheme(document, DEFAULT_THEME);

// ---- Actions
const actions = new ActionRegistry({
  invokeCommand: (id, args) => window.ld.invokeCommand(id, args)
});
const labelOf = (action) => t(action.labelKey, action.label);
const paletteLabelOf = (action) =>
  action.categoryKey === undefined
    ? labelOf(action)
    : format(t('Palette/Entry', '{category}: {label}'), { category: t(action.categoryKey), label: labelOf(action) });

const statusBar = createStatusBar(byId('status_bar'));
actions.onFailure((message) => statusBar.showError(message));

const palette = createCommandPalette(actions, document, {
  labelOf: paletteLabelOf,
  ariaLabel: t('Aria/CommandPalette'),
  placeholder: t('Toolbar/SearchActions'),
  anchor: () => document.querySelector('.CommandCenter')
});
const { version } = await (await fetch('../package.json')).json();
const aboutDialog = createAboutDialog(byId('about_dialog'), { t, version });
const languageDialog = createLanguageDialog(byId('language_dialog'), { t });
const toaster = createToaster();

actions.register({
  id: PALETTE_ACTION_ID,
  label: 'Command Palette',
  labelKey: 'View/CommandPalette',
  categoryKey: 'View',
  shortcut: 'Ctrl+Shift+P',
  run: async () => palette.toggle()
});
actions.register({
  id: 'app.quit',
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
  run: async () => applyTheme(document, nextTheme(currentTheme(document)))
});
actions.register({
  id: 'dev.toggleDevTools',
  label: 'Show / Hide Developer Tools',
  labelKey: 'View/ToggleDevTools',
  categoryKey: 'View',
  shortcut: 'Ctrl+Shift+I',
  command: 'dev.toggleDevTools'
});
actions.register({
  id: 'prefs.chooseLanguage',
  label: 'Choose Language…',
  labelKey: 'Language/Choose',
  categoryKey: 'Preferences',
  // Saved in the preferences; the new language applies at the next start.
  run: async () => {
    const choice = await languageDialog.choose(languages, lang);
    if (choice === null) return;
    await command('prefs.setLanguage', { language: choice });
    if (choice !== lang) toaster.warning(t('Language/RestartTitle'), t('Language/RestartMessage'));
  }
});
actions.register({
  id: 'help.about',
  label: 'About Layout Designer…',
  labelKey: 'Help/About',
  categoryKey: 'Help',
  shortcut: 'F1',
  run: async () => aboutDialog.open()
});

// ---- GUI components
createMenubar(byId('menubar'), { actions, labelOf });
createToolbar(byId('main_toolbar'), { actions, labelOf });
installShortcuts(actions, window);

// =====================================================================================
// main.js — renderer entry point (ESM)
// =====================================================================================
// Start-up order: labels (language) → vizjets' HTML → Actions → GUI components.
// Actions (docs/contracts/ACTION_COMMAND.md §10, §13):
//   - view.commandPalette  client  Ctrl+Shift+P (as in VS Code)
//   - app.quit             alias   Ctrl+Q (as in Illustrator)
//   - view.toggleTheme     client  light ↔ dark
//   - dev.toggleDevTools   alias   Ctrl+Shift+I
//   - help.about           client  opens the About dialog
// =====================================================================================

import { ActionRegistry } from './action_registry.js';
import { installShortcuts } from './shortcuts.js';
import { createCommandPalette, PALETTE_ACTION_ID } from './command_palette.js';
import { pickLanguage, loadLabels, createTranslator, localizeTree } from './i18n.js';
import { applyTheme, currentTheme, nextTheme, DEFAULT_THEME } from './theme.js';
import { loadVizjets } from './vizjet_loader.js';
import { createMenubar } from '../vizjets/menubar/menubar.js';
import { createToolbar } from '../vizjets/main_toolbar/main_toolbar.js';
import { createStatusBar } from '../vizjets/status_bar/status_bar.js';
import { createAboutDialog } from '../vizjets/about_dialog/about_dialog.js';

const byId = (id) => document.getElementById(id);

// ---- language and labels
const lang = pickLanguage(navigator.language);
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

const statusBar = createStatusBar(byId('status_bar'));
actions.onFailure((message) => statusBar.showError(message));

const palette = createCommandPalette(actions, document, { labelOf, ariaLabel: t('Aria/CommandPalette') });
const { version } = await (await fetch('../package.json')).json();
const aboutDialog = createAboutDialog(byId('about_dialog'), { t, version });

actions.register({
  id: PALETTE_ACTION_ID,
  label: 'Command Palette',
  labelKey: 'View/CommandPalette',
  shortcut: 'Ctrl+Shift+P',
  run: async () => palette.toggle()
});
actions.register({
  id: 'app.quit',
  label: 'Quit',
  labelKey: 'File/Quit',
  shortcut: 'Ctrl+Q',
  command: 'app.quit'
});
actions.register({
  id: 'view.toggleTheme',
  label: 'Light / Dark Theme',
  labelKey: 'View/ToggleTheme',
  run: async () => applyTheme(document, nextTheme(currentTheme(document)))
});
actions.register({
  id: 'dev.toggleDevTools',
  label: 'Show / Hide Developer Tools',
  labelKey: 'View/ToggleDevTools',
  shortcut: 'Ctrl+Shift+I',
  command: 'dev.toggleDevTools'
});
actions.register({
  id: 'help.about',
  label: 'About Layout Designer…',
  labelKey: 'Help/About',
  run: async () => aboutDialog.open()
});

// ---- GUI components
createMenubar(byId('menubar'), { actions, labelOf });
createToolbar(byId('main_toolbar'), { actions, labelOf });
installShortcuts(actions, window);

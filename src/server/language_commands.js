// =====================================================================================
// language_commands.js — interface language Commands (Electron main, CJS)
// =====================================================================================
// Languages = the label files present in src/i18n (LD_Labels_<xx>.json); each file
// names itself with its "Language/Name" key ("English", "Français").
// Language at start-up, first found: --lang switch (used by the tests) → preferences
// file → system locale. A change is saved in the preferences and applies at restart.
//   - i18n.startupInfo   → { locale, languages: [{ code, name }] }  (read at start-up)
//   - prefs.setLanguage  ({ language }) → saves it; unknown language → error
// =====================================================================================
'use strict';

const fs = require('fs');
const path = require('path');
const { preferencesPath, readPreferences, writePreferences } = require('./preferences.js');

const I18N_DIR = path.join(__dirname, '..', 'i18n');
const LABEL_FILE = /^LD_Labels_([a-z]{2,3})\.json$/;

// [{ code, name }] sorted by code.
function listLanguages(dir = I18N_DIR) {
  return fs
    .readdirSync(dir)
    .map((file) => LABEL_FILE.exec(file))
    .filter(Boolean)
    .map(([file, code]) => {
      const labels = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      return { code, name: labels['Language/Name'] || code };
    })
    .sort((a, b) => a.code.localeCompare(b.code));
}

// Pure: the locale to start with.
function resolveStartupLocale({ switchLang, preferred, systemLocale }) {
  return switchLang || preferred || systemLocale || '';
}

function registerLanguageCommands(registry, { i18nDir = I18N_DIR, prefsFile = preferencesPath() } = {}) {
  registry.register({
    id: 'i18n.startupInfo',
    run: async (_args, context) => ({
      locale: resolveStartupLocale({
        switchLang: context.app.commandLine.getSwitchValue('lang'),
        preferred: readPreferences(prefsFile).language,
        systemLocale: context.app.getLocale()
      }),
      languages: listLanguages(i18nDir)
    })
  });

  registry.register({
    id: 'prefs.setLanguage',
    run: async (args) => {
      const language = args && args.language;
      if (!listLanguages(i18nDir).some((l) => l.code === language)) {
        throw new Error(`Unknown language '${language}'`);
      }
      const prefs = readPreferences(prefsFile);
      prefs.language = language;
      writePreferences(prefsFile, prefs);
      return { language };
    }
  });
}

module.exports = { I18N_DIR, listLanguages, resolveStartupLocale, registerLanguageCommands };

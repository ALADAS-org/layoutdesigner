// =====================================================================================
// preferences_commands.js — Preferences dialog Commands (Electron main, CJS) — N0.5
// =====================================================================================
// Contract: docs/contracts/PREFERENCES.md §1, §3, §3 bis.
//   - prefs.info   → { file, status: 'ok' | 'missing' | 'invalid', language, theme }
//                    (start-up warning for an invalid file; the dialog's System page)
//   - prefs.reset  → { backup, language, theme } — <file>.bak kept, then the defaults;
//                    an `info` line in Output says where the copy is
//   - prefs.setTheme ({ theme: 'light' | 'dark' }) → saves it (applied at once by the
//                    renderer; no restart)
// The language itself is set by prefs.setLanguage (language_commands.js).
// =====================================================================================
'use strict';

const {
  preferencesPath, inspectPreferences, readPreferences, writePreferences, resetPreferences, themeOf, THEMES, DEFAULTS_PATH
} = require('./preferences.js');
const { log } = require('./journal.js');

/**
 * @param {InstanceType<typeof import('./command_registry.js').CommandRegistry>} registry
 * @param {{ prefsFile?: string, defaultsFile?: string }} [options]
 */
function registerPreferencesCommands(registry, { prefsFile = preferencesPath(), defaultsFile = DEFAULTS_PATH } = {}) {
  registry.register({
    id: 'prefs.info',
    run: async () => {
      const { status, prefs } = inspectPreferences(prefsFile);
      return { file: prefsFile, status, language: typeof prefs.language === 'string' ? prefs.language : null, theme: themeOf(prefs) };
    }
  });

  registry.register({
    id: 'prefs.reset',
    run: async () => {
      const { backup, prefs } = resetPreferences(prefsFile, defaultsFile);
      log('info', backup === null
        ? `Preferences reset to the defaults: ${prefsFile}`
        : `Preferences reset to the defaults; previous file kept as ${backup}`);
      return { backup, language: typeof prefs.language === 'string' ? prefs.language : null, theme: themeOf(prefs) };
    }
  });

  registry.register({
    id: 'prefs.setTheme',
    run: async (args) => {
      const theme = /** @type {{ theme?: unknown } | undefined} */ (args)?.theme;
      if (typeof theme !== 'string' || !THEMES.includes(theme)) throw new Error(`Unknown theme '${theme}'`);
      const prefs = readPreferences(prefsFile);
      prefs.theme = theme;
      writePreferences(prefsFile, prefs);
      return { theme };
    }
  });
}

module.exports = { registerPreferencesCommands };

// =====================================================================================
// preferences_commands.js — Preferences dialog Commands (Electron main, CJS) — N0.5
// =====================================================================================
// Contract: docs/contracts/PREFERENCES.md §1, §3, §3 bis.
//   - prefs.info   → { file, status: 'ok' | 'missing' | 'invalid', language }
//                    (start-up warning for an invalid file; the dialog's System page)
//   - prefs.reset  → { backup, language } — <file>.bak kept, then the defaults; an
//                    `info` line in Output says where the copy is
// The language itself is set by prefs.setLanguage (language_commands.js).
// =====================================================================================
'use strict';

const { preferencesPath, inspectPreferences, resetPreferences, DEFAULTS_PATH } = require('./preferences.js');
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
      return { file: prefsFile, status, language: typeof prefs.language === 'string' ? prefs.language : null };
    }
  });

  registry.register({
    id: 'prefs.reset',
    run: async () => {
      const { backup, prefs } = resetPreferences(prefsFile, defaultsFile);
      log('info', backup === null
        ? `Preferences reset to the defaults: ${prefsFile}`
        : `Preferences reset to the defaults; previous file kept as ${backup}`);
      return { backup, language: typeof prefs.language === 'string' ? prefs.language : null };
    }
  });
}

module.exports = { registerPreferencesCommands };

// =====================================================================================
// preferences_commands.js — Preferences dialog Commands (Electron main, CJS) — N0.5
// =====================================================================================
// Contract: docs/contracts/PREFERENCES.md §1, §3, §3 bis.
//   - prefs.info   → { file, status: 'ok' | 'missing' | 'invalid', language, theme,
//                      disabledPlugins }
//                    (start-up warning for an invalid file; the dialog's System page)
//   - prefs.reset  → { backup, language, theme, disabledPlugins } — <file>.bak kept, then the defaults;
//                    an `info` line in Output says where the copy is
//   - prefs.setTheme ({ theme: 'light' | 'dark' }) → saves it (applied at once by the
//                    renderer; no restart)
//   - prefs.setPluginEnabled ({ id, enabled }) → updates `disabledPlugins` (N0.6,
//                    PLUGIN_API.md §15; applied at the next start)
// The language itself is set by prefs.setLanguage (language_commands.js).
// =====================================================================================
'use strict';

const {
  preferencesPath, inspectPreferences, readPreferences, writePreferences, resetPreferences, themeOf, THEMES, DEFAULTS_PATH
} = require('./preferences.js');
const { log } = require('./journal.js');

/** Pure: the disabled plugins a preferences object lists. @param {import('./preferences.js').Preferences} prefs */
const disabledPluginsOf = (prefs) =>
  Array.isArray(prefs.disabledPlugins) ? prefs.disabledPlugins.filter((d) => typeof d === 'string') : [];

/**
 * @param {InstanceType<typeof import('./command_registry.js').CommandRegistry>} registry
 * @param {{ prefsFile?: string, defaultsFile?: string }} [options]
 */
function registerPreferencesCommands(registry, { prefsFile = preferencesPath(), defaultsFile = DEFAULTS_PATH } = {}) {
  registry.register({
    id: 'prefs.info',
    run: async () => {
      const { status, prefs } = inspectPreferences(prefsFile);
      return {
        file: prefsFile,
        status,
        language: typeof prefs.language === 'string' ? prefs.language : null,
        theme: themeOf(prefs),
        disabledPlugins: disabledPluginsOf(prefs)
      };
    }
  });

  registry.register({
    id: 'prefs.reset',
    run: async () => {
      const { backup, prefs } = resetPreferences(prefsFile, defaultsFile);
      log('info', backup === null
        ? `Preferences reset to the defaults: ${prefsFile}`
        : `Preferences reset to the defaults; previous file kept as ${backup}`);
      return {
        backup,
        language: typeof prefs.language === 'string' ? prefs.language : null,
        theme: themeOf(prefs),
        disabledPlugins: disabledPluginsOf(prefs)
      };
    }
  });

  registry.register({
    id: 'prefs.setPluginEnabled',
    run: async (args) => {
      const { id, enabled } = /** @type {{ id?: unknown, enabled?: unknown }} */ (args ?? {});
      if (typeof id !== 'string' || id === '' || typeof enabled !== 'boolean') {
        throw new Error("prefs.setPluginEnabled needs { id: string, enabled: boolean }");
      }
      const prefs = readPreferences(prefsFile);
      const list = disabledPluginsOf(prefs);
      prefs.disabledPlugins = enabled ? list.filter((d) => d !== id) : [...new Set([...list, id])].sort();
      writePreferences(prefsFile, prefs);
      return { disabledPlugins: prefs.disabledPlugins };
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

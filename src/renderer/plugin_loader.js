// =====================================================================================
// plugin_loader.js — plugins in the renderer (ESM) — N0.6
// =====================================================================================
// Contract: docs/contracts/PLUGIN_API.md §3, §6, §7.
// At start-up, after the core Actions and before the menu bar, toolbar and shortcuts:
//   1. the alias Actions declared by the server plugins are registered (per plugin);
//   2. each renderer plugin is imported from plugin://app/<folder>/<file> and its
//      `init(api)` called; its Actions are staged, then registered all or nothing.
// A failing plugin leaves no Action behind; it is reported in the status bar and in
// Output (`error` line); the core and the other plugins load normally.
// =====================================================================================

/** @typedef {import('../types/contracts').ActionDescriptor} ActionDescriptor */
/** @typedef {import('../types/contracts').RendererPluginApi} RendererPluginApi */
/** @typedef {import('../types/contracts').LogLevel} LogLevel */
/**
 * @typedef {{ serverActions: { plugin: string, descriptor: ActionDescriptor }[],
 *             rendererPlugins: { plugin: string, url: string }[],
 *             failures: { plugin: string, message: string }[] }} PluginsStartupInfo
 */

/** Palette category of plugin Actions that name none (§8.2). */
export const PLUGIN_CATEGORY = 'Plugins';

/** Pure: is `id` a valid id for this plugin (`<plugin id>.<name>`)? @param {string} pluginId @param {unknown} id */
export function ownsId(pluginId, id) {
  return typeof id === 'string' && id.startsWith(`${pluginId}.`) && /^[A-Za-z][\w-]*$/.test(id.slice(pluginId.length + 1));
}

/** Pure: the reason of a failure, as a short text. @param {unknown} err */
const reasonOf = (err) => (err instanceof Error ? err.message : String(err));

/**
 * @param {PluginsStartupInfo} info
 * @param {{ actions: import('./action_registry.js').ActionRegistry,
 *           output: ReturnType<typeof import('./output_sources.js').createOutput>,
 *           log: (level: LogLevel, message: unknown) => void,
 *           onFailure: (message: string) => void,
 *           importModule?: (url: string) => Promise<Record<string, unknown>> }} deps
 * @returns {Promise<Map<string, { state: 'loaded' | 'failed', reason?: string }>>} the
 *          outcome of each plugin handled here (renderer plugins, and server plugins whose
 *          Actions were refused)
 */
export async function loadPlugins(info, { actions, output, log, onFailure, importModule = (url) => import(url) }) {
  /** @type {Map<string, { state: 'loaded' | 'failed', reason?: string }>} */
  const outcome = new Map();
  /** @param {string} plugin @param {string} reason @param {boolean} [logged] main already wrote the line */
  const fail = (plugin, reason, logged = false) => {
    const message = `Plugin '${plugin}' not loaded: ${reason}`;
    if (!logged) log('error', message);
    onFailure(message);
    outcome.set(plugin, { state: 'failed', reason });
  };

  for (const { plugin, message } of info.failures) fail(plugin, message, true);

  // 1. Server plugins' alias Actions, grouped by plugin (all or nothing each).
  /** @type {Map<string, ActionDescriptor[]>} */
  const byPlugin = new Map();
  for (const { plugin, descriptor } of info.serverActions) {
    byPlugin.set(plugin, [...(byPlugin.get(plugin) ?? []), descriptor]);
  }
  for (const [plugin, descriptors] of byPlugin) {
    try {
      actions.registerAll(descriptors);
    } catch (err) {
      fail(plugin, reasonOf(err));
    }
  }

  // 2. Renderer plugins, in the order main discovered them.
  for (const { plugin, url } of info.rendererPlugins) {
    /** @type {ActionDescriptor[]} */
    const staged = [];
    const source = output.source(plugin);
    /** @type {RendererPluginApi} */
    const api = {
      pluginId: plugin,
      registerAction(descriptor) {
        if (!ownsId(plugin, descriptor?.id)) throw new Error(`Action id '${descriptor?.id}' must start with '${plugin}.'`);
        staged.push({ categoryKey: PLUGIN_CATEGORY, ...descriptor });
      },
      output: { append: (level, message) => source.append(level, message) },
      log: (...args) => console.log(`[plugin:${plugin}]`, ...args),
      warn: (...args) => console.warn(`[plugin:${plugin}]`, ...args)
    };
    try {
      const module = await importModule(url);
      if (typeof module.init !== 'function') throw new Error('its module must export a function init(api)');
      await module.init(api);
      actions.registerAll(staged);
      outcome.set(plugin, { state: 'loaded' });
      log('info', `Plugin ${plugin} loaded (renderer)`);
    } catch (err) {
      fail(plugin, reasonOf(err));
    }
  }
  return outcome;
}

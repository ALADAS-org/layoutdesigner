// =====================================================================================
// plugin_manager.js — discovery and loading of plugins (Electron main, CJS) — N0.6
// =====================================================================================
// Contract: docs/contracts/PLUGIN_API.md (validated 2026-11-05).
// - Each sub-folder of the plugins folder holding a package.json is a plugin; they are
//   discovered once, at start-up, in alphabetical order of folder name.
// - A plugin is identified by `<publisher>.<name>` (as VS Code); `displayName` is shown.
// - `ld-plugin-type`: `server` (CJS, in main, entry `main`) or `renderer` (ESM, in the
//   renderer, entry `renderer-main`); `both` is anticipated, not supported.
// - Tags: the standard `keywords` field. Disabled plugins (preferences) are not loaded.
// - A faulty plugin never breaks the application: it is rejected, all or nothing.
// No Electron import here, so it is unit-testable without Electron.
// =====================================================================================
'use strict';

const fs = require('fs');
const path = require('path');

const PLUGINS_DIR = path.join(__dirname, '..', '..', 'plugins');
const KINDS = ['server', 'renderer'];
const NAME = /^[a-z][a-z0-9-]*$/;
const PUBLISHER = /^[A-Za-z][A-Za-z0-9-]*$/;
const PLUGIN_CATEGORY = 'Plugins'; // palette category of plugin Actions without one (§8.2)

/**
 * @typedef {'loaded' | 'disabled' | 'failed' | 'pending'} PluginState
 * @typedef {{ folder: string, dir: string, id: string, displayName: string, kind: string,
 *             keywords: string[], entry: string, state: PluginState, reason?: string }} PluginInfo
 */

/** @param {NodeJS.ProcessEnv} [env] */
function pluginsPath(env = process.env) {
  return env.LD_PLUGINS_PATH || PLUGINS_DIR;
}

/**
 * Pure: a plugin described by its package.json, or the reason it is rejected.
 * @param {string} folder @param {unknown} manifest
 * @returns {{ id: string, displayName: string, kind: string, keywords: string[], entryName: string } | { error: string }}
 */
function describePlugin(folder, manifest) {
  if (manifest === null || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return { error: 'package.json is not a JSON object' };
  }
  const m = /** @type {Record<string, unknown>} */ (manifest);
  if (typeof m.publisher !== 'string' || !PUBLISHER.test(m.publisher)) {
    return { error: `'publisher' must match ${PUBLISHER}` };
  }
  if (typeof m.name !== 'string' || !NAME.test(m.name)) return { error: `'name' must match ${NAME}` };
  const kind = m['ld-plugin-type'];
  if (kind === 'both') return { error: "'ld-plugin-type' both is not supported yet" };
  if (typeof kind !== 'string' || !KINDS.includes(kind)) {
    return { error: `'ld-plugin-type' must be one of: ${KINDS.join(', ')}` };
  }
  const entryKey = kind === 'server' ? 'main' : 'renderer-main';
  const entryName = typeof m[entryKey] === 'string' ? /** @type {string} */ (m[entryKey]) : kind === 'server' ? 'index.js' : 'renderer.js';
  const keywords = Array.isArray(m.keywords) ? m.keywords.filter((k) => typeof k === 'string') : [];
  return {
    id: `${m.publisher}.${m.name}`,
    displayName: typeof m.displayName === 'string' && m.displayName.trim() !== '' ? m.displayName : `${m.publisher}.${m.name}`,
    kind,
    keywords,
    entryName
  };
}

/**
 * Scans the plugins folder. Rejected plugins are listed with `state: 'failed'`.
 * @param {string} dir @param {{ disabled?: string[] }} [options]
 * @returns {PluginInfo[]}
 */
function discoverPlugins(dir, { disabled = [] } = {}) {
  if (!fs.existsSync(dir)) return [];
  /** @type {PluginInfo[]} */
  const plugins = [];
  const folders = fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
  for (const folder of folders) {
    const pluginDir = path.join(dir, folder);
    const manifestFile = path.join(pluginDir, 'package.json');
    if (!fs.existsSync(manifestFile)) continue; // not a plugin
    /** @type {PluginInfo} */
    const info = { folder, dir: pluginDir, id: folder, displayName: folder, kind: '?', keywords: [], entry: '', state: 'pending' };
    plugins.push(info);
    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    } catch (err) {
      Object.assign(info, { state: 'failed', reason: `invalid package.json: ${/** @type {Error} */ (err).message}` });
      continue;
    }
    const d = describePlugin(folder, manifest);
    if ('error' in d) {
      Object.assign(info, { state: 'failed', reason: d.error });
      continue;
    }
    Object.assign(info, { id: d.id, displayName: d.displayName, kind: d.kind, keywords: d.keywords, entry: path.join(pluginDir, d.entryName) });
    // Disabled first: a failed plugin can be disabled so that its error is no longer
    // shown at each start (PLUGIN_API.md §15). Only a plugin with no valid id cannot be.
    if (disabled.includes(info.id)) {
      info.state = 'disabled';
    } else if (plugins.some((p) => p !== info && p.id === info.id && p.state !== 'failed')) {
      Object.assign(info, { state: 'failed', reason: `another plugin is already named '${info.id}'` });
    } else if (!fs.existsSync(info.entry)) {
      Object.assign(info, { state: 'failed', reason: `entry '${d.entryName}' not found` });
    }
  }
  return plugins;
}

/**
 * Pure: is `id` a valid id for this plugin (`<plugin id>.<name>`)?
 * @param {string} pluginId @param {unknown} id
 */
function ownsId(pluginId, id) {
  return typeof id === 'string' && id.startsWith(`${pluginId}.`) && /^[A-Za-z][\w-]*$/.test(id.slice(pluginId.length + 1));
}

/**
 * Loads the server plugins (all or nothing each) and returns what the renderer needs
 * (`plugins.startupInfo`, §3).
 * @param {PluginInfo[]} plugins
 * @param {{ commands: InstanceType<typeof import('./command_registry.js').CommandRegistry>,
 *           journal: ReturnType<typeof import('./journal.js').createJournal>,
 *           load?: (file: string) => unknown }} options
 */
async function loadServerPlugins(plugins, { commands, journal, load = require }) {
  /** @type {{ plugin: string, descriptor: Record<string, unknown> }[]} */
  const serverActions = [];
  for (const p of plugins) {
    if (p.state === 'disabled') journal.log('info', `Plugin ${p.id} disabled`);
    if (p.state !== 'pending' || p.kind !== 'server') continue;
    /** @type {import('../types/contracts').CommandDescriptor[]} */
    const staged = [];
    /** @type {Record<string, unknown>[]} */
    const actions = [];
    const source = journal.source(p.id);
    const api = {
      pluginId: p.id,
      /** @param {import('../types/contracts').CommandDescriptor} d */
      registerCommand(d) {
        if (!ownsId(p.id, d?.id)) throw new Error(`Command id '${d?.id}' must start with '${p.id}.'`);
        staged.push(d);
      },
      /** @param {Record<string, unknown>} d */
      registerAction(d) {
        if (!ownsId(p.id, d?.id)) throw new Error(`Action id '${d?.id}' must start with '${p.id}.'`);
        if (!staged.some((c) => c.id === d.command)) throw new Error(`Action '${d.id}': 'command' must be one of this plugin's Commands`);
        if (typeof d.run === 'function') throw new Error(`Action '${d.id}': a server plugin registers alias Actions only`);
        actions.push({ categoryKey: PLUGIN_CATEGORY, ...d });
      },
      output: { append: (/** @type {import('../types/contracts').LogLevel} */ level, /** @type {unknown} */ message) => source.log(level, message) },
      log: (/** @type {unknown[]} */ ...args) => console.log(`[plugin:${p.id}]`, ...args),
      warn: (/** @type {unknown[]} */ ...args) => console.warn(`[plugin:${p.id}]`, ...args)
    };
    try {
      const entry = load(p.entry);
      if (typeof entry !== 'function') throw new Error('its entry must export a function (module.exports = function (api) { … })');
      await entry(api);
      commands.registerAll(staged);
      p.state = 'loaded';
      for (const descriptor of actions) serverActions.push({ plugin: p.id, descriptor });
      journal.log('info', `Plugin ${p.id} loaded (server)`);
    } catch (err) {
      Object.assign(p, { state: 'failed', reason: /** @type {Error} */ (err)?.message ?? String(err) });
    }
  }
  for (const p of plugins) {
    if (p.state === 'failed') journal.log('error', `Plugin '${p.id}' not loaded: ${p.reason}`);
  }
  return {
    serverActions,
    rendererPlugins: plugins
      .filter((p) => p.state === 'pending' && p.kind === 'renderer')
      .map((p) => ({ plugin: p.id, url: `plugin://app/${encodeURIComponent(p.folder)}/${encodeURIComponent(path.basename(p.entry))}` })),
    failures: plugins.filter((p) => p.state === 'failed').map((p) => ({ plugin: p.id, message: String(p.reason) }))
  };
}

/**
 * Pure: the file a `plugin://app/<folder>/<file>` URL names, or null when it is not
 * inside the plugins folder (`..`, absolute, other host).
 * @param {string} url @param {string} dir
 */
function resolvePluginUrl(url, dir) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'plugin:' || parsed.host !== 'app') return null;
  let relative;
  try {
    relative = decodeURIComponent(parsed.pathname.slice(1)); // an encoded slash or backslash stays absolute
  } catch {
    return null;
  }
  if (relative === '' || path.isAbsolute(relative)) return null;
  const file = path.resolve(dir, relative);
  const inside = path.relative(dir, file);
  if (inside === '' || inside.startsWith('..') || path.isAbsolute(inside)) return null;
  return file;
}

module.exports = { PLUGINS_DIR, PLUGIN_CATEGORY, pluginsPath, describePlugin, discoverPlugins, ownsId, loadServerPlugins, resolvePluginUrl };

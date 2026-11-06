// =====================================================================================
// plugin_dependencies.js — dependencies between plugins (Electron main, CJS) — N0.6 bis
// =====================================================================================
// Contract: docs/contracts/PLUGIN_DEPENDENCIES.md (validated 2026-11-06).
// Pure functions, no Electron and no file access, so they are unit-testable:
// - parseDependencies: the `pluginDependencies` field (id → semver range, npm style);
// - loadingOrder: topological order, roots → leaves, ties in discovery order; the
//   plugins on a cycle are returned apart;
// - dependencyProblem: why a plugin cannot load now, worded after VS Code (§4).
// The order and the checks are applied by plugin_manager.js (main) and, for the
// renderer graph at load time, by plugin_loader.js.
// =====================================================================================
'use strict';

const semver = require('semver');

const PLUGIN_ID = /^[A-Za-z][A-Za-z0-9-]*\.[a-z][a-z0-9-]*$/;

/**
 * @typedef {{ id: string, kind: string, version?: string, state: string,
 *             dependencies?: Record<string, string> }} DependencyNode
 */

/**
 * Pure: the `pluginDependencies` of a manifest, or the reason it is invalid (§1).
 * @param {unknown} field @param {string} selfId
 * @returns {{ dependencies: Record<string, string> } | { error: string }}
 */
function parseDependencies(field, selfId) {
  if (field === undefined) return { dependencies: {} };
  if (field === null || typeof field !== 'object' || Array.isArray(field)) {
    return { error: "'pluginDependencies' must be an object: { \"<publisher>.<name>\": \"<semver range>\" }" };
  }
  /** @type {Record<string, string>} */
  const dependencies = {};
  for (const [id, range] of Object.entries(field)) {
    if (!PLUGIN_ID.test(id)) return { error: `'pluginDependencies': '${id}' is not a plugin id (<publisher>.<name>)` };
    if (id === selfId) return { error: "'pluginDependencies': a plugin cannot depend on itself" };
    if (typeof range !== 'string' || semver.validRange(range) === null) {
      return { error: `'pluginDependencies': '${range}' is not a valid version range for '${id}'` };
    }
    dependencies[id] = range;
  }
  return { dependencies };
}

/**
 * Pure: the plugins in topological order — each after all its prerequisites present in
 * the list, ties in the list order (alphabetical by folder) — and the cycles found.
 * A plugin that only depends on a cycle is in `order`; the check of §4 blocks it.
 * @template {DependencyNode} T
 * @param {T[]} plugins
 * @returns {{ order: T[], cycles: Map<T, string[]> }} cycles: each plugin on a cycle → the
 *          cycle as ids, starting and ending with it
 */
function loadingOrder(plugins) {
  /** @type {Map<string, T>} */
  const byId = new Map();
  for (const p of plugins) if (!byId.has(p.id) || byId.get(p.id)?.state === 'failed') byId.set(p.id, p);
  /** @param {T} p */
  const prerequisites = (p) =>
    Object.keys(p.dependencies ?? {}).flatMap((id) => {
      const d = byId.get(id);
      return d === undefined || d === p ? [] : [d];
    });

  // Cycles: the strongly connected parts with more than one plugin (self-dependency is
  // refused by parseDependencies). Tarjan, in list order so the result is stable.
  /** @type {Map<T, string[]>} */
  const cycles = new Map();
  /** @type {Map<T, number>} */ const index = new Map();
  /** @type {Map<T, number>} */ const low = new Map();
  /** @type {T[]} */ const stack = [];
  let counter = 0;
  /** @param {T} v */
  const connect = (v) => {
    index.set(v, counter);
    low.set(v, counter);
    counter += 1;
    stack.push(v);
    for (const w of prerequisites(v)) {
      if (!index.has(w)) {
        connect(w);
        low.set(v, Math.min(/** @type {number} */ (low.get(v)), /** @type {number} */ (low.get(w))));
      } else if (stack.includes(w)) {
        low.set(v, Math.min(/** @type {number} */ (low.get(v)), /** @type {number} */ (index.get(w))));
      }
    }
    if (low.get(v) === index.get(v)) {
      /** @type {T[]} */
      const part = [];
      let w;
      do {
        w = /** @type {T} */ (stack.pop());
        part.push(w);
      } while (w !== v);
      if (part.length > 1) for (const member of part) cycles.set(member, cyclePath(member, new Set(part), prerequisites));
    }
  };
  for (const p of plugins) if (!index.has(p)) connect(p);

  // Kahn's algorithm, always taking the first ready plugin in list order.
  /** @type {T[]} */
  const order = [];
  const left = plugins.filter((p) => !cycles.has(p));
  const placed = new Set();
  while (left.length > 0) {
    const i = left.findIndex((p) => prerequisites(p).every((d) => placed.has(d) || cycles.has(d)));
    const [next] = left.splice(i < 0 ? 0 : i, 1);
    order.push(next);
    placed.add(next);
  }
  return { order, cycles };
}

/**
 * The shortest way back to `start` inside its cycle, as ids (start … start).
 * @template T @param {T & { id: string }} start @param {Set<T>} part
 * @param {(p: T) => T[]} prerequisites
 */
function cyclePath(start, part, prerequisites) {
  /** @type {Map<T, T>} */
  const previous = new Map();
  /** @type {T[]} */
  let queue = [start];
  while (queue.length > 0) {
    /** @type {T[]} */
    const next = [];
    for (const v of queue) {
      for (const w of prerequisites(v)) {
        if (!part.has(w)) continue;
        if (w === start) {
          const path = [start.id];
          for (let x = v; x !== start; x = /** @type {T} */ (previous.get(x))) path.splice(1, 0, /** @type {any} */ (x).id);
          return [...path, start.id];
        }
        if (!previous.has(w)) {
          previous.set(w, v);
          next.push(w);
        }
      }
    }
    queue = next;
  }
  return [start.id, start.id];
}

/**
 * Pure: why `plugin` cannot load now, or null (§4). Dependencies are checked in their
 * declaration order; the first at fault is named.
 * @param {DependencyNode} plugin
 * @param {(id: string) => DependencyNode | undefined} find
 * @param {{ ready?: (dependency: DependencyNode) => boolean }} [options] when a dependency
 *        counts as available (default: `loaded`)
 * @returns {{ state: 'blocked' | 'failed', reason: string } | null}
 */
function dependencyProblem(plugin, find, { ready = (d) => d.state === 'loaded' } = {}) {
  for (const [id, range] of Object.entries(plugin.dependencies ?? {})) {
    const head = `Cannot load '${plugin.id}' because it depends on '${id}'`;
    const d = find(id);
    if (d === undefined) return { state: 'blocked', reason: `${head}, which is not installed.` };
    if (plugin.kind === 'server' && d.kind === 'renderer') {
      return { state: 'failed', reason: `a server plugin cannot depend on a renderer plugin ('${id}')` };
    }
    if (typeof d.version === 'string' && !semver.satisfies(d.version, range)) {
      return { state: 'blocked', reason: `${head} version ${range}, but ${d.version} is installed.` };
    }
    if (d.state === 'disabled') return { state: 'blocked', reason: `${head}, which is disabled.` };
    if (!ready(d)) return { state: 'blocked', reason: `${head}, which was not loaded.` };
  }
  return null;
}

/** @param {string} id @param {string[]} cycle */
const cycleReason = (id, cycle) => `Cannot load '${id}' because of a dependency cycle: ${cycle.join(' → ')}.`;

module.exports = { PLUGIN_ID, parseDependencies, loadingOrder, dependencyProblem, cycleReason };

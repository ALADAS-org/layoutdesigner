// Unit tests — dependencies between plugins (docs/contracts/PLUGIN_DEPENDENCIES.md).
// Tag @N0.6bis: filter with `npm run test:jest -- -t @N0.6bis` (roadmap lot).
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { CommandRegistry } = require('../../../../src/server/command_registry.js');
const { createJournal } = require('../../../../src/server/journal.js');
const { parseDependencies, loadingOrder, dependencyProblem, cycleReason } = require('../../../../src/server/plugin_dependencies.js');
const { discoverPlugins, loadServerPlugins } = require('../../../../src/server/plugin_manager.js');

/** A node for the pure functions. */
const node = (id, dependencies = {}, over = {}) => ({ id, kind: 'server', version: '1.0.0', state: 'pending', dependencies, ...over });
const ids = (list) => list.map((p) => p.id);

describe('parseDependencies (§1) @N0.6bis', () => {
  test('absent → none; an object id → semver range', () => {
    expect(parseDependencies(undefined, 'A.me')).toEqual({ dependencies: {} });
    expect(parseDependencies({ 'A.x': '^1.0.0', 'B.y': '~1.2.0', 'C.z': '>=1.4.0', 'D.w': '1.0.0' }, 'A.me'))
      .toEqual({ dependencies: { 'A.x': '^1.0.0', 'B.y': '~1.2.0', 'C.z': '>=1.4.0', 'D.w': '1.0.0' } });
  });

  test.each([
    [null, "must be an object"],
    [['A.x'], 'must be an object'],
    ['A.x', 'must be an object'],
    [{ 'not-an-id': '1.0.0' }, "'not-an-id' is not a plugin id"],
    [{ 'A.x': 'soon' }, "'soon' is not a valid version range"],
    [{ 'A.x': 1 }, "'1' is not a valid version range"],
    [{ 'A.me': '^1.0.0' }, 'cannot depend on itself']
  ])('rejects %p', (field, reason) => {
    expect(parseDependencies(field, 'A.me').error).toContain(reason);
  });
});

describe('loadingOrder (§5) @N0.6bis', () => {
  test('roots → leaves; ties keep the list (alphabetical) order', () => {
    const a = node('A.a', { 'A.c': '^1' });
    const b = node('A.b');
    const c = node('A.c', { 'A.b': '^1' });
    const d = node('A.d');
    expect(ids(loadingOrder([a, b, c, d]).order)).toEqual(['A.b', 'A.c', 'A.a', 'A.d']);
  });

  test('a diamond: the shared prerequisite once, before both', () => {
    const top = node('A.a', { 'A.b': '^1', 'A.c': '^1' });
    const left = node('A.b', { 'A.d': '^1' });
    const right = node('A.c', { 'A.d': '^1' });
    const base = node('A.d');
    expect(ids(loadingOrder([top, left, right, base]).order)).toEqual(['A.d', 'A.b', 'A.c', 'A.a']);
  });

  test('cycles are returned apart, with their path; a dependent of a cycle stays in order', () => {
    const a = node('A.a', { 'A.b': '^1' });
    const b = node('A.b', { 'A.a': '^1' });
    const x = node('A.x', { 'A.y': '^1' });
    const y = node('A.y', { 'A.z': '^1' });
    const z = node('A.z', { 'A.x': '^1' });
    const fan = node('A.fan', { 'A.a': '^1' });
    const { order, cycles } = loadingOrder([a, b, fan, x, y, z]);
    expect(ids(order)).toEqual(['A.fan']);
    expect(cycles.get(a)).toEqual(['A.a', 'A.b', 'A.a']);
    expect(cycles.get(b)).toEqual(['A.b', 'A.a', 'A.b']);
    expect(cycles.get(x)).toEqual(['A.x', 'A.y', 'A.z', 'A.x']);
    expect(cycleReason('A.a', cycles.get(a))).toBe("Cannot load 'A.a' because of a dependency cycle: A.a → A.b → A.a.");
  });

  test('a missing prerequisite does not hold the order', () => {
    expect(ids(loadingOrder([node('A.a', { 'A.gone': '^1' }), node('A.b')]).order)).toEqual(['A.a', 'A.b']);
  });
});

describe('dependencyProblem (§4) — reasons after VS Code @N0.6bis', () => {
  const plugins = [
    node('A.ok', {}, { state: 'loaded' }),
    node('A.off', {}, { state: 'disabled' }),
    node('A.bad', {}, { state: 'failed' }),
    node('A.old', {}, { state: 'loaded', version: '1.0.0' }),
    node('A.r', {}, { kind: 'renderer', state: 'pending' })
  ];
  const find = (id) => plugins.find((p) => p.id === id);
  const reason = (deps, over = {}) => dependencyProblem(node('A.me', deps, over), find);

  test('none when every dependency is loaded and in range', () => {
    expect(reason({ 'A.ok': '^1.0.0' })).toBeNull();
  });

  test.each([
    [{ 'A.gone': '^1.0.0' }, "Cannot load 'A.me' because it depends on 'A.gone', which is not installed."],
    [{ 'A.off': '^1.0.0' }, "Cannot load 'A.me' because it depends on 'A.off', which is disabled."],
    [{ 'A.bad': '^1.0.0' }, "Cannot load 'A.me' because it depends on 'A.bad', which was not loaded."],
    [{ 'A.old': '^2.0.0' }, "Cannot load 'A.me' because it depends on 'A.old' version ^2.0.0, but 1.0.0 is installed."],
    [{ 'A.ok': '^1.0.0', 'A.gone': '^1.0.0', 'A.off': '^1.0.0' }, "Cannot load 'A.me' because it depends on 'A.gone', which is not installed."]
  ])('blocked: %p', (deps, text) => {
    expect(reason(deps)).toEqual({ state: 'blocked', reason: text });
  });

  test('a server plugin cannot depend on a renderer plugin: failed (§2)', () => {
    expect(reason({ 'A.r': '^1.0.0' })).toEqual({ state: 'failed', reason: "a server plugin cannot depend on a renderer plugin ('A.r')" });
  });

  test('`ready` decides when a dependency counts as available', () => {
    const me = node('A.me', { 'A.r': '^1.0.0' }, { kind: 'renderer' });
    expect(dependencyProblem(me, find)).toMatchObject({ state: 'blocked' });
    expect(dependencyProblem(me, find, { ready: (d) => d.state === 'pending' })).toBeNull();
  });
});

// ---- Main: discovery, order and loading with dependencies --------------------------

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ld-deps-test-'));
const quiet = () => createJournal({ out: { log() {}, warn() {}, error() {} } });

/**
 * Plugins described as { folder: { kind?, version?, deps?, entry? } }; server entries
 * are functions (no file loaded).
 */
function setup(spec, { disabled = [] } = {}) {
  const dir = tmp();
  for (const [name, { kind = 'server', version = '1.0.0', deps }] of Object.entries(spec)) {
    fs.mkdirSync(path.join(dir, name));
    const manifest = { name, publisher: 'Acme', version, 'ld-plugin-type': kind, pluginDependencies: deps };
    fs.writeFileSync(path.join(dir, name, 'package.json'), JSON.stringify(manifest));
    fs.writeFileSync(path.join(dir, name, kind === 'server' ? 'index.js' : 'renderer.js'), '');
  }
  const plugins = discoverPlugins(dir, { disabled });
  const commands = new CommandRegistry();
  const journal = quiet();
  const load = (file) => spec[path.basename(path.dirname(file))].entry ?? (() => {});
  return { plugins, commands, journal, load };
}
const stateOf = (s, name) => s.plugins.find((p) => p.id === `Acme.${name}`);
const lines = (s) => s.journal.history().map((l) => [l.level, l.message]);

describe('loadServerPlugins with dependencies @N0.6bis', () => {
  test('exports: the entry\'s value, read by a declared dependent; info lines in topological order', async () => {
    const s = setup({
      'a-greeter': { deps: { 'Acme.z-provider': '^1.0.0' }, entry: (api) => { api.output.append('info', api.getExports('Acme.z-provider').hello('x')); } },
      'z-provider': { entry: () => ({ hello: (n) => `hello ${n}` }) }
    });
    await loadServerPlugins(s.plugins, s);
    expect(lines(s).filter(([, m]) => m.startsWith('Plugin') || m.startsWith('hello'))).toEqual([
      ['info', 'Plugin Acme.z-provider loaded (server)'],
      ['info', 'hello x'],
      ['info', 'Plugin Acme.a-greeter loaded (server)']
    ]);
  });

  test('an async entry is awaited: its exports are the resolved value, before its dependents load', async () => {
    const s = setup({
      dependent: { deps: { 'Acme.slow': '^1.0.0' }, entry: (api) => { api.output.append('info', `got ${api.getExports('Acme.slow').value}`); } },
      slow: { entry: async () => { await new Promise((r) => setTimeout(r, 20)); return { value: 42 }; } }
    });
    await loadServerPlugins(s.plugins, s);
    expect(lines(s)).toContainEqual(['info', 'got 42']);
    expect(stateOf(s, 'dependent').state).toBe('loaded');
  });

  test('no exports → undefined; getExports of an undeclared plugin makes the caller fail', async () => {
    let seen = 'unset';
    const s = setup({
      a: { deps: { 'Acme.b': '^1.0.0' }, entry: (api) => { seen = api.getExports('Acme.b'); } },
      b: {},
      c: { entry: (api) => api.getExports('Acme.b') }
    });
    const info = await loadServerPlugins(s.plugins, s);
    expect(seen).toBeUndefined();
    expect(info.failures).toEqual([{ plugin: 'Acme.c', message: "getExports('Acme.b'): 'Acme.b' is not declared in pluginDependencies" }]);
  });

  test('a rejected promise: the provider fails, its dependents are blocked (warn), transitively', async () => {
    const s = setup({
      a: { deps: { 'Acme.b': '^1.0.0' } },
      b: { deps: { 'Acme.c': '^1.0.0' } },
      c: { entry: async () => { throw new Error('no network'); } }
    });
    const info = await loadServerPlugins(s.plugins, s);
    expect(stateOf(s, 'c')).toMatchObject({ state: 'failed', reason: 'no network' });
    expect(stateOf(s, 'b')).toMatchObject({ state: 'blocked', reason: "Cannot load 'Acme.b' because it depends on 'Acme.c', which was not loaded." });
    expect(stateOf(s, 'a')).toMatchObject({ state: 'blocked', reason: "Cannot load 'Acme.a' because it depends on 'Acme.b', which was not loaded." });
    expect(info.blocked.map((b) => b.plugin)).toEqual(['Acme.a', 'Acme.b']);
    expect(lines(s).filter(([level]) => level === 'warn').map(([, m]) => m)).toEqual([
      "Cannot load 'Acme.b' because it depends on 'Acme.c', which was not loaded.",
      "Cannot load 'Acme.a' because it depends on 'Acme.b', which was not loaded."
    ]);
  });

  test('missing, disabled, wrong version: blocked, and the dependent is never called', async () => {
    let called = false;
    const entry = () => { called = true; };
    const s = setup({
      gone: { deps: { 'Acme.nowhere': '^1.0.0' }, entry },
      'needs-off': { deps: { 'Acme.off': '^1.0.0' }, entry },
      'needs-v2': { deps: { 'Acme.v1': '^2.0.0' }, entry },
      off: {},
      v1: {}
    }, { disabled: ['Acme.off'] });
    await loadServerPlugins(s.plugins, s);
    expect(called).toBe(false);
    expect(stateOf(s, 'gone').reason).toBe("Cannot load 'Acme.gone' because it depends on 'Acme.nowhere', which is not installed.");
    expect(stateOf(s, 'needs-off').reason).toBe("Cannot load 'Acme.needs-off' because it depends on 'Acme.off', which is disabled.");
    expect(stateOf(s, 'needs-v2').reason).toBe("Cannot load 'Acme.needs-v2' because it depends on 'Acme.v1' version ^2.0.0, but 1.0.0 is installed.");
  });

  test('a cycle: every plugin on it is blocked; the others load', async () => {
    const s = setup({ a: { deps: { 'Acme.b': '^1.0.0' } }, b: { deps: { 'Acme.a': '^1.0.0' } }, c: {} });
    const info = await loadServerPlugins(s.plugins, s);
    expect(stateOf(s, 'a').reason).toBe("Cannot load 'Acme.a' because of a dependency cycle: Acme.a → Acme.b → Acme.a.");
    expect(stateOf(s, 'b').state).toBe('blocked');
    expect(stateOf(s, 'c').state).toBe('loaded');
    expect(info.blocked.map((b) => b.plugin)).toEqual(['Acme.a', 'Acme.b']);
  });

  test('server → renderer refused (failed); renderer → server and renderer → renderer go to the renderer', async () => {
    const s = setup({
      srv: { deps: { 'Acme.ui': '^1.0.0' } },
      ui: { kind: 'renderer' },
      'ui-on-core': { kind: 'renderer', deps: { 'Acme.core': '^1.0.0', 'Acme.ui': '^1.0.0' } },
      core: {}
    });
    const info = await loadServerPlugins(s.plugins, s);
    expect(info.failures).toEqual([{ plugin: 'Acme.srv', message: "a server plugin cannot depend on a renderer plugin ('Acme.ui')" }]);
    expect(info.rendererPlugins).toEqual([
      { plugin: 'Acme.ui', url: 'plugin://app/ui/renderer.js', dependencies: [] },
      { plugin: 'Acme.ui-on-core', url: 'plugin://app/ui-on-core/renderer.js', dependencies: [{ id: 'Acme.core', kind: 'server' }, { id: 'Acme.ui', kind: 'renderer' }] }
    ]);
  });

  test('a renderer plugin whose server dependency failed is blocked in main', async () => {
    const s = setup({ core: { entry: () => { throw new Error('boom'); } }, ui: { kind: 'renderer', deps: { 'Acme.core': '^1.0.0' } } });
    const info = await loadServerPlugins(s.plugins, s);
    expect(info.rendererPlugins).toEqual([]);
    expect(info.blocked).toEqual([{ plugin: 'Acme.ui', message: "Cannot load 'Acme.ui' because it depends on 'Acme.core', which was not loaded." }]);
  });
});

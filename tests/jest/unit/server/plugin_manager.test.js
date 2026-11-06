// Unit tests — plugin discovery and server loading (docs/contracts/PLUGIN_API.md §2–§5, §7, §15).
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { CommandRegistry } = require('../../../../src/server/command_registry.js');
const { createJournal } = require('../../../../src/server/journal.js');
const {
  PLUGINS_DIR, pluginsPath, describePlugin, discoverPlugins, ownsId, loadServerPlugins, resolvePluginUrl
} = require('../../../../src/server/plugin_manager.js');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ld-plugins-test-'));
const manifest = (over = {}) => ({ name: 'demo', publisher: 'Acme', version: '1.0.0', 'ld-plugin-type': 'server', main: 'index.js', ...over });

/** Writes a plugin folder; `files` maps file names to contents (objects become JSON). */
function plugin(dir, folder, files) {
  fs.mkdirSync(path.join(dir, folder), { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, folder, name), typeof content === 'string' ? content : JSON.stringify(content));
  }
}

const quiet = () => createJournal({ out: { log() {}, warn() {}, error() {} } });

describe('pluginsPath', () => {
  test('plugins/ at the repo root; LD_PLUGINS_PATH overrides it', () => {
    expect(PLUGINS_DIR.split(path.sep).slice(-1)).toEqual(['plugins']);
    expect(pluginsPath({})).toBe(PLUGINS_DIR);
    expect(pluginsPath({ LD_PLUGINS_PATH: '/x' })).toBe('/x');
  });
});

describe('describePlugin', () => {
  test('id `<publisher>.<name>` as VS Code; displayName shown; keywords are the tags', () => {
    expect(describePlugin('f', manifest({ displayName: 'Demo', keywords: ['a', 3, 'b'] }))).toEqual({
      id: 'Acme.demo', displayName: 'Demo', kind: 'server', keywords: ['a', 'b'], entryName: 'index.js',
      version: '1.0.0', dependencies: {}
    });
  });

  test('default entries; without displayName the id is shown', () => {
    const d = describePlugin('f', manifest({ 'ld-plugin-type': 'renderer', main: undefined }));
    expect(d).toMatchObject({ displayName: 'Acme.demo', kind: 'renderer', entryName: 'renderer.js' });
  });

  test.each([
    [null, 'not a JSON object'],
    [manifest({ publisher: undefined }), "'publisher'"],
    [manifest({ name: 'Bad_Name' }), "'name'"],
    [manifest({ 'ld-plugin-type': undefined }), "'ld-plugin-type' must be one of"],
    [manifest({ 'ld-plugin-type': 'widget' }), "'ld-plugin-type' must be one of"],
    [manifest({ 'ld-plugin-type': 'both' }), 'not supported yet'],
    // N0.6 bis (PLUGIN_DEPENDENCIES.md §1): a semver version and valid declarations.
    [manifest({ version: undefined }), "'version' must be a semver version"],
    [manifest({ version: '1.0' }), "'version' must be a semver version"],
    [manifest({ pluginDependencies: ['Acme.x'] }), "'pluginDependencies' must be an object"],
    [manifest({ pluginDependencies: { 'Acme.x': 'soon' } }), "'soon' is not a valid version range"]
  ])('rejects %p', (m, reason) => {
    expect(describePlugin('f', m).error).toContain(reason);
  });
});

describe('discoverPlugins', () => {
  test('sub-folders with a package.json, in alphabetical order; states and reasons', () => {
    const dir = tmp();
    plugin(dir, 'b-good', { 'package.json': manifest({ name: 'good' }), 'index.js': '' });
    plugin(dir, 'a-bad-json', { 'package.json': '{ nope' });
    plugin(dir, 'c-dup', { 'package.json': manifest({ name: 'good' }), 'index.js': '' });
    plugin(dir, 'd-no-entry', { 'package.json': manifest({ name: 'noentry' }) });
    plugin(dir, 'e-off', { 'package.json': manifest({ name: 'off' }), 'index.js': '' });
    plugin(dir, 'f-not-a-plugin', { 'README.md': 'x' });
    fs.writeFileSync(path.join(dir, 'loose.txt'), 'x');
    const found = discoverPlugins(dir, { disabled: ['Acme.off'] });
    expect(found.map((p) => [p.folder, p.id, p.state])).toEqual([
      ['a-bad-json', 'a-bad-json', 'failed'],
      ['b-good', 'Acme.good', 'pending'],
      ['c-dup', 'Acme.good', 'failed'],
      ['d-no-entry', 'Acme.noentry', 'failed'],
      ['e-off', 'Acme.off', 'disabled']
    ]);
    expect(found[0].reason).toMatch(/^invalid package.json/);
    expect(found[2].reason).toBe("another plugin is already named 'Acme.good'");
    expect(found[3].reason).toBe("entry 'index.js' not found");
  });

  test('a failed plugin that is disabled is no longer reported (§15)', () => {
    const dir = tmp();
    plugin(dir, 'broken', { 'package.json': manifest({ name: 'broken' }) }); // no entry file
    expect(discoverPlugins(dir)[0]).toMatchObject({ state: 'failed', reason: "entry 'index.js' not found" });
    expect(discoverPlugins(dir, { disabled: ['Acme.broken'] })[0]).toMatchObject({ state: 'disabled' });
    expect(discoverPlugins(dir, { disabled: ['Acme.broken'] })[0].reason).toBeUndefined();
  });

  test('a missing folder: no plugin', () => {
    expect(discoverPlugins(path.join(tmp(), 'none'))).toEqual([]);
  });

  test('the three witnesses of plugins/ are valid @N0.6bis', () => {
    // Only the witnesses: a developer may have other plugins in plugins/ (e.g. a broken
    // one dropped there for the Design gate).
    const witnesses = discoverPlugins(PLUGINS_DIR).filter((p) => p.id.startsWith('LayoutDesigner.dummy-'));
    expect(witnesses.map((p) => [p.id, p.kind, p.state])).toEqual([
      ['LayoutDesigner.dummy-greeter', 'server', 'pending'],
      ['LayoutDesigner.dummy-renderer', 'renderer', 'pending'],
      ['LayoutDesigner.dummy-server', 'server', 'pending']
    ]);
  });
});

describe('ownsId', () => {
  test('`<plugin id>.<name>` only', () => {
    expect(ownsId('Acme.demo', 'Acme.demo.hello')).toBe(true);
    expect(ownsId('Acme.demo', 'Acme.demo.')).toBe(false);
    expect(ownsId('Acme.demo', 'Acme.demo.a.b')).toBe(false);
    expect(ownsId('Acme.demo', 'file.quit')).toBe(false);
    expect(ownsId('Acme.demo', 'Acme.demox.hello')).toBe(false);
    expect(ownsId('Acme.demo', 42)).toBe(false);
  });
});

describe('loadServerPlugins', () => {
  /** Plugins whose entries are given as functions (no file loaded). */
  function setup(entries, { disabled = [] } = {}) {
    const dir = tmp();
    for (const name of Object.keys(entries)) {
      plugin(dir, name, { 'package.json': manifest({ name }), 'index.js': '' });
    }
    plugin(dir, 'zz-renderer', { 'package.json': manifest({ name: 'zz-renderer', 'ld-plugin-type': 'renderer', 'renderer-main': 'r.js' }), 'r.js': '' });
    const plugins = discoverPlugins(dir, { disabled });
    const commands = new CommandRegistry();
    const journal = quiet();
    const load = (file) => entries[path.basename(path.dirname(file))];
    return { plugins, commands, journal, load };
  }

  test('registers Commands, returns alias Actions (category Plugins) and renderer URLs; info lines', async () => {
    const s = setup({
      good: (api) => {
        api.registerCommand({ id: `${api.pluginId}.hello`, run: async () => 'hi' });
        api.registerAction({ id: `${api.pluginId}.hello`, label: 'Hello', menuGroup: 'Demo', command: `${api.pluginId}.hello` });
      }
    });
    const info = await loadServerPlugins(s.plugins, s);
    expect(s.commands.has('Acme.good.hello')).toBe(true);
    expect(info.serverActions).toEqual([{ plugin: 'Acme.good', descriptor: {
      id: 'Acme.good.hello', label: 'Hello', menuGroup: 'Demo', command: 'Acme.good.hello', categoryKey: 'Plugins'
    } }]);
    expect(info.rendererPlugins).toEqual([{ plugin: 'Acme.zz-renderer', url: 'plugin://app/zz-renderer/r.js', dependencies: [] }]);
    expect(info.failures).toEqual([]);
    expect(info.blocked).toEqual([]);
    expect(s.plugins.find((p) => p.id === 'Acme.good').state).toBe('loaded');
    expect(s.journal.history().map((l) => l.message)).toEqual(['Plugin Acme.good loaded (server)']);
  });

  test('all or nothing: a plugin throwing midway leaves no Command; the others load', async () => {
    const s = setup({
      a: (api) => { api.registerCommand({ id: 'Acme.a.one', run: async () => 1 }); throw new Error('boom'); },
      b: (api) => api.registerCommand({ id: 'Acme.b.one', run: async () => 1 }),
      c: (api) => api.registerCommand({ id: 'file.quit', run: async () => 1 }),
      d: (api) => {
        api.registerCommand({ id: 'Acme.d.one', run: async () => 1 });
        api.registerAction({ id: 'Acme.d.one', label: 'X', command: 'app.quit' });
      },
      e: () => {}
    });
    s.commands.register({ id: 'Acme.e.taken', run: async () => 0 });
    const info = await loadServerPlugins(s.plugins, s);
    expect(s.commands.has('Acme.a.one')).toBe(false);
    expect(s.commands.has('Acme.b.one')).toBe(true);
    expect(s.commands.has('Acme.d.one')).toBe(false);
    expect(info.failures).toEqual([
      { plugin: 'Acme.a', message: 'boom' },
      { plugin: 'Acme.c', message: "Command id 'file.quit' must start with 'Acme.c.'" },
      { plugin: 'Acme.d', message: "Action 'Acme.d.one': 'command' must be one of this plugin's Commands" }
    ]);
    const errors = s.journal.history().filter((l) => l.level === 'error').map((l) => l.message);
    expect(errors[0]).toBe("Plugin 'Acme.a' not loaded: boom");
  });

  test('a disabled plugin is not loaded, and says so', async () => {
    let called = false;
    const s = setup({ off: () => { called = true; } }, { disabled: ['Acme.off'] });
    await loadServerPlugins(s.plugins, s);
    expect(called).toBe(false);
    expect(s.journal.history().map((l) => l.message)).toEqual(['Plugin Acme.off disabled']);
  });

  test('api.output writes under the plugin source', async () => {
    const s = setup({ src: (api) => api.output.append('warn', 'careful') });
    await loadServerPlugins(s.plugins, s);
    expect(s.journal.history()[0]).toMatchObject({ source: 'Acme.src', level: 'warn', message: 'careful' });
  });

  test('an entry that is not a function is rejected', async () => {
    const s = setup({ notfn: /** @type {any} */ ({}) });
    const info = await loadServerPlugins(s.plugins, s);
    expect(info.failures[0].message).toMatch(/must export a function/);
  });
});

describe('resolvePluginUrl', () => {
  const dir = path.resolve(tmp());
  test('a file inside the plugins folder', () => {
    expect(resolvePluginUrl('plugin://app/demo/renderer.js', dir)).toBe(path.join(dir, 'demo', 'renderer.js'));
  });
  test('dot segments are normalised by the URL itself, so they stay inside', () => {
    expect(resolvePluginUrl('plugin://app/demo/../../secret.js', dir)).toBe(path.join(dir, 'secret.js'));
    expect(resolvePluginUrl('plugin://app/%2e%2e/secret.js', dir)).toBe(path.join(dir, 'secret.js'));
  });
  test.each([
    'plugin://app/..%2F..%2Fsecret.js',
    'plugin://app/demo%2F..%2F..%2Fx.js',
    'plugin://app/%2Fetc%2Fpasswd',
    'plugin://other/demo/renderer.js',
    'file:///etc/passwd',
    'plugin://app/',
    'not a url'
  ])('refuses %s', (url) => {
    expect(resolvePluginUrl(url, dir)).toBeNull();
  });
});

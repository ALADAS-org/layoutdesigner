// Unit tests — renderer plugin loading with fake modules (PLUGIN_API.md §3, §6, §7).
import { jest } from '@jest/globals';
import { loadPlugins, ownsId, PLUGIN_CATEGORY } from '../../../../src/renderer/plugin_loader.js';
import { ActionRegistry } from '../../../../src/renderer/action_registry.js';
import { createOutput } from '../../../../src/renderer/output_sources.js';

function setup(modules) {
  const actions = new ActionRegistry({ invokeCommand: async () => ({ ok: true, value: undefined }) });
  actions.register({ id: 'file.quit', label: 'Quit', shortcut: 'Ctrl+Q', command: 'app.quit' });
  const output = createOutput();
  const logged = [];
  const failures = [];
  const deps = {
    actions,
    output,
    log: (level, message) => logged.push([level, message]),
    onFailure: (m) => failures.push(m),
    importModule: async (url) => {
      const m = modules[url];
      if (m instanceof Error) throw m;
      return m;
    }
  };
  return { actions, output, logged, failures, deps };
}
const renderer = (plugin) => ({ plugin, url: `plugin://app/${plugin}/renderer.js` });

test('ownsId: `<plugin id>.<name>`', () => {
  expect(ownsId('A.b', 'A.b.c')).toBe(true);
  expect(ownsId('A.b', 'view.x')).toBe(false);
});

test('server alias Actions and renderer Actions are registered, category Plugins by default', async () => {
  const s = setup({
    'plugin://app/A.r/renderer.js': {
      init: async (api) => {
        api.registerAction({ id: `${api.pluginId}.hello`, label: 'Hello', menuGroup: 'Demo', run: async () => api.output.append('info', 'hi') });
      }
    }
  });
  const outcome = await loadPlugins({
    serverActions: [{ plugin: 'A.s', descriptor: { id: 'A.s.hello', label: 'Server', command: 'A.s.hello', categoryKey: 'Plugins' } }],
    rendererPlugins: [renderer('A.r')],
    failures: []
  }, s.deps);
  expect(s.actions.get('A.s.hello')).toMatchObject({ command: 'A.s.hello' });
  expect(s.actions.get('A.r.hello')).toMatchObject({ categoryKey: PLUGIN_CATEGORY, menuGroup: 'Demo' });
  expect(outcome.get('A.r')).toEqual({ state: 'loaded' });
  expect(s.logged).toEqual([['info', 'Plugin A.r loaded (renderer)']]);
  await s.actions.trigger('A.r.hello');
  expect(s.output.lines()).toMatchObject([{ source: 'A.r', message: 'hi' }]);
});

test('all or nothing, and reported: failing modules leave no Action; the others load', async () => {
  const s = setup({
    'plugin://app/A.throws/renderer.js': { init: (api) => { api.registerAction({ id: 'A.throws.x', label: 'X', run: async () => {} }); throw new Error('boom'); } },
    'plugin://app/A.noinit/renderer.js': {},
    'plugin://app/A.missing/renderer.js': new Error('Failed to fetch dynamically imported module'),
    'plugin://app/A.foreign/renderer.js': { init: (api) => api.registerAction({ id: 'view.mine', label: 'X', run: async () => {} }) },
    'plugin://app/A.shortcut/renderer.js': { init: (api) => api.registerAction({ id: 'A.shortcut.x', label: 'X', shortcut: 'Ctrl+Q', run: async () => {} }) },
    'plugin://app/A.ok/renderer.js': { init: (api) => api.registerAction({ id: 'A.ok.x', label: 'X', run: async () => {} }) }
  });
  jest.spyOn(console, 'log').mockImplementation(() => {});
  const outcome = await loadPlugins({
    serverActions: [],
    rendererPlugins: ['A.throws', 'A.noinit', 'A.missing', 'A.foreign', 'A.shortcut', 'A.ok'].map(renderer),
    failures: [{ plugin: 'A.main', message: "entry 'index.js' not found" }]
  }, s.deps);
  expect(s.actions.list().map((a) => a.id).sort()).toEqual(['A.ok.x', 'file.quit']);
  expect(s.failures[0]).toBe("Plugin 'A.main' not loaded: entry 'index.js' not found");
  expect(s.failures).toHaveLength(6);
  expect(s.failures[1]).toBe("Plugin 'A.throws' not loaded: boom");
  expect(s.failures[2]).toMatch(/A\.noinit.*must export a function init/);
  expect(s.failures[4]).toMatch(/must start with 'A\.foreign\.'/);
  // main wrote its own failure line already; the renderer writes the others.
  expect(s.logged.filter(([level]) => level === 'error')).toHaveLength(5);
  expect([...outcome].filter(([, o]) => o.state === 'failed').map(([id]) => id)).toEqual(['A.main', 'A.throws', 'A.noinit', 'A.missing', 'A.foreign', 'A.shortcut']);
  jest.restoreAllMocks();
});

test('server alias Actions refused in the renderer fail their plugin', async () => {
  const s = setup({});
  await loadPlugins({
    serverActions: [{ plugin: 'A.s', descriptor: { id: 'A.s.x', label: 'X', command: 'A.s.x', shortcut: 'Ctrl+Q' } }],
    rendererPlugins: [],
    failures: []
  }, s.deps);
  expect(s.actions.get('A.s.x')).toBeUndefined();
  expect(s.failures[0]).toMatch(/^Plugin 'A\.s' not loaded: /);
});

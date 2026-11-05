// Unit tests — Preferences Commands for plugins (PLUGIN_API.md §15).
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { CommandRegistry } = require('../../../../src/server/command_registry.js');
const { registerPreferencesCommands } = require('../../../../src/server/preferences_commands.js');

function setup(initial) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ld-prefs-')), 'preferences.json');
  if (initial !== undefined) fs.writeFileSync(file, JSON.stringify(initial));
  const registry = new CommandRegistry();
  registerPreferencesCommands(registry, { prefsFile: file });
  /** Resolves with the value, or rejects with the error message. */
  const run = async (id, args) => {
    const reply = await registry.run(id, args, {});
    if (!reply.ok) throw new Error(reply.error.message);
    return reply.value;
  };
  return { file, run };
}

describe('prefs.setPluginEnabled', () => {
  test('keeps a sorted list of disabled plugins, and the other preferences', async () => {
    const { file, run } = setup({ language: 'fr' });
    await run('prefs.setPluginEnabled', { id: 'B.x', enabled: false });
    await run('prefs.setPluginEnabled', { id: 'A.y', enabled: false });
    await run('prefs.setPluginEnabled', { id: 'A.y', enabled: false });
    expect(JSON.parse(fs.readFileSync(file, 'utf8'))).toEqual({ language: 'fr', disabledPlugins: ['A.y', 'B.x'] });
    expect(await run('prefs.setPluginEnabled', { id: 'B.x', enabled: true })).toEqual({ disabledPlugins: ['A.y'] });
  });

  test('prefs.info reports them', async () => {
    const { run } = setup({ disabledPlugins: ['A.y', 3] });
    expect((await run('prefs.info')).disabledPlugins).toEqual(['A.y']);
  });

  test.each([[undefined], [{ id: 'A.y' }], [{ id: '', enabled: true }], [{ id: 'A.y', enabled: 'no' }]])('rejects %p', async (args) => {
    const { run } = setup();
    await expect(run('prefs.setPluginEnabled', args)).rejects.toThrow('needs { id: string, enabled: boolean }');
  });
});

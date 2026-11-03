// Unit tests — read-only file Commands of the Debug Console (OUTPUT_PANEL.md §5).
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { CommandRegistry } = require('../../../../src/server/command_registry.js');
const { registerFileCommands, APP_FOLDER } = require('../../../../src/server/file_commands.js');

function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ld-files-'));
  fs.mkdirSync(path.join(root, 'beta'));
  fs.mkdirSync(path.join(root, 'alpha'));
  fs.writeFileSync(path.join(root, 'a.txt'), 'x');
  const reg = new CommandRegistry();
  registerFileCommands(reg, { appFolder: root });
  const run = (id, args) => reg.run(id, args, /** @type {any} */ ({}));
  return { root, run };
}

test('the application folder is the repository root by default', () => {
  expect(fs.existsSync(path.join(APP_FOLDER, 'package.json'))).toBe(true);
});

test('fs.appFolder gives the application folder', async () => {
  const { root, run } = setup();
  await expect(run('fs.appFolder')).resolves.toEqual({ ok: true, value: root });
});

test('fs.listFolder lists folders first, then files, by name', async () => {
  const { root, run } = setup();
  const reply = await run('fs.listFolder', { folder: root });
  expect(reply).toEqual({
    ok: true,
    value: { folder: root, entries: [{ name: 'alpha', isFolder: true }, { name: 'beta', isFolder: true }, { name: 'a.txt', isFolder: false }] }
  });
});

test('fs.resolveFolder resolves relative to `from`, and refuses what is not a folder', async () => {
  const { root, run } = setup();
  await expect(run('fs.resolveFolder', { from: root, to: 'alpha' })).resolves.toEqual({ ok: true, value: path.join(root, 'alpha') });
  await expect(run('fs.resolveFolder', { from: path.join(root, 'alpha'), to: '..' })).resolves.toEqual({ ok: true, value: root });
  const missing = await run('fs.resolveFolder', { from: root, to: 'nothing' });
  expect(missing.ok).toBe(false);
  expect(missing.error.message).toMatch(/No such folder/);
  const file = await run('fs.resolveFolder', { from: root, to: 'a.txt' });
  expect(file.error.message).toMatch(/Not a folder/);
});

test('arguments must be non-empty strings', async () => {
  const { run } = setup();
  const reply = await run('fs.listFolder', {});
  expect(reply.ok).toBe(false);
});

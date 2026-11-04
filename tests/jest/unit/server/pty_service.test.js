// Unit tests — Terminal shells in main (OUTPUT_PANEL.md §6, §7), with a fake spawn.
'use strict';

const { defaultShell, createPtyService } = require('../../../../src/server/pty_service.js');

function fakeSpawn() {
  const spawned = [];
  const spawn = (file, args, options) => {
    const p = { file, args, options, written: [], sizes: [], killed: false, onDataFn: null, onExitFn: null };
    p.onData = (fn) => { p.onDataFn = fn; };
    p.onExit = (fn) => { p.onExitFn = fn; };
    p.write = (d) => p.written.push(d);
    p.resize = (c, r) => p.sizes.push([c, r]);
    p.kill = () => { p.killed = true; };
    spawned.push(p);
    return p;
  };
  return { spawn, spawned };
}

const sink = () => ({ data: jest.fn(), exit: jest.fn() });

test('PowerShell on Windows, $SHELL elsewhere (no preference)', () => {
  expect(defaultShell('win32', { SHELL: '/bin/zsh' })).toBe('powershell.exe');
  expect(defaultShell('linux', { SHELL: '/bin/zsh' })).toBe('/bin/zsh');
  expect(defaultShell('darwin', {})).toBe('/bin/sh');
});

test('start spawns the shell in the application folder, with the given size', () => {
  const { spawn, spawned } = fakeSpawn();
  const service = createPtyService({ spawn, platform: 'win32', env: {}, cwd: 'C:\\ld' });
  const id = service.start({ cols: 100, rows: 30 }, sink());
  expect(id).toBe(1);
  expect(spawned[0]).toMatchObject({ file: 'powershell.exe', options: { cols: 100, rows: 30, cwd: 'C:\\ld' } });
});

test('data both ways; resize; the end of a shell is reported and forgotten', () => {
  const { spawn, spawned } = fakeSpawn();
  const service = createPtyService({ spawn, platform: 'linux', env: { SHELL: '/bin/bash' }, cwd: '/ld' });
  const s = sink();
  const id = service.start({ cols: 80, rows: 24 }, s);
  service.write(id, 'ls\r');
  expect(spawned[0].written).toEqual(['ls\r']);
  spawned[0].onDataFn('out');
  expect(s.data).toHaveBeenCalledWith(id, 'out');
  service.resize(id, 120, 40);
  service.resize(id, 0, 0); // ignored: a hidden view has no size
  expect(spawned[0].sizes).toEqual([[120, 40]]);
  spawned[0].onExitFn({ exitCode: 0 });
  expect(s.exit).toHaveBeenCalledWith(id, 0);
  expect(service.size()).toBe(0);
});

test('kill and killAll end the shells', () => {
  const { spawn, spawned } = fakeSpawn();
  const service = createPtyService({ spawn, platform: 'linux', env: {}, cwd: '/ld' });
  const a = service.start({ cols: 80, rows: 24 }, sink());
  const b = service.start({ cols: 80, rows: 24 }, sink());
  service.kill(a);
  expect(spawned[0].killed).toBe(true);
  service.killAll([b]);
  expect(spawned[1].killed).toBe(true);
  expect(service.size()).toBe(0);
});

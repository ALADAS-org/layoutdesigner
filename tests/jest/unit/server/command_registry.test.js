// Unit tests — CommandRegistry (docs/contracts/ACTION_COMMAND.md §4–§5).
'use strict';

const { CommandRegistry } = require('../../../../src/server/command_registry.js');
const { registerAppCommands } = require('../../../../src/server/app_commands.js');

describe('CommandRegistry.register', () => {
  test('accepts a valid descriptor', () => {
    const reg = new CommandRegistry();
    reg.register({ id: 'app.quit', run: async () => {} });
    expect(reg.has('app.quit')).toBe(true);
  });

  test('rejects a duplicate id', () => {
    const reg = new CommandRegistry();
    reg.register({ id: 'app.quit', run: async () => {} });
    expect(() => reg.register({ id: 'app.quit', run: async () => {} })).toThrow(/already registered/);
  });

  test.each([
    ['not an object', null],
    ['missing id', { run: async () => {} }],
    ['id without domain', { id: 'quit', run: async () => {} }],
    ['missing run', { id: 'app.quit' }]
  ])('rejects an invalid descriptor (%s)', (_label, descriptor) => {
    expect(() => new CommandRegistry().register(descriptor)).toThrow(TypeError);
  });
});

describe('CommandRegistry.run', () => {
  test('passes args and context, and wraps the result', async () => {
    const reg = new CommandRegistry();
    reg.register({ id: 'test.echo', run: async (args, ctx) => ({ args, who: ctx.who }) });
    await expect(reg.run('test.echo', { n: 1 }, { who: 'main' }))
      .resolves.toEqual({ ok: true, value: { args: { n: 1 }, who: 'main' } });
  });

  test('unknown id resolves to ok: false', async () => {
    const reply = await new CommandRegistry().run('nope.nothing', undefined, {});
    expect(reply.ok).toBe(false);
    expect(reply.error.message).toMatch(/Unknown Command 'nope.nothing'/);
  });

  test('an exception inside a Command resolves to ok: false', async () => {
    const reg = new CommandRegistry();
    reg.register({ id: 'test.boom', run: async () => { throw new Error('boom'); } });
    const reply = await reg.run('test.boom', undefined, {});
    expect(reply).toEqual({ ok: false, error: { message: "Command 'test.boom' failed: boom" } });
  });
});

describe('app commands', () => {
  test("'app.quit' calls app.quit()", async () => {
    const reg = new CommandRegistry();
    registerAppCommands(reg);
    const app = { quit: jest.fn() };
    await expect(reg.run('app.quit', undefined, { app })).resolves.toEqual({ ok: true, value: undefined });
    expect(app.quit).toHaveBeenCalledTimes(1);
  });

  test("'dev.toggleDevTools' toggles the developer tools of the sender window", async () => {
    const reg = new CommandRegistry();
    registerAppCommands(reg);
    const webContents = { toggleDevTools: jest.fn() };
    await expect(reg.run('dev.toggleDevTools', undefined, { webContents })).resolves.toEqual({ ok: true, value: undefined });
    expect(webContents.toggleDevTools).toHaveBeenCalledTimes(1);
  });
});

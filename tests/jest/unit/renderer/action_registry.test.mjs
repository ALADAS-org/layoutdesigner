// Unit tests — ActionRegistry (docs/contracts/ACTION_COMMAND.md §3, §5).
const { jest } = import.meta;
import { ActionRegistry } from '../../../../src/renderer/action_registry.js';

const okBridge = () => jest.fn(async (id, args) => ({ ok: true, value: { id, args } }));

describe('ActionRegistry construction', () => {
  test('requires an invokeCommand function', () => {
    expect(() => new ActionRegistry({})).toThrow(TypeError);
  });
});

describe('ActionRegistry.register', () => {
  test('accepts a client Action and an alias Action, listed in order', () => {
    const reg = new ActionRegistry({ invokeCommand: okBridge() });
    reg.register({ id: 'view.commandPalette', label: 'Command Palette', run: async () => {} });
    reg.register({ id: 'app.quit', label: 'Quit', command: 'app.quit' });
    expect(reg.list().map((a) => a.id)).toEqual(['view.commandPalette', 'app.quit']);
    expect(reg.get('app.quit').label).toBe('Quit');
  });

  test('rejects a duplicate id', () => {
    const reg = new ActionRegistry({ invokeCommand: okBridge() });
    reg.register({ id: 'app.quit', label: 'Quit', command: 'app.quit' });
    expect(() => reg.register({ id: 'app.quit', label: 'Quit', command: 'app.quit' }))
      .toThrow(/already registered/);
  });

  test.each([
    ['not an object', null],
    ['id without domain', { id: 'quit', label: 'Quit', command: 'app.quit' }],
    ['missing label', { id: 'app.quit', command: 'app.quit' }],
    ['both command and run', { id: 'app.quit', label: 'Quit', command: 'app.quit', run: async () => {} }],
    ['neither command nor run', { id: 'app.quit', label: 'Quit' }],
    ['invalid command id', { id: 'app.quit', label: 'Quit', command: 'quit' }],
    ['run not a function', { id: 'app.quit', label: 'Quit', run: 'nope' }],
    ['malformed shortcut', { id: 'app.quit', label: 'Quit', command: 'app.quit', shortcut: 'Ctrl+' }]
  ])('rejects an invalid descriptor (%s)', (_label, descriptor) => {
    expect(() => new ActionRegistry({ invokeCommand: okBridge() }).register(descriptor)).toThrow(TypeError);
  });

  test('rejects two Actions with the same shortcut, whatever the spelling', () => {
    const reg = new ActionRegistry({ invokeCommand: okBridge() });
    reg.register({ id: 'view.commandPalette', label: 'Palette', shortcut: 'Ctrl+Shift+P', run: async () => {} });
    expect(() => reg.register({ id: 'test.other', label: 'Other', shortcut: 'shift+control+p', run: async () => {} }))
      .toThrow(/already used by 'view.commandPalette'/);
  });

  test('registered Actions cannot be modified', () => {
    const reg = new ActionRegistry({ invokeCommand: okBridge() });
    reg.register({ id: 'app.quit', label: 'Quit', command: 'app.quit' });
    expect(Object.isFrozen(reg.get('app.quit'))).toBe(true);
  });
});

describe('ActionRegistry.run', () => {
  test('an alias Action forwards to its Command and resolves to the reply', async () => {
    const invokeCommand = okBridge();
    const reg = new ActionRegistry({ invokeCommand });
    reg.register({ id: 'app.quit', label: 'Quit', command: 'app.quit' });
    await expect(reg.run('app.quit', { a: 1 }))
      .resolves.toEqual({ ok: true, value: { id: 'app.quit', args: { a: 1 } } });
    expect(invokeCommand).toHaveBeenCalledWith('app.quit', { a: 1 });
  });

  test('an alias Action passes an ok: false reply through', async () => {
    const reply = { ok: false, error: { message: "Unknown Command 'app.nope'" } };
    const reg = new ActionRegistry({ invokeCommand: async () => reply });
    reg.register({ id: 'app.nope', label: 'Nope', command: 'app.nope' });
    await expect(reg.run('app.nope')).resolves.toEqual(reply);
  });

  test('a client Action runs in the renderer, without the bridge', async () => {
    const invokeCommand = okBridge();
    const reg = new ActionRegistry({ invokeCommand });
    reg.register({ id: 'test.double', label: 'Double', run: async (n) => n * 2 });
    await expect(reg.run('test.double', 21)).resolves.toBe(42);
    expect(invokeCommand).not.toHaveBeenCalled();
  });

  test('an unknown Action rejects', async () => {
    const reg = new ActionRegistry({ invokeCommand: okBridge() });
    await expect(reg.run('nope.nothing')).rejects.toThrow(/Unknown Action 'nope.nothing'/);
  });
});

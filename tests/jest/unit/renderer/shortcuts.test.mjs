// Unit tests — shortcut parsing, matching and dispatch (docs/contracts/ACTION_COMMAND.md §6).
const { jest } = import.meta;
import { parseShortcut, normalizeShortcut, matchesShortcut, installShortcuts }
  from '../../../../www/src/renderer/shortcuts.js';
import { ActionRegistry } from '../../../../www/src/renderer/action_registry.js';

const key = (k, mods = {}) => ({ key: k, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, ...mods });

describe('parseShortcut / normalizeShortcut', () => {
  test('parses modifiers and key', () => {
    expect(parseShortcut('Ctrl+Shift+P')).toEqual({ ctrl: true, alt: false, shift: true, key: 'P' });
  });

  test('normalizes spelling and order', () => {
    expect(normalizeShortcut('shift+control+p')).toBe('Ctrl+Shift+P');
    expect(normalizeShortcut('Ctrl+Q')).toBe('Ctrl+Q');
  });

  test.each(['', 'Ctrl+', 'Ctrl', 'Hyper+P', 42])('rejects malformed shortcut %p', (s) => {
    expect(() => parseShortcut(s)).toThrow(TypeError);
  });
});

describe('matchesShortcut', () => {
  test('Ctrl+Shift+P matches the exact combination only', () => {
    expect(matchesShortcut('Ctrl+Shift+P', key('P', { ctrlKey: true, shiftKey: true }))).toBe(true);
    expect(matchesShortcut('Ctrl+Shift+P', key('p', { ctrlKey: true, shiftKey: true }))).toBe(true);
    expect(matchesShortcut('Ctrl+Shift+P', key('P', { ctrlKey: true }))).toBe(false);
    expect(matchesShortcut('Ctrl+Shift+P', key('P', { ctrlKey: true, shiftKey: true, altKey: true }))).toBe(false);
    expect(matchesShortcut('Ctrl+Shift+P', key('P', { ctrlKey: true, shiftKey: true, metaKey: true }))).toBe(false);
  });

  test('Ctrl+Q matches Ctrl+q, not q nor Ctrl+Shift+Q', () => {
    expect(matchesShortcut('Ctrl+Q', key('q', { ctrlKey: true }))).toBe(true);
    expect(matchesShortcut('Ctrl+Q', key('q'))).toBe(false);
    expect(matchesShortcut('Ctrl+Q', key('Q', { ctrlKey: true, shiftKey: true }))).toBe(false);
  });
});

describe('installShortcuts', () => {
  function setup() {
    const invokeCommand = jest.fn(async () => ({ ok: true }));
    const reg = new ActionRegistry({ invokeCommand });
    const palette = jest.fn(async () => {});
    reg.register({ id: 'view.commandPalette', label: 'Palette', shortcut: 'Ctrl+Shift+P', run: palette });
    reg.register({ id: 'app.quit', label: 'Quit', shortcut: 'Ctrl+Q', command: 'app.quit' });
    let listener;
    const target = { addEventListener: (type, fn) => { if (type === 'keydown') listener = fn; } };
    installShortcuts(reg, target);
    const press = (event) => { event.preventDefault = jest.fn(); listener(event); return event; };
    return { invokeCommand, palette, press };
  }

  test('runs the matching client Action and prevents the default', () => {
    const { palette, press } = setup();
    const event = press(key('P', { ctrlKey: true, shiftKey: true }));
    expect(palette).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  test('runs the matching alias Action through the bridge', () => {
    const { invokeCommand, press } = setup();
    press(key('q', { ctrlKey: true }));
    expect(invokeCommand).toHaveBeenCalledWith('app.quit', undefined);
  });

  test('ignores keys without a matching Action', () => {
    const { invokeCommand, palette, press } = setup();
    const event = press(key('x', { ctrlKey: true }));
    expect(palette).not.toHaveBeenCalled();
    expect(invokeCommand).not.toHaveBeenCalled();
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});

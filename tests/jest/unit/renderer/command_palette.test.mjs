// Unit tests — command palette filtering (docs/contracts/ACTION_COMMAND.md §7).
// The palette's DOM behaviour is covered end-to-end (tests/playwright/e2e).
import { filterActions, PALETTE_ACTION_ID } from '../../../../www/src/renderer/command_palette.js';

const actions = [
  { id: PALETTE_ACTION_ID, label: 'Command Palette' },
  { id: 'app.quit', label: 'Quit' },
  { id: 'test.quick', label: 'Quick Look' }
];

describe('filterActions', () => {
  test('empty query lists every Action except the palette itself, in order', () => {
    expect(filterActions(actions, '', PALETTE_ACTION_ID).map((a) => a.id)).toEqual(['app.quit', 'test.quick']);
  });

  test('matches a substring, case-insensitively', () => {
    expect(filterActions(actions, 'QUI', PALETTE_ACTION_ID).map((a) => a.id)).toEqual(['app.quit', 'test.quick']);
    expect(filterActions(actions, 'quit', PALETTE_ACTION_ID).map((a) => a.id)).toEqual(['app.quit']);
    expect(filterActions(actions, ' look ', PALETTE_ACTION_ID).map((a) => a.id)).toEqual(['test.quick']);
  });

  test('no match gives an empty list', () => {
    expect(filterActions(actions, 'zzz', PALETTE_ACTION_ID)).toEqual([]);
  });
});

// Unit tests — command palette filtering (docs/contracts/ACTION_COMMAND.md §7).
// The palette's DOM behaviour is covered end-to-end (tests/playwright/e2e).
import { filterActions, sortByLabel, initialSelection, PALETTE_ACTION_ID } from '../../../../src/renderer/command_palette.js';

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

describe('filterActions with localised labels', () => {
  const fr = { 'app.quit': 'Quitter', 'test.quick': 'Aperçu rapide' };
  const labelOf = (a) => fr[a.id] || a.label;

  test('filters on the displayed label, not the English one', () => {
    expect(filterActions(actions, 'quitter', PALETTE_ACTION_ID, labelOf).map((a) => a.id)).toEqual(['app.quit']);
    expect(filterActions(actions, 'look', PALETTE_ACTION_ID, labelOf)).toEqual([]);
    expect(filterActions(actions, 'APERÇU', PALETTE_ACTION_ID, labelOf).map((a) => a.id)).toEqual(['test.quick']);
  });
});

describe('sortByLabel', () => {
  test('sorts by displayed label, alphabetically for the locale, without changing the input', () => {
    const list = [{ id: 'a.q', label: 'Fichier : Quitter' }, { id: 'a.t', label: 'Affichage : Thème' },
      { id: 'a.p', label: 'Préférences : Langue' }, { id: 'a.h', label: 'Aide : À propos' }];
    expect(sortByLabel(list, (a) => a.label, 'fr').map((a) => a.id)).toEqual(['a.t', 'a.h', 'a.q', 'a.p']);
    expect(list[0].id).toBe('a.q');
  });

  test('ignores case and accents in the comparison', () => {
    const list = [{ id: 'b', label: 'été' }, { id: 'a', label: 'Abc' }, { id: 'c', label: 'Zed' }];
    expect(sortByLabel(list, (a) => a.label, 'fr').map((a) => a.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('initialSelection', () => {
  const quit = { id: 'app.quit' };
  const about = { id: 'help.about' };

  test('the first entry, unless it is listed in noPreselect', () => {
    expect(initialSelection([about, quit], ['app.quit'])).toBe(0);
    expect(initialSelection([quit, about], ['app.quit'])).toBe(-1);
    expect(initialSelection([quit], ['app.quit'])).toBe(-1);
    expect(initialSelection([quit, about])).toBe(0);
  });

  test('nothing to select in an empty list', () => {
    expect(initialSelection([], ['app.quit'])).toBe(-1);
  });
});

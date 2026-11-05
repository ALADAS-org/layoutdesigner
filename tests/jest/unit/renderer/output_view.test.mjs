// Unit tests — the Output source selector state (OUTPUT_PANEL.md §4, built in N0.6).
import { selectorState } from '../../../../src/renderer/output_view.js';

test('one source: no selector, no tags', () => {
  expect(selectorState(['Layout Designer'], new Set())).toMatchObject({ visible: false, withSource: false });
});

test('several sources: « n / m sources », tags when several are checked', () => {
  const s = selectorState(['Layout Designer', 'A.x', 'A.y'], new Set(['A.x']));
  expect(s).toMatchObject({ visible: true, checked: ['Layout Designer', 'A.y'], summary: '2 / 3 sources', withSource: true });
});

test('a new source is checked by default; the last checked one cannot be unchecked', () => {
  const s = selectorState(['Layout Designer', 'A.x', 'A.new'], new Set(['Layout Designer', 'A.x']));
  expect(s.checked).toEqual(['A.new']);
  expect(s.withSource).toBe(false);
  expect(s.canUncheck('A.new')).toBe(false);
  expect(s.canUncheck('A.x')).toBe(true);
});

test('the closed value is localised', () => {
  expect(selectorState(['a', 'b'], new Set(), (n, m) => `${n} sur ${m}`).summary).toBe('2 sur 2');
});

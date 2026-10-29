// Unit tests — pure helpers of the N0.3 vizjets.
import { cycleIndex } from '../../../../src/vizjets/menubar/menubar.js';
import { tooltipOf } from '../../../../src/vizjets/main_toolbar/main_toolbar.js';

describe('cycleIndex (menu keyboard navigation)', () => {
  test.each([
    [0, 1, 3, 1], [2, 1, 3, 0], [0, -1, 3, 2], [1, -1, 3, 0], [-1, 1, 3, 0], [0, 1, 1, 0], [0, 1, 0, -1]
  ])('cycleIndex(%p, %p, %p) → %p', (index, delta, length, expected) => {
    expect(cycleIndex(index, delta, length)).toBe(expected);
  });
});

describe('tooltipOf (toolbar)', () => {
  test('label and shortcut, as in Illustrator', () => {
    expect(tooltipOf('Command Palette', 'Ctrl+Shift+P')).toBe('Command Palette (Ctrl+Shift+P)');
    expect(tooltipOf('Light / Dark Theme', undefined)).toBe('Light / Dark Theme');
  });
});

// Unit tests — bottom panel sizing rules (docs/contracts/OUTPUT_PANEL.md §2).
import {
  clampBodyHeight, MIN_BODY_PX, DOCUMENT_MIN_PX, INITIAL_FRACTION, INITIAL_FOLDED, INITIAL_TAB, TABS
} from '../../../../src/vizjets/bottom_panel/bottom_panel.js';

describe('bottom panel first-launch state', () => {
  test('folded on Output, 18.75 % of the window once unfolded, tabs in VS Code order', () => {
    expect(TABS).toEqual(['output', 'debugConsole', 'terminal']);
    expect(INITIAL_TAB).toBe('output');
    expect(INITIAL_FOLDED).toBe(true);
    expect(INITIAL_FRACTION).toBe(0.1875);
  });
});

describe('clampBodyHeight', () => {
  const room = 700; // workspace − tab row − splitter

  test('keeps a height within the limits', () => {
    expect(clampBodyHeight(200, room)).toBe(200);
  });

  test('never goes below about three lines of text', () => {
    expect(clampBodyHeight(10, room)).toBe(MIN_BODY_PX);
  });

  test('always leaves the document area at least 100 px', () => {
    expect(clampBodyHeight(10000, room)).toBe(room - DOCUMENT_MIN_PX);
  });

  test('in a window too small for both limits, the minimum wins', () => {
    expect(clampBodyHeight(300, 120)).toBe(MIN_BODY_PX);
  });

  test('rounds to whole pixels', () => {
    expect(clampBodyHeight(123.6, room)).toBe(124);
  });
});

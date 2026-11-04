// Unit tests — Terminal restart policy (OUTPUT_PANEL.md §6, PO decision 2026-11-04).
import { afterExit, QUICK_EXIT_MS, QUICK_EXITS_TO_STOP } from '../../../../src/renderer/terminal_view.js';

test('a shell that lived is replaced, and the quick-exit count goes back to 0', () => {
  expect(afterExit(5000, 1)).toEqual({ restart: true, quickExits: 0 });
});

test('one quick exit is still restarted', () => {
  expect(afterExit(QUICK_EXIT_MS - 1, 0)).toEqual({ restart: true, quickExits: 1 });
});

test('two quick exits in a row stop the restarts (no loop)', () => {
  expect(QUICK_EXITS_TO_STOP).toBe(2);
  expect(afterExit(10, 1)).toEqual({ restart: false, quickExits: 2 });
});

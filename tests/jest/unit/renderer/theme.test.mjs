// Unit tests — predefined themes (N0.3).
import { THEMES, DEFAULT_THEME, nextTheme, applyTheme, currentTheme } from '../../../../src/renderer/theme.js';

const fakeDoc = () => ({ documentElement: { dataset: {} } });

describe('themes', () => {
  test('two predefined themes, dark by default', () => {
    expect(THEMES).toEqual(['light', 'dark']);
    expect(DEFAULT_THEME).toBe('dark');
  });

  test('nextTheme alternates', () => {
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('light');
  });

  test('applyTheme sets <html data-theme>, currentTheme reads it', () => {
    const doc = fakeDoc();
    expect(currentTheme(doc)).toBe('dark');
    applyTheme(doc, 'light');
    expect(doc.documentElement.dataset.theme).toBe('light');
    expect(currentTheme(doc)).toBe('light');
  });

  test('applyTheme rejects an unknown theme', () => {
    expect(() => applyTheme(fakeDoc(), 'sepia')).toThrow(TypeError);
  });
});

// Unit tests — balanced two-line split of the restart warning (N0.3).
import { splitBalanced } from '../../../../src/renderer/toast.js';

describe('splitBalanced', () => {
  test('splits at the space nearest the middle', () => {
    expect(splitBalanced('La nouvelle langue sera appliquée au prochain démarrage de Layout Designer.'))
      .toEqual(['La nouvelle langue sera appliquée au', 'prochain démarrage de Layout Designer.']);
    expect(splitBalanced('The new language will be applied when Layout Designer restarts.'))
      .toEqual(['The new language will be applied', 'when Layout Designer restarts.']);
  });

  test('the two lines differ as little as possible', () => {
    const text = 'aa bb cc dd ee ff';
    const [a, b] = splitBalanced(text);
    expect(Math.abs(a.length - b.length)).toBeLessThanOrEqual(3);
    expect(`${a} ${b}`).toBe(text);
  });

  test('uses the given measure (e.g. rendered width)', () => {
    const wide = (s) => [...s].reduce((n, c) => n + (c === 'W' ? 10 : 1), 0);
    expect(splitBalanced('WW a b c d e f g h', wide)).toEqual(['WW', 'a b c d e f g h']);
  });

  test('a single word stays on one line', () => {
    expect(splitBalanced('Hello')).toEqual(['Hello']);
    expect(splitBalanced('  Hello  ')).toEqual(['Hello']);
  });
});

// Unit tests — Preferences › Plugins: the plugins a bulk action concerns, transitively
// (docs/contracts/PLUGIN_DEPENDENCIES.md §6). Tag @N0.6bis (roadmap lot).
import { dependentsOf, prerequisitesOf } from '../../../../src/vizjets/preferences_dialog/preferences_dialog.js';

const row = (id, dependencies = []) => ({ id, displayName: id, kind: 'server', keywords: [], state: 'loaded', enabled: true, dependencies });
// core ← evm ← base, polygon; core ← solana; other alone (the NFT graph of the backlog).
const rows = [
  row('A.base', ['A.evm']), row('A.core'), row('A.evm', ['A.core']),
  row('A.other'), row('A.polygon', ['A.evm']), row('A.solana', ['A.core'])
];
const ids = (list) => list.map((r) => r.id);

describe('Preferences › Plugins — transitive lists @N0.6bis', () => {
  test('dependentsOf: who would be blocked, in list order, the selection excluded', () => {
    expect(ids(dependentsOf(['A.core'], rows))).toEqual(['A.base', 'A.evm', 'A.polygon', 'A.solana']);
    expect(ids(dependentsOf(['A.evm'], rows))).toEqual(['A.base', 'A.polygon']);
    expect(ids(dependentsOf(['A.core', 'A.evm'], rows))).toEqual(['A.base', 'A.polygon', 'A.solana']);
    expect(dependentsOf(['A.other'], rows)).toEqual([]);
  });

  test('prerequisitesOf: what is needed, in list order, the selection excluded; unknown ids ignored', () => {
    expect(ids(prerequisitesOf(['A.base'], rows))).toEqual(['A.core', 'A.evm']);
    expect(ids(prerequisitesOf(['A.solana', 'A.polygon'], rows))).toEqual(['A.core', 'A.evm']);
    expect(prerequisitesOf(['A.x'], [row('A.x', ['A.gone'])])).toEqual([]);
  });

  test('a cycle does not loop', () => {
    const cyc = [row('A.a', ['A.b']), row('A.b', ['A.a'])];
    expect(ids(dependentsOf(['A.a'], cyc))).toEqual(['A.b']);
    expect(ids(prerequisitesOf(['A.a'], cyc))).toEqual(['A.b']);
  });
});

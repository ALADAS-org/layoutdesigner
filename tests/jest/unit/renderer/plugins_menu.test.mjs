// Unit tests — the Plugins menu model (PLUGIN_API.md §8.1).
import { pluginsMenuModel } from '../../../../src/renderer/plugins_menu.js';

const a = (id, label, menuGroup) => ({ id, label, menuGroup });
const labelOf = (action) => action.label;

test('no plugin Action: no menu', () => {
  expect(pluginsMenuModel([], labelOf)).toBeNull();
});

test('submenus by menuGroup (by theme, across plugins), sorted by name, then ungrouped; by label inside', () => {
  const model = pluginsMenuModel([
    a('P.z.x', 'Zebra'),
    a('P.b.hello', 'Hello from the server', 'Demo'),
    a('P.a.hello', 'Hello from the renderer', 'Demo'),
    a('P.c.x', 'export', 'Arrange'),
    a('P.d.x', 'Apple')
  ], labelOf);
  expect(model.groups.map((g) => [g.name, g.actions.map((x) => x.label)])).toEqual([
    ['Arrange', ['export']],
    ['Demo', ['Hello from the renderer', 'Hello from the server']]
  ]);
  expect(model.ungrouped.map((x) => x.label)).toEqual(['Apple', 'Zebra']);
});

// Unit tests — vizjet loader (N0.3).
import { loadVizjets } from '../../../../src/renderer/vizjet_loader.js';

test('inserts each host\'s HTML, fetched from its data-vizjet path', async () => {
  const hosts = [
    { dataset: { vizjet: 'vizjets/a/a.html' }, innerHTML: '' },
    { dataset: { vizjet: 'vizjets/b/b.html' }, innerHTML: '' }
  ];
  const doc = { querySelectorAll: (selector) => (selector === '[data-vizjet]' ? hosts : []) };
  await loadVizjets(doc, async (url) => `<p>${url}</p>`);
  expect(hosts.map((h) => h.innerHTML)).toEqual(['<p>vizjets/a/a.html</p>', '<p>vizjets/b/b.html</p>']);
});

test('a failing fetch rejects', async () => {
  const doc = { querySelectorAll: () => [{ dataset: { vizjet: 'x.html' }, innerHTML: '' }] };
  await expect(loadVizjets(doc, async () => { throw new Error('missing'); })).rejects.toThrow('missing');
});

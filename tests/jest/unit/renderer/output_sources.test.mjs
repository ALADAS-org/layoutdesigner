// Unit tests — Output lines and sources (docs/contracts/OUTPUT_PANEL.md §4).
import { createOutput, formatLine, formatTime, APP_SOURCE } from '../../../../src/renderer/output_sources.js';

const at = (h, m, s) => new Date(2026, 10, 3, h, m, s).getTime();

describe('createOutput', () => {
  test('a source appends lines that carry it', () => {
    const output = createOutput();
    output.source(APP_SOURCE).append('info', 'Labels loaded: fr', at(9, 0, 0));
    expect(output.lines()).toMatchObject([{ source: 'Layout Designer', level: 'info', message: 'Labels loaded: fr' }]);
    expect(output.sources()).toEqual(['Layout Designer']);
  });

  test('keeps lines in time order, whatever their arrival order', () => {
    const output = createOutput();
    output.add({ source: APP_SOURCE, level: 'info', time: at(9, 0, 2), message: 'renderer' });
    output.add({ source: APP_SOURCE, level: 'info', time: at(9, 0, 1), message: 'main' });
    output.add({ source: APP_SOURCE, level: 'info', time: at(9, 0, 2), message: 'renderer 2' });
    expect(output.lines().map((l) => l.message)).toEqual(['main', 'renderer', 'renderer 2']);
  });

  test('rejects an unknown level or a missing source', () => {
    const output = createOutput();
    expect(() => output.source(APP_SOURCE).append('debug', 'x')).toThrow(TypeError);
    expect(() => output.add({ source: '', level: 'info', time: 0, message: 'x' })).toThrow(TypeError);
  });

  test('notifies its listeners', () => {
    const output = createOutput();
    const seen = [];
    output.onChange((line) => seen.push(line.message));
    output.source('ld-dummy').append('warn', 'hello');
    expect(seen).toEqual(['hello']);
  });
});

describe('formatLine', () => {
  const line = { source: 'ld-dummy-server', level: 'info', time: at(14, 9, 5), message: 'Hello' };

  test('the mock-up format: level, time to the second, message', () => {
    expect(formatLine(line)).toBe('[info]  14:09:05  Hello');
  });

  test('with several sources shown, the source follows the time', () => {
    expect(formatLine(line, { withSource: true })).toBe('[info]  14:09:05  [ld-dummy-server]  Hello');
  });

  test('time is padded to two digits', () => {
    expect(formatTime(at(7, 3, 9))).toBe('07:03:09');
  });
});

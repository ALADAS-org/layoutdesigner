// Unit tests — main-process journal (docs/contracts/OUTPUT_PANEL.md §4, §7).
'use strict';

const { createJournal, APP_SOURCE, LEVELS } = require('../../../../src/server/journal.js');

function setup() {
  const out = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
  let t = 1000;
  const journal = createJournal({ out, now: () => t++ });
  return { out, journal };
}

describe('journal.log', () => {
  test('keeps a line under the Layout Designer source, with level, time and message', () => {
    const { journal } = setup();
    journal.log('info', 'Started');
    expect(journal.history()).toEqual([{ source: APP_SOURCE, level: 'info', time: 1000, message: 'Started' }]);
  });

  test('still writes to the console, with the matching method', () => {
    const { out, journal } = setup();
    journal.log('info', 'a');
    journal.log('warn', 'b');
    journal.log('error', 'c');
    expect(out.log).toHaveBeenCalledWith('a');
    expect(out.warn).toHaveBeenCalledWith('b');
    expect(out.error).toHaveBeenCalledWith('c');
  });

  test('accepts only the three levels', () => {
    const { journal } = setup();
    expect(LEVELS).toEqual(['info', 'warn', 'error']);
    expect(() => journal.log('debug', 'x')).toThrow(TypeError);
  });
});

describe('journal.subscribe', () => {
  test('a subscriber gets the later lines only; history keeps the earlier ones', () => {
    const { journal } = setup();
    journal.log('info', 'before');
    const sink = jest.fn();
    const unsubscribe = journal.subscribe(sink);
    journal.log('warn', 'after');
    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink.mock.calls[0][0]).toMatchObject({ level: 'warn', message: 'after' });
    expect(journal.history().map((l) => l.message)).toEqual(['before', 'after']);
    unsubscribe();
    journal.log('info', 'later');
    expect(sink).toHaveBeenCalledTimes(1);
  });
});

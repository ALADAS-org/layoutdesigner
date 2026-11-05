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

describe('journal sources (N0.6)', () => {
  test('source(name).log writes under that source, prefixed in the console', () => {
    const printed = [];
    const j = createJournal({ out: { log: (m) => printed.push(m), warn() {}, error() {} }, now: () => 0 });
    j.source('Acme.demo').log('info', 'hello');
    expect(j.history()).toEqual([{ source: 'Acme.demo', level: 'info', time: 0, message: 'hello' }]);
    expect(printed).toEqual(['[Acme.demo] hello']);
  });

  test('at most MAX_LINES_PER_SOURCE lines per source: the oldest of that source goes', () => {
    const { MAX_LINES_PER_SOURCE } = require('../../../../src/server/journal.js');
    const j = createJournal({ out: { log() {}, warn() {}, error() {} }, now: () => 0 });
    j.log('info', 'app line');
    for (let i = 0; i <= MAX_LINES_PER_SOURCE; i++) j.source('p').log('info', `p${i}`);
    const lines = j.history();
    expect(lines.filter((l) => l.source === 'p')).toHaveLength(MAX_LINES_PER_SOURCE);
    expect(lines[0].message).toBe('app line');
    expect(lines[1].message).toBe('p1');
  });
});

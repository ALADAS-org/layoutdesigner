// Unit tests — Debug Console line parsing and Tab completion (OUTPUT_PANEL.md §5).
import { tokenize, parseCommandLine, complete, WORDS } from '../../../../src/renderer/debug_console.js';

describe('tokenize', () => {
  test('splits on spaces; double quotes keep spaces', () => {
    expect(tokenize('  cd  "My Folder"  ')).toEqual(['cd', 'My Folder']);
    expect(tokenize('preferences.setLanguage language=fr')).toEqual(['preferences.setLanguage', 'language=fr']);
  });
});

describe('parseCommandLine', () => {
  test('an empty line asks for nothing', () => {
    expect(parseCommandLine('   ')).toBeNull();
  });

  test('an Action id with key=value arguments', () => {
    expect(parseCommandLine('view.toggleTheme')).toEqual({ word: 'view.toggleTheme', actionId: 'view.toggleTheme', args: undefined });
    expect(parseCommandLine('x.y a=1 b=two')).toEqual({ word: 'x.y', actionId: 'x.y', args: { a: '1', b: 'two' } });
  });

  test('short words are aliases of the Debug Console Actions', () => {
    expect(WORDS).toEqual({
      help: 'debugConsole.showHelp',
      clear: 'debugConsole.clear',
      pwd: 'debugConsole.showFolder',
      ls: 'debugConsole.listFolder',
      cd: 'debugConsole.setFolder'
    });
    expect(parseCommandLine('help')).toMatchObject({ actionId: 'debugConsole.showHelp', args: undefined });
  });

  test('ls and cd take a folder as first positional argument', () => {
    expect(parseCommandLine('cd ..')).toMatchObject({ actionId: 'debugConsole.setFolder', args: { folder: '..' } });
    expect(parseCommandLine('ls "C:\\Program Files"')).toMatchObject({ args: { folder: 'C:\\Program Files' } });
  });

  test('any other positional argument is an error', () => {
    expect(parseCommandLine('view.toggleTheme now')).toEqual({ word: 'view.toggleTheme', error: 'unexpectedArgument', arg: 'now' });
    expect(parseCommandLine('cd a b')).toMatchObject({ error: 'unexpectedArgument', arg: 'b' });
  });
});

describe('complete', () => {
  const candidates = ['help', 'view.toggleTheme', 'view.togglePanel', 'view.showOutput'];

  test('a single match is completed, followed by a space', () => {
    expect(complete('he', candidates)).toEqual({ completed: 'help ', matches: ['help'] });
  });

  test('several matches: the longest common prefix', () => {
    expect(complete('view.t', candidates)).toEqual({ completed: 'view.toggle', matches: ['view.togglePanel', 'view.toggleTheme'] });
  });

  test('no match leaves the text as it is', () => {
    expect(complete('zz', candidates)).toEqual({ completed: 'zz', matches: [] });
  });
});

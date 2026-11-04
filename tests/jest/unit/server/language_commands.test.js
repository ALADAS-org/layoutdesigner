// Unit tests — preferences file and interface language Commands (N0.3).
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { CommandRegistry } = require('../../../../src/server/command_registry.js');
const { preferencesPath, readPreferences, writePreferences, DEFAULT_PREFERENCES_PATH } =
  require('../../../../src/server/preferences.js');
const { listLanguages, resolveStartupLocale, registerLanguageCommands, I18N_DIR } =
  require('../../../../src/server/language_commands.js');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'ld-test-'));

describe('preferences file', () => {
  test('default path is src/config/preferences.json; LD_PREFERENCES_PATH overrides it', () => {
    expect(DEFAULT_PREFERENCES_PATH.split(path.sep).slice(-3)).toEqual(['src', 'config', 'preferences.json']);
    expect(preferencesPath({})).toBe(DEFAULT_PREFERENCES_PATH);
    expect(preferencesPath({ LD_PREFERENCES_PATH: '/x/p.json' })).toBe('/x/p.json');
  });

  test('missing file reads as {}; write creates the folder; read gives it back', () => {
    const file = path.join(tmp(), 'config', 'preferences.json');
    expect(readPreferences(file)).toEqual({});
    writePreferences(file, { language: 'fr' });
    expect(readPreferences(file)).toEqual({ language: 'fr' });
  });

  test.each([['{ not json'], ['[1, 2]'], ['"text"'], ['null']])('a broken file %p reads as {}', (text) => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const file = path.join(tmp(), 'preferences.json');
    fs.writeFileSync(file, text);
    expect(readPreferences(file)).toEqual({});
    jest.restoreAllMocks();
  });
});

describe('listLanguages', () => {
  test('the label files of src/i18n, named by their "Language/Name" key', () => {
    expect(listLanguages(I18N_DIR)).toEqual([{ code: 'en', name: 'English' }, { code: 'fr', name: 'Français' }]);
  });

  test('ignores other files; a file without a name is named by its code', () => {
    const dir = tmp();
    fs.writeFileSync(path.join(dir, 'LD_Labels_de.json'), '{}');
    fs.writeFileSync(path.join(dir, 'LD_Labels_en.json'), '{"Language/Name": "English"}');
    fs.writeFileSync(path.join(dir, 'notes.json'), '{}');
    expect(listLanguages(dir)).toEqual([{ code: 'de', name: 'de' }, { code: 'en', name: 'English' }]);
  });
});

describe('resolveStartupLocale', () => {
  test('--lang switch, then preferences, then system locale', () => {
    expect(resolveStartupLocale({ switchLang: 'en', preferred: 'fr', systemLocale: 'de-DE' })).toBe('en');
    expect(resolveStartupLocale({ switchLang: '', preferred: 'fr', systemLocale: 'de-DE' })).toBe('fr');
    expect(resolveStartupLocale({ switchLang: '', preferred: undefined, systemLocale: 'de-DE' })).toBe('de-DE');
    expect(resolveStartupLocale({})).toBe('');
  });
});

describe('language Commands', () => {
  function setup() {
    const prefsFile = path.join(tmp(), 'preferences.json');
    const reg = new CommandRegistry();
    registerLanguageCommands(reg, { prefsFile });
    const app = (lang, locale) => ({ commandLine: { getSwitchValue: () => lang }, getLocale: () => locale });
    return { reg, prefsFile, app };
  }

  test('i18n.startupInfo gives the locale to start with and the languages', async () => {
    const { reg, prefsFile, app } = setup();
    let reply = await reg.run('i18n.startupInfo', undefined, { app: app('', 'fr-BE') });
    expect(reply).toEqual({
      ok: true,
      value: { locale: 'fr-BE', languages: [{ code: 'en', name: 'English' }, { code: 'fr', name: 'Français' }] }
    });
    writePreferences(prefsFile, { language: 'en' });
    reply = await reg.run('i18n.startupInfo', undefined, { app: app('', 'fr-BE') });
    expect(reply.value.locale).toBe('en');
  });

  test('prefs.setLanguage saves the language, keeping other preferences', async () => {
    const { reg, prefsFile } = setup();
    writePreferences(prefsFile, { other: 1 });
    await expect(reg.run('prefs.setLanguage', { language: 'fr' }, {})).resolves.toEqual({ ok: true, value: { language: 'fr' } });
    expect(readPreferences(prefsFile)).toEqual({ other: 1, language: 'fr' });
  });

  test('prefs.setLanguage rejects a language without label file', async () => {
    const { reg, prefsFile } = setup();
    const reply = await reg.run('prefs.setLanguage', { language: 'xx' }, {});
    expect(reply.ok).toBe(false);
    expect(reply.error.message).toMatch(/Unknown language 'xx'/);
    expect(fs.existsSync(prefsFile)).toBe(false);
  });
});

describe('defaults and reset (N0.5 step 6)', () => {
  const { DEFAULTS_PATH, readDefaults, inspectPreferences, resetPreferences } = require('../../../../src/server/preferences.js');
  const { registerPreferencesCommands } = require('../../../../src/server/preferences_commands.js');

  test('preferences.default.json is valid JSON and lists every preference', () => {
    expect(readDefaults(DEFAULTS_PATH)).toEqual({ language: null, theme: 'dark' }); // null = system language
  });

  test('inspectPreferences tells ok, missing and invalid apart, without logging', () => {
    const dir = tmp();
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(inspectPreferences(path.join(dir, 'none.json')).status).toBe('missing');
    fs.writeFileSync(path.join(dir, 'bad.json'), '{ not json');
    expect(inspectPreferences(path.join(dir, 'bad.json')).status).toBe('invalid');
    fs.writeFileSync(path.join(dir, 'ok.json'), '{"language": "fr"}');
    expect(inspectPreferences(path.join(dir, 'ok.json'))).toEqual({ status: 'ok', prefs: { language: 'fr' } });
    expect(spy).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  test('resetPreferences keeps the replaced file as .bak, then writes the defaults', () => {
    const file = path.join(tmp(), 'preferences.json');
    expect(resetPreferences(file)).toEqual({ backup: null, prefs: { language: null, theme: 'dark' } }); // no file yet
    fs.writeFileSync(file, '{ not json');
    expect(resetPreferences(file).backup).toBe(`${file}.bak`);
    expect(fs.readFileSync(`${file}.bak`, 'utf8')).toBe('{ not json');
    expect(JSON.parse(fs.readFileSync(file, 'utf8'))).toEqual({ language: null, theme: 'dark' });
  });

  test('prefs.info and prefs.reset; prefs.setLanguage accepts null', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    const prefsFile = path.join(tmp(), 'preferences.json');
    const reg = new CommandRegistry();
    registerPreferencesCommands(reg, { prefsFile });
    registerLanguageCommands(reg, { prefsFile });
    expect((await reg.run('prefs.info', undefined, {})).value).toEqual({ file: prefsFile, status: 'missing', language: null, theme: 'dark' });
    await reg.run('prefs.setLanguage', { language: 'fr' }, {});
    expect((await reg.run('prefs.info', undefined, {})).value).toMatchObject({ status: 'ok', language: 'fr' });
    expect(await reg.run('prefs.reset', undefined, {})).toEqual({ ok: true, value: { backup: `${prefsFile}.bak`, language: null, theme: 'dark' } });
    await expect(reg.run('prefs.setLanguage', { language: null }, {})).resolves.toEqual({ ok: true, value: { language: null } });
    expect(JSON.parse(fs.readFileSync(prefsFile, 'utf8'))).toEqual({ language: null, theme: 'dark' });
    jest.restoreAllMocks();
  });

  test('prefs.setTheme remembers light or dark; prefs.info falls back to dark', async () => {
    const prefsFile = path.join(tmp(), 'preferences.json');
    const reg = new CommandRegistry();
    registerPreferencesCommands(reg, { prefsFile });
    await expect(reg.run('prefs.setTheme', { theme: 'light' }, {})).resolves.toEqual({ ok: true, value: { theme: 'light' } });
    expect((await reg.run('prefs.info', undefined, {})).value.theme).toBe('light');
    expect((await reg.run('prefs.setTheme', { theme: 'pink' }, {})).ok).toBe(false);
    fs.writeFileSync(prefsFile, '{"theme": "pink"}');
    expect((await reg.run('prefs.info', undefined, {})).value.theme).toBe('dark');
  });
});

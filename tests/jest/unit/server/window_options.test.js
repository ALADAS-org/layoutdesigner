// Unit test — main window options respect the Electron security invariants.
'use strict';

const { APP_TITLE, buildMainWindowOptions } = require('../../../../www/src/server/window_options.js');

describe('buildMainWindowOptions', () => {
  test('enables context isolation and disables Node integration', () => {
    const { webPreferences } = buildMainWindowOptions();
    expect(webPreferences.contextIsolation).toBe(true);
    expect(webPreferences.nodeIntegration).toBe(false);
  });

  test('uses the application title', () => {
    expect(buildMainWindowOptions().title).toBe(APP_TITLE);
    expect(APP_TITLE).toBe('Layout Designer');
  });

  test('returns a fresh object on each call', () => {
    const a = buildMainWindowOptions();
    a.webPreferences.nodeIntegration = true;
    expect(buildMainWindowOptions().webPreferences.nodeIntegration).toBe(false);
  });
});

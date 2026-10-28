// =====================================================================================
// window_options.js — BrowserWindow options for the main window (Electron main, CJS)
// =====================================================================================
// Kept as a pure function, free of any Electron import, so the security settings can
// be unit-tested without starting Electron.
//
// Security invariants (LD_ReferenceCorpus_Bootstrap.md, "Conventions"):
//   - contextIsolation: true
//   - nodeIntegration : false
// Main-process powers will reach the renderer only through declared IPC in a preload
// bridge; no preload exists yet (it arrives with the Action / Command step, N0.2).
// =====================================================================================
'use strict';

const APP_TITLE = 'Layout Designer';

function buildMainWindowOptions() {
  return {
    title: APP_TITLE,
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  };
}

module.exports = { APP_TITLE, buildMainWindowOptions };

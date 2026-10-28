// =====================================================================================
// window_options.js — BrowserWindow options for the main window (Electron main, CJS)
// =====================================================================================
// Kept as a pure function, free of any Electron import, so the security settings can
// be unit-tested without starting Electron.
//
// Security invariants (LD_ReferenceCorpus_Bootstrap.md, "Conventions"):
//   - contextIsolation: true
//   - nodeIntegration : false
// Main-process powers reach the renderer only through declared IPC in the preload
// bridge (preload.js).
// =====================================================================================
'use strict';

const path = require('path');

const APP_TITLE = 'Layout Designer';
const PRELOAD_PATH = path.join(__dirname, 'preload.js');

function buildMainWindowOptions() {
  return {
    title: APP_TITLE,
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: PRELOAD_PATH
    }
  };
}

module.exports = { APP_TITLE, PRELOAD_PATH, buildMainWindowOptions };

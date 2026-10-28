// =====================================================================================
// electron_main.js — Electron main-process entry point (CJS)
// =====================================================================================
// N0.1: open one secure, empty main window. Nothing else.
// =====================================================================================
'use strict';

const path = require('path');
const { app, BrowserWindow } = require('electron');
const { buildMainWindowOptions } = require('./window_options.js');

const INDEX_HTML = path.join(__dirname, '..', '..', 'index.html');

function createMainWindow() {
  const win = new BrowserWindow(buildMainWindowOptions());
  win.loadFile(INDEX_HTML);
  return win;
}

app.whenReady().then(() => {
  createMainWindow();

  // macOS: re-create a window when the dock icon is clicked and none is open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

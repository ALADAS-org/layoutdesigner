// =====================================================================================
// electron_main.js — Electron main-process entry point (CJS)
// =====================================================================================
// Opens one secure main window and serves Commands to the renderer over a single IPC
// channel (docs/contracts/ACTION_COMMAND.md §5).
// =====================================================================================
'use strict';

const path = require('path');
const { app, BrowserWindow, ipcMain } = require('electron');
const { buildMainWindowOptions } = require('./window_options.js');
const { CommandRegistry } = require('./command_registry.js');
const { registerAppCommands } = require('./app_commands.js');

const INDEX_HTML = path.join(__dirname, '..', 'index.html');

// Same string as in preload.js (a sandboxed preload cannot require local modules).
const COMMAND_INVOKE_CHANNEL = 'ld:command:invoke';

const commands = new CommandRegistry();
registerAppCommands(commands);

function createMainWindow() {
  const win = new BrowserWindow(buildMainWindowOptions());
  win.loadFile(INDEX_HTML);
  return win;
}

app.whenReady().then(() => {
  // Reply is always { ok, value } or { ok: false, error } — never a thrown IPC error.
  ipcMain.handle(COMMAND_INVOKE_CHANNEL, (_event, request) => {
    const { id, args } = request || {};
    return commands.run(id, args, { app });
  });

  createMainWindow();

  // macOS: re-create a window when the dock icon is clicked and none is open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

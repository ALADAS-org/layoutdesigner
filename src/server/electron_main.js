// =====================================================================================
// electron_main.js — Electron main-process entry point (CJS)
// =====================================================================================
// Opens one secure main window and serves Commands to the renderer over a single IPC
// channel (docs/contracts/ACTION_COMMAND.md §5). No native menu: the menu bar is HTML
// (N0.3, contract §13). Main-side traces go to the Output panel through the journal
// (docs/contracts/OUTPUT_PANEL.md §4, §7).
// =====================================================================================
'use strict';

const path = require('path');
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const { buildMainWindowOptions } = require('./window_options.js');
const { CommandRegistry } = require('./command_registry.js');
const { registerAppCommands } = require('./app_commands.js');
const { registerLanguageCommands } = require('./language_commands.js');
const { journal, log } = require('./journal.js');
const { preferencesPath } = require('./preferences.js');
const { version } = require('../../package.json');

const INDEX_HTML = path.join(__dirname, '..', 'index.html');

// Same string as in preload.js (a sandboxed preload cannot require local modules).
const COMMAND_INVOKE_CHANNEL = 'ld:command:invoke';
const OUTPUT_APPEND_CHANNEL = 'ld:output:append';
const OUTPUT_HISTORY_CHANNEL = 'ld:output:history';

log('info', `Layout Designer ${version} started (Electron ${process.versions.electron})`);
log('info', `Preferences file: ${preferencesPath()}`);

const commands = new CommandRegistry();
registerAppCommands(commands);
registerLanguageCommands(commands);

function createMainWindow() {
  const win = new BrowserWindow(buildMainWindowOptions());
  win.loadFile(INDEX_HTML);
  return win;
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);

  // Reply is always { ok, value } or { ok: false, error } — never a thrown IPC error.
  // Context: the app, and the webContents of the window that sent the request.
  ipcMain.handle(COMMAND_INVOKE_CHANNEL, (event, request) => {
    const { id, args } = request || {};
    return commands.run(id, args, { app, webContents: event.sender });
  });

  // Output: a renderer asks for the lines so far and receives every later one.
  ipcMain.handle(OUTPUT_HISTORY_CHANNEL, (event) => {
    const wc = event.sender;
    const unsubscribe = journal.subscribe((line) => {
      if (!wc.isDestroyed()) wc.send(OUTPUT_APPEND_CHANNEL, line);
    });
    wc.once('destroyed', unsubscribe);
    return journal.history();
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

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
const { pathToFileURL } = require('url');
const fs = require('fs');
const { app, BrowserWindow, ipcMain, Menu, protocol, net } = require('electron');
const { buildMainWindowOptions } = require('./window_options.js');
const { CommandRegistry } = require('./command_registry.js');
const { registerAppCommands } = require('./app_commands.js');
const { registerLanguageCommands } = require('./language_commands.js');
const { registerFileCommands } = require('./file_commands.js');
const { registerPreferencesCommands } = require('./preferences_commands.js');
const { createPtyService } = require('./pty_service.js');
const { journal, log } = require('./journal.js');
const { preferencesPath, inspectPreferences } = require('./preferences.js');
const { pluginsPath, discoverPlugins, loadServerPlugins, resolvePluginUrl } = require('./plugin_manager.js');
const { version } = require('../../package.json');

const INDEX_HTML = path.join(__dirname, '..', 'index.html');

// Same string as in preload.js (a sandboxed preload cannot require local modules).
const COMMAND_INVOKE_CHANNEL = 'ld:command:invoke';
const OUTPUT_APPEND_CHANNEL = 'ld:output:append';
const OUTPUT_HISTORY_CHANNEL = 'ld:output:history';
// Terminal (OUTPUT_PANEL.md §7): start is an invoke; the rest are one-way messages.
const PTY = {
  start: 'ld:pty:start', write: 'ld:pty:write', resize: 'ld:pty:resize', kill: 'ld:pty:kill',
  data: 'ld:pty:data', exit: 'ld:pty:exit'
};
const ptys = createPtyService();

log('info', `Layout Designer ${version} started (Electron ${process.versions.electron})`);
log('info', `Preferences file: ${preferencesPath()}`);

const commands = new CommandRegistry();
registerAppCommands(commands);
registerLanguageCommands(commands);
registerFileCommands(commands);
registerPreferencesCommands(commands);

// ---- Plugins (PLUGIN_API.md): discovered once; server plugins loaded before the window.
const PLUGINS = pluginsPath();
// Renderer plugins are ES modules served by plugin://app/<folder>/<file> (§3); the
// scheme must be declared privileged before the app is ready.
protocol.registerSchemesAsPrivileged([
  { scheme: 'plugin', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }
]);
// inspect, not read: the language Command already warns once about an invalid file.
const disabled = /** @type {unknown} */ (inspectPreferences(preferencesPath()).prefs.disabledPlugins);
const plugins = discoverPlugins(PLUGINS, { disabled: Array.isArray(disabled) ? disabled.filter((d) => typeof d === 'string') : [] });
const pluginsReady = loadServerPlugins(plugins, { commands, journal });
commands.register({ id: 'plugins.startupInfo', run: () => pluginsReady });
commands.register({
  id: 'plugins.list',
  run: async () => {
    await pluginsReady;
    return plugins.map(({ id, displayName, kind, keywords, state, reason }) => ({ id, displayName, kind, keywords, state, reason }));
  }
});

function createMainWindow() {
  const win = new BrowserWindow(buildMainWindowOptions());
  win.loadFile(INDEX_HTML);
  return win;
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);

  // plugin:// serves only files inside the plugins folder (§3).
  protocol.handle('plugin', async (request) => {
    const file = resolvePluginUrl(request.url, PLUGINS);
    if (file === null || !fs.existsSync(file)) return new Response('Not found', { status: 404 });
    const response = await net.fetch(pathToFileURL(file).toString());
    return new Response(response.body, {
      headers: { 'Content-Type': 'text/javascript', 'Access-Control-Allow-Origin': '*' }
    });
  });

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

  // Terminal: shells belong to the window that started them, and end with it.
  /** @type {Map<number, Set<number>>} webContents id → its session ids */
  const ptysOf = new Map();
  ipcMain.handle(PTY.start, (event, size) => {
    const wc = event.sender;
    const { cols = 80, rows = 24 } = size || {};
    const id = ptys.start({ cols, rows }, {
      data: (sid, data) => { if (!wc.isDestroyed()) wc.send(PTY.data, { id: sid, data }); },
      exit: (sid, exitCode) => {
        ptysOf.get(wc.id)?.delete(sid);
        if (!wc.isDestroyed()) wc.send(PTY.exit, { id: sid, exitCode });
      }
    });
    if (!ptysOf.has(wc.id)) {
      ptysOf.set(wc.id, new Set());
      const wcId = wc.id;
      wc.once('destroyed', () => {
        ptys.killAll([...(ptysOf.get(wcId) ?? [])]);
        ptysOf.delete(wcId);
      });
    }
    ptysOf.get(wc.id)?.add(id);
    log('info', `Terminal: ${ptys.shell()} started in ${ptys.cwd()}`);
    return id;
  });
  ipcMain.on(PTY.write, (_event, { id, data }) => ptys.write(id, data));
  ipcMain.on(PTY.resize, (_event, { id, cols, rows }) => ptys.resize(id, cols, rows));
  ipcMain.on(PTY.kill, (_event, { id }) => ptys.kill(id));

  createMainWindow();

  // macOS: re-create a window when the dock icon is clicked and none is open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

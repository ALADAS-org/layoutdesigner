// =====================================================================================
// preload.js — the only bridge between renderer and main (CJS, sandboxed)
// =====================================================================================
// Contract: docs/contracts/ACTION_COMMAND.md §5.
// Exposes to the renderer, each on a fixed channel — no generic ipcRenderer, no file
// or model access:
//   window.ld.invokeCommand(id, args)   Commands (ACTION_COMMAND.md §5)
//   window.ld.onOutput(listener)        main-side Output lines (OUTPUT_PANEL.md §7):
//     the lines written so far, then every new one; resolves once the history is in.
//   window.ld.pty.*                     the Terminal's shell (OUTPUT_PANEL.md §7):
//     start(size) → id, write, resize, kill, onData(listener), onExit(listener)
// =====================================================================================
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

const COMMAND_INVOKE_CHANNEL = 'ld:command:invoke';
const OUTPUT_APPEND_CHANNEL = 'ld:output:append';
const OUTPUT_HISTORY_CHANNEL = 'ld:output:history';
const PTY = {
  start: 'ld:pty:start', write: 'ld:pty:write', resize: 'ld:pty:resize', kill: 'ld:pty:kill',
  data: 'ld:pty:data', exit: 'ld:pty:exit'
};

/** @type {import('../types/contracts').LdBridge} */
const bridge = {
  invokeCommand: (id, args) => ipcRenderer.invoke(COMMAND_INVOKE_CHANNEL, { id, args }),
  onOutput: (listener) => {
    ipcRenderer.on(OUTPUT_APPEND_CHANNEL, (_event, line) => listener(line));
    return ipcRenderer
      .invoke(OUTPUT_HISTORY_CHANNEL)
      .then((/** @type {import('../types/contracts').OutputLine[]} */ lines) => lines.forEach(listener));
  },
  pty: {
    start: (size) => ipcRenderer.invoke(PTY.start, size),
    write: (id, data) => ipcRenderer.send(PTY.write, { id, data }),
    resize: (id, cols, rows) => ipcRenderer.send(PTY.resize, { id, cols, rows }),
    kill: (id) => ipcRenderer.send(PTY.kill, { id }),
    onData: (listener) => { ipcRenderer.on(PTY.data, (_event, { id, data }) => listener(id, data)); },
    onExit: (listener) => { ipcRenderer.on(PTY.exit, (_event, { id, exitCode }) => listener(id, exitCode)); }
  }
};

contextBridge.exposeInMainWorld('ld', bridge);

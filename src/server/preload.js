// =====================================================================================
// preload.js — the only bridge between renderer and main (CJS, sandboxed)
// =====================================================================================
// Contract: docs/contracts/ACTION_COMMAND.md §5.
// Exposes to the renderer, each on a fixed channel — no generic ipcRenderer, no file
// or model access:
//   window.ld.invokeCommand(id, args)   Commands (ACTION_COMMAND.md §5)
//   window.ld.onOutput(listener)        main-side Output lines (OUTPUT_PANEL.md §7):
//     the lines written so far, then every new one; resolves once the history is in.
// =====================================================================================
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

const COMMAND_INVOKE_CHANNEL = 'ld:command:invoke';
const OUTPUT_APPEND_CHANNEL = 'ld:output:append';
const OUTPUT_HISTORY_CHANNEL = 'ld:output:history';

contextBridge.exposeInMainWorld('ld', {
  invokeCommand: (id, args) => ipcRenderer.invoke(COMMAND_INVOKE_CHANNEL, { id, args }),
  onOutput: (listener) => {
    ipcRenderer.on(OUTPUT_APPEND_CHANNEL, (_event, line) => listener(line));
    return ipcRenderer.invoke(OUTPUT_HISTORY_CHANNEL).then((lines) => lines.forEach(listener));
  }
});

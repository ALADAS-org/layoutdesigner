// =====================================================================================
// preload.js — the only bridge between renderer and main (CJS, sandboxed)
// =====================================================================================
// Contract: docs/contracts/ACTION_COMMAND.md §5.
// Exposes exactly one function to the renderer: window.ld.invokeCommand(id, args).
// No generic ipcRenderer, no file or model access.
// =====================================================================================
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

const COMMAND_INVOKE_CHANNEL = 'ld:command:invoke';

contextBridge.exposeInMainWorld('ld', {
  invokeCommand: (id, args) => ipcRenderer.invoke(COMMAND_INVOKE_CHANNEL, { id, args })
});

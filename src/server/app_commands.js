// =====================================================================================
// app_commands.js — application-level Commands (Electron main, CJS)
// =====================================================================================
// Contract: docs/contracts/ACTION_COMMAND.md. Witness of N0.2: 'app.quit', reached
// from the UI through the alias Action of the same id.
// =====================================================================================
'use strict';

function registerAppCommands(registry) {
  registry.register({
    id: 'app.quit',
    run: async (_args, context) => {
      context.app.quit();
    }
  });
}

module.exports = { registerAppCommands };

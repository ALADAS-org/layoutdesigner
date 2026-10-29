// =====================================================================================
// app_commands.js — application-level Commands (Electron main, CJS)
// =====================================================================================
// Contract: docs/contracts/ACTION_COMMAND.md. Each is reached from the UI through the
// alias Action of the same id.
//   - app.quit            (N0.2)
//   - dev.toggleDevTools  (N0.3) shows / hides the developer tools of the sender window
// =====================================================================================
'use strict';

function registerAppCommands(registry) {
  registry.register({
    id: 'app.quit',
    run: async (_args, context) => {
      context.app.quit();
    }
  });

  registry.register({
    id: 'dev.toggleDevTools',
    run: async (_args, context) => {
      context.webContents.toggleDevTools();
    }
  });
}

module.exports = { registerAppCommands };

// Dummy server plugin (N0.6 witness, docs/contracts/PLUGIN_API.md §12): a Command that
// greets from Node.js, written under the plugin's Output source, and its alias Action in
// *Plugins › Demo*.
'use strict';

/** @param {import('../../src/types/contracts').ServerPluginApi} api */
module.exports = function (api) {
  const id = `${api.pluginId}.hello`;
  api.registerCommand({
    id,
    run: async () => {
      const message = `Hello from a server plugin (Node.js ${process.versions.node})`;
      api.output.append('info', message);
      return message;
    }
  });
  api.registerAction({ id, label: 'Hello from the server', menuGroup: 'Demo', command: id });
};

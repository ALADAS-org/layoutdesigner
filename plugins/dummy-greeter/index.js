// Dummy dependent plugin (N0.6 bis witness, docs/contracts/PLUGIN_DEPENDENCIES.md §9): it
// declares dummy-server in `pluginDependencies` and reuses its exports; a Command and its
// alias Action in *Plugins › Demo*, written under the plugin's Output source.
'use strict';

/** @param {import('../../src/types/contracts').ServerPluginApi} api */
module.exports = function (api) {
  const server = api.getExports('LayoutDesigner.dummy-server');
  const id = `${api.pluginId}.hello`;
  api.registerCommand({
    id,
    run: async () => {
      const message = `Hello from a plugin that depends on dummy-server (Node.js ${server.nodeVersion()})`;
      api.output.append('info', message);
      return message;
    }
  });
  api.registerAction({ id, label: 'Hello from a dependent plugin', menuGroup: 'Demo', command: id });
};

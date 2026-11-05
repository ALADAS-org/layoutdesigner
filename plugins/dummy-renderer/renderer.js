// Dummy renderer plugin (N0.6 witness, docs/contracts/PLUGIN_API.md §12): a client
// Action in *Plugins › Demo* that writes under the plugin's Output source.

/** @param {import('../../src/types/contracts').RendererPluginApi} api */
export function init(api) {
  api.registerAction({
    id: `${api.pluginId}.hello`,
    label: 'Hello from the renderer',
    menuGroup: 'Demo',
    run: async () => api.output.append('info', 'Hello from a renderer plugin')
  });
}

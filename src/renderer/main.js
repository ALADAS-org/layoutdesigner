// =====================================================================================
// main.js — renderer entry point (ESM)
// =====================================================================================
// N0.2 witnesses (docs/contracts/ACTION_COMMAND.md §10):
//   - client Action 'view.commandPalette' (Ctrl+Shift+P, as in VS Code);
//   - alias Action  'app.quit' → Command 'app.quit' (Ctrl+Q, as in Illustrator).
// =====================================================================================

import { ActionRegistry } from './action_registry.js';
import { installShortcuts } from './shortcuts.js';
import { createCommandPalette, PALETTE_ACTION_ID } from './command_palette.js';

const actions = new ActionRegistry({
  invokeCommand: (id, args) => window.ld.invokeCommand(id, args)
});

const palette = createCommandPalette(actions, document);

actions.register({
  id: PALETTE_ACTION_ID,
  label: 'Command Palette',
  shortcut: 'Ctrl+Shift+P',
  run: async () => palette.toggle()
});

actions.register({
  id: 'app.quit',
  label: 'Quit',
  shortcut: 'Ctrl+Q',
  command: 'app.quit'
});

installShortcuts(actions, window);

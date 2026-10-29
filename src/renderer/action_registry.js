// =====================================================================================
// action_registry.js — client-side registry of Actions (renderer, ESM)
// =====================================================================================
// Contract: docs/contracts/ACTION_COMMAND.md §3.
// An Action is the only thing a menu item, toolbar button, shortcut or palette entry
// triggers. Two kinds:
//   - client Action: { id, label, shortcut?, run: async (args) => result }
//   - alias Action : { id, label, shortcut?, command: '<Command id>' } — forwarded to
//                    main through the bridge's invokeCommand(id, args).
// =====================================================================================

import { normalizeShortcut } from './shortcuts.js';

export const ID_PATTERN = /^[A-Za-z][\w-]*(\.[A-Za-z][\w-]*)+$/; // e.g. 'app.quit'

export class ActionRegistry {
  #actions = new Map();
  #shortcuts = new Map(); // normalized shortcut → Action id
  #invokeCommand;

  // invokeCommand: (commandId, args) => Promise<{ ok, value } | { ok: false, error }>
  constructor({ invokeCommand }) {
    if (typeof invokeCommand !== 'function') {
      throw new TypeError("ActionRegistry needs an 'invokeCommand' function");
    }
    this.#invokeCommand = invokeCommand;
  }

  register(descriptor) {
    if (descriptor === null || typeof descriptor !== 'object') {
      throw new TypeError('Action descriptor must be an object');
    }
    const { id, label, shortcut, command, run } = descriptor;
    if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
      throw new TypeError(`Invalid Action id: '${id}' (expected '<domain>.<name>')`);
    }
    if (typeof label !== 'string' || label.trim() === '') {
      throw new TypeError(`Action '${id}': 'label' must be a non-empty string`);
    }
    const isAlias = command !== undefined;
    const isClient = run !== undefined;
    if (isAlias === isClient) {
      throw new TypeError(`Action '${id}': give exactly one of 'command' (alias) or 'run' (client)`);
    }
    if (isAlias && (typeof command !== 'string' || !ID_PATTERN.test(command))) {
      throw new TypeError(`Action '${id}': invalid Command id '${command}'`);
    }
    if (isClient && typeof run !== 'function') {
      throw new TypeError(`Action '${id}': 'run' must be a function`);
    }
    if (this.#actions.has(id)) {
      throw new Error(`Action '${id}' is already registered`);
    }
    let normalized;
    if (shortcut !== undefined) {
      normalized = normalizeShortcut(shortcut);
      const owner = this.#shortcuts.get(normalized);
      if (owner !== undefined) {
        throw new Error(`Action '${id}': shortcut '${shortcut}' is already used by '${owner}'`);
      }
    }

    const action = Object.freeze({ id, label, shortcut, command, run });
    this.#actions.set(id, action);
    if (normalized !== undefined) this.#shortcuts.set(normalized, id);
  }

  get(id) {
    return this.#actions.get(id);
  }

  // Actions in registration order.
  list() {
    return [...this.#actions.values()];
  }

  // Alias Action → resolves to the Command reply { ok, value | error }.
  // Client Action → resolves to what its run() returns. Unknown id → rejects.
  async run(id, args) {
    const action = this.#actions.get(id);
    if (action === undefined) {
      throw new Error(`Unknown Action '${id}'`);
    }
    if (action.command !== undefined) {
      return this.#invokeCommand(action.command, args);
    }
    return action.run(args);
  }
}

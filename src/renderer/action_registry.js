// =====================================================================================
// action_registry.js — client-side registry of Actions (renderer, ESM)
// =====================================================================================
// Contract: docs/contracts/ACTION_COMMAND.md §3.
// An Action is the only thing a menu item, toolbar button, shortcut or palette entry
// triggers. Two kinds:
//   - client Action: { id, label, labelKey?, categoryKey?, shortcut?, run: async (args) => result }
//   - alias Action : { id, label, labelKey?, categoryKey?, shortcut?, command: '<Command id>' } —
//                    forwarded to main through the bridge's invokeCommand(id, args).
// `label` is the English fallback; `labelKey` is its key in the LD_Labels_xx.json files;
// `categoryKey` names its category (the menu it belongs to), shown in the palette as
// "Category: Label", as in VS Code.
// (contract §13). UI triggers call trigger(), which reports failures to listeners
// (the status bar) and never rejects.
// =====================================================================================

import { normalizeShortcut } from './shortcuts.js';
import { log } from './journal.js';

export const ID_PATTERN = /^[A-Za-z][\w-]*(\.[A-Za-z][\w-]*)+$/; // e.g. 'file.quit'

/** @typedef {import('../types/contracts').ActionDescriptor} ActionDescriptor */
/** @typedef {import('../types/contracts').Action} Action */
/** @typedef {import('../types/contracts').CommandReply} CommandReply */
/** @typedef {(commandId: string, args?: unknown) => Promise<CommandReply>} InvokeCommand */

export class ActionRegistry {
  /** @type {Map<string, Action>} */
  #actions = new Map();
  /** @type {Map<string, string>} normalized shortcut → Action id */
  #shortcuts = new Map();
  /** @type {InvokeCommand} */
  #invokeCommand;
  /** @type {Array<(message: string, actionId: string) => void>} */
  #failureListeners = [];

  /** @param {{ invokeCommand: InvokeCommand }} options */
  constructor({ invokeCommand }) {
    if (typeof invokeCommand !== 'function') {
      throw new TypeError("ActionRegistry needs an 'invokeCommand' function");
    }
    this.#invokeCommand = invokeCommand;
  }

  /** @param {ActionDescriptor} descriptor */
  register(descriptor) {
    if (descriptor === null || typeof descriptor !== 'object') {
      throw new TypeError('Action descriptor must be an object');
    }
    const { id, label, labelKey, categoryKey, shortcut, command, run, menuGroup } = descriptor;
    if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
      throw new TypeError(`Invalid Action id: '${id}' (expected '<domain>.<name>')`);
    }
    if (typeof label !== 'string' || label.trim() === '') {
      throw new TypeError(`Action '${id}': 'label' must be a non-empty string`);
    }
    if (labelKey !== undefined && (typeof labelKey !== 'string' || labelKey.trim() === '')) {
      throw new TypeError(`Action '${id}': 'labelKey' must be a non-empty string`);
    }
    if (categoryKey !== undefined && (typeof categoryKey !== 'string' || categoryKey.trim() === '')) {
      throw new TypeError(`Action '${id}': 'categoryKey' must be a non-empty string`);
    }
    if (menuGroup !== undefined && (typeof menuGroup !== 'string' || menuGroup.trim() === '')) {
      throw new TypeError(`Action '${id}': 'menuGroup' must be a non-empty string`);
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

    const action = Object.freeze({ id, label, labelKey, categoryKey, shortcut, command, run, menuGroup });
    this.#actions.set(id, action);
    if (normalized !== undefined) this.#shortcuts.set(normalized, id);
  }

  /**
   * All or nothing (plugins, PLUGIN_API.md §7): either every descriptor is registered,
   * or none is and the first error is thrown.
   * @param {ActionDescriptor[]} descriptors
   */
  registerAll(descriptors) {
    const actions = new Map(this.#actions);
    const shortcuts = new Map(this.#shortcuts);
    try {
      for (const d of descriptors) this.register(d);
    } catch (err) {
      this.#actions = actions;
      this.#shortcuts = shortcuts;
      throw err;
    }
  }

  /** @param {string} id @returns {Action | undefined} */
  get(id) {
    return this.#actions.get(id);
  }

  // Actions in registration order.
  /** @returns {Action[]} */
  list() {
    return [...this.#actions.values()];
  }

  // Alias Action → resolves to the Command reply { ok, value | error }.
  // Client Action → resolves to what its run() returns. Unknown id → rejects.
  /** @param {string} id @param {unknown} [args] @returns {Promise<unknown>} */
  async run(id, args) {
    const action = this.#actions.get(id);
    if (action === undefined) {
      throw new Error(`Unknown Action '${id}'`);
    }
    if (action.command !== undefined) {
      return this.#invokeCommand(action.command, args);
    }
    // register() guarantees exactly one of `command` / `run`.
    const run = /** @type {NonNullable<Action['run']>} */ (action.run);
    return run(args);
  }

  // listener(message, actionId) is called when a triggered Action fails.
  /** @param {(message: string, actionId: string) => void} listener */
  onFailure(listener) {
    if (typeof listener !== 'function') throw new TypeError('onFailure needs a function');
    this.#failureListeners.push(listener);
  }

  // Used by every UI trigger (menu, toolbar, shortcut, palette). Never rejects: an
  // unknown id, a thrown error or an ok: false Command reply goes to the listeners.
  /** @param {string} id @param {unknown} [args] @returns {Promise<void>} */
  async trigger(id, args) {
    /** @type {string | undefined} */
    let message;
    try {
      const reply = /** @type {Partial<{ ok: boolean, error: { message?: string } }> | undefined} */ (await this.run(id, args));
      if (reply && reply.ok === false) message = (reply.error && reply.error.message) || `Action '${id}' failed`;
    } catch (err) {
      message = err instanceof Error ? err.message : String(err);
    }
    if (message === undefined) return;
    log('error', message);
    for (const listener of this.#failureListeners) listener(message, id);
  }
}

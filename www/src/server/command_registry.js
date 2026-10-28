// =====================================================================================
// command_registry.js — server-side registry of Commands (Electron main, CJS)
// =====================================================================================
// Contract: docs/contracts/ACTION_COMMAND.md §4–§5.
// A Command is a plain descriptor { id, run: async (args, context) => result }.
// It is reached from the UI only through an alias Action (renderer), over IPC.
// No Electron import here, so the registry is unit-testable without Electron.
// =====================================================================================
'use strict';

const ID_PATTERN = /^[A-Za-z][\w-]*(\.[A-Za-z][\w-]*)+$/; // e.g. 'app.quit'

class CommandRegistry {
  #commands = new Map();

  register(descriptor) {
    if (descriptor === null || typeof descriptor !== 'object') {
      throw new TypeError('Command descriptor must be an object');
    }
    const { id, run } = descriptor;
    if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
      throw new TypeError(`Invalid Command id: '${id}' (expected '<domain>.<name>')`);
    }
    if (typeof run !== 'function') {
      throw new TypeError(`Command '${id}': 'run' must be a function`);
    }
    if (this.#commands.has(id)) {
      throw new Error(`Command '${id}' is already registered`);
    }
    this.#commands.set(id, { id, run });
  }

  has(id) {
    return this.#commands.has(id);
  }

  // Never throws: always resolves to { ok: true, value } or { ok: false, error: { message } }.
  async run(id, args, context) {
    const command = this.#commands.get(id);
    if (command === undefined) {
      return { ok: false, error: { message: `Unknown Command '${id}'` } };
    }
    try {
      const value = await command.run(args, context);
      return { ok: true, value };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: { message: `Command '${id}' failed: ${message}` } };
    }
  }
}

module.exports = { CommandRegistry, ID_PATTERN };

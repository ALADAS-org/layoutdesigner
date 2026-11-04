// =====================================================================================
// pty_service.js — shells for the Terminal tab (Electron main, CJS) — N0.5 step 7
// =====================================================================================
// Contract: docs/contracts/OUTPUT_PANEL.md §6, §7. One shell per Terminal session,
// spawned with node-pty (prebuilt N-API binary, no rebuild — decision 19):
//   - shell: PowerShell on Windows (no preference — decision 27), $SHELL elsewhere;
//   - working directory: the application folder (decision 17);
//   - data both ways: keystrokes in, shell output out; resize; kill;
//   - every shell of a window is killed when that window goes away.
// The spawn function is injected, so the service is unit-testable without a shell.
// =====================================================================================
'use strict';

const { APP_FOLDER } = require('./file_commands.js');

/**
 * @typedef {{ onData: (listener: (data: string) => void) => unknown,
 *             onExit: (listener: (e: { exitCode: number }) => void) => unknown,
 *             write: (data: string) => void, resize: (cols: number, rows: number) => void,
 *             kill: () => void, pid?: number }} Pty
 * @typedef {(file: string, args: string[], options: { name: string, cols: number, rows: number,
 *             cwd: string, env: NodeJS.ProcessEnv }) => Pty} Spawn
 * @typedef {{ data: (id: number, data: string) => void, exit: (id: number, exitCode: number) => void }} Sink
 */

/**
 * Pure: the default shell of the platform.
 * @param {NodeJS.Platform} platform @param {NodeJS.ProcessEnv} env
 */
function defaultShell(platform, env) {
  return platform === 'win32' ? 'powershell.exe' : env.SHELL || '/bin/sh';
}

/**
 * @param {{ spawn?: Spawn, platform?: NodeJS.Platform, env?: NodeJS.ProcessEnv, cwd?: string }} [options]
 */
function createPtyService({ spawn, platform = process.platform, env = process.env, cwd = APP_FOLDER } = {}) {
  /** @type {Map<number, Pty>} */
  const sessions = new Map();
  let nextId = 1;
  const doSpawn = spawn ?? /** @type {Spawn} */ (require('node-pty').spawn);

  return {
    shell: () => defaultShell(platform, env),
    cwd: () => cwd,
    /**
     * @param {{ cols: number, rows: number }} size
     * @param {Sink} sink where the session's output and end go
     * @returns {number} the session id
     */
    start({ cols, rows }, sink) {
      const id = nextId++;
      const pty = doSpawn(defaultShell(platform, env), [], { name: 'xterm-256color', cols, rows, cwd, env });
      sessions.set(id, pty);
      pty.onData((data) => sink.data(id, data));
      pty.onExit(({ exitCode }) => {
        sessions.delete(id);
        sink.exit(id, exitCode);
      });
      return id;
    },
    /** @param {number} id @param {string} data */
    write: (id, data) => sessions.get(id)?.write(data),
    /** @param {number} id @param {number} cols @param {number} rows */
    resize(id, cols, rows) {
      if (cols > 0 && rows > 0) sessions.get(id)?.resize(cols, rows);
    },
    /** @param {number} id */
    kill(id) {
      const pty = sessions.get(id);
      sessions.delete(id);
      pty?.kill();
    },
    /** @param {number[]} ids */
    killAll: (ids) => ids.forEach((id) => {
      const pty = sessions.get(id);
      sessions.delete(id);
      pty?.kill();
    }),
    size: () => sessions.size
  };
}

module.exports = { defaultShell, createPtyService };

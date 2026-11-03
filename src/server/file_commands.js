// =====================================================================================
// file_commands.js — read-only file Commands for the Debug Console (main, CJS) — N0.5
// =====================================================================================
// Contract: docs/contracts/OUTPUT_PANEL.md §5. Reached through the Debug Console's
// alias Actions (pwd, ls, cd). Nothing is created, changed or deleted.
//   - fs.appFolder                      → the application folder (the root folder)
//   - fs.resolveFolder ({ from, to })   → absolute path of `to` seen from `from`;
//                                         error when it is not an existing folder
//   - fs.listFolder    ({ folder })     → { folder, entries: [{ name, isFolder }] },
//                                         folders first, then by name
// No Electron import here, so it is unit-testable without Electron.
// =====================================================================================
'use strict';

const fs = require('fs');
const path = require('path');

const APP_FOLDER = path.join(__dirname, '..', '..');

/** @typedef {{ name: string, isFolder: boolean }} FolderEntry */

/** @param {unknown} args @param {string} key @returns {string} */
function stringArg(args, key) {
  const value = /** @type {Record<string, unknown> | undefined} */ (args)?.[key];
  if (typeof value !== 'string' || value === '') throw new Error(`'${key}' must be a non-empty string`);
  return value;
}

/** @param {string} folder */
async function assertFolder(folder) {
  let stats;
  try {
    stats = await fs.promises.stat(folder);
  } catch {
    throw new Error(`No such folder: ${folder}`);
  }
  if (!stats.isDirectory()) throw new Error(`Not a folder: ${folder}`);
}

/**
 * @param {InstanceType<typeof import('./command_registry.js').CommandRegistry>} registry
 * @param {{ appFolder?: string }} [options]
 */
function registerFileCommands(registry, { appFolder = APP_FOLDER } = {}) {
  registry.register({ id: 'fs.appFolder', run: async () => appFolder });

  registry.register({
    id: 'fs.resolveFolder',
    run: async (args) => {
      const folder = path.resolve(stringArg(args, 'from'), stringArg(args, 'to'));
      await assertFolder(folder);
      return folder;
    }
  });

  registry.register({
    id: 'fs.listFolder',
    run: async (args) => {
      const folder = path.resolve(stringArg(args, 'folder'));
      await assertFolder(folder);
      const dirents = await fs.promises.readdir(folder, { withFileTypes: true });
      /** @type {FolderEntry[]} */
      const entries = dirents
        .map((d) => ({ name: d.name, isFolder: d.isDirectory() }))
        .sort((a, b) => Number(b.isFolder) - Number(a.isFolder) || a.name.localeCompare(b.name));
      return { folder, entries };
    }
  });
}

module.exports = { APP_FOLDER, registerFileCommands };

// =====================================================================================
// debug_console.js — the Debug Console tab (renderer, ESM) — N0.5 step 5
// =====================================================================================
// Contract: docs/contracts/OUTPUT_PANEL.md §5. Text-mode access to the application:
// - a line is an **Action id** with arguments `key=value` (`preferences.setLanguage
//   language=fr`), or a **short word** — each the alias of an Action of the category
//   « Debug Console », so the palette lists them too (PO decision 2026-11-04):
//     help → debugConsole.showHelp      clear → debugConsole.clear
//     pwd  → debugConsole.showFolder    ls [folder] → debugConsole.listFolder
//     cd [folder] → debugConsole.setFolder (no folder: back to the application folder)
// - the Debug Console adds no path of its own to main: everything runs an Action;
// - transcript above, input line below, history (↑ / ↓), Tab completes words and ids;
// - errors in red, and a `warn` line in Output.
// =====================================================================================

import { log } from './journal.js';
import { format } from './i18n.js';
import { sortByLabel } from './command_palette.js';

/** @typedef {import('../types/contracts').Action} Action */
/** @typedef {import('./i18n.js').Translate} Translate */
/** @typedef {'input' | 'result' | 'error' | 'info'} EntryKind */

/** Short words → the Action each is an alias of. */
export const WORDS = Object.freeze({
  help: 'debugConsole.showHelp',
  clear: 'debugConsole.clear',
  pwd: 'debugConsole.showFolder',
  ls: 'debugConsole.listFolder',
  cd: 'debugConsole.setFolder'
});

/** Words whose first positional argument is a folder. */
const FOLDER_WORDS = ['ls', 'cd'];

/**
 * Pure: splits a line on spaces; "double quotes" keep spaces (Windows paths).
 * @param {string} text
 * @returns {string[]}
 */
export function tokenize(text) {
  /** @type {string[]} */
  const tokens = [];
  const re = /"([^"]*)"|(\S+)/g;
  for (const m of text.matchAll(re)) tokens.push(m[1] !== undefined ? m[1] : m[2]);
  return tokens;
}

/**
 * Pure: what a typed line asks for.
 * @param {string} text
 * @returns {{ word: string, actionId: string, args: Record<string, string> | undefined } |
 *           { word: string, error: 'unexpectedArgument', arg: string } | null}
 */
export function parseCommandLine(text) {
  const [word, ...rest] = tokenize(text.trim());
  if (word === undefined) return null;
  const actionId = Object.hasOwn(WORDS, word) ? WORDS[/** @type {keyof typeof WORDS} */ (word)] : word;
  /** @type {Record<string, string>} */
  const args = {};
  for (const token of rest) {
    const eq = token.indexOf('=');
    if (eq > 0) args[token.slice(0, eq)] = token.slice(eq + 1);
    else if (FOLDER_WORDS.includes(word) && args.folder === undefined) args.folder = token;
    else return { word, error: 'unexpectedArgument', arg: token };
  }
  return { word, actionId, args: Object.keys(args).length > 0 ? args : undefined };
}

/**
 * Pure: Tab completion — the longest common prefix of the candidates starting with
 * `prefix`, and those candidates.
 * @param {string} prefix
 * @param {string[]} candidates
 * @returns {{ completed: string, matches: string[] }}
 */
export function complete(prefix, candidates) {
  const matches = [...new Set(candidates.filter((c) => c.startsWith(prefix)))].sort();
  if (matches.length === 0) return { completed: prefix, matches };
  let common = matches[0];
  for (const m of matches) {
    while (!m.startsWith(common)) common = common.slice(0, -1);
  }
  return { completed: matches.length === 1 ? `${common} ` : common, matches };
}

/**
 * @param {HTMLElement} el  the Debug Console tab's view
 * @param {{ actions: import('./action_registry.js').ActionRegistry,
 *           paletteLabelOf: (action: Action) => string, locale: string, t: Translate,
 *           invokeCommand: (id: string, args?: unknown) => Promise<import('../types/contracts').CommandReply>,
 *           appFolder: string }} options
 */
export function createDebugConsole(el, { actions, paletteLabelOf, locale, t, invokeCommand, appFolder }) {
  const doc = el.ownerDocument;
  el.classList.add('DebugConsole');
  const transcript = doc.createElement('div');
  transcript.className = 'DebugConsoleTranscript';
  transcript.setAttribute('role', 'log');
  const row = doc.createElement('div');
  row.className = 'DebugConsoleInputRow';
  const prompt = doc.createElement('span');
  prompt.className = 'DebugConsolePrompt';
  prompt.textContent = '>';
  const input = doc.createElement('input');
  input.className = 'DebugConsoleInput';
  input.type = 'text';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.placeholder = t('DebugConsole/Placeholder', 'Command or Action id — Tab completes');
  input.setAttribute('aria-label', t('Aria/DebugConsoleInput', 'Debug Console input'));
  row.append(prompt, input);
  el.append(transcript, row);

  let folder = appFolder;
  /** @type {string[]} */
  const history = [];
  let historyIndex = 0;

  /**
   * @param {EntryKind} kind
   * @param {string} text
   * @param {string} [muted] text shown after, in the muted colour (an Action id)
   */
  function print(kind, text, muted) {
    const line = doc.createElement('div');
    line.className = `DebugConsoleLine is-${kind}`;
    line.textContent = text;
    if (muted !== undefined) {
      const span = doc.createElement('span');
      span.className = 'DebugConsoleMuted';
      span.textContent = `  ${muted}`;
      line.append(span);
    }
    transcript.append(line);
    transcript.scrollTop = transcript.scrollHeight;
  }

  /**
   * Red in the transcript (interface language), `warn` in Output (English, as every
   * Output line).
   * @param {string} message @param {string} english
   */
  function fail(message, english) {
    print('error', message);
    log('warn', `Debug Console: ${english}`);
  }

  /** @param {unknown} args @returns {string | undefined} */
  const folderArg = (args) => /** @type {{ folder?: string } | undefined} */ (args)?.folder;

  /** @param {string} id @param {unknown} [args] */
  async function command(id, args) {
    const reply = await invokeCommand(id, args);
    if (!reply.ok) throw new Error(reply.error.message);
    return reply.value;
  }

  const api = {
    focus: () => input.focus(),
    folder: () => folder,
    print,
    clear: () => transcript.replaceChildren(),
    showHelp() {
      print('info', t('DebugConsole/Words', 'Console commands: help, clear, pwd, ls [folder], cd [folder]'));
      for (const action of sortByLabel(actions.list(), paletteLabelOf, locale)) {
        print('result', paletteLabelOf(action), action.id);
      }
    },
    showFolder: () => print('result', folder),
    /** @param {unknown} [args] */
    async listFolder(args) {
      const target = folderArg(args);
      const where = target === undefined ? folder : /** @type {string} */ (await command('fs.resolveFolder', { from: folder, to: target }));
      const { entries } = /** @type {{ entries: { name: string, isFolder: boolean }[] }} */ (
        await command('fs.listFolder', { folder: where })
      );
      for (const entry of entries) print('result', entry.isFolder ? `${entry.name}/` : entry.name);
    },
    /** @param {unknown} [args] */
    async setFolder(args) {
      const target = folderArg(args);
      folder = target === undefined ? appFolder : /** @type {string} */ (await command('fs.resolveFolder', { from: folder, to: target }));
      print('result', folder);
    },
    /** @param {string} text */
    async run(text) {
      const parsed = parseCommandLine(text);
      if (parsed === null) return;
      print('input', `> ${text.trim()}`);
      history.push(text.trim());
      historyIndex = history.length;
      if ('error' in parsed) {
        fail(
          format(t('DebugConsole/UnexpectedArgument', "Unexpected argument '{arg}' — Action arguments are key=value."), { arg: parsed.arg }),
          `unexpected argument '${parsed.arg}' in '${text.trim()}'`
        );
        return;
      }
      const action = actions.get(parsed.actionId);
      if (action === undefined) {
        fail(format(t('DebugConsole/Unknown', "Unknown command '{word}'. Type help."), { word: parsed.word }), `unknown command '${parsed.word}'`);
        return;
      }
      try {
        const value = await actions.run(action.id, parsed.args);
        const reply = /** @type {Partial<import('../types/contracts').CommandReply> | undefined} */ (value);
        if (action.command !== undefined && reply && reply.ok === false) throw new Error(reply.error?.message ?? `Action '${action.id}' failed`);
        // The console's own Actions print their result themselves; others say OK.
        if (!action.id.startsWith('debugConsole.')) print('result', t('DebugConsole/OK', 'OK'));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        print('error', message);
        log('error', `Debug Console: ${action.id} failed: ${message}`);
      }
    }
  };

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      const text = input.value;
      input.value = '';
      api.run(text);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      if (history.length === 0) return;
      historyIndex = Math.max(0, Math.min(history.length, historyIndex + (event.key === 'ArrowUp' ? -1 : 1)));
      input.value = history[historyIndex] ?? '';
    } else if (event.key === 'Tab') {
      // Completes the first word only (words and Action ids).
      if (input.value.includes(' ')) return;
      const candidates = [...Object.keys(WORDS), ...actions.list().map((a) => a.id)];
      const { completed, matches } = complete(input.value, candidates);
      if (matches.length > 1 && completed === input.value) print('info', matches.join('   '));
      input.value = completed;
    } else {
      return;
    }
    event.preventDefault();
  });
  // A click in the transcript gives the focus back to the input (unless text is selected).
  el.addEventListener('mouseup', () => {
    if ((doc.getSelection()?.toString() ?? '') === '') input.focus();
  });

  print('info', t('DebugConsole/Welcome', 'Type help for the list of commands.'));
  return api;
}

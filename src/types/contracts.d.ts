// =====================================================================================
// contracts.d.ts — types of the public contracts (checked by `npm run typecheck`)
// =====================================================================================
// The code is plain JavaScript; these declarations are what JSDoc annotations refer to:
//   /** @param {import('../types/contracts').ActionDescriptor} descriptor */
// Each type names the contract section it comes from — the contract is the authority.
// =====================================================================================

// ---- Commands (ACTION_COMMAND.md §4–§5) ---------------------------------------------

/** What a Command receives besides its arguments (main process). */
export interface CommandContext {
  app: import('electron').App;
  /** The window that sent the request. */
  webContents: import('electron').WebContents;
}

export interface CommandDescriptor {
  id: string;
  run: (args: unknown, context: CommandContext) => unknown | Promise<unknown>;
}

/** A Command never throws across IPC: it replies ok or not ok. */
export type CommandReply =
  | { ok: true; value: unknown }
  | { ok: false; error: { message: string } };

// ---- Actions (ACTION_COMMAND.md §3, §13.3) ------------------------------------------

export interface ActionDescriptor {
  /** `<domain>.<name>`, the domain being the palette category (§13.9). */
  id: string;
  /** English label — the fallback of `labelKey`. */
  label: string;
  labelKey?: string;
  categoryKey?: string;
  /** Electron accelerator syntax, e.g. 'Ctrl+Shift+P'. */
  shortcut?: string;
  /** Alias Action: the Command it forwards to. Exactly one of `command` / `run`. */
  command?: string;
  /** Client Action: the work itself. */
  run?: (args?: unknown) => unknown | Promise<unknown>;
}

/** A registered Action (frozen). */
export type Action = Readonly<ActionDescriptor>;

// ---- Output (OUTPUT_PANEL.md §4, §7) ------------------------------------------------

export type LogLevel = 'info' | 'warn' | 'error';

export interface OutputLine {
  source: string;
  level: LogLevel;
  /** Epoch milliseconds. */
  time: number;
  message: string;
}

// ---- Preload bridge (ACTION_COMMAND.md §5, OUTPUT_PANEL.md §7) ----------------------

export interface LdBridge {
  invokeCommand(id: string, args?: unknown): Promise<CommandReply>;
  /** The main-side lines written so far, then every new one. */
  onOutput(listener: (line: OutputLine) => void): Promise<void>;
}

export interface LanguageInfo {
  code: string;
  name: string;
}

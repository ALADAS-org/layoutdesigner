# Contract — Bottom panel: Terminal, Debug Console, Output (N0.5)

**Status:** DRAFT — to be validated by the Product Owner before any code. Open points
are listed in §13 and settled **one at a time**; each answer is recorded in §12.
**Authors:** JeanArt & Echopraxium (Michel) · 2026-10-30

This contract fixes the bottom panel of the main window, after **VS Code** (reference
application for generic editor features, PO decision 2026-10-30). It builds on
`ACTION_COMMAND.md` (Actions, Commands, the preload bridge, themes, labels) and is used
by `PLUGIN_API.md` §8.3 (plugins write in the Output panel).

References:
- **Reference target, validated by the PO (2026-10-30):** the mock-up
  `docs/mockups/output_panel_prototype.html` — to be updated from two tabs
  (*Console*, *Output*) to the three tabs of §3.
- Splitter: TscgOntologyExplorer `src/renderer/Splitter.js` (read from its HEAD;
  `mousedown` / `mousemove` / `mouseup`, minimum sizes, `dragging` class).
- Behaviour, names and shortcuts: VS Code's panel.
- **Code reference: VS Code itself** (`microsoft/vscode`, MIT licence), read from its
  HEAD — it is an Electron application built on the same stack as this step
  (`@xterm/xterm`, `node-pty`). PO remark, 2026-10-30.

## 1. Window layout

Rows, top to bottom (unchanged except the workspace):

```
menu bar
toolbar (command center)
workspace ──────────────────────────────────────────────
│ object explorer │ document area                      │
│ (reserved)      ├────────── splitter (4 px) ─────────┤
│ full height     │ bottom panel                       │
────────────────────────────────────────────────────────
status bar
```

- The **object explorer** column on the left, full height of the workspace, is
  **reserved in the layout but not built** in N0.5: it is its own sub-step, placed with
  the calques (PO decision 2026-10-30, position to settle then). In N0.5 the column
  has no width and no content; only the layout grid anticipates it.
- The **bottom panel spans the document area only**, not the explorer column (as in
  VS Code, where the side bar is full height).

## 2. Panel anatomy (from the validated mock-up)

| Part | Behaviour |
|---|---|
| **Splitter** | Horizontal bar between document area and panel, **4 px, mid grey**, theme tokens `--ld-splitter` / `--ld-splitter-hover`. Drag to resize; cursor `row-resize`. Hidden when the panel is folded. |
| **Tab row** | Always visible, even when folded. From left to right: fold button, tabs, then the active tab's own tools on the right (e.g. the Output channel list). |
| **Fold button** | Square, **square corners**, top left of the tab row. Arrow **down** when unfolded, **right** when folded. |
| **Tabs** | One active at a time. A click on a tab of a folded panel **unfolds** it. |
| **Body** | The active tab's content; hidden when folded (the document area takes the height). |

**Size.** At first launch the panel is **unfolded**, its height a **quarter of the
window height** (PO decision 2026-10-30). Resizing limits (proposed; values confirmed
at the Design gate): minimum = tab row + about three lines of text; maximum = the
document area always keeps about 100 px.

## 3. Tabs (PO decision 2026-10-30: all three are built in N0.5)

| Tab | What it is | Process |
|---|---|---|
| **Terminal** | A real system shell embedded in the panel (`cmd` / PowerShell / bash). | Display in the renderer (xterm.js); the shell runs in main (node-pty). |
| **Debug Console** | Layout Designer's own command interpreter: text-mode access to the application — preferences (e.g. the language), Actions, a few file commands (list files, change folder) through Commands. | Input and display in the renderer; file commands reach main through alias Actions, as everywhere (`ACTION_COMMAND.md` §5). |
| **Output** | Read-only channels, **one shown at a time**, chosen in a list on the right of the tab row (as in VS Code). | Renderer; main-side traces reach it over IPC (§6). |

**Tab order, left to right (as VS Code): Output · Debug Console · Terminal.** The tab
active at first launch is **Output** — it shows the witness case of the step (PO
decision 2026-10-30, departing from VS Code, which opens on Terminal).

## 4. Output — channels

- A **channel** is a named, append-only list of lines. The list on the right of the tab
  row shows every channel that has at least one line.
- **Witness case of N0.5: the application's own traces**, in a channel named
  `Layout Designer` — both renderer traces (labels loaded, Actions registered, a failed
  Command) and main traces (start-up, preferences read or rejected —
  `preferences.js` currently writes them to `console.warn`).
- Each line carries a time stamp and a level (`info`, `warn`, `error`).
- Plugins (N0.6) get one channel each, named after the plugin; they only append.
- Renderer API (ESM), the only way to write in the panel:

```js
import { output } from './output_channels.js';
output.channel('Layout Designer').append('info', 'Labels loaded: fr');
```

## 5. Debug Console

- An input line at the bottom of the body, the transcript above, an input history
  (Up / Down), as in VS Code's Debug Console.
- Every command typed here runs **an Action** (directly or through an alias of a
  Command) — the Debug Console adds no path of its own to main. Its result and errors
  are written in the transcript.
- Syntax and the initial command set: open point §13.

## 6. Terminal

- **Shell process in main** (node-pty), one per Terminal tab in N0.5; default shell by
  platform (Windows: to settle — `cmd` or PowerShell; Linux / macOS: `$SHELL`).
- Working directory at start: open point §13.
- **Display in the renderer** with xterm.js, resized to the body (fit add-on).
- Data flows both ways: keystrokes renderer → main, shell output main → renderer
  (§7). The shell is killed when the window closes.
- Running `npm start` in the Terminal starts a **second, independent instance**, as
  VS Code's *Extension Development Host*. Single-instance lock (none today) and shared
  preferences (TD-2): open point §13.

## 7. Preload bridge — additions

Today the bridge exposes exactly one function, `window.ld.invokeCommand(id, args)`
(`ACTION_COMMAND.md` §5). N0.5 needs **main → renderer** messages and a **stream**,
which `invoke` cannot carry. Proposed additions, each a named function with a fixed
channel — still no generic `ipcRenderer`:

| Function | Channel | Direction |
|---|---|---|
| `ld.onOutput(listener)` | `ld:output:append` | main → renderer (main-side Output lines) |
| `ld.pty.start(options)` → id | `ld:pty:start` | renderer → main (invoke) |
| `ld.pty.write(id, data)` | `ld:pty:write` | renderer → main |
| `ld.pty.resize(id, cols, rows)` | `ld:pty:resize` | renderer → main |
| `ld.pty.kill(id)` | `ld:pty:kill` | renderer → main |
| `ld.pty.onData(listener)` / `ld.pty.onExit(listener)` | `ld:pty:data` / `ld:pty:exit` | main → renderer |

## 8. Actions, menu and shortcuts (VS Code names and keys)

| Action id | Label (en) | Shortcut | Menu |
|---|---|---|---|
| `view.togglePanel` | Show / Hide Panel | Ctrl+J | View |
| `view.showTerminal` | Terminal | Ctrl+` | View |
| `view.showDebugConsole` | Debug Console | Ctrl+Shift+Y | View |
| `view.showOutput` | Output | Ctrl+Shift+U | View |

All four appear in the command palette (« View: … »). Labels in
`LD_Labels_<xx>.json` (en, fr), like the tab names.

## 9. Themes

New tokens in `theme.css`, light and dark: `--ld-splitter`, `--ld-splitter-hover`,
`--ld-panel-bg`, `--ld-tab-active-fg`, `--ld-tab-accent`, and the terminal colours
passed to xterm.js. Values follow the mock-up and are a Design-gate decision.

## 10. Dependencies and security

Two new runtime dependencies, **accepted by the PO** when choosing the Terminal
(2026-10-30). Facts read from the npm registry on 2026-10-30:

| Package | Latest | Notes |
|---|---|---|
| `@xterm/xterm` (+ `@xterm/addon-fit`) | 6.0.0 (+ 0.11.0) | Renderer. Injects `<style>` elements at run time. |
| `node-pty` | 1.1.0 | Main, native module. **Prebuilt binaries for Windows (x64, arm64) and macOS**; on Linux it compiles with `node-gyp` at install (needs Python and a C++ toolchain). |

Consequences, to settle (§13):
- **CSP.** `src/index.html` allows only `default-src 'self'`. xterm.js's `<style>`
  injection needs `style-src 'self' 'unsafe-inline'` (no nonce support found in 6.0.0).
  Precedent: VS Code's workbench (`src/vs/code/electron-browser/workbench/workbench.html`)
  declares exactly `style-src 'self' 'unsafe-inline'`. Loosening the CSP is a security
  decision for the PO.
- **Electron ABI.** Whether the prebuilt `node-pty` loads in Electron 45 as is, or
  needs `@electron/rebuild` (a third, dev dependency), is to verify on Windows before
  the contract is validated. VS Code does **without** `@electron/rebuild`: its `.npmrc`
  makes npm build native modules against Electron's headers (`runtime="electron"`,
  `target=<electron version>`, `disturl=https://electronjs.org/headers`) — a path with
  no extra dependency.
- Packaging: same situation as TD-1 (files loaded from `node_modules/`).

## 11. Anticipated, not implemented in N0.5

| Item | Where it lands |
|---|---|
| Object explorer (left column) | Its own sub-step, with the calques. |
| Several Terminal instances, split terminals | Backlog. |
| *Problems* tab (VS Code) | With N2 (clear messages on invalid files). |
| Output filters, clear, copy, save to file | Backlog unless the PO asks for it in N0.5. |

## 12. Product Owner decisions

**2026-10-30 (late evening):**
1. Three tabs as in VS Code — Terminal, Debug Console, Output — all built in N0.5;
   dependencies xterm.js and node-pty accepted.
2. The layout anticipates the object explorer now: left column, full height; the
   bottom panel spans the document area only. The explorer itself is a separate
   sub-step, with the calques.
3. VS Code is also a **code reference** (same Electron + xterm.js + node-pty stack),
   read from its HEAD.
4. **Tabs: Output · Debug Console · Terminal; Output active at first launch** (§3).
5. **First launch: panel unfolded, height = a quarter of the window height** (§2).

## 13. Open points (settled one at a time, in this order)

1. ~~Tab order and the tab active at first launch.~~ Settled (§12, 4).
2. ~~Default panel state at first launch, minimum and maximum heights.~~ Settled
   (§12, 5); limits confirmed at the Design gate.
3. Persistence of panel state (height, folded, active tab, active Output channel) in
   the preferences.
4. Output: line format (time stamp, level), and whether `console.*` calls in main and
   renderer are redirected to the `Layout Designer` channel.
5. Debug Console: syntax and initial command set.
6. Terminal: default shell on Windows; working directory at start.
7. CSP change required by xterm.js.
8. node-pty in Electron 45: prebuilt as is, or `@electron/rebuild`; Linux build
   prerequisites.
9. Second instance from the Terminal: single-instance lock or not; shared preferences
   (TD-2).
10. Mock-up update to the three tabs (reference target for the Design gate).

## 14. N0.5 witness case and acceptance criteria (draft)

- The panel opens, folds, unfolds, resizes; folded state keeps the tab row.
- Output shows the `Layout Designer` channel with traces from **both** processes.
- The Debug Console runs at least one Action and one alias of a Command, and shows an
  error for an unknown command.
- The Terminal runs the platform shell; typing `echo` shows the output; resizing the
  panel resizes the terminal; the shell ends with the window.
- The four Actions of §8 work from menu, palette and shortcut.
- Both themes; labels in en and fr.
- Anti-regression gate: unit + end-to-end tests green (counts at closure); Design gate
  against the updated mock-up.

## 15. Complexity budget (N0.5, draft)

- Files (expected): `src/vizjets/bottom_panel/` (html, css, js), `src/renderer/`
  `splitter.js`, `output_channels.js`, `debug_console.js`, `terminal_view.js`;
  `src/server/pty_service.js`; preload additions; labels; theme tokens; tests.
- Concepts: bottom panel, Output channel, Debug Console command, pty session, the
  bridge functions of §7.
- Dependencies: `@xterm/xterm`, `@xterm/addon-fit`, `node-pty` (accepted); possibly
  `@electron/rebuild` (dev, needs approval).
- Size: the largest N0 sub-step so far — the Terminal alone (native module, IPC
  stream, CSP) is about half of it.

---

<sub>Prepared with the assistance of Claude AI, used as a tool under the authors' direction.</sub>

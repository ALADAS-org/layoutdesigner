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
  `docs/mockups/output_panel_prototype.html` — updated on 2026-10-31 to the decisions
  of §12 (three tabs, Output first, a quarter of the window, level colours, Debug
  Console with `help` / ids, PowerShell, the reserved Calques column right / left).
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
│ document area                      │ Calques panel   │
│ (visual content of the document)   │ (reserved)      │
├────────── splitter (4 px) ─────────┤ full height     │
│ bottom panel                       │                 │
────────────────────────────────────────────────────────
status bar
```

- The **Calques panel** is the object explorer: one tree (calques, sub-calques,
  objects) with expand / collapse per parent node — as Illustrator's *Layers* panel and
  Inkscape's *Layers and Objects* dialog (PO decision 2026-10-31: having both an object
  explorer and a calques panel would be absurd).
- It takes the **full height** of the workspace, on the **right by default**
  (« Drawing » layout, as Illustrator and Inkscape); the user will be able to put it on
  the left (« IDE » layout, as VS Code's side bar).
- In N0.5 it is **reserved in the layout but not built**: the workspace is a
  **symmetric grid** whose side column can be placed right or left by one class on the
  window; the column has no width and no content. The panel, its position setting and
  the Action *Show / Hide Calques* are delivered together with the calques step.
- The **document area** — the visual content of the document — sits above the bottom
  panel; the **bottom panel spans the document area only**, whichever side the Calques
  panel is on.

## 2. Panel anatomy (from the validated mock-up)

| Part | Behaviour |
|---|---|
| **Splitter** | Horizontal bar between document area and panel, **4 px, mid grey**, theme tokens `--ld-splitter` / `--ld-splitter-hover`. Drag to resize; cursor `row-resize`. Hidden when the panel is folded. |
| **Tab row** | Always visible, even when folded. From left to right: fold button, tabs, then the active tab's own tools on the right (from N0.6: the Output source selector, §4). |
| **Fold button** | Square, **square corners**, top left of the tab row. Arrow **down** when unfolded, **right** when folded. |
| **Tabs** | One active at a time. A click on a tab of a folded panel **unfolds** it. |
| **Body** | The active tab's content; hidden when folded (the document area takes the height). |

**Size.** At first launch the panel is **unfolded**, its height a **quarter of the
window height** (PO decision 2026-10-30). Resizing limits (proposed; values confirmed
at the Design gate): minimum = tab row + about three lines of text; maximum = the
document area always keeps about 100 px.

**No persistence.** Every launch starts from the first-launch state above: unfolded, a
quarter of the window height, tab Output, source `Layout Designer`. Nothing about the
panel is written to the preferences (PO decision 2026-10-30).

## 3. Tabs (PO decision 2026-10-30: all three are built in N0.5)

| Tab | What it is | Process |
|---|---|---|
| **Terminal** | A real system shell embedded in the panel (`cmd` / PowerShell / bash). | Display in the renderer (xterm.js); the shell runs in main (node-pty). |
| **Debug Console** | Layout Designer's own command interpreter: text-mode access to the application — preferences (e.g. the language), Actions, a few file commands (list files, change folder) through Commands. | Input and display in the renderer; file commands reach main through alias Actions, as everywhere (`ACTION_COMMAND.md` §5). |
| **Output** | Read-only trace lines, each from a **source**; the view shows the **selected sources mixed** in time order (§4). | Renderer; main-side traces reach it over IPC (§6). |

**Tab order, left to right (as VS Code): Output · Debug Console · Terminal.** The tab
active at first launch is **Output** — it shows the witness case of the step (PO
decision 2026-10-30, departing from VS Code, which opens on Terminal).

## 4. Output — sources

**Model (PO decision 2026-10-31, replacing VS Code's « one channel at a time »).**

- A **source** is whoever writes traces: the application (`Layout Designer`), later each
  plugin (named after the plugin). « Source » is the only term; there is no separate
  notion of channel.
- Every line carries its **source**, a level, a time stamp and a message.
- The Output view shows the lines of the **selected sources, mixed in time order** —
  e.g. a plugin's traces next to the application's, to follow what happened.
- **Witness case of N0.5: the application's own traces**, source `Layout Designer`,
  from **both** processes (renderer: labels loaded, Actions registered, a failed
  Command; main: start-up, preferences read or rejected).
- **Anticipated, not built in N0.5:** the **source selector** (check boxes, on the
  right of the tab row). With a single source it has no witness case, so in N0.5 it is
  not shown; it is built in **N0.6** with the first plugins. Its ergonomics are
  checked by the PO at the N0.6 Design gate (PO, 2026-10-31).
- **Selector look (PO, 2026-10-31; still checked at the N0.6 Design gate):** shown only
  while the Output tab is active; **no label**; a drop-down button whose closed value
  is **« n / m sources »** — n checked sources out of m (« 2 / 3 sources »,
  « 3 / 3 sources »), so that a hidden source is seen at a glance (localised). The
  selector exists only when m ≥ 2, so the plural always applies. The
  names are seen by opening it: a list of **check boxes**, one per source; at least
  one source stays checked. The button's tooltip lists the checked names.
- **A source that appears during the session** (e.g. a plugin writing its first line
  after start-up) is **checked by default**, so that its first traces — often a
  loading error — are not missed (PO, 2026-10-31).
- **Line format (PO decision 2026-10-30, the validated mock-up):**
  `[info]  23:18:04  Labels loaded: fr` — level (`info`, `warn`, `error`), local time
  to the second, message. When **several sources are shown** (from N0.6), each line
  also shows its source after the time: `[info]  14:19:02  [ld-dummy-server]  Hello`. **Level colours (PO decision 2026-10-30):** `info` in the
  muted colour (`--ld-muted-fg`), `warn` orange (new token `--ld-warn-fg`, light and
  dark values set at the Design gate), `error` with the existing `--ld-error-fg`.
- **Which traces reach Output (PO decision 2026-10-30): an explicit journal, not a
  redirection of `console.*`.** Each process has a small `log(level, message)` function
  that writes to the `Layout Designer` source **and** still to the console (DevTools
  for the renderer, the launching terminal for main). Only what the code chooses to
  trace reaches Output; the noise of Electron and libraries stays in the console. The
  existing `console.warn` / `console.error` calls (`preferences.js`,
  `action_registry.js`) are replaced by this function. Each plugin will write under its own source,
  as a VS Code extension writes in its own channel.
- Plugins (N0.6) get one source each, named after the plugin; they only append.
- Renderer API (ESM), the only way to write in the panel:

```js
import { output } from './output_sources.js';
output.source('Layout Designer').append('info', 'Labels loaded: fr');
```

## 5. Debug Console

- An input line at the bottom of the body, the transcript above, an input history
  (Up / Down), as in VS Code's Debug Console.
- Every command typed here runs **an Action** (directly or through an alias of a
  Command) — the Debug Console adds no path of its own to main. Its result and errors
  are written in the transcript.
- **General shape (PO decision 2026-10-31):**
  - an **Action id typed as is** (`view.toggleTheme`), with arguments as
    `key=value` (`preferences.setLanguage language=fr`);
  - a few **short words**, each an alias of an Action: `help`, `clear`, and read-only
    file commands `pwd`, `ls [folder]`, `cd <folder>` (through new Commands in main;
    nothing is created or deleted);
  - errors (unknown command, missing argument) in red in the transcript, and a `warn`
    line in Output.
- **Consistency with the command palette** (PO, 2026-10-31): the palette and the Debug
  Console are two textual accesses to the **same catalogue of Actions** — consistency
  between them matters more than with the menu bar or the toolbar, which are only
  placements. Hence:
  - the Debug Console runs exactly the Actions the palette lists (one registry);
  - `help` shows each entry as the palette does (« View: Light / Dark Theme ») followed
    by its id; Tab completes ids;
  - **core Action ids are prefixed by their palette category** (`ACTION_COMMAND.md`
    §13.9). Typed labels are not accepted: they are localised and would break when the
    language changes (VS Code likewise keys `keybindings.json` on ids, not labels).
- **Starting folder** of `pwd` / `ls` / `cd`: the **application folder** (the
  repository root) — PO decision 2026-10-31. Anticipated, not built: the active
  document's folder once documents exist (N0.7).

## 6. Terminal

- **Shell process in main** (node-pty), one per Terminal tab in N0.5. Default shell by
  platform: **Windows: PowerShell** (as VS Code), Linux / macOS: `$SHELL` (PO decision
  2026-10-31).
- **Windows shell is a preference** (PO decision 2026-10-31): key
  `terminal.windowsShell` in `preferences.json`, values `powershell` (default) or
  `cmd` (`cmd.exe`). Read when a Terminal starts — no application restart needed.
  How the user changes it from the GUI is not settled (a dialog, or the Debug Console
  with a `preferences.set…` Action: proposal, not built).
- **Working directory at start: the application folder**, as the Debug Console — the
  application folder is the root folder (PO decision 2026-10-31).
- **Display in the renderer** with xterm.js, resized to the body (fit add-on).
- Data flows both ways: keystrokes renderer → main, shell output main → renderer
  (§7). The shell is killed when the window closes.
- Running `npm start` in the Terminal starts a **second, independent instance**, as
  VS Code's *Extension Development Host*. **No single-instance lock** (PO decision
  2026-10-31): several instances may run. They share `preferences.json`; the last
  write wins — a low risk recorded under TD-2.

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
`--ld-panel-bg`, `--ld-tab-active-fg`, `--ld-tab-accent`, `--ld-warn-fg`, and the terminal colours
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
  declares exactly `style-src 'self' 'unsafe-inline'`. **Accepted by the PO
  (2026-10-31):** the window CSP gains `style-src 'self' 'unsafe-inline'`; inline
  **scripts stay forbidden**. An isolated Terminal view with its own CSP was
  considered and rejected as too complex.
- **Electron ABI.** Whether the prebuilt `node-pty` loads in Electron 45 as is, or
  needs `@electron/rebuild` (a third, dev dependency), is to verify on Windows before
  the contract is validated. VS Code does **without** `@electron/rebuild`: its `.npmrc`
  makes npm build native modules against Electron's headers (`runtime="electron"`,
  `target=<electron version>`, `disturl=https://electronjs.org/headers`) — a path with
  no extra dependency.
  **Decided (PO, 2026-10-31): `@electron/rebuild`** (dev dependency, 4.2.1 on the
  registry; requires Node ≥ 22.12), run automatically by a `postinstall` script
  (`electron-rebuild -o node-pty`), so that `npm install` alone yields a working
  Terminal — « as automatic as possible ». Preferred over VS Code's `.npmrc` because
  nothing has to be kept in step by hand when Electron is upgraded. Loading node-pty
  in Electron 45 is verified on Windows at the very start of the implementation.
- Packaging: same situation as TD-1 (files loaded from `node_modules/`).

## 11. Anticipated, not implemented in N0.5

| Item | Where it lands |
|---|---|
| Calques panel (= object explorer), its right / left position setting (a remembered preference, like the language) and the Action *Show / Hide Calques* (`view.toggleLayers`; shortcut F7 as Illustrator, or Ctrl+B as VS Code — to decide then) | The calques step. |
| Several Terminal instances, split terminals | Backlog. |
| *Problems* tab (VS Code) | With N2 (clear messages on invalid files). |
| Output filters, clear, copy, save to file | Backlog unless the PO asks for it in N0.5. |
| Remembering the panel state between sessions | Backlog (PO decision 2026-10-30: always the first-launch state). |

## 12. Product Owner decisions

**2026-10-30 (late evening):**
1. Three tabs as in VS Code — Terminal, Debug Console, Output — all built in N0.5;
   dependencies xterm.js and node-pty accepted.
2. The layout anticipates the side panel now; the bottom panel spans the document
   area only. *Amended 2026-10-31 by decision 10.*
3. VS Code is also a **code reference** (same Electron + xterm.js + node-pty stack),
   read from its HEAD.
4. **Tabs: Output · Debug Console · Terminal; Output active at first launch** (§3).
5. **First launch: panel unfolded, height = a quarter of the window height** (§2).
6. **No persistence of the panel state**: every launch starts from the first-launch
   state (§2).
7. **Output line format of the mock-up**: `[level]  HH:MM:SS  message` (§4).
8. **Level colours**: `info` muted, `warn` orange, `error` `--ld-error-fg` (§4).
9. **Explicit journal** (`log(level, message)` in each process, also writing to the
   console); no redirection of `console.*` (§4).

**2026-10-31:**
10. **The object explorer and the Calques panel are one and the same panel** (a tree
    with expand / collapse). Full height, **right by default** (« Drawing »), left as
    a user choice (« IDE »). N0.5 reserves its column in a symmetric grid; the panel,
    its position setting and *Show / Hide Calques* come with the calques step. The
    central area above the bottom panel is the visual content of the document (§1).
11. **Debug Console general shape** accepted, provided it is consistent with the
    command palette (§5).
12. **Core Action ids aligned on their palette category** (`ACTION_COMMAND.md` §13.9).
13. **Verb vocabulary for Action names**: `toggle`, `show`, `choose`, `set`, `reset`,
    `save`, `load` (`ACTION_COMMAND.md` §13.10).
14. **The palette filter also matches Action ids**, the id shown muted on the right of
    each entry (`ACTION_COMMAND.md` §13.11). `load` is for non-document files
    (patterns, palettes, themes).
15. **Debug Console starting folder = the application folder** (§5).
16. **Terminal on Windows: PowerShell by default, `cmd.exe` as a preference** (§6).
17. **The application folder is the root folder**: Debug Console and Terminal both
    start there (§5, §6).
18. **CSP: `style-src 'self' 'unsafe-inline'` added**, as VS Code; inline scripts stay
    forbidden (§10).
19. **node-pty rebuilt for Electron by `@electron/rebuild`** in `postinstall` (§10).
20. **Several instances allowed, no lock**; shared `preferences.json` added to TD-2
    (§6).
21. **Output « sources » instead of channels**: every line carries its source; the
    view shows the selected sources mixed in time order; the selector (check boxes)
    is built in N0.6 and its ergonomics checked by the PO then (§4).
22. **Source selector**: no label; closed value « n / m sources »; check
    boxes in its drop-down list; a new source is checked by default (§4).

1. ~~Tab order and the tab active at first launch.~~ Settled (§12, 4).
2. ~~Default panel state at first launch, minimum and maximum heights.~~ Settled
   (§12, 5); limits confirmed at the Design gate.
3. ~~Persistence of panel state.~~ Settled: none (§12, 6).
4. ~~Output: line format, which traces reach Output.~~ Settled (§12, 7–9).
5. ~~Debug Console: general shape, starting folder.~~ Settled (§12, 11–15).
6. ~~Terminal: default shell on Windows, working directory at start.~~ Settled
   (§12, 16–17).
7. ~~CSP change required by xterm.js.~~ Settled (§12, 18).
8. ~~node-pty build for Electron.~~ Settled (§12, 19).
9. ~~Second instance from the Terminal.~~ Settled (§12, 20).
10. ~~Mock-up update.~~ Done (2026-10-31); awaiting the PO's Design look.

## 14. N0.5 witness case and acceptance criteria (draft)

- The panel opens, folds, unfolds, resizes; folded state keeps the tab row.
- Output shows the `Layout Designer` source with traces from **both** processes; no
  source selector is shown (single source).
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
  `splitter.js`, `output_sources.js`, `debug_console.js`, `terminal_view.js`;
  `src/server/pty_service.js`; preload additions; labels; theme tokens; tests.
- Concepts: bottom panel, Output source (line model), Debug Console command, pty session, the
  bridge functions of §7.
- Dependencies: `@xterm/xterm`, `@xterm/addon-fit`, `node-pty`; dev:
  `@electron/rebuild` (all accepted).
- Size: the largest N0 sub-step so far — the Terminal alone (native module, IPC
  stream, CSP) is about half of it.

---

<sub>Prepared with the assistance of Claude AI, used as a tool under the authors' direction.</sub>

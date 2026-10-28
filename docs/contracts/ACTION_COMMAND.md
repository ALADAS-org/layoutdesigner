# Contract — Actions and Commands (N0.2)

**Status:** validated by the Product Owner on 2026-10-29 (decisions in §12).
**Author:** Echopraxium (Michel) with Claude AI · 2026-10-29

This contract fixes how a user intention travels from the GUI to the code that carries
it out. Everything later in N0 builds on it: the HTML menu bar and toolbar (N0.3), the
localised labels (N0.4), the plugins (N0.5), the editing operations (N0.6 onward).

## 1. Vocabulary (from `docs/ROADMAP.md`)

- **Action** — client-side unit of functionality (renderer). **The only thing** a menu
  item, toolbar button, keyboard shortcut or command-palette entry triggers.
- **Command** — server-side unit of functionality (Electron main). Reached from the UI
  **only** through an Action that redirects to it: an **alias Action**.

So there are two kinds of Actions:

| Kind | Runs | Example |
|---|---|---|
| **Client Action** | entirely in the renderer | open the command palette |
| **Alias Action** | forwards to one Command in main, through IPC | *Quit* → Command `app.quit` |

## 2. Identifiers

Every Action and every Command has a **string id**, namespaced with dots:
`<domain>.<name>` — e.g. `app.quit`, `view.commandPalette`.

- Ids are unique within their registry; registering an existing id is an **error**.
- An alias Action and its Command normally share the same id (`app.quit` → `app.quit`);
  the contract does not require it.
- Plugins (N0.5) will prefix their ids with the plugin name; the rule is written in the
  plugin contract, not here.

## 3. Action

An Action is a plain object (a descriptor) registered in the **ActionRegistry**:

```js
{
  id:       'app.quit',          // required, unique
  label:    'Quit',              // required — English text shown in menus and palette
  shortcut: 'Ctrl+Q',            // optional — Electron accelerator syntax
  command:  'app.quit',          // alias Action only: the Command it forwards to
  run:      async (args) => {},  // client Action only: the work itself
}
```

- Exactly one of `command` (alias) or `run` (client) is given; otherwise registration
  fails.
- Running an Action returns a Promise. For an alias Action it resolves to the Command's
  result (§5).

**ActionRegistry** (renderer, ESM):
`register(descriptor)` · `get(id)` · `list()` (in registration order) · `run(id, args)`.
Running an unknown id rejects with an error — no silent "null" Action.

## 4. Command

A Command is a plain object registered in the **CommandRegistry** (main, CJS):

```js
{
  id:  'app.quit',
  run: async (args, context) => result,  // context gives access to app / main window
}
```

**CommandRegistry**: `register(descriptor)` · `has(id)` · `run(id, args, context)`.
Commands are registered **explicitly** at start-up, not discovered by scanning a folder.

## 5. The alias path (IPC)

```
menu / shortcut / palette ──► Action (renderer)
                                 │ alias: window.ld.invokeCommand(id, args)
                                 ▼
                        preload bridge (contextBridge)
                                 │ ipcRenderer.invoke('ld:command:invoke', { id, args })
                                 ▼
                        main: CommandRegistry.run(id, args, context)
```

- **One** IPC channel, `ld:command:invoke`, using `invoke` / `handle` (request–response).
- The preload exposes **only** `window.ld.invokeCommand(id, args)` — no generic
  `ipcRenderer`, no file or model access (security invariant of the Bootstrap).
- `args` and the result must be structured-cloneable (plain data).
- The reply is always `{ ok: true, value }` or `{ ok: false, error: { message } }`.
  Unknown Command id → `ok: false`. An exception inside a Command is caught in main and
  returned as `ok: false`; it never crashes the main process.

## 6. Keyboard shortcuts

A small renderer-side dispatcher listens to `keydown` and runs the Action whose
`shortcut` matches. Two Actions declaring the same shortcut is a registration error.
Electron's native menu stays until N0.3 (ROADMAP decision); our shortcuts must not
reuse its accelerators (Ctrl+R, Ctrl+Shift+I, …).

## 7. Command palette

A client Action, `view.commandPalette`, opens an HTML overlay that:

- lists **Actions** (not Commands — Commands are never reached directly), by `label`;
- filters the list as the user types;
- runs the highlighted entry on **Enter** or click; arrows move; **Esc** closes.

Minimal styling only; its look belongs to the theming of N0.3.

## 8. Anticipated, not implemented in N0.2

| Later step | What the model leaves room for |
|---|---|
| N0.3 menus / toolbar | They reference Actions by id; nothing else to add. |
| N0.3 enable / disable | An optional `isEnabled()` on the Action descriptor (absent = enabled). |
| N0.4 localisation | An optional `labelKey`; `label` stays as the English fallback. |
| N0.5 plugins | Plugins call the same `register()`; ids prefixed by plugin name. |
| N0.6 undo / redo | A Command that modifies the document will do it through an EditTransaction (contract written before N0.6). |

## 9. Departures from electron-boilerplate-cjs, and why

The boilerplate is the reference for the registries, the IPC path and the palette; it
is followed except where it conflicts with our vocabulary or our rules.

| Boilerplate | Here | Why |
|---|---|---|
| Menus and palette call **Commands** directly (`commandKey` → `CallCommand`) | They trigger **Actions**; Commands only through alias Actions | Agreed vocabulary (ROADMAP). |
| Key = `constructor.name`; one singleton class per Command | Explicit string id; plain descriptor objects | Ids stable and namespaced (plugins); less code per Action / Command. |
| Unknown key → silent `NullCmd` / `NullAction` | Explicit error / `ok: false` | Failures visible and testable (*Reliable*). |
| Commands found by scanning a folder | Explicit registration | Predictable start-up; plugins register the same way. |
| Preload exposes many channels (model, files, L10n…) | One function, `invokeCommand` | Only what N0.2 needs; minimal attack surface. |
| Renderer globals + jQuery | ES modules, no jQuery | Decision "renderer in ESM"; no new dependency. |
| Palette shortcut Ctrl+Shift+P (VS Code) | Same: `Ctrl+Shift+P` | Product Owner decision (§12). |

## 10. N0.2 witness case and acceptance criteria

Witnesses: one **client Action** (`view.commandPalette`) and one **alias Action**
(`app.quit` → Command `app.quit`).

**Anti-regression gate:**
- Unit (Jest): both registries — register, duplicate id, invalid descriptor, run,
  unknown id; the alias path with a fake bridge; shortcut matching and conflicts.
- End-to-end (Playwright): the shortcut opens the palette; typing filters it; Esc closes
  it; choosing *Quit* closes the application.

**Design gate (Product Owner):** palette behaviour and ergonomics.

## 11. Complexity budget (N0.2)

- **Files (≈ 6–8):** `www/src/server/command_registry.js`,
  `www/src/server/preload.js`, IPC wiring in `electron_main.js`;
  `www/src/renderer/action_registry.js`, `shortcuts.js`, `command_palette.js` (+ its
  CSS), `main.js` (renderer entry, registers the two witness Actions); tests.
- **Concepts:** Action / Command descriptors, the two registries, `window.ld.invokeCommand`,
  the `ld:command:invoke` channel, the `{ ok, value | error }` reply, the shortcut
  dispatcher, the palette.
- **Dependencies:** none new. Jest runs the renderer's ES modules with Node's
  `--experimental-vm-modules` flag (invoked through `node`, so it works under Windows
  `cmd` without `cross-env`).

## 12. Product Owner decisions (2026-10-29)

1. **Palette shortcut:** `Ctrl+Shift+P`, as in VS Code (and the boilerplate).
2. **Reference application:** **Illustrator** is the reference for editing conventions
   and shortcuts — and later for the calques user interface. Hence *Quit* = `Ctrl+Q`.
3. **Departures of §9 accepted.** Every UI trigger goes through an Action, since the
   renderer is where they are triggered; some Actions are aliases that forward to
   Commands of the server.

**Open, for the N0.6 contract:** where the document model lives (renderer or main). It
decides whether editing operations are client Actions or alias Actions.

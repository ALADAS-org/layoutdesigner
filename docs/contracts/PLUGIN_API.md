# Contract — Plugins and their API (N0.6)

**Status:** DRAFT — to be validated by the Product Owner before any code. Product Owner
answers of 2026-10-30 are recorded in §11.
**Authors:** JeanArt & Echopraxium (Michel) · 2026-10-30

This contract fixes how code outside the application core adds functionality to Layout
Designer. It builds on `ACTION_COMMAND.md`: a plugin contributes **Actions** (renderer)
and **Commands** (main) through the same registries as the core, and nothing else in
N0.6.

Reference, read from its HEAD: TscgOntologyExplorer (`Echopraxium/tscg`,
`instances/tscg-tools/TscgOntologyExplorer/`) — `PLUGINS_README.md`,
`src/core/PluginManager.js`, `src/core/ServerPluginApi.js`,
`src/renderer/RendererPluginApi.js`, `plugins/tscg-dummy-*`. Departures in §10.

## 1. Plugin kinds

| Kind | Runs in | Module system | Entry | Can contribute |
|---|---|---|---|---|
| `server` | Electron main | CJS | `module.exports = function (api) { … }` | Commands, and the alias Actions that reach them |
| `renderer` | renderer | ESM | `export function init(api) { … }` | Actions (client or alias of an existing Command) |
| `both` | both | CJS + ESM | one entry per process | *anticipated, not implemented in N0.6* (§9) |

A `server` plugin has full Node.js; a `renderer` plugin has the DOM but no Node.js,
like the core renderer (`contextIsolation: true`, `nodeIntegration: false`).

## 2. Layout on disk and discovery

```
plugins/                          ← at the repo root, versioned (PO decision, §11)
  ld-dummy-server/
    package.json                  { "name": "ld-dummy-server", "version": "1.0.0",
                                    "ld-plugin-type": "server", "main": "index.js" }
    index.js
  ld-dummy-renderer/
    package.json                  { "name": "ld-dummy-renderer", "version": "1.0.0",
                                    "ld-plugin-type": "renderer",
                                    "renderer-main": "renderer.js" }
    renderer.js
```

- Each sub-folder holding a `package.json` is a plugin. Other entries are ignored.
- `ld-plugin-type` is **required** (`server` | `renderer`); absent or unknown → the
  plugin is rejected (§7). *(TscgOE defaults to `server`; see §10.)*
- `name` is **required** and must match `^[a-z][a-z0-9-]*$`; it is the **plugin name**
  used to prefix ids (§4). Two plugins with the same name → the second is rejected.
- Entries: `main` (server, default `index.js`), `renderer-main` (renderer, default
  `renderer.js`); a missing entry file rejects the plugin.
- Plugins are discovered **once, at start-up**, in alphabetical order of folder name
  (deterministic). No hot reload, no install / uninstall in N0.6.
- `LD_PLUGINS_PATH` (environment) points the plugins folder elsewhere — the tests use it,
  as `LD_PREFERENCES_PATH` for preferences.

## 3. Loading

**Main process, before the window is created:** scan the folder, `require()` each
server entry and call it with its scoped API (§5). Renderer plugins are only listed.

**Renderer, at start-up**, after the core Actions are registered and **before** the
menu bar, toolbar and shortcuts are built (they read the registry):

1. Read the Command `plugins.startupInfo` (same direct call as `i18n.startupInfo`,
   contract §13.8). It returns plain data:
   ```js
   {
     serverActions:   [ { plugin, descriptor } ],   // alias Actions declared by server plugins
     rendererPlugins: [ { plugin, url } ],           // e.g. 'plugin://ld-dummy-renderer/renderer.js'
     failures:        [ { plugin, message } ]        // plugins rejected in main
   }
   ```
2. Register the server plugins' alias Actions.
3. `import(url)` each renderer plugin and call its `init(api)`.

Renderer modules are served by a privileged **`plugin://`** protocol registered in main
(`standard`, `secure`, `supportFetchAPI`), as in TscgOE. It serves **only** files inside
the plugins folder (a path escaping it — `..`, absolute — is refused). The
Content-Security-Policy gains `script-src 'self' plugin:`.

**No new IPC channel and no new preload function:** server plugin Commands are reached
through `ld:command:invoke`, like core Commands.

## 4. Identifiers

Every Action and Command a plugin registers has an id of the form
**`<plugin name>.<name>`** — e.g. `ld-dummy-server.hello` (valid under the existing
`ID_PATTERN`). The API **rejects** any other id; it does not prefix silently, so the id
written in the plugin is the id seen everywhere (palette, logs, errors). A plugin can
therefore never replace or shadow a core Action or Command.

## 5. Server plugin API (main, CJS)

```js
module.exports = function (api) {
  api.pluginName                                   // 'ld-dummy-server'
  api.registerCommand({ id, run })                 // as CommandRegistry.register (contract §4)
  api.registerAction({ id, label, categoryKey?, shortcut?, menuGroup?, command })
                                                   // alias Action only; `command` must be
                                                   // one of this plugin's Commands
  api.output                                       // the plugin's channel in the Output panel (§8.3)
  api.log(...args) · api.warn(...args)             // console, prefixed '[plugin:<name>]'
}
```

`run(args, context)` receives the same context as core Commands (`app`, `webContents`).
Action descriptors are plain data (they travel to the renderer through
`plugins.startupInfo`).

Plugin Actions carry an English `label` only in N0.6 (PO decision): no `labelKey`.
`menuGroup` is defined in §8.1.

## 6. Renderer plugin API (renderer, ESM)

```js
export function init(api) {
  api.pluginName                                   // 'ld-dummy-renderer'
  api.registerAction(descriptor)                   // as ActionRegistry.register (contract §3):
                                                   // client (`run`) or alias (`command`);
                                                   // English `label`, optional `menuGroup`
  api.output                                       // the plugin's channel in the Output panel (§8.3)
  api.log(...args) · api.warn(...args)
}
```

`init` may be `async`. No DOM container, panel tab of its own or toolbar button is offered
in N0.6 (no witness).

## 7. Errors — a faulty plugin never breaks the application

A plugin is **rejected** when: its `package.json` is unreadable or invalid (§2); its
entry is missing or throws while loading; its entry function / `init` throws or
rejects; it registers an invalid or foreign-prefixed id, a duplicate id or a
shortcut already used.

- **All or nothing:** a plugin's registrations are kept only if its entry completes
  successfully; a rejected plugin leaves no Action or Command behind.
- Each rejection is logged in the console **and shown in the status bar**
  (`Plugin '<name>' not loaded: <reason>`), like a failed Command.
- The core and the other plugins load normally.
- At run time, a failing plugin Action or Command behaves like a core one (`trigger()`
  → status bar; `ok: false` reply).

## 8. Where plugin Actions appear

### 8.1 The *Plugins* menu (PO decision: Inkscape is the reference)

Reference: Inkscape's *Extensions* menu — a drawing application, like Layout Designer.
The palette keeps following VS Code (§8.2).

- A top-level **Plugins** menu, the **last menu on the left** of the bar:
  *File · View · Plugins … Help* (Help stays aligned right). Its title is a core label
  (`Plugins`) — named *Plugins*, not Inkscape's *Extensions*, so that one word is used
  everywhere: menu, code, contract, `plugins/` folder (PO decision).
- It lists **every plugin Action**. As in Inkscape's *Extensions* menu, the plugin
  chooses where its entry goes with **`menuGroup`** (optional, English text — the INX
  `<submenu name="…">`): Actions sharing a `menuGroup` form one **submenu** of that
  name; Actions without `menuGroup` sit directly in the *Plugins* menu. Grouping is by
  theme, not by plugin: two plugins naming the same group share its submenu.
- Order: submenus first, sorted by name, then the ungrouped entries; inside each, sorted
  by label (as the palette).
- One level of submenu only (Inkscape allows nesting; anticipated, not built).
- The menu is built from the registry after the plugins are loaded; with no plugin
  Action it is **not shown**.
- Not in N0.6: Inkscape's *Previous Extension* and *Manage Extensions…* entries
  (install / list dialog — backlog).

**Submenus in the menu bar** (excluded from N0.3 for lack of a witness, contract §13.2 —
the *Plugins* menu is their witness): a submenu entry shows `›` on the right; it opens
on hover, on click, or with **→ / Enter / Space**; **←** or **Esc** closes it and returns
to its parent entry; ↑ / ↓ move inside it. Same behaviour as Windows / Illustrator menus.

### 8.2 Palette and shortcuts

- **Command palette:** always, like every Action, sorted with the others. Category:
  the Action's `categoryKey`, else **`Plugins`** — e.g. « Plugins: Hello from the
  server ».
- Keyboard shortcuts: allowed, subject to the same conflict rule (§7).

### 8.3 Plugin output — the Output panel (N0.5)

Plugins write their messages in the **Output panel** built at N0.5 (bottom panel, after
VS Code). Each plugin gets **its own channel**, named after the plugin, as a VS Code
extension's `OutputChannel`; `api.output` is that channel. Its exact methods (e.g.
`appendLine`) and the main → renderer path a server plugin needs are fixed by the
**Output panel contract** (N0.5); this contract only uses them.

## 9. Anticipated, not implemented in N0.6

| Later need | Room left in the model |
|---|---|
| `both` plugins (one plugin with Node and DOM parts) | `ld-plugin-type: "both"` reserved; the two loading paths of §3 already exist. |
| Plugin labels in several languages | `labelKey` and plugin label files (`i18n/Labels_<xx>.json` inside the plugin, keys prefixed by the plugin name) when the PO promotes them. |
| Plugin ↔ plugin messages (TscgOE `sendToRenderer` / `onFromServer`) | A server plugin's Commands already answer its renderer part. |
| UI contributions (panels, tabs, toolbar buttons) | Added to the API when a witness needs them. |
| Contributions to documents, calques, EditTransactions | Written with the N0.7 / N0.8 contracts. |
| Install / uninstall (`.tgz`), enable / disable, plugin list dialog | Backlog. |

## 10. Departures from TscgOntologyExplorer, and why

| TscgOE | Here | Why |
|---|---|---|
| `registerMenuItem` + `onAction(id, fn)` | `registerAction` / `registerCommand` | Our vocabulary: menus only trigger Actions (ACTION_COMMAND §1). |
| Separate IPC channels per plugin event (`trigger-server-action`, `plugin:<event>`) | Same `ld:command:invoke` channel as the core | One channel, minimal preload (Bootstrap security rule). |
| Ids not prefixed | `<plugin name>.<name>`, enforced | No collision with the core or between plugins (ACTION_COMMAND §2). |
| Missing type → `server` | Type required | Explicit; a typo is reported instead of loaded wrongly. |
| Native popup (`showPopup`) | A channel in the Output panel (`api.output`) | GUI entirely in HTML; VS Code is the reference for generic editor features (PO). |
| *Tools › Plugins* item with free `group` | *Plugins* menu with `menuGroup` submenus | PO decision: Inkscape *Extensions* menu; palette as VS Code. |
| Plugins folder in `%LOCALAPPDATA%` | `plugins/` at the repo root | PO decision; same packaging issue as TD-2 — recorded as debt. |
| Registrations kept when a plugin fails midway | All or nothing | Reliable: no half-loaded plugin. |

## 11. Product Owner decisions (2026-10-30)

1. **Reference:** Inkscape's *Extensions* menu for where plugin entries appear (one
   *Plugins* menu, last on the left before *Help*, entries grouped by theme in
   submenus — §8.1); the command palette keeps following VS Code (§8.2).
2. **Folder:** `plugins/` at the repo root, versioned; the two dummy plugins live there,
   so `npm start` shows them. Packaging will need a per-user folder → technical debt.
3. **Labels:** English `label` only in N0.6; plugin localisation anticipated (§9).
4. **Submenus** in the menu bar are part of N0.6 (§8.1); the *Plugins* menu is their
   first witness, *Object › Transformation* (N0.10) will reuse them.
5. **Plugin output:** in a bottom **Output panel** after VS Code, built first as its own
   sub-step (N0.5); plugins move to N0.6. The `showResult` toast idea is dropped (§8.3).

## 12. N0.6 witness case and acceptance criteria

Witnesses, both with `menuGroup: "Demo"`, so they share *Plugins › Demo*:
- **`ld-dummy-server`** — Command `ld-dummy-server.hello` returning « Hello from a server
  plugin (Node.js <version>) » to its Output channel + its alias Action;
- **`ld-dummy-renderer`** — client Action `ld-dummy-renderer.hello` writing « Hello from
  a renderer plugin » to its Output channel.

**Anti-regression gate:**
- Unit (Jest): discovery (valid, no type, unknown type, bad name, duplicate name,
  missing entry, invalid JSON); id prefix rule; all-or-nothing on a throwing plugin;
  `plugin://` path resolution refuses escapes; renderer loader with fake modules;
  *Plugins* menu model (grouping, order, empty → hidden); one Output channel per plugin.
- End-to-end (Playwright, `LD_PLUGINS_PATH` → test fixtures): both dummy Actions are in
  the palette and in *Plugins › Demo*, by mouse and by keyboard (→ / ← in the submenu),
  and their lines appear in their Output channels; a broken fixture plugin is reported in the status bar while
  the application and the other plugins work; no plugin → no *Plugins* menu.

**Design gate (Product Owner):** run `npm start`; open *Plugins › Demo* (mouse and
keyboard) and the palette; run both entries; look at the Output panel and at a failure
message (a broken plugin dropped into `plugins/`).

## 13. Complexity budget (N0.6)

- **Files (≈ 10 + tests):** `src/server/plugin_manager.js` (scan, validate),
  `src/server/server_plugin_api.js`, `src/server/plugin_protocol.js` (path resolution
  pure + registration), wiring in `electron_main.js`; `src/renderer/plugin_loader.js`
  (+ renderer API), wiring in `main.js`, CSP in `index.html`; *Plugins* menu + submenus in
  `vizjets/menubar/`; label keys
  `Plugins`, `Plugin/LoadFailed`; two dummy plugins; test fixtures (good + broken).
- **Concepts:** plugin kinds, `package.json` fields `ld-plugin-type` / `main` /
  `renderer-main`, plugin name and id prefix, the two scoped APIs, Command
  `plugins.startupInfo`, `plugin://` protocol, `LD_PLUGINS_PATH`, rejection rule;
  *Plugins* menu, `menuGroup`, **submenus** in the menu bar, one Output channel per plugin.
- **Dependencies:** none new.
- **Size:** ≈ 550–650 lines of code (submenus add ≈ 120 to `menubar.js` / `.css`),
  about as much in tests.
- **Debt to record:** TD-3 — plugins folder inside the application folder (repaid with
  TD-2 at packaging).

---

<sub>Prepared with the assistance of Claude AI, used as a tool under the authors' direction.</sub>

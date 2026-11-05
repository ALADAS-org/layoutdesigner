# Contract — Plugins and their API (N0.6)

**Status:** VALIDATED by the Product Owner, 2026-11-05, after trying the interactive
mock-up `docs/mockups/plugins_prototype.html` (« maquette OK »), the reference target of
the Design gate. Product Owner answers of 2026-10-30 are recorded in §11, those of
2026-11-05 in §4, §14 and §15. Implementation notes of N0.6 in §16.
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

> **Revised 2026-11-05 (PO): plugin identifier after VS Code.** A plugin is identified
> by **`<publisher>.<name>`**, from two standard `package.json` fields — `publisher`
> (e.g. `LayoutDesigner`; a third party uses its own) and `name` (lower case, as npm
> requires, e.g. `dummy-server`) — so `LayoutDesigner.dummy-server`, as VS Code's
> `GitHub.copilot`. `displayName` (e.g. « Dummy Server ») is what the interface shows.
> This identifier replaces « plugin name » everywhere below: the id prefix of its
> Actions and Commands (`LayoutDesigner.dummy-server.hello`), its Output source, its row
> in *Preferences › Plugins*, error messages. The publisher prefix avoids collisions
> between authors. The witnesses become `LayoutDesigner.dummy-server` and
> `LayoutDesigner.dummy-renderer`.

Every Action and Command a plugin registers has an id of the form
**`<plugin name>.<name>`** — e.g. `ld-dummy-server.hello` (valid under the existing
`ID_PATTERN`). The API **rejects** any other id; it does not prefix silently, so the id
written in the plugin is the id seen everywhere (palette, logs, errors). A plugin can
therefore never replace or shadow a core Action or Command.

## 5. Server plugin API (main, CJS)

```js
module.exports = function (api) {
  api.pluginId                                     // 'LayoutDesigner.dummy-server' (§4)
  api.registerCommand({ id, run })                 // as CommandRegistry.register (contract §4)
  api.registerAction({ id, label, categoryKey?, shortcut?, menuGroup?, command })
                                                   // alias Action only; `command` must be
                                                   // one of this plugin's Commands
  api.output                                       // the plugin's source in the Output panel (§8.3)
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
  api.pluginId                                     // 'LayoutDesigner.dummy-renderer' (§4)
  api.registerAction(descriptor)                   // as ActionRegistry.register (contract §3):
                                                   // client (`run`) or alias (`command`);
                                                   // English `label`, optional `menuGroup`
  api.output                                       // the plugin's source in the Output panel (§8.3)
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
VS Code). Each plugin is **its own source**, named after the plugin (as a VS Code
extension's `OutputChannel`); `api.output` writes under that source, and the user
chooses which sources the Output view mixes (`OUTPUT_PANEL.md` §4). Its exact methods (e.g.
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
| Install / uninstall (`.tgz`) | Backlog. |
| **Enable / disable** each plugin | **Promoted into N0.6** (PO, 2026-11-05) — §15. |
| **Dependencies between plugins** (a plugin reusing another) | **Sub-step N0.6 bis**, right after N0.6, with its own contract and witness (PO, 2026-11-05) — §15. |

## 10. Departures from TscgOntologyExplorer, and why

| TscgOE | Here | Why |
|---|---|---|
| `registerMenuItem` + `onAction(id, fn)` | `registerAction` / `registerCommand` | Our vocabulary: menus only trigger Actions (ACTION_COMMAND §1). |
| Separate IPC channels per plugin event (`trigger-server-action`, `plugin:<event>`) | Same `ld:command:invoke` channel as the core | One channel, minimal preload (Bootstrap security rule). |
| Ids not prefixed | `<plugin name>.<name>`, enforced | No collision with the core or between plugins (ACTION_COMMAND §2). |
| Missing type → `server` | Type required | Explicit; a typo is reported instead of loaded wrongly. |
| Native popup (`showPopup`) | A source in the Output panel (`api.output`) | GUI entirely in HTML; VS Code is the reference for generic editor features (PO). |
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
  plugin (Node.js <version>) » under its Output source + its alias Action;
- **`ld-dummy-renderer`** — client Action `ld-dummy-renderer.hello` writing « Hello from
  a renderer plugin » under its Output source.

**Anti-regression gate:**
- Unit (Jest): discovery (valid, no type, unknown type, bad name, duplicate name,
  missing entry, invalid JSON); id prefix rule; all-or-nothing on a throwing plugin;
  `plugin://` path resolution refuses escapes; renderer loader with fake modules;
  *Plugins* menu model (grouping, order, empty → hidden); one Output source per plugin (and the source selector, `OUTPUT_PANEL.md` §4).
- End-to-end (Playwright, `LD_PLUGINS_PATH` → test fixtures): both dummy Actions are in
  the palette and in *Plugins › Demo*, by mouse and by keyboard (→ / ← in the submenu),
  and their lines appear under their Output sources; a broken fixture plugin is reported in the status bar while
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
  *Plugins* menu, `menuGroup`, **submenus** in the menu bar, one Output source per plugin (and the source selector, `OUTPUT_PANEL.md` §4).
- **Dependencies:** none new.
- **Size:** ≈ 550–650 lines of code (submenus add ≈ 120 to `menubar.js` / `.css`),
  about as much in tests.
- **Debt to record:** TD-4 — plugins folder inside the application folder (repaid with
  TD-2 at packaging). *(Was TD-3 in the first draft; TD-3 was taken by N0.5.)*
- **Debt to repay:** TD-3 — Output lines kept without limit, view fully re-rendered
  (N0.5): a cap per source and rows appended instead of rebuilt, now that plugins make
  several sources.

## 14. Alignment with N0.5 (2026-11-05)

What N0.5 decided or built since this draft, and what it changes here — to validate
with the rest of the contract.

1. **Output sources** (`OUTPUT_PANEL.md` §4): each plugin is a source; N0.6 builds the
   **source selector** — shown only on the Output tab, closed value « n / m sources »,
   check boxes in its list, a new source checked by default, at least one checked —
   and the source tags on lines when several sources are shown. Its ergonomics are
   checked by the PO at the N0.6 Design gate.
2. **Server plugins write in Output through main's journal**, which today has a single
   source (`Layout Designer`): the journal gains a source per line
   (`journal.source(name).log(level, message)`), so that `api.output` of a server
   plugin writes under the plugin's name and its lines reach the renderer like the
   application's (`ld.onOutput`, history included).
3. **Types** (decision 2026-11-03): the two plugin APIs are typed in
   `src/types/contracts.d.ts` (`ServerPluginApi`, `RendererPluginApi`), so that a plugin
   written in JavaScript gets the same JSDoc checks and completion as the core; the
   dummy plugins are type-checked too.
4. **Ids and verbs**: plugin Action ids keep the plugin-name prefix (§4,
   `ACTION_COMMAND.md` §13.9); the verb vocabulary of §13.10 is recommended for their
   names. The **palette filter matches ids** (§13.11): typing a plugin's name lists all
   its Actions.
5. **Debug Console** (`OUTPUT_PANEL.md` §5): plugin Actions run by their id there and are
   listed by `help`, with no extra work.
6. **CSP**: renderer plugins are loaded from `plugin://`; the CSP of `index.html`
   (`style-src 'self' 'unsafe-inline'` since step 7) gains `script-src 'self' plugin:`.
7. **Preferences**: ~~no *Plugins* category in N0.6~~ — superseded by §15 (PO,
   2026-11-05): enable / disable is a real preference, hence *Preferences › Plugins*.
8. **Menu bar order** with the *Edit* menu of N0.5: *File · Edit · View · Plugins …
   Help* (Plugins still the last menu on the left).
9. **Mock-up** `docs/mockups/plugins_prototype.html`: *Plugins › Demo* by mouse and
   keyboard, the palette (« Plugins: … », ids in grey, filter on ids), the source
   selector, a broken plugin (status bar + `error` line), no plugin → no *Plugins* menu.
   **Decided (PO, 2026-11-05):** an `info` line in Output for each plugin loaded
   (« Plugin LayoutDesigner.dummy-server loaded (server) ») and for each plugin disabled
   (« Plugin … disabled »), under the source « Layout Designer », in loading order.

## 15. Enable / disable, and dependencies (PO decisions 2026-11-05)

**In N0.6 — enable / disable each plugin** (Inkscape *Manage Extensions…*, VS Code
*Enable / Disable*). Proposed shape, points to settle one at a time:
- a real preference — the list of disabled plugins in `preferences.json` — and hence a
  **Plugins** category in the Preferences dialog (`PREFERENCES.md` §1 rule): one check
  box per plugin, with its name, kind and state (loaded, disabled, failed);
- **a change applies at the next start** (PO decision 2026-11-05), as the language: it
  is saved at once, the restart warning is shown, and a disabled plugin is **not loaded
  at all** (no Action, menu entry nor Output source) — an `info` line in Output says so.
  Same as Inkscape (extensions are read at session start); VS Code enables / disables
  most extensions without reload since 1.31 — not followed here: unloading at run time
  (and its dependents, N0.6 bis) is much more complex and fragile;
- *Preferences › Plugins* (PO, 2026-11-05): **one row per plugin** — a check box
  (enabled / disabled), the plugin's **name**, its **kind** (server / renderer) and its
  **state** at this start (loaded, disabled, failed — the reason in a tooltip). A failed
  plugin stays listed, so that it can be disabled and its error no longer shown at each
  start;
- **Tags** (PO, 2026-11-05): a plugin declares tags in the **standard `keywords`
  field** of its `package.json` (as npm and VS Code); shown as **« Tags »** in the
  interface, in every language (as VS Code's Marketplace, which shows `keywords` under
  « Tags »), as small grey labels under the plugin's name in *Preferences › Plugins*.
  Free words, English, lower case. **Search by tag: backlog**;
- witness: the two dummy plugins (each declares a few tags).

**In N0.6 bis — dependencies between plugins**, right after N0.6 (after VS Code's
`extensionDependencies` and `exports`, to settle in its own contract): a plugin declares
the plugins it needs; loading follows them; a missing, disabled or failed dependency
keeps its dependents unloaded, with the reason; cycles are refused; a plugin reuses
another through what that one **exports** (same process only — across processes, through
its Commands). Witness: a third dummy plugin depending on another. The sub-step is
named « N0.6 bis » so that the later sub-steps keep their numbers.

## 16. Implementation notes (N0.6, 2026-11-05)

What the code fixes where the contract left a choice — to confirm at the Design gate.

- **Files:** `src/server/plugin_manager.js` (discovery, server loading, `plugin://` path
  resolution — one file instead of the three of §13), `src/renderer/plugin_loader.js`,
  `src/renderer/plugins_menu.js`, submenus in `vizjets/menubar/`, the source selector in
  `src/renderer/output_view.js`, the *Plugins* category in `vizjets/preferences_dialog/`.
- **URL** of a renderer plugin: `plugin://app/<folder>/<file>` (a fixed host, `app`,
  so the folder name is a path segment; percent-encoded slashes are refused).
- **Commands:** `plugins.startupInfo` (§3) and `plugins.list` (each plugin: `id`,
  `displayName`, `kind`, `keywords`, `state`, `reason`) for *Preferences › Plugins*;
  `prefs.setPluginEnabled({ id, enabled })` writes `disabledPlugins`, which
  `prefs.info` and `prefs.reset` now return too (a reset that re-enables plugins shows
  the restart warning, as for the language).
- **States** in *Preferences › Plugins*: `loaded`, `disabled`, `failed` (reason in the
  tooltip) at this start; after a change, « disabled (at the next start) » or « enabled
  (at the next start) ». The category is hidden when there is no plugin.
- **Several failures** at start-up: each is written in Output; the status bar shows the
  last one.
- **A server plugin whose alias Actions are refused in the renderer** (e.g. a shortcut
  already used) is reported as failed; its Commands stay registered in main (reachable
  only from the Debug Console). Accepted: no witness; to revisit with N0.6 bis.
- **Output cap** (TD-3 repaid): 1000 lines per source in main's journal and in the
  renderer's Output; the oldest line of that source goes. A new line appends a row.
- **Palette** (`ACTION_COMMAND.md` §13.11): the filter now also matches Action ids and
  each entry shows its id on the right in the muted colour — decided in N0.5 but not
  built then; built here because §14.4 relies on it.
- **Tests:** the core end-to-end tests start with an empty plugins folder
  (`LD_PLUGINS_PATH`, `launch.js`); `plugins.spec.js` copies `plugins/` into a temporary
  folder and adds a broken plugin beside the witnesses.

---

<sub>Prepared with the assistance of Claude AI, used as a tool under the authors' direction.</sub>

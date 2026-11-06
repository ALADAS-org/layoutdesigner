# Contract — Dependencies between plugins (N0.6 bis)

**Status:** VALIDATED by the Product Owner, 2026-11-06, after trying the interactive
mock-up `docs/mockups/plugin_dependencies_prototype.html`, the reference target of the
Design gate. Points decided one at a time on 2026-11-05 / 06 (§12).
**Authors:** JeanArt & Echopraxium (Michel) · 2026-11-05

This contract lets a plugin **reuse another plugin**. It extends `PLUGIN_API.md`
(validated 2026-11-05) without changing it: plugin kinds, identifiers
(`<publisher>.<name>`), loading, the all-or-nothing rule, *Preferences › Plugins* and
the Output lines stay as they are. `PLUGIN_API.md` §15 points here.

Reference application: **VS Code** — `extensionDependencies` in `package.json`, the
value returned by `activate()` exposed as `exports`, and the message *« Cannot activate
the 'X' extension because it depends on the 'Y' extension, which is … »*. Departures
in §11.

## 1. Declaring dependencies

A plugin declares the plugins it needs in its `package.json`, with the **npm**
convention: an object mapping each plugin **id** (`PLUGIN_API.md` §4) to a **semver
range** (PO decision: plugins are bound to evolve, so versions are part of the
declaration).

```json
{
  "name": "dummy-greeter",
  "publisher": "LayoutDesigner",
  "version": "1.0.0",
  "ld-plugin-type": "server",
  "pluginDependencies": {
    "LayoutDesigner.dummy-server": "^1.0.0"
  }
}
```

- **Field name** `pluginDependencies` — the word *plugin* everywhere, as for the menu
  (`PLUGIN_API.md` §8.1); VS Code's `extensionDependencies` is not used.
- **Ranges** follow npm: `^1.0.0` (any 1.x from 1.0.0), `~1.2.0` (any 1.2.x),
  `>=1.4.0`, `1.0.0` (exactly)… Checked with the **`semver`** library — the one npm
  uses (new direct dependency, approved by the PO).
- **`version`** of every plugin must now be a valid semver version (npm already
  requires it). The witnesses are `1.0.0`.
- The field is optional; absent or `{}` means no dependency.
- A plugin is **`failed`** (it is the plugin itself that is wrong, §4) when the field is
  not an object, a key is not a valid plugin id, a value is not a valid range, or it
  names itself.

## 2. Dependencies and processes

A server plugin runs in Electron main, a renderer plugin in the renderer
(`PLUGIN_API.md` §1). Main loads the server plugins **before** the window exists; the
renderer loads its own afterwards. Hence three rules:

| Dependent → dependency | Allowed | Ordering | Reuse |
|---|---|---|---|
| server → server | yes | in main | `exports` (§3) |
| renderer → renderer | yes | in the renderer | `exports` (§3) |
| renderer → server | yes | always met (main is done first) | the dependency's **Commands** (`ld:command:invoke`), not `exports` |
| server → renderer | **refused** | — | — |

A server plugin declaring a renderer plugin is **`failed`**, with the reason
`a server plugin cannot depend on a renderer plugin ('<id>')`.

**Why (PO, 2026-11-05).** The server graph must never depend on the renderer, so that
main can one day run **without a window** — a *batch* mode for automation (*Scripts*,
backlog). The Commands of a server plugin already work without any renderer; only its
alias Actions need the interface.

## 3. Exports — reusing another plugin

As VS Code's `activate()`: **the value a plugin's entry returns becomes its exports.**

```js
// provider (server) — dummy-server/index.js
module.exports = function (api) {
  api.registerCommand({ id: 'LayoutDesigner.dummy-server.hello', run: () => … });
  return { nodeVersion: () => process.versions.node };
};

// renderer provider: export async function init(api) { …; return { … }; }

// dependent (same process) — dummy-greeter/index.js
module.exports = function (api) {
  const server = api.getExports('LayoutDesigner.dummy-server');
  api.registerCommand({
    id: 'LayoutDesigner.dummy-greeter.hello',
    run: () => api.output.append('info', `Hello from a plugin that depends on dummy-server (Node.js ${server.nodeVersion()})`)
  });
};
```

- **`api.getExports(id)`** is added to both plugin APIs (`ServerPluginApi`,
  `RendererPluginApi` in `src/types/contracts.d.ts`). It returns the provider's
  exports, `undefined` when the provider returns nothing.
- It **throws** when `id` is not declared in the caller's `pluginDependencies`, or is a
  plugin of the other process (renderer → server: use its Commands, §2). An uncaught
  throw in the entry makes the dependent `failed`, as any error in an entry
  (`PLUGIN_API.md` §7).
- **Asynchronous entries.** Both loaders already `await` the entry
  (`await entry(api)`, `await module.init(api)`): when the provider's entry is
  `async`, its exports are the **resolved** value, published only once the promise
  resolves, and its dependents load only **after** it. `getExports` therefore stays
  synchronous and always returns ready exports. A rejected promise makes the provider
  `failed` and its dependents `blocked` (§4).
- **Exported values are plain JavaScript values shared in the same process** — no IPC,
  no copy, no serialisation: functions may be `async`, return promises, take callbacks,
  objects or classes. Only across processes (renderer → server Commands) must arguments
  and results be plain data.
- A plugin's exports are read only by its declared dependents; a plugin that is not
  `loaded` has no exports.

## 4. States and reasons

`PLUGIN_API.md` §16 states — `loaded`, `disabled`, `failed` — gain **`blocked`** (PO
decision): the plugin itself is sound, but one of its dependencies prevents it from
loading; it would load as soon as the dependency is repaired. VS Code has no name for
this state (it shows a message); we need one for the *state* column of
*Preferences › Plugins*. (*stale* was considered and dropped: it means *out of date*,
describing the plugin itself.)

| State | Meaning |
|---|---|
| `loaded` | its entry completed; Actions, Commands, Output source and exports exist |
| `disabled` | unchecked in *Preferences › Plugins*; not loaded at all |
| `failed` | the plugin itself is wrong (invalid `package.json` or declaration, entry missing or throwing, invalid id…) |
| `blocked` | sound, but a dependency is missing, of the wrong version, disabled, not loaded (failed or blocked itself), or part of a cycle |

A `blocked` plugin is **not loaded at all**, like a disabled one: no Action, menu entry,
Command, Output source nor exports.

**Reasons** follow VS Code's sentence, with our verb *load* (PO decision):

```
Cannot load 'LayoutDesigner.dummy-greeter' because it depends on 'LayoutDesigner.dummy-server', which is not installed.
Cannot load 'LayoutDesigner.dummy-greeter' because it depends on 'LayoutDesigner.dummy-server', which is disabled.
Cannot load 'LayoutDesigner.dummy-greeter' because it depends on 'LayoutDesigner.dummy-server', which was not loaded.
Cannot load 'LayoutDesigner.dummy-greeter' because it depends on 'LayoutDesigner.dummy-server' version ^2.0.0, but 1.0.0 is installed.
Cannot load 'LayoutDesigner.a' because of a dependency cycle: LayoutDesigner.a → LayoutDesigner.b → LayoutDesigner.a.
```

- *not installed*: no plugin with that id was discovered.
- *was not loaded*: the dependency is `failed` or `blocked` — the chain is followed
  one link at a time (each plugin names its own direct dependency).
- When several dependencies are at fault, the reason names the **first** in the
  declaration order.

**Where they are shown** — as a failure today (`PLUGIN_API.md` §7, §16): an Output
line under the source « Layout Designer », the status bar (last message), and the
tooltip of the state in *Preferences › Plugins*. Level of the Output line: **`warn`**
for `blocked` (nothing is broken in the plugin), `error` for `failed` (PO, 2026-11-06).

## 5. Loading order

- Draw the arrows **from each prerequisite to the plugins that depend on it**: the
  **roots** are the plugins with no dependency (providers such as `dummy-server`), the
  **leaves** are those nobody depends on.
- Plugins load in **topological order, from the roots to the leaves** (PO decision): a
  plugin loads only once all its prerequisites are `loaded`.
- **Ties** keep the current order — alphabetical by folder name — so loading stays
  deterministic and the tests reproducible.
- It is a graph, not always a tree: a prerequisite shared by two plugins (a *diamond*)
  is loaded **once**, before both.
- **Two graphs**, one per process: the server graph in main (before the window, as
  today), then the renderer graph in the renderer (§2).
- **Cycles are refused**: every plugin on a cycle is `blocked` with the cycle reason
  (§4); a plugin that merely depends on one of them is `blocked` with *which was not
  loaded*.
- The Output `info` lines « Plugin … loaded » follow this order (`PLUGIN_API.md`
  §14.9), so they show what really happened.

**Where it is computed.** Main discovers every plugin, of both kinds
(`PLUGIN_API.md` §3). It resolves everything that can be known **before loading** —
declarations, missing, versions, disabled, cycles, server → renderer — for both graphs,
and loads the server graph. `plugins.startupInfo` gives the renderer its plugins in
order, each with its renderer dependencies, plus the plugins already `blocked`. What
only happens **at load time** in the renderer — a renderer entry that throws — blocks
its dependents there. `semver` is therefore used in main only.

## 6. *Preferences › Plugins*

Unchanged from `PLUGIN_API.md` §15 (one row per plugin, check box, name, kind, tags,
state; a change applies at the next start, with the restart warning), plus:

- **State `blocked`** shown like the others (« blocked »), its reason in the tooltip.
- **Bulk actions, after Gmail** (PO, 2026-11-06) — *this changes the row validated in
  N0.6*: the check box of a row now **selects** the plugin; whether it is enabled or
  disabled is read in the **state** column only. Above the list, on one line:
  ```
  [☐ select all]  [ Disable ▾ ]  [ Apply ]                    1 selected
  ```
  - the **select-all** box: checked when every plugin is selected, *indeterminate*
    when only some are; clicking it selects all or none;
  - the **action combo**: *Disable* · *Enable*;
  - **Apply**, on the right of the combo, runs the action on the selection; it is
    greyed out while nothing is selected. After *Apply* the selection is cleared.
  - A plugin already in the requested state is left as it is.
- **Dependency confirmation** (VS Code) — only when *Apply* would leave a plugin
  `blocked`. It **names** the other plugins concerned, followed transitively, and
  offers to include them with a check box, **checked by default**:
  > *Disabling « Dummy Server » will keep these plugins from loading: Dummy Greeter*
  > ☑ *Disable them too* — **[Apply]** · **[Cancel]**

  > *« Dummy Greeter » depends on these disabled plugins: Dummy Server. Without them,
  > it will stay blocked.*
  > ☑ *Enable them too* — **[Apply]** · **[Cancel]**
- Labels are core labels (en / fr), as the rest of the dialog.

## 7. Errors and run time

- The all-or-nothing rule of `PLUGIN_API.md` §7 is unchanged; a plugin is `loaded` only
  if its entry completes, and only then are its exports published.
- **A server plugin whose alias Actions are refused in the renderer** (`PLUGIN_API.md`
  §16): its Commands and exports stay in main, so its **server dependents stay
  `loaded`** — main is already done when the renderer refuses the Actions. Its renderer
  dependents (renderer → server) are `blocked` (*which was not loaded*), since the
  renderer sees it as `failed`. *Accepted for N0.6 bis; no witness.*
- At run time nothing changes: a failing exported function throws in its caller, as any
  JavaScript call.

## 8. Anticipated, not implemented in N0.6 bis

| Later need | Room left in the model |
|---|---|
| **Dependency graph shown** (PO: *anticipated proposal, to validate if the user experience justifies it*) | Two levels: (1) a Command `plugins.graph` writing the graph as **DOT** text in Output or the Debug Console — no dependency, Interoperable; (2) an SVG rendering via `@viz-js/viz` (Graphviz in WebAssembly) in *Preferences › Plugins* — a new dependency and `'wasm-unsafe-eval'` in the CSP. |
| A lighter view without a graph | A grey line « Depends on: … · Required by: … » under each plugin in *Preferences › Plugins* (proposal). |
| Optional dependencies (load if present) | A second field, as npm's `optionalDependencies`, if a witness needs it. |
| Batch mode (main without a window) | Guaranteed possible by §2: the server graph never depends on the renderer. |
| `both` plugins (`PLUGIN_API.md` §9) | Their two parts would follow §2 each. |
| Install a missing dependency | With install / uninstall (backlog). |
| **Plugins disabled by default** — *promoted to N0.6 ter* (PO, 2026-11-06 — NFT mode, requested by the sponsor) | A manifest field `"ld-enabled-by-default": false` (default `true`): such a plugin is `disabled` until the user enables it in *Preferences › Plugins*. Preferences then need to store **enabled** plugins too, not only `disabledPlugins` (`PLUGIN_API.md` §15). First real case: the NFT plugins (ROADMAP backlog), whose graph — `nft-core` ← `nft-evm` ← one plugin per chain — also exercises transitive dependencies and the *Enable them too* confirmation. |

## 9. Witness case

A **third dummy plugin, server**, depending on `dummy-server` (PO decision):

- **`LayoutDesigner.dummy-greeter`** (folder `plugins/dummy-greeter/`), `version`
  `1.0.0`, `keywords` `["demo", "dependency"]`, `pluginDependencies`
  `{ "LayoutDesigner.dummy-server": "^1.0.0" }`. Command
  `LayoutDesigner.dummy-greeter.hello` and its alias Action « Hello from a dependent
  plugin », `menuGroup: "Demo"` — a third entry in *Plugins › Demo*. It calls
  `api.getExports('LayoutDesigner.dummy-server').nodeVersion()` and writes « Hello from
  a plugin that depends on dummy-server (Node.js ‹version›) » under its own Output
  source.
- **`dummy-server`** gains its exports `{ nodeVersion }` (§3); its existing behaviour
  is unchanged.
- The other cases (missing, wrong version, failed, cycle, server → renderer, renderer
  → server through Commands, async entry, rejected promise, diamond) are covered by
  **test fixtures only**, not by shipped plugins.

## 10. Acceptance criteria

**Anti-regression gate:**
- Unit (Jest) — declaration: valid, absent, not an object, bad id, bad range, self,
  invalid `version`. Resolution: order roots → leaves, alphabetical tie, diamond loaded
  once, missing, version mismatch, disabled, failed propagated transitively, cycle
  (two plugins, and longer), server → renderer refused, renderer → server allowed,
  renderer → failed server blocked. Exports: returned value, `undefined`, async entry
  awaited before dependents, rejected promise → `failed` + dependents `blocked`,
  `getExports` on an undeclared id or the other process throws. Reasons: exact wording
  of §4. Confirmations: transitive dependents / prerequisites lists.
- End-to-end (Playwright, `LD_PLUGINS_PATH` → fixtures): the three witnesses loaded,
  « Hello from a dependent plugin » in *Plugins › Demo* and the palette writes its
  line under its source; the Output `info` lines follow the topological order;
  disabling `dummy-server` (select, *Disable*, *Apply*) shows the confirmation naming « Dummy Greeter »; after a
  restart with `dummy-server` disabled, `dummy-greeter` is `blocked` with its reason
  (tooltip, Output, status bar) and absent from the menu and the palette; a cycle
  fixture is reported while the other plugins work.
- The existing N0.6 tests stay green.

**Design gate (Product Owner):** run `npm start`; run the three *Plugins › Demo*
entries; in *Preferences › Plugins*, select « Dummy Server », *Disable*, *Apply* (look at the
confirmation, with and without « Disable them too »), restart, look at « Dummy
Greeter » `blocked` and its reason; select it, *Enable*, *Apply* (look at the second
confirmation); restart. Try the select-all box.

## 11. Departures from VS Code, and why

| VS Code | Here | Why |
|---|---|---|
| `extensionDependencies` | `pluginDependencies` | One word, *plugin*, everywhere (`PLUGIN_API.md` §8.1). |
| A list of ids, no version | An object id → semver range, as npm | PO: plugins are bound to evolve. |
| *activate* (lazy, on activation events) | *load* (at start-up) | N0.6 loads every plugin at start-up; no activation events. |
| No name for the state | `blocked` | A state column needs one. |
| Extension host separate from the UI | server → renderer refused | Keep main usable without a window (batch mode). |
| Changes mostly without reload (since 1.31) | At the next start | `PLUGIN_API.md` §15; unloading dependents at run time is fragile. |

## 12. Product Owner decisions (2026-11-05)

1. Declaration: `pluginDependencies`, an object id → **semver range** (npm convention).
2. New dependency **`semver`** approved.
3. Processes: server → server and renderer → renderer through `exports`; renderer →
   server through Commands; **server → renderer refused**, to keep a future **batch
   mode** possible (automation, *Scripts* — backlog).
4. Exports: the value returned by the entry, awaited when asynchronous, read with
   `api.getExports(id)`, limited to declared dependencies of the same process.
5. State **`blocked`** (not *stale*), reasons worded after VS Code's sentence with
   *load*.
6. *Preferences › Plugins*: a confirmation, after VS Code, when disabling a plugin
   that others depend on and when enabling a plugin whose dependency is disabled.
   **Revised 2026-11-06:** enable / disable through **bulk actions after Gmail** —
   row check box = selection, select-all box, then the action combo, then *Apply* on
   its right; the confirmation offers the other plugins with a check box (§6).
7. Loading order: topological, roots → leaves (arrows from prerequisite to dependent),
   alphabetical ties, one graph per process.
8. Dependency graph display: an **anticipated proposal**, to validate if the user
   experience justifies it (§8).
9. Witness: a third server plugin, `dummy-greeter`, depending on `dummy-server`
   through its exports.
10. Mock-up: *Preferences › Plugins* with the `blocked` state, the two confirmations,
    the third *Plugins › Demo* entry with its Output line, and the start-up lines in two
    scenarios (all loaded / `dummy-server` disabled).
11. Output level: `warn` for `blocked`, `error` for `failed` (2026-11-06).
12. Bulk actions after Gmail and the dependency confirmation (« … them too »)
    validated on the mock-up (2026-11-06).

## 13. Complexity budget (N0.6 bis)

- **Files:** new `src/server/plugin_dependencies.js` (pure: declaration check,
  resolution, order, reasons — ≈ 150 lines); changes to `src/server/plugin_manager.js`
  (exports, order, `version`), `src/renderer/plugin_loader.js` (order, runtime
  blocking, `getExports`), `src/server/electron_main.js` (`plugins.startupInfo`),
  `vizjets/preferences_dialog/` (state, bulk actions, two confirmations), labels en / fr,
  `src/types/contracts.d.ts`; the witness `plugins/dummy-greeter/`; `dummy-server`
  export; test fixtures.
- **Concepts:** `pluginDependencies`, semver ranges, `blocked` and its reasons,
  `api.getExports`, exports as the entry's value, the process rule, topological order,
  bulk actions and two confirmations; `plugins.startupInfo` gains each renderer plugin's dependencies
  and the `blocked` list.
- **Dependencies:** `semver` (direct, main only) — approved.
- **Size:** ≈ 350–450 lines of code, about as much in tests.
- **Debt:** none expected. §16's « server plugin whose Actions are refused » is settled
  in §7.

## 14. Implementation notes (N0.6 bis, 2026-11-06)

What the code fixes where the contract left a choice — to confirm at the Design gate.

- **Files:** `src/server/plugin_dependencies.js` (pure: `parseDependencies`,
  `loadingOrder` — Kahn with ties in folder order, cycles by Tarjan with the shortest
  path —, `dependencyProblem`, `cycleReason`); `src/types/semver.d.ts` (the three
  `semver` functions used, instead of adding `@types/semver`).
- **Check order of a dependency** when several things are wrong with it: not installed
  → server → renderer (failed) → version → disabled → not loaded.
- **Main** resolves the order of **both** graphs, blocks what can be known before
  loading (missing, version, disabled, failed, cycles) and loads the server graph; a
  renderer plugin whose **server** dependency failed is blocked in main.
  `plugins.startupInfo` gains `blocked` and, per renderer plugin, `dependencies`
  (`{ id, kind }`); `plugins.list` gains `dependencies` (ids).
- **Renderer:** a renderer plugin whose dependency failed or was blocked there
  (a renderer `init` that throws, or a server plugin whose Actions were refused, §7) is
  blocked at load time.
- **Status bar:** a blocked plugin is shown in the **warn** colour (`showWarning`, new);
  `error` stays for failures. The last message wins, as before.
- **Preferences › Plugins:** with the bulk actions, *Apply* writes one
  `prefs.setPluginEnabled` per changed plugin, then shows the restart warning once; the
  confirmation is a small jQuery UI dialog (`LdPluginsConfirm`) over the Preferences
  dialog. A selection that leaves nobody blocked (e.g. select all + Disable) asks
  nothing.
- **Witnesses:** `dummy-server` returns `{ nodeVersion }`; `dummy-greeter` in
  `plugins/`.
- **Tests tagged by roadmap lot** (PO, 2026-11-06): the tests of this lot carry
  `@N0.6bis` in their titles — `npm run test:jest -- -t @N0.6bis`,
  `npx playwright test --grep @N0.6bis`. Earlier tests are not tagged yet (backlog
  *Test batches*).

---

<sub>Prepared with the assistance of Claude AI, used as a tool under the authors' direction.</sub>

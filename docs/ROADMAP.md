# Layout Designer — Roadmap (Maslow pyramid)

**Authors:** JeanArt & Echopraxium · **Product Owner:** Michel (Echopraxium)
**Agreed:** 2026-10-28 · **Governed by** the skills `ld-maslow-pyramid-workflow`
(what / when) and `ld-complexity-governance` (cost, tests, debt).

> *Build the wall brick by brick. Never skip a step.* A level starts only when the
> level below has been validated by the Product Owner — both gates: the automated
> **anti-regression gate** (tests) and the **Design gate** (plastic-arts and
> ergonomic validation by the Product Owner).

## Current status

| Level | State |
|---|---|
| N0 — Scaffolding | ⏳ **in progress** — N0.1 ✅ · N0.2 ✅ · N0.3 + N0.4 ✅ · N0.5 ✅ 2026-11-05 · N0.6 ✅ 2026-11-05 · N0.6 bis in progress (plugin dependencies: contract drafted) |
| N1 — Base | — |
| N2 — Reliability | — |
| N3 — Control | — |
| N4 — Generative pipeline (spec) | — |
| N5 — Implementation | — |

The improvised first prototype was abandoned on 2026-10-28; it remains readable under
the git tag `proto-improvise-2026-10`. Nothing from it is assumed to be valid.

## Next action & open points

*Updated at the end of each session — the first thing a new conversation reads after
the status table.*

**Next action (2026-10-30, evening): open N0.5 — Output panel.** Write the **Output panel
contract** (`docs/contracts/OUTPUT_PANEL.md`) and have it validated before any code:
bottom panel after VS Code, resizable with a splitter (reference: TscgOntologyExplorer
`src/renderer/Splitter.js`), tabs (first tab: *Output*), channels, the main → renderer
path for server-side traces; witness case: the **application's own traces**.
**Reference target validated by the PO (2026-10-30):** the mock-up
`docs/mockups/output_panel_prototype.html` — tabs *Console* and *Output* (one channel
shown at a time, chosen in a list on the right, as in VS Code); splitter **4 px, mid
grey** (a theme token); a **square fold / unfold button with square corners**, top left
of the panel (arrow down when unfolded, right when folded); when folded, the tab row
stays visible and a click on a tab unfolds the panel. The details (Console vs Output
content, height limits, persistence) are settled in the contract, one point at a time.

**Product Owner input and decisions (2026-10-30, late evening) — settled one point at a
time:**
1. **Three tabs, as in VS Code** (decided): **Terminal** — a real system shell embedded
   in the panel (`cmd` / PowerShell / bash); **Debug Console** — Layout Designer's own
   command interpreter (text-mode access to the application: preferences such as the
   language, Actions; a few file commands such as listing files or changing folder,
   through Commands); **Output** — channels (application, plugins). **All three are
   built in N0.5** (PO decision), Terminal included. The Terminal brings two new
   dependencies, **xterm.js** (display) and **node-pty** (native module, rebuilt for
   Electron) — accepted by the PO when choosing this option; versions and build setup
   are fixed in the contract. The validated mock-up (tabs *Console* / *Output*) is to
   be updated to these three tabs. Running `npm start` from the Terminal starts a
   second, independent instance (as VS Code's *Extension Development Host*);
   single-instance lock and shared preferences (TD-2) are settled in the contract.
2. **Object explorer = Calques panel** (PO decision 2026-10-31). The two are one
   panel: a tree (calques, sub-calques, objects) with expand / collapse, as
   Illustrator's *Layers* panel and Inkscape's *Layers and Objects* dialog. Full
   height; **right by default** (« Drawing » layout), left as a user choice (« IDE »
   layout, as VS Code's side bar). N0.5 reserves its column in a symmetric grid; the
   central area above the bottom panel is the visual content of the document. The
   panel, its position setting (a remembered preference) and the Action *Show / Hide
   Calques* are delivered **with the calques step** — no separate sub-step.

**Output panel contract drafted (2026-10-30, 23:10):** `docs/contracts/OUTPUT_PANEL.md`
(not yet validated). Its open points (§13) are settled one at a time. Settled so far:
VS Code is also a code reference (same stack); tabs **Output · Debug Console ·
Terminal**, **Output** active at first launch; first launch **folded** (2026-11-03), height 18.75 % once unfolded (a quarter reduced by 25 %)
of the window; no persistence (every launch starts from that state). Output line format of the
mock-up (`[info]  HH:MM:SS  message`). Level colours; an explicit
journal (no `console.*` redirection). Debug Console general shape
(Action ids + `key=value`, short words), consistent with the command palette; core
Action ids aligned on their palette category (`ACTION_COMMAND.md` §13.9). Verb vocabulary for
Action names (§13.10). The palette filter also
matches Action ids (§13.11). Debug Console starts in
the application folder. Terminal: PowerShell on
Windows, `cmd.exe` as a preference. Terminal also starts in
the application folder (the root folder). CSP gains
`style-src 'self' 'unsafe-inline'` (as VS Code). node-pty: no rebuild,
its prebuilt N-API binaries (revised during step 1, `OUTPUT_PANEL.md` §10). Several
instances allowed, no lock (shared preferences file noted in TD-2). Mock-up updated to all
these decisions. Output « sources » replace
channels (lines carry their source, the view mixes the selected sources; selector in
N0.6, ergonomics to check then). **Contract validated by the PO
(2026-10-31).** Implementation:
**step 1** (dependencies, node-pty checked inside Electron) — confirmed by the PO on
Windows on 2026-11-03, no rebuild needed; **step 2** (the three Actions renamed after
their palette category, `ACTION_COMMAND.md` §13.9) delivered. **step 3** (bottom panel shell: workspace grid with the reserved Calques
column, splitter, fold button, three empty tabs, `view.togglePanel` Ctrl+J and the
`view.show…` Actions, Terminal on Ctrl+Shift+T) validated by the PO (2026-11-03: height 18.75 %, folded at
first launch); **step 4** (Output: sources, explicit journal in both processes,
main-side history over `ld.onOutput`, line format and level colours) delivered.
Step 4 validated by the PO for `info` and `warn` (2026-11-03); the
`error` colour is judged at step 5. **Step 5 — Debug Console** delivered (2026-11-04): Action ids
with `key=value`, short words `help` · `clear` · `pwd` · `ls` · `cd` as Actions of the
category « Debug Console » (in the palette too), read-only `fs.*` Commands, history,
Tab completion, errors in red with a line in Output. Step 5 validated by the PO (2026-11-04), Design included
(the `error` red too). **Step 6 — Preferences** (2026-11-04): contract
`docs/contracts/PREFERENCES.md` validated « until further notice » after its mock-up;
delivered — *Edit › Preferences…* (Ctrl+K), dialog after Inkscape (*Interface* /
*System*), language applied at once, reset with confirmation and `.bak`, start-up
warning with Reset / Ignore for an invalid file, `preferences.default.json`.
Step 6 validated by the PO (2026-11-04), with the error icon and a
pale red background for error toasts. **Step 7 — Terminal** delivered (2026-11-04):
xterm.js + node-pty, PowerShell on Windows / `$SHELL` elsewhere, started in the
application folder, follows the panel size and the theme; a shell that ends is replaced,
screen cleared, with a loop guard; CSP allows inline styles. Step 7 validated by the PO
(2026-11-05). Added the same day at the PO's request: the **theme as a preference**
(*Preferences › Interface › Theme*, remembered, applied at once). Validated by the PO
(2026-11-05): **N0.5 is complete.** **Next: N0.6 — plugins**: the draft contract
`docs/contracts/PLUGIN_API.md` is aligned with N0.5 (§14, to validate with the rest). Decided
2026-11-05 (PO): **enable / disable** each plugin is part of N0.6; **dependencies
between plugins** form a sub-step **N0.6 bis** right after it (`PLUGIN_API.md` §15).
**N0.6 — plugins** (2026-11-05): contract `PLUGIN_API.md` **validated** after its
mock-up (« maquette OK »); **delivered** — server and renderer plugins (two dummy
witnesses), `plugin://`, *Plugins* menu with submenus (*Plugins › Demo*), palette
« Plugins: … » with ids, one Output source per plugin and the **source selector**,
*Preferences › Plugins* (enable / disable at the next start, tags, state); TD-3 repaid,
TD-4 recorded. **Validated by the PO (2026-11-05)** at the Design gate — fixed on the
way: a failed plugin that is disabled is no longer reported. **Next: N0.6 bis**
(dependencies).
**N0.6 bis — plugin dependencies** (2026-11-05): contract
`docs/contracts/PLUGIN_DEPENDENCIES.md` **drafted** with the PO, one point at a time
(its §12): `pluginDependencies` with semver ranges (`semver` approved), the process
rule (server → renderer refused, to keep a future batch mode), `exports` and
`api.getExports`, state `blocked` with reasons after VS Code, confirmations in
*Preferences › Plugins*, topological order, witness `dummy-greeter`. **To validate**
after its mock-up `docs/mockups/plugin_dependencies_prototype.html`.

**Decision (2026-11-03, PO): a preferences step is added to N0.5**, after the Debug
Console (Terminal moves after it). After Inkscape: *Edit › Preferences…* opens a
**Preferences dialog** that also offers to **reset** the preferences. Prompted by an
invalid `preferences.json` (today only a `warn` line in Output). Understood so far, to
confirm in its contract (written just before the step): the defaults live in a shipped
file `src/config/preferences.default.json`, copied over `preferences.json` on reset; a
new **Edit** menu. Details settled one point at a time.

**Decision (2026-11-03, PO): type checking with option (b)** — the code stays plain
JavaScript (renderer ESM, main CJS, no build step); types are written as **JSDoc**
annotations and `.d.ts` files for the contracts, checked by **`tsc --checkJs`**
(`npm run typecheck`, dev dependency `typescript`). Rejected: (a) no types; (c) `.ts`
files, which need a build step for the renderer. **Placed now, before step 5** (PO,
2026-11-03) — **done**: TypeScript 7.0.2 (native compiler), `strict` mode, two
projects (`tsconfig.main.json` CJS + Node types, `tsconfig.renderer.json` ESM + DOM),
contract types in `src/types/contracts.d.ts`, every file of `src/` annotated, zero
error; `npm test` runs the type check first (anti-regression gate).

**N0.6 — plugins: contract drafted** in `docs/contracts/PLUGIN_API.md` (not yet
validated). Agreed so far (PO, 2026-10-30): Inkscape's *Extensions* menu is the
reference for where plugin entries appear — a *Plugins* menu (the same word everywhere),
last on the left before *Help*, entries grouped by theme in **submenus** (part of the
step); the palette keeps following VS Code; plugin labels English only; `plugins/` at
the repo root; plugin output goes to the Output panel (N0.5). Remaining in the original
plan below:
- write the **Plugin API contract** (`docs/contracts/PLUGIN_API.md`) and have it
  validated: plugin kinds (server = CJS in main, renderer = ESM, `both`), discovery and
  loading, ids prefixed by the plugin name, what a plugin contributes (Actions,
  Commands, menu entries, labels), lifecycle, errors;
- reference, read from its HEAD: TscgOntologyExplorer `PLUGINS_README.md`,
  `src/core/PluginManager.js`, `src/core/ServerPluginApi.js`,
  `src/renderer/RendererPluginApi.js`, `plugins/tscg-dummy-*`;
- witness case: **dummy server and renderer plugins**, each contributing an Action
  visible in the palette (and a menu entry if the contract keeps that);
- agree the acceptance criteria and the complexity budget (no new dependency expected).

**N0.3 + N0.4 validated by the Product Owner on 2026-10-30** (HTML GUI and localisation,
merged into one step) — details in `docs/contracts/ACTION_COMMAND.md` §13. Final state:
menu bar (File / View / Help, Help on the right, Illustrator-like keyboard navigation);
toolbar with the developer-tools wrench and a VS Code-like **command center** opening
the command palette over it; palette entries « Category: Label », sorted
alphabetically, *File › Quit* never preselected; status bar showing failed Commands;
jQuery UI dialogs (About — F1; Choose Language); light and dark themes, **dark by
default**; labels in `src/i18n/LD_Labels_<xx>.json` (en, fr); interface language chosen
in the GUI, saved in `src/config/preferences.json`, applied at restart after a centred
modal iziToast warning; GUI icons in `assets/icons/`; dependencies jquery, jquery-ui,
izitoast. Tests at closure: unit 113, end-to-end 48.

**Decision (2026-10-30, Product Owner):** multi-document with one tab per document is
added to N0 as a new sub-step **N0.6**, before the calques; the following sub-steps
move down by one (calques + undo / redo → N0.7 … zoom / panning → N0.10).
*Renumbered again the same evening (Output panel inserted as N0.5): see below.*

**Decisions (2026-10-30 evening, Product Owner):**
- **Reference applications by domain:** Inkscape (and Illustrator) for drawing;
  **VS Code for generic editor features** (palette, command center, bottom panel…).
- A bottom **Output panel** after VS Code (splitter, tabs) is a new sub-step **N0.5**,
  before the plugins — the application's traces are shown there; plugins write in it.
  Following sub-steps move down by one: plugins → N0.6, multi-document → N0.7,
  calques + undo / redo → N0.8 … zoom / panning → N0.11.

**Decisions (2026-10-29, Product Owner):**
- N0 sub-steps and their order: see *N0 sub-steps* below.
- Public contracts are written **just before the sub-step that uses them**, not all
  upfront — each still validated before its code.
- Module systems: Electron main in **CJS**, renderer in **ESM**.
- Dev dependencies: `electron`, `jest`, `@playwright/test`.
- **Illustrator is the reference application** for editing conventions and shortcuts,
  and later for the calques user interface.
- Electron's default native menu stays until N0.3, which replaces it with the HTML
  menu bar (it keeps reload / DevTools shortcuts available until then).
- N0.3 answers: *Help* menu aligned right; toolbar = command palette + developer tools
  (wrench icon); two predefined themes, light and dark; failed Command message in the
  status bar; first dialog = *Help › About*, a jQuery dialog as in Cryptocalc.
- **N0.4 merged into N0.3**: labels localised from the start, one file per language
  `src/i18n/LD_Labels_<xx>.json` (`en`, `fr`).
- The `www/` folder was a vestige: the application lives in `src/` at the repo root.

**Open points** (decided when their level comes, not before):
- N1 — which patterns form the reference sample (one per primitive family).
- N1 — deterministic value grid for cell-by-cell comparison with Silverquote: what
  Silverquote can export (an `.xlsx`?) and whether export and screenshot come from the
  same draw.
- N4 — **TSCG as a modelling tool** for the elements of a composition (stamp,
  oblitération, pattern, découpe, trame — e.g. fictitious banknotes), to decompose them
  before writing the calque types' JSON rules. Dependency **one way only**: Layout
  Designer's formats stay self-contained, TSCG describes them from outside (M0
  instances of an M1 domain). Waits for TSCG's planned « Application » ontology type
  (PO idea, 2026-10-30).

## Vocabulary

| Term | Meaning |
|---|---|
| **Calque** | A layer of the document (`layer` in English code identifiers). |
| **Action** | Client-side unit of functionality. The only thing a menu, toolbar or command-palette entry triggers. *The user sees it as a « command » (Command Palette, « Search commands »), as in VS Code.* |
| **Command** | Server-side unit of functionality (Electron main). Reached from the UI only through an Action that redirects to it (an alias). |
| **EditTransaction** | The undoable unit of document modification (undo/redo history). |

## The pyramid

### N0 — Scaffolding
A sound workshop before any artwork. Every brick is validated on the simplest witness
case: a **rectangle** (on at least two calques); dummy client and server plugins for
the API.
- Functional units: Action registry (client), Command registry (server), Actions as
  aliases of Commands, **command palette**.
- Extensibility: server-side and client-side **plugins** and their **API** (plugins
  contribute Actions, Commands, menu entries).
- **Multi-document**: several documents open at once, **one tab per document**
  (added 2026-10-30 by the Product Owner) — reference: TscgOntologyExplorer
  `src/renderer/DocumentManager.js` (open / close / activate, per-document state) and
  Illustrator's document tabs.
- **Calques**: add, remove, reorder, show/hide, active calque.
- Editing: undo/redo (EditTransactions), selection, copy/paste, *Object →
  Transformation* (translation, scale, height/width ratio, rotation; mirror as a
  special case), zoom (loupe), panning — Illustrator basic toolkit (reference application).
- GUI **entirely in HTML, menus included**: menu bar, toolbar, status bar, dialog
  boxes; themable.
- Localisation of labels with JSON files.
- First unit and end-to-end tests (Jest + Playwright).

References (read from their HEAD): electron-boilerplate-cjs (HTML menus, viewlets,
Commands / Actions, command palette), TscgOntologyExplorer (plugins), Cryptocalc
(vizjets, L10n, tests). Details in `ld-maslow-pyramid-workflow` §4.

#### N0 sub-steps (order validated 2026-10-29)

| # | Sub-step | Contract written first | State |
|---|---|---|---|
| N0.1 | Electron shell (secure empty window) + Jest / Playwright harness | — | ✅ 2026-10-29 |
| N0.2 | Action / Command registries, aliasing, command palette | Action / Command ✅ | ✅ 2026-10-29 |
| N0.3 | HTML GUI: menu bar, toolbar, status bar, one dialog; themable | contract §13 | ✅ 2026-10-30 |
| N0.4 | Localisation (JSON, en / fr) — merged into N0.3 | contract §13.6 | ✅ 2026-10-30 |
| N0.5 | **Bottom panel** after VS Code: tabs Terminal, Debug Console, Output; resizable (splitter), foldable; layout reserves the object explorer's column; witness = the application's own traces | Output panel ✅ | ✅ 2026-11-05 |
| N0.6 | Server and renderer plugins (dummy ones); *Plugins* menu with submenus, after Inkscape; Output **source selector**; **enable / disable** each plugin (Preferences › Plugins) | Plugin API (validated 2026-11-05) | ✅ 2026-11-05 |
| N0.6 bis | **Dependencies between plugins**: declared, loading order, missing / disabled / failed dependency, cycles refused, reuse through `exports` (same process) | Plugin dependencies (draft 2026-11-05) | ⏳ in progress |
| N0.7 | **Multi-document, one tab per document**: *File › New* (Ctrl+N), *File › Close* (Ctrl+W), switch tabs (Ctrl+Tab / Ctrl+Shift+Tab), close button per tab, one active document; each document owns its state | Document model (multi-document) | — |
| N0.8 | Calques + undo / redo per document (every mutation is an EditTransaction; « modified » mark on the tab); **Calques panel** (= object explorer: tree, full height, right by default, right / left as a preference) and *View › Show / Hide Calques* | Calque / object model, EditTransaction | — |
| N0.9 | Selection + copy / paste | — | — |
| N0.10 | *Object → Transformation* | — | — |
| N0.11 | Zoom (loupe) + panning | — | — |

### N1 — Base
Redo Silverquote, without the crypto-wallet part: open a JSON `.pattern` file,
generate a grid of **square** cells, render **faithfully to Silverquote**.
- Corpus: `assets/legacy/patterns/`; grammar: `schemas/pattern.schema.json`,
  `schemas/pattern.spec.md` (its rendering rules are hypotheses to re-verify);
  validator: `cli_tools/pattern_validate.cjs`.
- Reference renders: `assets/legacy/screenshots/silverquote/`.

### N2 — Reliability
Clear messages on invalid files; visual non-regression run on every change.

### N3 — Control
Grid size, Random / Sequence, seed, PNG export, save.

### N4 — Generative pipeline *(specification)*
Predefined calque types, bottom → top: **Background, Trame, Pattern, Scene**. Each
has its own JSON rule set and its own composition modalities. The model anticipates
several Trame / Scene calques without implementing them. Deliverable: spec + JSON
schemas, validated before any code.

### N5 — Implementation
Calque types one by one: **Trame** (guilloché as a special case: banknote spirograph
screens and rosettes) · **Pattern** families (text, quad, hex) · **Background** ·
**Scene** (composing `.lypart` with the N0 transformations — collage-like designs such
as ATC). Anticipated sub-project: the **pattern editor**.

## Open backlog (no "final product")

The tool evolves continuously. An item leaves the backlog only when the Product Owner
promotes it to a step, with its reference target.

- SVG / `.lypart` / PDF export; SVG import (interoperability)
- Millimetres and print formats (interoperability)
- Multiple Trame / Scene calques in practice
- Scripting language — merged into **Scripts** below (PO, 2026-11-05)
- Composition templates, predefined patterns, tutorials (guiding)
- Search plugins by tag (`keywords`), in *Preferences › Plugins* or the palette (N0.6)
- Enable / disable plugins without a restart (VS Code does it since 1.31) (N0.6)
- **Test batches** (PO, 2026-11-05): run only part of the unit / end-to-end tests by a
  criterion — a category, or the version / sub-step that introduced them (e.g. a
  `@N0.6` tag; the 4-number `xx.yy.zz.tt` idea needs care, since `package.json`
  versions must be semver). Jest (`-t`, paths) and Playwright (`--grep` on tags) can
  filter already, no new dependency. To place: a small sub-step before N0.7, or later.
- **Scripts** (PO, 2026-11-05) — automation after MS Office *macros*: record, edit and
  replay a sequence of Actions / Commands, also in a **batch mode** (main without a
  window; kept possible by `PLUGIN_DEPENDENCIES.md` §2). Merges the « scripting
  language » item above. Language: **Python** wanted, **embedded** so that the
  installed Python does not matter — options: a standalone CPython shipped with the
  app (child process of main, JSON over stdio), or Pyodide (WebAssembly). Name:
  *Scripts*, not Illustrator's *Actions*, which would clash with our *Action*.
- **Node editor** (PO, 2026-11-05): intuition that it will serve the specification of
  document templates (with N4). A read-only first witness could be the plugin
  dependency graph (`PLUGIN_DEPENDENCIES.md` §8).
- **Document templates and wizards** (PO, 2026-11-05): ATC, fantasy banknote, stamp,
  playing card…, and wizards to create a document from them (guiding).

- **NFT mode** (requested by the **sponsor and first user**; recorded by the PO,
  2026-11-06) — optional, **inactive by default**: a set of plugins, disabled by
  default (`PLUGIN_DEPENDENCIES.md` §8, `ld-enabled-by-default`). Factored after
  N0.6 bis: `nft-core` (artwork metadata — name, description, attributes, image,
  edition, royalties —, generated collections from a seed, export of images and
  metadata, one menu entry and dialog with the chain choice) ← `nft-evm` (ERC-721 /
  ERC-1155) ← `nft-base`, `nft-polygon`, `nft-immutable`; and `nft-solana`,
  `nft-sui`, `nft-aptos`, `nft-tezos` on `nft-core`. Chains: Solana, Sui, Base,
  Polygon, Tezos, Aptos, Immutable — *Immutable X has been merged into Immutable
  zkEVM; check the target when promoted*. Keys and signing in main only (as
  Cryptocalc), never in the renderer; compatible with the batch mode.
## Quality axes (every delivery reports on them)

Reliable · Intuitive · Guiding · Evolvable · Interoperable.

---

<sub>Prepared with the assistance of Claude AI, used as a tool under the authors' direction.</sub>

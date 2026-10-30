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
| N0 — Scaffolding | ⏳ **in progress** — N0.1 ✅ · N0.2 ✅ · N0.3 + N0.4 ✅ · N0.5 next (bottom panel — contract in draft) · N0.6 contract in draft (plugins) |
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
2. **Object explorer** — an essential scaffolding feature that was missing: a panel on
   the **left, full height**, with a splitter and expand / collapse. **Decided
   (2026-10-30, 23:06):** the layout anticipates it **from N0.5** — left column, full
   height; the bottom panel spans the **document area only**. The explorer itself is
   **its own sub-step**, not built in N0.5; its exact position relative to the calques
   is settled when that part of N0 comes (it needs calques and the rectangle as witness).

**Output panel contract drafted (2026-10-30, 23:10):** `docs/contracts/OUTPUT_PANEL.md`
(not yet validated). Its open points (§13) are settled one at a time. Settled so far:
VS Code is also a code reference (same stack); tabs **Output · Debug Console ·
Terminal**, **Output** active at first launch; first launch unfolded, height a quarter
of the window. Next: persistence of the panel state.

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
| N0.5 | **Bottom panel** after VS Code: tabs Terminal, Debug Console, Output; resizable (splitter), foldable; layout reserves the object explorer's column; witness = the application's own traces | Output panel (draft) | ⏳ next |
| N0.6 | Server and renderer plugins (dummy ones); *Plugins* menu with submenus, after Inkscape | Plugin API (draft) | — |
| N0.7 | **Multi-document, one tab per document**: *File › New* (Ctrl+N), *File › Close* (Ctrl+W), switch tabs (Ctrl+Tab / Ctrl+Shift+Tab), close button per tab, one active document; each document owns its state | Document model (multi-document) | — |
| N0.8 | Calques + undo / redo per document (every mutation is an EditTransaction; « modified » mark on the tab) | Calque / object model, EditTransaction | — |
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
- Scripting language
- Composition templates, predefined patterns, tutorials (guiding)

## Quality axes (every delivery reports on them)

Reliable · Intuitive · Guiding · Evolvable · Interoperable.

---

<sub>Prepared with the assistance of Claude AI, used as a tool under the authors' direction.</sub>

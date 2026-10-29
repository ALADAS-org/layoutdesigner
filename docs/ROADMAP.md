# Layout Designer — Roadmap (Maslow pyramid)

**Product Owner:** Michel (Echopraxium) · **Implementer & advisor:** Claude AI
**Agreed:** 2026-10-28 · **Governed by** the skills `ld-maslow-pyramid-workflow`
(what / when) and `ld-complexity-governance` (cost, tests, debt).

> *Build the wall brick by brick. Never skip a step.* A level starts only when the
> level below has been validated by the Product Owner — both gates: the automated
> **anti-regression gate** (tests) and the **Design gate** (plastic-arts and
> ergonomic validation by the Product Owner).

## Current status

| Level | State |
|---|---|
| N0 — Scaffolding | ⏳ **in progress** — N0.1 ✅ · N0.2 ✅ · N0.3 + N0.4 delivered, awaiting validation |
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

**Next action (2026-10-29): Product Owner validation of N0.3 + N0.4** (HTML GUI and
localisation, merged into one step). Run `npm test`, then `npm start` and check the
Design gate: menus (mouse and keyboard), toolbar icons and tooltips, light and dark
themes, About dialog, status bar, French labels (system locale, or
`npx electron . --lang=fr`). Details: `docs/contracts/ACTION_COMMAND.md` §13.
Settled on 2026-10-29: `jquery-ui` approved; theme colours approved; the palette
icon was replaced by a VS Code-like **command center** in the toolbar; **dark theme by
default**; *Help › About* also on **F1** and as the palette entry « Help: About… »
(palette entries read « Category: Label », as in VS Code); **interactive language
choice** promoted from the backlog into N0.3 (palette entry *Preferences: Choose
Language…*, jQuery dialog, iziToast restart warning, `src/config/preferences.json`;
contract §13.8) — awaiting the Product Owner's check.

After validation: N0.5 — plugins (write the Plugin API contract first).

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

## Vocabulary

| Term | Meaning |
|---|---|
| **Calque** | A layer of the document (`layer` in English code identifiers). |
| **Action** | Client-side unit of functionality. The only thing a menu, toolbar or command-palette entry triggers. |
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
| N0.3 | HTML GUI: menu bar, toolbar, status bar, one dialog; themable | contract §13 | 🔍 delivered, awaiting validation |
| N0.4 | Localisation (JSON, en / fr) — merged into N0.3 | contract §13.6 | 🔍 delivered with N0.3 |
| N0.5 | Server and renderer plugins (dummy ones) | Plugin API | — |
| N0.6 | Document + calques + undo / redo (every mutation is an EditTransaction) | Calque / object model, EditTransaction | — |
| N0.7 | Selection + copy / paste | — | — |
| N0.8 | *Object → Transformation* | — | — |
| N0.9 | Zoom (loupe) + panning | — | — |

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

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
| N0 — Scaffolding | ⏳ **next** — not started |
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

**Next action (2026-10-29): open N0.** Agree with the Product Owner, before any code:
1. the **sub-steps of N0** and their order;
2. for each sub-step, its **reference target** and **acceptance criteria** (both gates);
3. the **complexity budget**, starting with a short **written design of the public
   contracts** — Action / Command registries and aliasing, plugin API, calque and
   object model, EditTransaction history — validated before implementation.

**Open points** (decided when their level comes, not before):
- N0 — order of the sub-steps (proposal to be made by Claude, decided by the Product Owner).
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
  special case), zoom (loupe), panning — Illustrator / Inkscape basic toolkit.
- GUI **entirely in HTML, menus included**: menu bar, toolbar, status bar, dialog
  boxes; themable.
- Localisation of labels with JSON files.
- First unit and end-to-end tests (Jest + Playwright).

References (read from their HEAD): electron-boilerplate-cjs (HTML menus, viewlets,
Commands / Actions, command palette), TscgOntologyExplorer (plugins), Cryptocalc
(vizjets, L10n, tests). Details in `ld-maslow-pyramid-workflow` §4.

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

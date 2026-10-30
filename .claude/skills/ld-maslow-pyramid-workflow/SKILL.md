---
name: ld-maslow-pyramid-workflow
description: "Layout Designer: priorities and step-by-step workflow (Maslow pyramid N0–N5, Product Owner validation, no improvisation). Load before proposing or building any LD feature."
---

# Layout Designer — Maslow Pyramid Workflow

Agreed with Michel (Product Owner) on 2026-10-28; multi-document added to N0 on
2026-10-30. Companion skill: `ld-complexity-governance` (cost, tests, technical debt).
The repository copy (`.claude/skills/ld-maslow-pyramid-workflow/SKILL.md` on HEAD) is
the reference.

## 0. Guiding principles

**Build the wall brick by brick. Never skip a step.**

The anti-pattern to avoid is the *electronic piano demo*: an improvised result that
looks impressive, that nobody fully understands, and that makes us feel we can play
without having learned. An opaque result is not a result, even when it impresses —
for a tool designer it is level zero (or −1). Past examples in this repo: an
unrequested print-format selector and presets with hand-set, unexplained
composition; a guilloché built from a guessed need (the real need was banknote
spirograph screens and rosettes); first pattern renders that drifted from
Silverquote and were caught only by the Product Owner's eye.

**Don't reinvent the wheel.** For editing behaviour, follow the conventions of the
vector-drawing classic **Illustrator**, the reference application (Product Owner
decision, 2026-10-29) — names, menus, shortcuts, selection and transformation
behaviour, document tabs, and later the calques user interface. Inspire from it, even
copy it. Scope is its **basic toolkit** only (documents, selection, copy/paste,
transformation, zoom/pan, calques…), not its exhaustive feature set, until the Product
Owner decides otherwise. Likewise reuse the Product Owner's own prior work (§4).

## 1. Vocabulary (agreed)

| Term | Meaning |
|---|---|
| **Calque** | A layer of the document (`layer` in English code identifiers). |
| **Action** | Client-side unit of functionality (renderer). **The only thing a menu, toolbar or command-palette entry triggers.** The user sees it as a « command » (Command Palette, « Search commands »), as in VS Code. |
| **Command** | Server-side unit of functionality (Electron main: files, quit, full screen, dev tools…). Never called directly by the UI: an Action that *redirects* to it (an alias) is used instead. |
| **EditTransaction** | The undoable unit of document modification, recorded in the document's undo/redo history. Actions that modify the document produce EditTransactions. |
| **Document** | One open work, shown in its **own tab**; several documents can be open at once, one of them active. Each document owns its state (calques, selection, undo/redo history, « modified » mark). |

## 2. Roles

| Role | Who | Owns |
|---|---|---|
| **Product Owner** | Michel | Scope, priority, acceptance. Design validation (plastic-arts and ergonomic judgement). Nothing is closed without him. |
| **Implementer & advisor** | Claude | Implementation of the agreed step; advice on how steps should be sequenced; control of complexity growth and technical debt (see `ld-complexity-governance`). |

Suggestions and critiques from Claude are **welcome** — they are **proposed, never
built** until the Product Owner accepts them.

## 3. The pyramid (order of construction)

A level starts only when the level below has been validated by the Product Owner.
Live status (current step, sub-steps, acceptance criteria) is in `docs/ROADMAP.md`
on HEAD — read it there, never from memory.

| Level | Need | Content |
|---|---|---|
| **N0 — Scaffolding** | A sound workshop before any artwork | **Functional units**: Action registry (client), Command registry (server), Actions as aliases of Commands, **command palette**. **Extensibility**: server-side and client-side plugins with a **plugin API** (plugins contribute Actions, Commands and menu entries). **Multi-document**: several documents open at once, **one tab per document** — *File › New* (Ctrl+N), *File › Close* (Ctrl+W), switch tabs (Ctrl+Tab / Ctrl+Shift+Tab), close button per tab, one active document, each document owning its state. **Calques**: the generic calque stack (add, remove, reorder, show/hide, select the active calque), per document. **Editing functions**: undo/redo per document (EditTransactions; « modified » mark on the tab), selection, copy/paste, object transformation (*Object → Transformation*: translation, scale, height/width ratio, rotation; mirror as a special case), zoom (loupe) and panning. **GUI structure, entirely in HTML, menus included**: menu bar, toolbar, status bar, dialog boxes; themable. **Localisation** of labels with JSON files. **First unit and end-to-end tests** (Jest + Playwright). Every brick is validated on the simplest witness case: a **rectangle** (on at least two calques), **at least two documents open in two tabs** for multi-document; dummy client and server plugins for the API. |
| **N1 — Base** | Redo Silverquote, without the crypto-wallet part | Open a JSON `.pattern` file, generate a grid of **square** cells, render **faithfully to Silverquote**. |
| **N2 — Reliability** | Never regress | Clear messages on invalid files; visual non-regression run on every change. |
| **N3 — Control** | Drive the generation | Grid size, Random/Sequence, seed, PNG export, save. |
| **N4 — Generative pipeline** *(specification)* | Define the chain | Predefined calque types, bottom → top: **Background, Trame, Pattern, Scene**. Each has **its own JSON rule set** and **its own composition modalities**. The model **anticipates** several Trame / Scene calques without implementing them. Deliverable = spec + JSON schemas, validated before any code. |
| **N5 — Implementation** | Build the calque types one by one | Sub-steps: **Trame** (guilloché = a special case: banknote spirograph screens and rosettes) · **Pattern** families (text, quad, hex) · **Background** · **Scene** = composing `.lypart` with the N0 transformations, enabling collage-like designs such as ATC. Anticipated sub-project: the **pattern editor**. |

N0 sub-steps (order validated; live state in `docs/ROADMAP.md`): N0.1 Electron shell +
test harness · N0.2 Action / Command registries, command palette · N0.3 + N0.4 HTML GUI
and localisation · N0.5 plugins · **N0.6 multi-document, one tab per document** · N0.7
calques + undo / redo per document · N0.8 selection + copy / paste · N0.9 *Object →
Transformation* · N0.10 zoom + panning.

There is **no top level and no "final product"**: the tool evolves continuously.
Above N5 there is only an **open backlog** (e.g. SVG/`.lypart`/PDF export,
millimetres and print formats, multiple Trame/Scene calques in practice,
scripting). An item leaves the backlog only when the Product Owner promotes it to a
step, with its reference target.

## 4. N0 references — read them from their HEAD, never from memory

| Brick | Reference to follow |
|---|---|
| Editing behaviour, document tabs, calques (including their user interface), menu content, shortcuts | **Illustrator** conventions — the reference application (basic toolkit only). |
| HTML menu bar, toolbar, viewlets, Commands / Actions, command palette | **electron-boilerplate-cjs** (ALADAS-org, Product Owner's prototype): `www/src/view/viewlets/{menubar,main_toolbar,command_palette}/`, `www/src/view/viewlet_loader.js`, `www/src/controller/command_registry.js` + `commands/`, `www/src/view/action_registry.js` + `actions/`, `www/css/custom_menu.css`. Menu entries are declarative (`labelKey` for L10n + a key of what they trigger). **Adapt, do not copy blindly**: (a) menu entries trigger **Actions only**; an Action may be an alias redirecting to a server Command over IPC; (b) **lighter form** than the prototype's singleton-per-class (≈30 lines per unit) — one unit = a small registered object, ES modules — without turning the Electron plumbing into a *gas factory*; (c) add what the prototype lacks: keyboard shortcuts, keyboard navigation, enabled/disabled state, separators, check items, submenus, command-palette filter. jQuery and iziToast are accepted. |
| GUI components (dialogs, status bar) | Cryptocalc `www/vizjets/<component>/` (`.html` + `.css` + `.js`, inserted with `w3-include-html`); driver code in `www/js/view/`. |
| Localisation | Cryptocalc `www/js/L10n/` and electron-boilerplate-cjs `www/L10n/` (`gui-msg-en.json`, `gui-msg-fr.json`). |
| Tests | **Jest + Playwright**, as in TSCG and Cryptocalc (`tests/jest/unit`, `tests/jest/fixtures`, `tests/playwright/e2e`, `_doc` test protocols). The first tests are generated in N0. |
| Plugins & API | **TscgOntologyExplorer** (the boilerplate's extensibility was never prototyped): `PLUGINS_README.md`, `src/core/PluginManager.js`, `src/core/ServerPluginApi.js`, `src/renderer/RendererPluginApi.js`, `plugins/tscg-dummy-*` (server = CJS in main; renderer = ESM via `plugin://`; `both` = hybrid; type declared in `package.json`). Plugins register their contributions in the Action / Command registries. |
| Multi-document (tabs) | **TscgOntologyExplorer** `src/renderer/DocumentManager.js` (a `Document` per tab holding its own state; open — activates an already-open document instead of duplicating it —, close — activates the adjacent tab —, set active, change listeners) and Illustrator's document tabs. |
| Undo / redo | EditTransaction history, one per document (designed in N0; nothing is inherited from the abandoned prototype). |

## 5. Quality axes (cross-cutting, every step)

Every delivery states its effect on these five axes:

1. **Reliable** — unit + end-to-end tests (from N0).
2. **Intuitive** — ergonomics reviewed on every step that touches the UI.
3. **Guiding** — help for beginners: command palette (N0), composition templates, predefined patterns, tutorials.
4. **Evolvable** — plugins (N0), scripting language (backlog).
5. **Interoperable** — e.g. SVG import/export; mm and print formats belong here.

## 6. Per-step loop

1. **Locate** the request in the pyramid. If it belongs to a later level or to the
   backlog, say so and propose where it goes — do not build it.
2. **Fix the reference target before coding**: an image, a file, a behaviour (for
   N1: Silverquote renders; for N0: the rectangle witness, two documents in two tabs,
   the Illustrator behaviour, and the references of §4). No reference → ask; never
   guess the need.
3. **Agree the acceptance criteria** — two gates, both required:
   - **Anti-regression gate** (automated): unit, end-to-end and visual tests green.
   - **Design gate** (Product Owner): plastic-arts and ergonomic validation.
4. **Declare the complexity budget** (see `ld-complexity-governance`).
5. **Implement the minimum** that meets the criteria. Nothing more.
6. **Deliver** as git patches (`git am`) with the delivery report
   (`ld-complexity-governance` §5), including a *Proposals (not built)* section.
7. **Product Owner validates** (runs it himself). Only then is the step closed and
   `docs/ROADMAP.md` updated.

## 7. Hard rules

- Implement only what the current step asks for. No "while I'm at it".
- Extra ideas go to *Proposals (not built)*; the Product Owner accepts or rejects.
- Never call a step done before both gates pass.
- Anticipate in the model, do not implement (e.g. multiple Trame / Scene calques).
- Prefer an established Illustrator convention, or the Product Owner's
  prior prototypes, over an invented one; when departing from them, say why.
- When something is unclear, ask one precise question instead of filling the gap
  with an invented choice.
- **One point at a time** (Product Owner, 2026-10-30): one question per message; move
  to the next point only after the Product Owner's answer. Never bundle several open
  decisions in one message.
- Opaque composition choices (formats, presets, default layouts, colours) are
  **design decisions** — they belong to the Product Owner.

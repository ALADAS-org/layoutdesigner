# Layout Designer — Reference Corpus (Bootstrap)

> Minimal orientation file. If this is the only Layout Designer document in context,
> it is enough to avoid silent corruption. For anything operational (paths, contracts,
> build order), see **`LD_ReferenceCorpus.md`** (the complete index/router).

---

## What Layout Designer is

**Layout Designer** — an ElectronJS tool for composing **fixed-format print
artifacts**: postcards, commemorative/definitive stamps, fantasy/"Monopoly"
banknotes, ID-1 (credit-card format) cards, ATC/ARC, playing and tarot cards.
Spun out of *Pattern Lab*; the pattern grid-DSL became one of its three file
formats.

**Design stance.** A **domain-free core + plugins**. The core knows documents,
layers, regions, commands and a rendering façade — nothing about stamps or
banknotes. Every print-domain notion (formats, fill, pattern, guilloche, text,
perforation, postmark…) is a **plugin contribution**. New kinds of artifact are
added without touching the core.

**Three file formats — the live/frozen axis:**
```
.lydoc   a DOCUMENT: format + ordered layers + assets          (live, editable)
.lygrid  a PATTERN:  a grid-DSL (ex-.pattern) — cells -> shapes (live, editable)
.lypart  a COMPONENT: a FROZEN SVG snapshot of a render        (frozen, reusable)
```
A `.lydoc` or `.lygrid` is *live* (re-rendered from its model each time); a
`.lypart` is *frozen* (an SVG baked once, replaced transformed).

---

## How it is judged

Layout Designer is a **toolkit**, not a monolith. It is judged by (1) **internal
coherence** — every mutation is reversible, the façade is the only drawing surface,
units are consistent — and (2) **usefulness** — can a real artifact be composed from
the pieces? Shortcuts are legitimate when they serve the toolkit, **flagged as such**
(e.g. the v0 Canvas2D-only backend, deferred SVG export). Every mechanism must pay
for its place by use.

---

## Minimal project corpus (to bootstrap a fresh Claude project)

**Design goal: once the project is set up, the user never has to load anything into
a conversation.** Everything needed is either resident in the project or pulled from
HEAD automatically. Set it up once, in three places:

**A — Project custom instructions (the standing prompt for every conversation).**
Put a **short directive** in the project's custom-instructions field telling Claude to
fetch and follow the Smart Prompt from HEAD — keeps the field small and current:

```
This is a Layout Designer project. At the very start of every conversation, before anything else:
1. Fetch https://raw.githubusercontent.com/ALADAS-org/layoutdesigner/main/docs/reboot-kit/LD_SmartPrompt.md
   and follow it as your session loader (it names the corpus to read and the authority rule).
2. Governing rule: HEAD is the only authority — read code/structure facts from HEAD or the
   resident corpus, never from memory.
```

*(Fallback, if web fetch is off: paste the full contents of `LD_SmartPrompt.md` into the
custom-instructions field instead.)*

**B — Resident in Project Knowledge (loaded once, always in context):**
1. `LD_ReferenceCorpus_Bootstrap.md` — invariants (this file).
2. `LD_ReferenceCorpus.md` — the HEAD router.
3. `LD_Workflow.md` — the development workflow (setup + per-task loop).
4. `docs/reboot-kit/LD_FileTree.md` — the repo path map.

> Item 4 **drifts** as the repo evolves. That is the **project owner's** occasional
> maintenance — regenerate it with `cli_tools/ld_generate_filetree.py` and reload it after
> structural changes — never the user's per-conversation burden. Keep the resident set
> small — **four files, not the whole repo.**

**Read from HEAD on demand (never loaded into the project):**
- The **source code** (core, plugins, renderer) and the **architecture spec**
  (`docs/LayoutDesigner_ARCHITECTURE.md`) — a resident copy would go stale and violate
  the head-over-memory rule, so these come from HEAD when needed. The File Tree gives
  the exact paths.

**Enable web fetch** in the project so Claude pulls all of the above itself.

---

## Hard invariants (must never drift)

**The `gfx` façade is the ONLY drawing surface (§12).**
No layer, no primitive ever touches a raw canvas / P5 context. Everything receives
`gfx` and draws **in millimetres**, in **one coordinate frame**, using the **normalized
anchors** of §10.2:
- **square grid:** `center` + 8 compass (`N, NE, E, SE, S, SW, W, NW`)
- **hex grid:** `center` + `0, 60, 120, 180, 240, 300`

P5's per-primitive anchor inconsistency (`ellipseMode`, `rectMode`, text baseline) is
absorbed in **one place** (`src/core/render/facade.js`). `CanvasTarget` is the first
backend; `SvgTarget` (export → `.lypart`) will implement **the same contract** — primitive
code must not change.

**Units are millimetres, everywhere in the model.** Pixels appear only at render time
(`pxPerMm = dpi/25.4 × zoom`). Regions, sizes, line widths: mm.

**Every mutation is a Command (§5).** The UI never mutates the document directly — it
calls `session.dispatch(cmd)`. All mutations live in `src/core/commands.js` and nowhere
else. Undo/redo is the UndoStack; coalescing by `coalesceKey`.

**Three formats, one meaning each.** `.lydoc` = document, `.lygrid` = pattern grid-DSL,
`.lypart` = frozen SVG component. Don't conflate `.lygrid` (live pattern) with `.lypart`
(frozen output). `.lypat` is retired (too close to `.lypart`).

**Electron security.** `contextIsolation: true`, `nodeIntegration: false`. The renderer
has no Node; main-process powers (files, PDF/SVG export) are exposed **only** via declared
IPC through the preload bridge.

**Code conventions.**
- ES modules (`import`/`export`). For an older CommonJS Electron, swap to `require`/
  `module.exports` — mechanical, no logic change.
- Generated code/docs in **English**; conversation in **French**.
- `author` / credit line: `"Echopraxium (Michel) with Claude AI"`.
- Raw CDN base: `https://raw.githubusercontent.com/ALADAS-org/layoutdesigner/main/`

---

## HEAD is the only authority

The committed content on `main` is the sole source of truth for any live file (code,
architecture spec). **Never** trust stale snapshots, session uploads, or project-knowledge
copies for current structure.

- Refresh a clone: `git fetch --depth 1 origin main && git reset --hard origin/main`
- Raw CDN is unrestricted: `https://raw.githubusercontent.com/ALADAS-org/layoutdesigner/main/...`

Corpus `.md` files hold durable *rationale* and routing only. When rationale and a live
file disagree on a structural fact, **the live file on HEAD wins.**

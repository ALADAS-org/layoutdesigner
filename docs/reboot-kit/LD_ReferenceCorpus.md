# Layout Designer — Reference Corpus (Complete)

**Author**: Echopraxium (Michel) with Claude AI

> **This file is a router, not a content store.** It maps *where authority lives*
> so that live facts are read from HEAD, never recited from the corpus. It carries
> no line counts or code bodies — those go stale. For the invariants (façade rule,
> mm, Command, the three formats), see the companion
> **`LD_ReferenceCorpus_Bootstrap.md`**.

---

## How to read HEAD

- Raw CDN (unrestricted): `https://raw.githubusercontent.com/ALADAS-org/layoutdesigner/main/<path>`
- Exact committed content: `git show HEAD:<path>` in a fresh clone
  (`git fetch --depth 1 origin main && git reset --hard origin/main`)
- The GitHub **API is rate-limited** — prefer the raw CDN or a clone.

---

## The architecture spec (the design authority)

`docs/LayoutDesigner_ARCHITECTURE.md` ★ — the full specification (v0.4). Section map:
§2 data model · §3 plugins · §4 layers / presets / postal types · §5 undo · §6 i18n ·
§7 multi-doc shell · §8 the three formats · §10 `.lygrid` spec (primitives, anchors,
mini-language, guilloche, symmetry) · §11 WYSIWYG editor (deferred) · §12 the `gfx`
façade · §15 **build order** · §16 open decisions.

When a design question arises, read the relevant § from HEAD — do not reconstruct it
from memory.

---

## Core routing — where each contract lives  (★ = authority, read from HEAD)

| Concern | Path |
|---|---|
| Data model (Document / Layer / Region / GridPattern / Component, all mm) | `src/core/document.js` ★ |
| Command + UndoStack (coalescing) | `src/core/undo.js` ★ |
| **All** mutations (add/remove/move/setField/setProp/setFormat) | `src/core/commands.js` ★ |
| Session (doc + undo + event bus = one tab) | `src/core/session.js` |
| Plugin-host v0 : LayerType / Primitive / formats / locales / presets | `src/core/registry.js` ★ |
| i18n (fr/en dictionaries + `t()`) | `src/core/i18n.js` |
| **`gfx` façade** + `CanvasTarget` + anchors §10.2 (mm→px) | `src/core/render/facade.js` ★ |
| Compositor (bottom→top: region, opacity, blend, mask, delegate) | `src/core/render/compositor.js` ★ |
| Cell geometry (square / hex) | `src/core/geometry/grid_layout.js` |
| Guilloche curve math (hypotrochoid, rose, spiral…) | `src/core/geometry/guilloche.js` |

## Plugin routing — built-in contributions (each exports `register(reg)`)

| Plugin | Path | Contributes |
|---|---|---|
| formats-print | `builtin-plugins/formats-print/index.js` | FormatSpec catalogue (mm) + "stamp" preset |
| layer-fill | `builtin-plugins/layer-fill/index.js` | LayerType `fill` (solid / gradient) |
| layer-pattern | `builtin-plugins/layer-pattern/index.js` | LayerType `pattern` (.lygrid): mini-language §10.3, symbols/macros, quadrant symmetry §10.5 |
| layer-guilloche | `builtin-plugins/layer-guilloche/index.js` | LayerType `guilloche` |
| layer-text | `builtin-plugins/layer-text/index.js` | LayerType `text` (anchored §10.2) |
| layer-perforation | `builtin-plugins/layer-perforation/index.js` | LayerType `perforation` (stamp dentelure, edge effect §4) |

## Shell & assets routing

| Purpose | Path |
|---|---|
| Browser host (fast preview, no Electron) | `demo.html` |
| App wiring (registry+plugins, session, compositor, UI) | `src/renderer/app.js` |
| Electron main (serves project over localhost, loads window) | `main.js` |
| Electron preload bridge (contextIsolation, IPC stubs) | `preload.cjs` |
| Reference mini-language sample (8 Yi King trigrams) | `assets/iching.lygrid.js` |
| JSON Schemas for `.lydoc` / `.lygrid` (to be added, §15.4) | `schemas/` |

## Reboot-kit routing (this lazy-loading workflow)

| Purpose | Path |
|---|---|
| Session loader (fetched by project custom instructions) | `docs/reboot-kit/LD_SmartPrompt.md` |
| Development workflow (setup + per-task loop, human-facing) | `docs/reboot-kit/LD_Workflow.md` |
| Current-state handovers (read the latest on resume) | `docs/Handovers/*_LD_Handover.md` (timestamped) |
| Invariants | `docs/reboot-kit/LD_ReferenceCorpus_Bootstrap.md` |
| This router | `docs/reboot-kit/LD_ReferenceCorpus.md` |
| Repo path map (generated) | `docs/reboot-kit/LD_FileTree.md` |
| File-tree generator | `cli_tools/ld_generate_filetree.py` |

---

## Build order status (§15)

| Step | Scope | State |
|---|---|---|
| 1 | Core : document / session / undo+commands | ✅ done |
| 2 | `gfx` façade + CanvasTarget ; anchors §10.2 ; pattern render behind gfx | ✅ done |
| 3 | plugin-host + registry + LayerType/Primitive contracts ; load builtin-plugins | ✅ done |
| 4 | `files.js` : `.lydoc`/`.lygrid` open/save + JSON Schemas + validation | ⏳ deferred |
| 5 | i18n (fr/en) ; UI shell : toolbar, tabs, canvas, Layers panel | ✅ done (tabs = v1) |
| 6 | Plugins : formats-print, layer-fill, layer-pattern (faithful .pattern engine), layer-guilloche (currency grammar), layer-text, layer-perforation, layer-component (.lypart) | ✅ done |
| 7a | `component` layer (place .lypart: pos/scale/aspect/rotation) | ✅ done |
| 7b | `SvgTarget` + export-svg → `.lypart` (real frozen components) | ⏳ deferred |
| 8/9 | WYSIWYG pattern editor (§11) | ⏳ deferred (sub-project) |

**Deferred / not-yet-built (do not assume these exist):** `files.js` (open/save), `SvgTarget` + `.lypart` export,
quad/hex cell rendering in layer-pattern, the WYSIWYG editor; see `LD_HANDOVER.md` for the full roadmap. Earlier: `SvgTarget`,
`.lypart` export, the WYSIWYG editor, the `postmark` / `ink-stamp` layer types (§4.1),
torn-edge masks and named groups (§4) — the compositor already carries the `mask` hook.

---

*Companion: `LD_ReferenceCorpus_Bootstrap.md` (invariants). Governing discipline:
HEAD is the only authority; verifiable facts come from HEAD, never from memory.*

# Layout Designer — Handover (2026-10-27)

Current-state handover for resuming work (read this + `LD_ReferenceCorpus.md` on HEAD).
Supersedes nothing in the architecture; it records **where the build is** and **what's next**.

## Where we are

- Repo `ALADAS-org/layoutdesigner`, prototype + reboot-kit live on `main`.
- Runnable: `npm install && npm start` (Electron) or `npx serve .` → `demo.html`. The
  demo opens on the **ATC** preset.
- Everything is drawn through the `gfx` façade (§12); the model is in millimetres; every
  mutation is a Command.

## What's built (against architecture §15)

- **Core (§15.1)** — `src/core/`: Document/Layer/Region/GridPattern/Component (mm),
  Command+UndoStack, Session, Registry (plugin-host v0), i18n.
- **Façade (§15.2)** — `src/core/render/facade.js`: `gfx` + `CanvasTarget`, anchors
  §10.2, and `image()` for component placement. `compositor.js` composites bottom→top
  (region/opacity/blend/mask).
- **Plugins (§15.3/§15.6)** — `builtin-plugins/`:
  - `layer-fill` (solid / gradient)
  - `layer-pattern` — **faithful `.pattern`/`.lygrid` engine** (ComboShape + parts,
    `$Name(args)` macros; primitives circle/ellipse/square/rectangle/diamond/arc PIE/
    polygram/line/digit_mark/guilloche). Verified cell-for-cell vs Silverquote.
  - `layer-guilloche` — **currency-grade** textures, grammar `style: field | rosette |
    combo` (+ density/shape/gradient params).
  - `layer-text`, `layer-perforation`.
  - `layer-component` — places frozen `.lypart` SVGs (position/scale/aspect/rotation/flip).
- **UI shell (§15.5)** — HTML toolbar, Layers panel, undo/redo, format select, guides,
  language toggle, quadrant-symmetry toggle. (Tabs/multi-doc = v1.)
- **Presets** — `stamp`, `banknote`, `atc` (4 named layers bottom→top:
  `background → guilloche → pattern → ATC`).
- **Legacy corpus** — `schemas/pattern.schema.json` + `pattern.spec.md` +
  `cli_tools/pattern_validate.cjs` (37/37, 0 err) + `screenshots/legacy/`.

## Invariants & rendering rules (do not regress — see `pattern.spec.md`)

1. `position:[x,y]` is **centre-relative** (absolute px, or percent×CellSize). Anchors too.
2. Filled shapes get a **default black outline**; `drawColor:"none"` suppresses it.
3. `digit_mark` is an **optional overlay** (`showDigits`), off by default.
4. Cells are **jointive**; anti-seam `cellBleedPx` (~0.75px) covers sub-pixel gaps; the
   grid overlay (`GridColor`) is drawn **on top**, not as a gap.
5. Guilloche grammar: `style` = field (full-surface, no holes) / rosette (precessing
   spirograph medallion) / combo; `gradient:{from,to}` = per-line/radius colour lerp.
6. `.lypart` placement: `component` layer `items[]`, each `{svg, x,y,w,h (mm), rotation,
   flipX, opacity}`; SVGs preloaded to `_img` before render (`preloadComponents`).

## Deferred / next steps (priority order)

1. **§15.4 `files.js`** — open/save `.lydoc`/`.lygrid` (+ validation: branch
   `schemas/pattern.schema.json`). This gives **persistence** (the main missing piece).
2. **§15.7 `SvgTarget`** — implement the gfx **SVG backend** (same contract as
   CanvasTarget) → real `export .lypart` (frozen components) + SVG/PDF print. Today the
   `.lypart` samples in `assets/lyparts.js` are generated, not exported.
3. **Quad/hex cell types** in `layer-pattern` (`SquareQuadCell`, `TriangleQuadCell`,
   `HexTruchet`, `HexRhombusCell`): they **validate** but aren't rendered live yet.
4. **UI**: preset selector; `.lypart` placement UI (drag/scale/rotate); guilloche &
   pattern parameter panels; the WYSIWYG pattern editor (§11, sub-project).
5. **Pixel-snapping** option (crisper fills at integer zoom); `icon` primitive + tileset
   loader for the legacy `Icons/*` family.
6. **Named groups** (§4) so the ATC layer can nest sub-pieces as a real group.

## Known gaps / honest notes

- `.lypart` components are **generated SVG samples**; real ones arrive with §15.7 export.
- Guilloche aesthetics are tuned via the grammar, not final — that's by design (the
  grammar is the control surface).
- The `banknote`/`atc` presets are demonstrations; regions/placements are hand-set.

## How to continue

Work in the **Layout Designer v0** Claude project (the reboot-kit loads per conversation
via the Smart Prompt). Read this handover and `LD_ReferenceCorpus.md`; read code/structure
facts from HEAD, never from memory. Deliver changes as **git patches** (`git am`).

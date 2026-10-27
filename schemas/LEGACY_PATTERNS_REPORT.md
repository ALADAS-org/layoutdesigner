# Legacy patterns — grammar, validation & render report

Reproduces, on the legacy SilverQuote corpus now under `assets/legacy/patterns/`,
the results of the earlier Pattern Lab prototype: the extracted JSON grammar, a
validator run, and render previews.

## The `.pattern` grammar (one type, not three)

The `.pattern` files **are** JSON. The 3 `.json` files that shipped alongside
(`Polygram.json`, `HalfCircles.json`, `Truchet/CircleQuarter_GreySepia.json`) were
**byte-identical duplicates** of their `.pattern` sibling — not a distinct format —
so they were removed. There is a **single grammar**:

- `schemas/pattern.schema.json` — JSON Schema (structure).
- `schemas/pattern.spec.md` — the human-readable spec (fields, families, primitives,
  the `$Variable` / macro mini-language, anchors, `NumberFormat`, quad `colorPairs`).

This is the same grammar destined for `.lygrid` validation (architecture §15.4); the
legacy `.pattern` is the ancestor of `.lygrid`.

## Validation — 37 / 37

The semantic validator `cli_tools/pattern_validate.cjs` (0-dependency Node; checks
`$ref` resolution, macro arity, prefix collisions, cell coverage, quad `colorPairs`
cardinality) passes the whole corpus:

```
node cli_tools/pattern_validate.cjs assets/legacy/patterns
# -> 37 file(s) — 0 error(s), 0 warning(s)
```

The argument may be a file or a directory (recursive); works on Windows cmd too (no
shell globbing needed).

## Render previews — representative subset (10)

Rendered with the Pattern Lab renderer (Canvas2D) into `screenshots/legacy/`, one per
family/variant, random cells seeded for a stable image:

| File | Pattern | Family / feature |
|---|---|---|
| `default.png` | Default.pattern | default (diamonds, circles, lines, digit marks) |
| `polygram.png` | Polygram.pattern | polygram (regular + star) |
| `arcs.png` | HalfCircles.pattern | arc / half-circle |
| `iching.png` | IChing/IChing_Mono.pattern | composed bars (Yi King) |
| `rectangles.png` | NestedSquares.pattern | nested rectangles |
| `quad-square.png` | Quad/SquareQuad.pattern | SquareQuadCell |
| `quad-triangle.png` | Quad/TriangleQuad.pattern | TriangleQuadCell |
| `truchet.png` | Truchet/CircleQuarter.pattern | Truchet quarter-circle |
| `moire.png` | Moire/SquareMoire.pattern | moiré grid |
| `text.png` | Text/Text.pattern | text family |

**Not in the subset (validated, not rendered):** the `Icons/*` patterns (Galaga,
Swords, Icons, Icons 32x32) reference external **tilesets** (`assets/legacy/tilesets/`,
`assets/legacy/icons/`) via an `icon` primitive — rendering them needs image loading,
out of scope for this pass. They still **validate** under the grammar.

## Next step (optional)

Fold this grammar into `schemas/` as the `.lygrid` validator for the real §15.4
`files.js` (open/save + validation), and add an `icon` primitive + tileset loader to
render the `Icons/*` family.

# Silverquote reference screenshots

Captures of **Silverquote 0.1.52** supplied by the Product Owner on 2026-10-28. They are
the **reference target for N1** (see `docs/ROADMAP.md`): the Layout Designer pattern
render must match Silverquote, judged at the Design gate.

| File | Pattern (`assets/legacy/patterns/`) | Grid | Background |
|---|---|---|---|
| `Silverquote_Default_44x26.png` | `Default.pattern` | 44×26 | `#b9b9b9` |
| `Silverquote_HalfCircles_44x26.png` | `HalfCircles.pattern` | 44×26 | black |
| `Silverquote_NestedSquares_22x13.png` | `NestedSquares.pattern` | 22×13 | black |
| `Silverquote_Polygram_44x26.png` | `Polygram.pattern` | 44×26 | `#b9b9b9` |

Zoom 100 %, palette `default`. The right-hand "Wallet Bakery" panel is the
crypto-wallet part, out of scope.

**Limit:** the cell values were generated at random, so these images are visual
references (shapes, colours, outlines, cell size, spacing) — not pixel-exact goldens.
Automated visual regression in N1/N2 needs a deterministic value grid; how to obtain one
is to be decided with the Product Owner.

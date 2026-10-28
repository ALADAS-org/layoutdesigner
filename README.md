# Layout Designer

An **ElectronJS** tool for composing print-style artifacts (postcards, stamps, fantasy
banknotes, ATC…) from generative calques — built step by step, starting from what
**Silverquote** did (pattern generation on a grid of cells from a JSON description),
without its crypto-wallet part.

> **Status:** restarting from a clean base (2026-10-28). No application code yet — the
> next step is **N0 — Scaffolding**. The earlier improvised prototype is archived under
> the git tag `proto-improvise-2026-10`.

## How the project is driven

- **Roadmap:** `docs/ROADMAP.md` — a Maslow pyramid (N0 Scaffolding → N5), each level
  validated by the Product Owner before the next one starts.
- **Technical debt:** `docs/TECH_DEBT.md`.
- **Working with Claude:** `docs/reboot-kit/LD_Workflow.md`.

## What the repository holds today

```
assets/legacy/patterns/                 Silverquote .pattern corpus (N1 input)
assets/legacy/icons/, tilesets/         assets of the Icons/* pattern family
assets/legacy/screenshots/silverquote/  Silverquote reference renders (N1 target)
schemas/                                .pattern grammar: JSON Schema + spec
cli_tools/pattern_validate.cjs          semantic validator for .pattern files
cli_tools/ld_generate_filetree.py       regenerates docs/reboot-kit/LD_FileTree.md
docs/                                   roadmap, debt register, reboot-kit
```

## License

MIT — see `LICENSE`. Author: Echopraxium (Michel) with Claude AI.

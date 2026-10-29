# Layout Designer — Reference Corpus (Router)

**Authors**: JeanArt & Echopraxium (Michel)

> **A router, not a content store.** It maps *where authority lives* so that live facts
> are read from HEAD, never recited. Companion: **`LD_ReferenceCorpus_Bootstrap.md`**.

## How to read HEAD

- Raw CDN: `https://raw.githubusercontent.com/ALADAS-org/layoutdesigner/main/<path>`
- Exact committed content: `git show HEAD:<path>` in a fresh clone.
- The GitHub API is rate-limited — prefer the raw CDN or a clone.

## Governance (★ = authority)

| Concern | Path |
|---|---|
| Roadmap — pyramid N0 → N5, current status, backlog | `docs/ROADMAP.md` ★ |
| Technical debt register | `docs/TECH_DEBT.md` ★ |
| Workflow (setup + per-step loop, human-facing) | `docs/reboot-kit/LD_Workflow.md` |
| Skills: priorities / complexity (repo copy = reference; keep the claude.ai account skills identical) | `.claude/skills/ld-maslow-pyramid-workflow/SKILL.md` ★, `.claude/skills/ld-complexity-governance/SKILL.md` ★ |

## N1 reference material (Silverquote)

| Concern | Path |
|---|---|
| `.pattern` corpus | `assets/legacy/patterns/` |
| Icons / tilesets used by the `Icons/*` family | `assets/legacy/icons/`, `assets/legacy/tilesets/` |
| Reference renders (target of N1) | `assets/legacy/screenshots/silverquote/` |
| `.pattern` grammar — JSON Schema | `schemas/pattern.schema.json` ★ |
| `.pattern` grammar — spec (rendering rules = hypotheses to re-verify) | `schemas/pattern.spec.md` ★ |
| Semantic validator | `cli_tools/pattern_validate.cjs` |

## External references for N0 (read from their own HEAD)

| Brick | Repository / path |
|---|---|
| HTML menu bar, viewlets, Command / Action registries, command palette | `ALADAS-org/electron-boilerplate-cjs` — `www/src/view/viewlets/`, `www/src/controller/command_registry.js`, `www/src/view/action_registry.js` |
| Plugins (server + renderer) and their API | `Echopraxium/tscg` — `instances/tscg-tools/TscgOntologyExplorer/` (`PLUGINS_README.md`, `src/core/`, `src/renderer/RendererPluginApi.js`) |
| GUI components (dialogs, status bar), L10n, tests | `ALADAS-org/Cryptocalc` — `www/vizjets/`, `www/js/L10n/`, `tests/` |

## Reboot-kit

| Purpose | Path |
|---|---|
| Session loader | `docs/reboot-kit/LD_SmartPrompt.md` |
| Invariants & conventions | `docs/reboot-kit/LD_ReferenceCorpus_Bootstrap.md` |
| This router | `docs/reboot-kit/LD_ReferenceCorpus.md` |
| Repo path map (generated) | `docs/reboot-kit/LD_FileTree.md` |
| File-tree generator | `cli_tools/ld_generate_filetree.py` |

## Not on `main`

Everything from the abandoned improvised prototype (core, `gfx` façade, plugins,
presets, guilloché, `.lydoc` / `.lygrid` / `.lypart` design, architecture v0.3) lives
only under the tag `proto-improvise-2026-10`. Do not treat it as a design authority.

---

<sub>Prepared with the assistance of Claude AI, used as a tool under the authors' direction.</sub>

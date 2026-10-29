# Layout Designer — Reference Corpus (Bootstrap)

> Minimal orientation file. If this is the only Layout Designer document in context,
> it is enough to avoid silent corruption. Where things live: **`LD_ReferenceCorpus.md`**
> (the router). What to build and when: **`docs/ROADMAP.md`** on HEAD.

---

## What Layout Designer is

An **ElectronJS** tool for composing print-style artifacts (postcards, stamps, fantasy
banknotes, ATC…) from generative calques. It restarts (2026-10-28) from what
**Silverquote** did — generate patterns on a grid of square cells from a JSON
description — without the crypto-wallet part, and grows **step by step**.

The earlier improvised prototype was **abandoned** (tag `proto-improvise-2026-10`).
Do not reuse its code, design or vocabulary unless the Product Owner asks.

---

## How work is governed

Two project skills are authoritative — load them on every Layout Designer task:

- **`ld-maslow-pyramid-workflow`** — the pyramid N0 → N5, roles, vocabulary, per-step
  loop, references, hard rules.
- **`ld-complexity-governance`** — complexity budget, tests as a gate, debt register,
  delivery report.

Essentials, in case the skills are not loaded:

- **Roles.** Michel is the **Product Owner** (scope, priority, acceptance, Design
  validation). Claude **implements and advises** (sequencing, complexity, technical
  debt). Suggestions are welcome — **proposed, never built** without acceptance.
- **No improvisation.** Implement only the current step. Fix the **reference target**
  (image, file, behaviour) before coding; when unclear, ask.
- **Two gates** close a step: automated **anti-regression** (unit + e2e tests, Jest +
  Playwright) and the Product Owner's **Design gate**.
- **Don't reinvent the wheel:** Illustrator conventions for editing — the reference
  application (basic toolkit only); the Product Owner's prototypes for GUI, plugins, L10n and tests.

---

## Vocabulary (agreed)

**Calque** (layer) · **Action** (client-side unit; the only thing menus trigger) ·
**Command** (server-side unit, reached through an alias Action) · **EditTransaction**
(undoable unit of document modification).

---

## Minimal project corpus (Claude project setup)

**A — Project custom instructions:**

```
This is a Layout Designer project. At the very start of every conversation, before anything else:
1. Fetch https://raw.githubusercontent.com/ALADAS-org/layoutdesigner/main/docs/reboot-kit/LD_SmartPrompt.md
   and follow it as your session loader (it names the corpus to read and the authority rule).
2. Governing rule: HEAD is the only authority — read code/structure facts from HEAD or the
   resident corpus, never from memory.
```

**B — Resident in Project Knowledge (four files):** `LD_ReferenceCorpus_Bootstrap.md`
(this file), `LD_ReferenceCorpus.md`, `LD_Workflow.md`, `LD_FileTree.md`. The file tree
drifts; the owner regenerates it with `cli_tools/ld_generate_filetree.py` after
structural changes.

**C — Enable web fetch**, so everything else is read from HEAD on demand.

---

## Conventions

- Code and docs in **English**; conversation in **French**.
- Credits: authors and copyright holders `"JeanArt & Echopraxium"` (LICENSE, README,
  `package.json`, About dialog, document headers). Claude AI is mentioned discreetly,
  as a tool, in a small closing line of the README and documents ("Prepared with the
  assistance of Claude AI, used as a tool under the authors' direction"). It is never
  an author or a GitHub contributor: commits are authored by Echopraxium, with **no**
  `Co-Authored-By` trailer.
- Changes delivered as **git patches** (`git am`).
- Electron security: `contextIsolation: true`, `nodeIntegration: false`; main-process
  powers only through declared IPC in the preload bridge.

## HEAD is the only authority

The committed content on `main` is the sole source of truth for live files. Never trust
memory, stale uploads or project-knowledge copies for current structure.

- Raw CDN: `https://raw.githubusercontent.com/ALADAS-org/layoutdesigner/main/<path>`
- Refresh a clone: `git fetch --depth 1 origin main && git reset --hard origin/main`

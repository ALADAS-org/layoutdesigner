# Layout Designer — Project Workflow

**Author:** Echopraxium (Michel), with Claude AI
**Audience:** anyone working on the Layout Designer codebase with Claude
**What this guide is:** how to set up and run a dedicated Claude project for
developing (and extending) Layout Designer — the one-time setup, then the
per-task development loop.

> This is the **human-facing workflow** (the counterpart of TSCG's `UserGuide.md`).
> The invariants it refers to live in `LD_ReferenceCorpus_Bootstrap.md`; where each
> contract lives is in `LD_ReferenceCorpus.md`; the design detail is in
> `docs/LayoutDesigner_ARCHITECTURE.md` on HEAD.

---

## 1. The atelier metaphor — who does what

Building the tool is like running a design atelier. Three roles, one tool:

| Role | Who | Responsibility |
|---|---|---|
| **Head designer** | **You** | Decide *what* to build and *whether it's right*. Choose the feature, judge every design/code decision, keep or reject it. Nothing ships without your say-so. |
| **Builder** | **Claude** | Does the work *under your direction*: proposes an approach, writes the module or plugin, runs/previews it, handles files, versions and patches. |
| **The atelier** | **Layout Designer** | The equipment: the domain-free core, the `gfx` façade, and the plugin contracts you build with. |

The single most important habit: **you pilot, Claude builds.** Claude proposes,
drafts and explains — but it can be wrong, and it never decides the *meaning* of
your design. When a choice feels off, push back and ask why.

---

## 2. One-time setup

You do this once. After that, every new task starts at Section 3.

### 2.1 Clone the repository locally

You need [Git](https://git-scm.com/downloads) and [Node.js](https://nodejs.org/)
(for Electron). Then:

```bash
git clone https://github.com/ALADAS-org/layoutdesigner.git
cd layoutdesigner
npm install
npm start          # the Electron app opens on the "stamp" demo document
```

To preview in a browser instead (ES modules don't load from `file://`, so use a
static server): `npx serve .` then open `http://localhost:3000/demo.html`.

### 2.2 Open a Claude **Pro** account

The workflow relies on **Claude Projects** (persistent project knowledge, custom
instructions, memory), which require a paid plan. Sign up at [claude.ai](https://claude.ai).

### 2.3 Create and configure the **"Layout Designer"** project

In your Claude account, create a new **Project** named **`Layout Designer`**. Set
it up **once** so that afterwards you never have to load anything into a
conversation. The exact set is defined in `LD_ReferenceCorpus_Bootstrap.md` under
*"Minimal project corpus"* (the single source of truth). In short, three things:

**1. Project custom instructions.** This is the project's **instructions** field
— the standing prompt applied to *every* conversation — **not** the short
"description" label. Paste this directive into it:

```
This is a Layout Designer project. At the very start of every conversation, before anything else:
1. Fetch https://raw.githubusercontent.com/ALADAS-org/layoutdesigner/main/docs/reboot-kit/LD_SmartPrompt.md
   and follow it as your session loader (it names the corpus to read and the authority rule).
2. Governing rule: HEAD is the only authority — read code/structure facts from HEAD or the
   resident corpus, never from memory.
```

This keeps the field small and the Smart Prompt always current, and it applies
automatically — no per-session paste. (Fetching the prompt is not the same as
*applying* it; this directive is what makes Claude adopt it every conversation.)

**2. Project Knowledge (resident, loaded once — four files):**
`LD_ReferenceCorpus_Bootstrap.md`, `LD_ReferenceCorpus.md`, `LD_Workflow.md`
(this file), `docs/reboot-kit/LD_FileTree.md`. Everything else — the source code
and the architecture spec — is read from HEAD on demand, so it never goes stale.

**3. Enable web fetch.** This is the one unavoidable dependency: the source files
and `docs/LayoutDesigner_ARCHITECTURE.md` are read from HEAD on demand (the File
Tree gives the path), so web fetch lets Claude pull them itself — still with zero
action from you, and without bulk-loading the whole repo into the project.

*(The project owner refreshes the one drift-prone resident copy — the File Tree —
after structural changes, with `cli_tools/ld_generate_filetree.py`. Never a
per-conversation concern.)*

### 2.4 Verify the setup before your first task

The thing that can silently be wrong is **web fetch** being off (so Claude can't
read source or the architecture from HEAD). Quick test — ask:

> *"Fetch `https://raw.githubusercontent.com/ALADAS-org/layoutdesigner/main/src/core/render/facade.js`
> and tell me which anchor names the square grid exposes."*

If Claude answers `center` + the 8 compass points, web fetch is on and the router
works. If it can't reach the file, web fetch is off — turn it on and retry.

You are ready to build.

---

## 3. The per-task development journey

Everything below repeats for each feature. It maps onto the architecture's §15
build order and the plugin model — with **you as head designer** at every decision.

### Step 1 — Pick a task

Either the next **§15 build-order step** (e.g. §15.4 `files.js` for open/save,
§15.7 `SvgTarget` for `.lypart` export), or a **new plugin** (a `LayerType`, a
`Primitive`, or a document `preset`). Describe it in a few sentences.

### Step 2 — Frame it against the architecture

Ask the open question:

> *"Here's what I want to add — does it fit the architecture, and how?"*

Claude reads the relevant § of `LayoutDesigner_ARCHITECTURE.md` from HEAD and
proposes an approach that respects the invariants: draw only through the `gfx`
façade, keep the model in millimetres, route every mutation through a Command,
and keep the **core domain-free** — a print-domain feature is a **plugin**, not a
core edit. **You decide** whether to proceed.

### Step 3 — Delegate the build, and pilot it

> *"Build it — a runnable slice with a preview."*

Claude writes the module(s) or plugin, renders a preview (headless or in the
browser host) so you can *see* the result, and explains the choices. Your job is
to **pilot**: validate each decision, ask for explanations, reject anything that
doesn't match what you intend. Two ground rules protect you:

- **It must run.** New code is syntax-checked and the composition is rendered
  before it's called done — a slice that doesn't render is not done.
- **Design decisions are yours.** Claude proposes the *structure*; you own the
  *intent* (what a stamp should look like, what a format means).

### Step 4 — Integrate as a git patch

Claude delivers changes as **git patches** (`.patch`, applied with `git am`),
your stated preference — not as a zip. On Windows cmd, pass the **full filenames**
(the `*` glob isn't expanded there).

### Step 5 — After structural changes, refresh the File Tree

When files are added, moved or renamed, regenerate the resident path map so the
next conversation stays oriented:

```bash
python cli_tools/ld_generate_filetree.py      # from the repo root
```

then reload `LD_FileTree.md` into Project Knowledge. (Owner task, occasional.)

---

## 4. Quick reference — your checklist

1. **Setup (once):** clone + `npm install` · get Claude Pro · create & load the
   `Layout Designer` project (custom-instructions directive · 4 resident files · web fetch).
2. **Frame** a task against the architecture (`gfx` façade · mm · Command · plugins, not core).
3. **Build** a runnable slice with a preview → *pilot every choice*.
4. **Integrate** as a `git am` patch.
5. **Refresh** `LD_FileTree.md` after structural changes.

## 5. Where to look next

- `docs/LayoutDesigner_ARCHITECTURE.md` — the full design (v0.4), §15 build order.
- `docs/reboot-kit/LD_ReferenceCorpus.md` — where each contract lives (the HEAD router).
- `docs/reboot-kit/LD_ReferenceCorpus_Bootstrap.md` — the invariants.
- `README_PROTOTYPE.md` — what the first prototype builds vs defers.

---

*Remember: you pilot, Claude builds, Layout Designer is the atelier. Nothing ships
without the head designer's approval.*

# Layout Designer — Project Workflow

**Author:** Echopraxium (Michel), with Claude AI
**What this guide is:** how to run the Claude project that develops Layout Designer —
the one-time setup, then the per-step loop. Priorities live in `docs/ROADMAP.md`; the
governing rules in the skills `ld-maslow-pyramid-workflow` and
`ld-complexity-governance`.

---

## 1. Roles

| Role | Who | Responsibility |
|---|---|---|
| **Product Owner** | **Michel** | Decides *what* is built, *when*, and *whether it is right*: scope, priority, acceptance, Design validation (plastic-arts and ergonomic judgement). Nothing is closed without him. |
| **Implementer & advisor** | **Claude** | Implements the agreed step; advises on how steps are sequenced; watches complexity growth and technical debt and reports them. Suggestions and critiques are welcome — proposed, never built without acceptance. |

**Product Owner validation rule.** A step is closed only when **both gates** pass:

1. **Anti-regression gate** — unit, end-to-end and (where rendering is involved)
   visual tests are green. Reference images are created or changed only with the
   Product Owner's approval.
2. **Design gate** — the Product Owner runs the result himself and validates it.

The anti-pattern to avoid is the *electronic piano demo*: an improvised, impressive but
opaque result. An opaque result is not a result.

---

## 2. One-time setup

1. **Clone:** `git clone https://github.com/ALADAS-org/layoutdesigner.git`
   (needs Git and Node.js). There is no application to run until N0 delivers one.
2. **Claude project:** create the project, put the fetch directive in its custom
   instructions, load the four resident files and enable web fetch — exact content in
   `LD_ReferenceCorpus_Bootstrap.md` (*Minimal project corpus*).
3. **Skills:** `ld-maslow-pyramid-workflow` and `ld-complexity-governance` are versioned
   in the repo under `.claude/skills/` (the reference; Claude Code loads them
   automatically there). Save the same versions as skills on the claude.ai account so
   conversations load them too; when a skill changes, update both.

---

## 3. The per-step loop

1. **Locate** the request in the pyramid (`docs/ROADMAP.md`). Later level or backlog →
   it is recorded there, not built.
2. **Fix the reference target** (Silverquote screenshot, Illustrator/Inkscape behaviour,
   a prototype of the Product Owner…) and the **acceptance criteria**.
3. **Declare the complexity budget** (files, concepts, dependencies).
4. **Implement the minimum**, with its tests.
5. **Deliver** git patches (`git am`; on Windows cmd pass full file names) with the
   delivery report: done · left out · complexity added · debt · tests · quality axes ·
   proposals (not built) · what to validate.
6. **Validate** (Product Owner, both gates). Then update `docs/ROADMAP.md`.
7. After structural changes, regenerate `LD_FileTree.md`
   (`python cli_tools/ld_generate_filetree.py`) and reload it into the project.

---

## 4. Quality axes

Every delivery says how it affects: **Reliable** (tests) · **Intuitive** (ergonomics) ·
**Guiding** (help for beginners) · **Evolvable** (plugins, scripting) ·
**Interoperable** (e.g. SVG).

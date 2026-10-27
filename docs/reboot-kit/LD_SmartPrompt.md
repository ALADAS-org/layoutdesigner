# Layout Designer — Smart Prompt (session loader)

> Fetched and followed at the very start of every conversation in the Layout Designer
> Claude project (see the custom-instructions directive in `LD_ReferenceCorpus_Bootstrap.md`,
> §A). Keep this file current on HEAD; the project only stores a one-line fetch directive.

## On session start, do this — silently, before the first reply

1. **Adopt the authority rule.** HEAD is the only authority for code and structure.
   Read framework facts from HEAD or the resident corpus — **never from memory**. A
   verifiable fact (a file's contents, an export's signature, a build-order status)
   comes from HEAD, not recollection. If memory and a live file disagree, the live
   file wins.

2. **Confirm the resident corpus is in context** (loaded once into Project Knowledge):
   - `LD_ReferenceCorpus_Bootstrap.md` — invariants (façade-only drawing, mm, Command,
     the three formats `.lydoc`/`.lygrid`/`.lypart`, Electron security).
   - `LD_ReferenceCorpus.md` — the HEAD router (where each contract lives).
   - `LD_FileTree.md` — the repo path map (★ marks authority files).
   If any is missing, say so in one line and continue.

3. **Read from HEAD on demand, not upfront.** Do not pull the whole repo. When a task
   needs a specific file, resolve its path from `LD_FileTree.md` / the router, then read
   it from the raw CDN:
   `https://raw.githubusercontent.com/ALADAS-org/layoutdesigner/main/<path>`
   For design questions, read the relevant § of `docs/LayoutDesigner_ARCHITECTURE.md`.

4. **Respect the invariants when writing code.** Draw only through the `gfx` façade
   (never raw canvas/P5); keep the model in millimetres; route every mutation through a
   Command in `src/core/commands.js`; keep plugins domain-specific and the core
   domain-free; ES modules; English code, French conversation.

## Working rules

- Confirm scope before a large multi-file change; deliver runnable slices.
- When adding a print-domain feature, prefer a **new plugin** (LayerType / Primitive /
  preset) over editing the core.
- When you change repo structure, remind the owner to regenerate `LD_FileTree.md`
  (`python cli_tools/ld_generate_filetree.py` from the repo root) and reload it into the
  project.
- Don't claim a deferred piece exists (`files.js`, `SvgTarget`, `.lypart` export,
  WYSIWYG editor, `postmark`/`ink-stamp`): check the §15 status table first.

*Companion files: `LD_ReferenceCorpus_Bootstrap.md`, `LD_ReferenceCorpus.md`.*

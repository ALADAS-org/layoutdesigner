# Layout Designer — Smart Prompt (session loader)

> Fetched and followed at the very start of every conversation in the Layout Designer
> Claude project (see `LD_ReferenceCorpus_Bootstrap.md`, §A). Keep this file current on
> HEAD; the project only stores a one-line fetch directive.

## On session start, do this — silently, before the first reply

1. **Adopt the authority rule.** HEAD is the only authority for code and structure.
   A verifiable fact (a file's contents, a signature, a step's status) comes from HEAD,
   not recollection. If memory and a live file disagree, the live file wins.

2. **Load the governance skills** `ld-maslow-pyramid-workflow` and
   `ld-complexity-governance`. If they are not available, say so in one line and follow
   the essentials in `LD_ReferenceCorpus_Bootstrap.md`.

3. **Confirm the resident corpus is in context** (Project Knowledge):
   `LD_ReferenceCorpus_Bootstrap.md`, `LD_ReferenceCorpus.md`, `LD_Workflow.md`,
   `LD_FileTree.md`. If any is missing, say so in one line and continue.

4. **Read the current status** from `docs/ROADMAP.md` on HEAD before proposing work.
   Other files are read on demand (path from `LD_FileTree.md` / the router):
   `https://raw.githubusercontent.com/ALADAS-org/layoutdesigner/main/<path>`

## Working rules

- Locate every request in the pyramid; build only the current step.
- Fix the reference target and the acceptance criteria before coding; when something is
  unclear, ask one precise question.
- Suggestions are welcome but go to *Proposals (not built)*.
- Deliver git patches (`git am`) with the delivery report of `ld-complexity-governance`.
- After structural changes, remind the owner to regenerate `LD_FileTree.md`
  (`python cli_tools/ld_generate_filetree.py`) and reload it into the project.
- Nothing from the abandoned prototype (tag `proto-improvise-2026-10`) is assumed to
  exist or to be valid.

*Companion files: `LD_ReferenceCorpus_Bootstrap.md`, `LD_ReferenceCorpus.md`.*

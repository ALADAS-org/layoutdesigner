# Layout Designer — Technical debt register

Governed by the skill `ld-complexity-governance` §4. A debt is a **known shortcut or
defect, accepted on purpose**, whose cost grows until it is repaid. An unrecorded
shortcut is a defect. Planned work of the current level is not debt.

Entry format:

```
## TD-<n> — <short title>
- Date / level: <yyyy-mm-dd> / <N0..N5>
- What: <the shortcut or the problem>
- Why: <reason it was accepted>
- Cost if left: <risk, what it blocks>
- Repayment: <plan, step where it should be repaid>
- Status: open | repaid (<commit>)
```

## Entries

The register started empty with N0 (2026-10-28): the improvised prototype was
abandoned rather than carried as debt (tag `proto-improvise-2026-10`).

## TD-1 — jQuery / jQuery UI (and since N0.5, iziToast and xterm.js) loaded from `../node_modules/`
- Date / level: 2026-10-29 / N0.3
- What: `src/index.html` loads jQuery, jQuery UI and its CSS by relative path into
  `node_modules/`. Works with `npm start`; not verified for a packaged build.
- Why: no packaging exists yet; copying the files into `src/` would duplicate versioned
  third-party code.
- Cost if left: a packaged build could miss these files (no dialogs, broken start-up).
  N0.5 step 7 adds xterm.js and its fit add-on (`@xterm/xterm`, `@xterm/addon-fit`),
  loaded the same way; node-pty is required by main from `node_modules` too.
- Repayment: when packaging is introduced, check the layout or copy the files at build
  time; add an end-to-end test on the packaged app.
- Status: open

## TD-2 — Preferences written inside the application folder
- Date / level: 2026-10-29 / N0.3
- What: preferences are saved in `src/config/preferences.json`, inside the application
  folder (Product Owner choice).
- Why: simple and visible during development; no packaging exists yet.
- Cost if left: a packaged (asar) or installed application cannot write there; an
  update would also overwrite the user's preferences.
  Since N0.5 (2026-10-31), several instances may run at once (a second one launched
  from the Terminal, no single-instance lock): they share this file and the last
  write wins.
- Repayment: when packaging is introduced, move the file to Electron's per-user folder
  (`app.getPath('userData')`) — only `preferences.js` changes. Concurrent instances:
  re-read before write, or a lock, if a real conflict ever shows up.
- Status: open

## TD-3 — Output lines kept without limit, view fully re-rendered
- Date / level: 2026-11-03 / N0.5
- What: main's journal and the renderer's Output keep every line of the session; the
  Output view rebuilds all its rows on each change (batched per micro-task).
- Why: the only source in N0.5 writes a handful of lines; a cap and an incremental view
  would be infrastructure without a witness case.
- Cost if left: a chatty plugin (N0.6) could make memory grow and the view slow over a
  long session.
- Repayment: with N0.6 (several sources, the selector) — a cap per source (e.g. the last
  N lines) and rows appended instead of rebuilt.
- Status: repaid (N0.6, 2026-11-05) — 1000 lines per source in main's journal and in the
  renderer's Output; a new line appends a row; the view is rebuilt only when the choice
  of sources changes or a line arrives out of time order.

## TD-4 — Plugins folder inside the application folder
- Date / level: 2026-11-05 / N0.6
- What: plugins are discovered in `plugins/` at the repo root (`PLUGIN_API.md` §2,
  Product Owner decision), versioned with the two dummy plugins.
- Why: simple and visible during development (`npm start` shows the witnesses); no
  packaging exists yet.
- Cost if left: a packaged (asar) or installed application cannot have user plugins
  added there, and an update would replace them — same issue as TD-2.
- Repayment: with TD-2, when packaging is introduced — a per-user plugins folder
  (`app.getPath('userData')`), the shipped plugins kept beside the application; only
  `pluginsPath()` in `plugin_manager.js` changes.
- Status: open

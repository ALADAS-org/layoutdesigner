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

## TD-1 — jQuery / jQuery UI loaded from `../node_modules/`
- Date / level: 2026-10-29 / N0.3
- What: `src/index.html` loads jQuery, jQuery UI and its CSS by relative path into
  `node_modules/`. Works with `npm start`; not verified for a packaged build.
- Why: no packaging exists yet; copying the files into `src/` would duplicate versioned
  third-party code.
- Cost if left: a packaged build could miss these files (no dialogs, broken start-up).
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

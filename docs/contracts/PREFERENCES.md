# Contract — Preferences dialog and reset (N0.5 step 6)

**Status:** VALIDATED by the Product Owner on 2026-11-04, after trying the mock-up
`docs/mockups/preferences_prototype.html` — « until further notice »: it stays open to
reformulation in use. Open points are settled one at a time; each
answer is recorded in §5.
**Authors:** JeanArt & Echopraxium (Michel) · 2026-11-04

Prompted by an invalid `preferences.json`, which today only gives a `warn` line in
Output (step 4): the user should be able to repair it. This contract builds on
`ACTION_COMMAND.md` (§13.8 language choice, §13.9 ids, §13.10 verbs) and on the
preferences file of N0.3 (`src/server/preferences.js`, TD-2).

Reference target: the interactive mock-up `docs/mockups/preferences_prototype.html` —
*Edit* menu, the dialog (*Interface* / *System*), immediate language change with the
restart warning, reset with confirmation, the start-up warning for an invalid file.

References: **Inkscape** *Edit › Preferences…* (one dialog, the language in it);
**Illustrator** *Edit › Preferences* (dialog, « Reset Preferences » button);
**VS Code** *Configure Display Language* (a palette command for the language).

## 1. The dialog — the Inkscape model (PO decision 2026-11-04)

```
┌ Preferences ───────────────────────────────────────────┐
│ ┌────────────┐                                          │
│ │ Interface  │  Interface                               │
│ │ System     │    Language   [ System language ▾ ]      │
│ └────────────┘                                          │
│                                              [Close]    │
└─────────────────────────────────────────────────────────┘
```

- *Edit › Preferences…* opens a modal **Preferences dialog** (jQuery UI, like the About
  dialog of N0.3) — Inkscape is the reference, an open-source application like this one.
- **Categories in a list on the left**, the selected one's page on the right. In this
  step:
  - **Interface** — *Language*: « System language » (`null`) first, then the available
    languages; *Theme*: Dark / Light (added 2026-11-05, §5 8);
  - **System** — **Reset preferences** (as Inkscape's *System › Reset preferences*) and
    the preferences file path, read-only.
- **Rule: a category appears only when it holds at least one real preference** — no
  empty category built in advance. Each new preference is added to the dialog and to
  `preferences.default.json` by the step that creates it (Terminal shell: step 7,
  Calques panel position: N0.8, under *Interface*).
- **Changes apply at once**, no OK / Cancel: one **Close** button. A new language is
  saved at once and shows the restart warning. Reset keeps its confirmation (§3) — the
  only change not undone by choosing again.
- It holds **every preference**; nothing else in the application edits them.

## 2. The language: one place, two ways in

- The language is chosen **in the Preferences dialog** (as Inkscape).
- The palette keeps *Preferences: Choose Language…* (`preferences.chooseLanguage`), as
  VS Code keeps *Configure Display Language*; it now **opens the Preferences dialog on
  *Interface*, the focus on the language** instead of its own dialog.
- The small dialog `src/vizjets/language_dialog/` is removed; the restart warning of
  §13.8 is unchanged.

## 3. Defaults and reset

- The defaults live in a file shipped and versioned with the application,
  **`src/config/preferences.default.json`** — also the living list of every preference
  and its default value, completed by each step that adds one. `preferences.json` stays
  the user's own file, not versioned.
- It holds `{ "language": null, "theme": "dark" }`: **`null` means « the system
  language »**, so that a reset gives back the first-launch behaviour (no preferences
  file → system locale) instead of forcing English.
- **Reset** = `preferences.default.json` copied over `preferences.json`:
  1. **Confirmation** first — « Reset all preferences to their defaults? », OK / Cancel.
  2. **Backup**: the replaced file is copied to **`preferences.json.bak`** beforehand
     (only the latest copy is kept); an `info` line in Output says where. A broken
     file's content is therefore never lost.
  3. **When it applies**, as a language change: a preference that needs a restart (the
     language) applies at the next launch, with the modal restart warning of
     `ACTION_COMMAND.md` §13.8; the others apply at once. The dialog then shows the
     defaults.

## 3 bis. Invalid file at start-up

- When `preferences.json` exists but cannot be read or is not a JSON object, the
  application starts with the defaults (as today, with its `warn` line in Output) **and
  shows a warning** at start-up — an iziToast, like the language restart warning:
  « **Invalid preferences** — The preferences file cannot be read; the defaults are
  used. » with two buttons:
  - **Reset**: the reset of §3 — backup `.bak`, then the defaults — **without a second
    confirmation** (the button is already an explicit choice);
  - **Ignore**: closes the warning; the file is left as it is (the user may repair it by
    hand); the warning comes back at each launch while the file is invalid.
- It is an **error**, not a warning: the toast shows the **error icon**
  `assets/icons/error_icn.png` (PO, 2026-11-04) instead of the warning icon, on a
  **pale red** background (iziToast's error style) instead of the warnings' orange.
- A **missing** file is not an error (first launch): no warning.

## 4. Menu, Action, shortcut

- A new **Edit** menu, between *File* and *View* (order of Illustrator, Inkscape and
  VS Code: File · Edit · View · … · Help). In this step it holds *Preferences…* only;
  undo / redo (N0.8) and copy / paste (N0.9) will come above it — Inkscape keeps
  *Preferences…* at the bottom of *Edit*.
- Action **`edit.choosePreferences`** (prefix = palette category, verb `choose` = opens
  a choice dialog), label « Preferences… » — palette « Edit: Preferences… », French
  « Édition : Préférences… ».
- Shortcut **Ctrl+K**, as Illustrator. Not Ctrl+S (*Save*) nor Ctrl+O (*Open*): both are
  universal and will be needed by the documents (N0.7) — PO, 2026-11-04.
- *Preferences: Choose Language…* stays in the palette, category *Preferences*, and
  opens the same dialog on the language (§2).
- The word stays **Preferences** (Illustrator, Inkscape), not *Options* nor *Settings*.

## 5. Product Owner decisions

**2026-11-03:** a preferences step is added to N0.5 after the Debug Console; after
Inkscape, *Edit › Preferences…* opens a dialog that also offers the reset.

**2026-11-04:**
1. The Preferences dialog holds every preference, the language included (§1).
2. Compromise Inkscape / VS Code: *Choose Language…* stays in the palette and opens the
   Preferences dialog on the language; its own small dialog is removed (§2).
3. Defaults in a shipped file `src/config/preferences.default.json`, copied over
   `preferences.json` on reset; the language default is `null` = system language (§3).
4. Reset: confirmation, backup `preferences.json.bak` with a line in Output, applied
   as a language change (restart warning when needed) (§3).
5. Invalid file at start-up: a warning with **Reset** (no second confirmation) and
   **Ignore**; a missing file gives none (§3 bis).
6. New *Edit* menu with *Preferences…*, Action `edit.choosePreferences`, shortcut
   **Ctrl+K**; the word stays « Preferences » (§4).
7. **Inkscape model**: categories on the left (*Interface*, *System* now; a category
   appears only with a real preference), changes applied at once, one *Close* button,
   *Reset preferences* under *System* (§1).

**2026-11-05:**
8. **The theme becomes a preference**: *Interface › Theme* (Dark / Light), remembered
   in `preferences.json` (`theme`, default `"dark"` in `preferences.default.json`),
   **applied at once** (no restart); *View › Light / Dark Theme* stays as a shortcut and
   saves it too; a reset goes back to dark at once.

## 6. Open points (settled one at a time, in this order)

1. ~~Where the defaults come from.~~ Settled (§5, 3).
2. ~~Reset: confirmation, backup, when it applies.~~ Settled (§5, 4).
3. ~~Invalid file at start-up.~~ Settled (§5, 5).
4. ~~The Edit menu, the Action id and the shortcut.~~ Settled (§5, 6).
5. ~~Dialog layout.~~ Settled (§5, 7).
6. Witness case, acceptance criteria, complexity budget — drafted in §7 and §8, to
   validate with the whole contract.

## 7. Witness case and acceptance criteria (draft)

Witness: the **language** preference and an **invalid preferences file**.
- *Edit › Preferences…* and Ctrl+K open the dialog on *Interface*; *Choose Language…*
  (palette) opens it on *Interface*, the language focused.
- Choosing a language saves it at once and shows the restart warning; « System
  language » saves `null`; after a restart the interface is in the chosen language.
- *System › Reset preferences*: confirmation; Cancel changes nothing; OK copies the file
  to `preferences.json.bak`, writes the defaults, writes an `info` line in Output, shows
  the restart warning when the language changed.
- An invalid file at start-up: the warning with **Reset** (backup + defaults, no second
  confirmation) and **Ignore** (file untouched, warning again at the next launch); a
  missing file: no warning.
- `preferences.default.json` exists, is valid JSON and lists every preference.
- The small language dialog is gone; both themes; labels en / fr.
- Anti-regression gate: type check, unit and end-to-end tests green; Design gate: the PO.

## 8. Complexity budget (draft)

- Files: `src/config/preferences.default.json`; vizjet `src/vizjets/preferences_dialog/`
  (html, css, js) replacing `language_dialog/`; Commands in `src/server/` (read the
  defaults, reset with backup, report an invalid file at start-up); labels; tests.
- Concepts: the *Edit* menu, the Action `edit.choosePreferences`, preference
  categories, the reset Command, the start-up « invalid preferences » information.
- Dependencies: none (jQuery UI and iziToast are already there).
- TD-2 (preferences inside the application folder) unchanged; the `.bak` copy sits next
  to the file.

---

<sub>Prepared with the assistance of Claude AI, used as a tool under the authors' direction.</sub>

---
name: "ld-complexity-governance"
description: "Layout Designer: govern complexity growth and technical debt — complexity budget, tests as gates, debt register, delivery report. Load with ld-maslow-pyramid-workflow on every LD task."
---

# Layout Designer — Complexity Governance

Agreed with Michel (Product Owner) on 2026-10-28. Companion skill:
`ld-maslow-pyramid-workflow` (what to build, and when). This skill answers:
**at what cost?** Claude is responsible for watching complexity and debt and for
reporting them honestly; the Product Owner decides what to accept.

## 1. Principles

1. **Complexity is spent, not accumulated by accident.** Every new file, concept,
   contract or dependency must be justified by the current step.
2. **Anticipate in the model, do not implement.** Leave the door open in data
   formats and contracts (e.g. a list of Trame calques, a `transform` object), but
   build only what the step requires.
3. **Every foundation proves itself on a witness case.** The N0 scaffolding
   (plugins, calques, editing functions, HTML GUI, i18n, tests) is built up front by
   decision, so each brick must be exercised by the simplest real case — the
   **rectangle** (on at least two calques) for calques / selection / copy-paste /
   transformation / undo / zoom / pan, **dummy client and server plugins** for the
   API — and covered by tests. Infrastructure without a witness case is speculative
   and is not delivered.
4. **Don't reinvent the wheel.** Reuse established conventions (Illustrator /
   Inkscape for editing; Cryptocalc and TscgOntologyExplorer for GUI, i18n, tests
   and plugins) before designing anything new. Invented behaviour is complexity the
   user has to learn.
5. **Debt is allowed only when it is known, written down and accepted.** An
   unrecorded shortcut is a defect.
6. **What is not tested does not exist.** Tests are a gate, not a bonus.

## 2. Complexity budget (declared before implementing)

At the start of each step, state in a few lines:

- new **files** and modules;
- new **concepts** exposed to other code (contracts, APIs, plugin hooks,
  file-format fields, events, menu items, UI components);
- new **dependencies** — each one needs explicit Product Owner approval; prefer
  none when the cost is reasonable;
- rough size of the change.

If the implementation is about to exceed the budget, **stop and report** before
continuing. Public contracts (plugin API, object and calque model, file formats)
deserve a short written design, validated by the Product Owner, before code.

## 3. Tests — the anti-regression gate

Stack (decided): **Jest** for unit tests, **Playwright** for end-to-end tests of
the Electron app — as in TSCG and Cryptocalc. Layout follows Cryptocalc `tests/`
(`jest/unit`, `jest/fixtures`, `playwright/e2e`, `_doc` test protocols).

Definition of done for any step that touches code:

- **Unit tests** for the new logic (model, calques, commands, parsing, geometry,
  plugin loading).
- **End-to-end tests** for the user-visible path (menus, dialogs, editing
  actions on the rectangle, open a file, render).
- **Visual regression** for rendering: reference images (golden files) with a
  stated tolerance. For N1 the references are **Silverquote renders** chosen by the
  Product Owner. A golden file is created or updated **only with Product Owner
  approval** — updating a golden is a Design-gate decision, never a way to make a
  test pass.
- Tests run on every delivery; a red suite blocks the delivery.

## 4. Technical debt register — `docs/TECH_DEBT.md`

One entry per known debt, kept on HEAD:

```
## TD-<n> — <short title>
- Date / level: <yyyy-mm-dd> / <N0..N5>
- What: <the shortcut or the problem>
- Why: <reason it was accepted>
- Cost if left: <risk, what it blocks>
- Repayment: <plan, step where it should be repaid>
- Status: open | repaid (<commit>)
```

Sources of debt to record: shortcuts taken in a step; code that exists above the
current pyramid level (built too early); duplicated logic; missing tests; corpus or
doc drift from HEAD.

First application (before N0 work starts): **inventory the current repository by
pyramid level** and record everything built ahead of its level as debt, with the
Product Owner's choice of treatment (archive branch / hide / restart minimal).

## 5. Delivery report (end of every step)

```
### Done
### Deliberately left out
### Complexity added   (files, concepts, dependencies — vs declared budget)
### Debt              (created: TD-x … / repaid: TD-y …)
### Tests             (unit / e2e / visual: counts and results)
### Quality axes      (reliable · intuitive · guiding · evolvable · interoperable)
### Proposals (not built)
### Needs Product Owner validation   (what to run, what to look at)
```

## 6. Rules of conduct

- Refactoring that changes behaviour or structure needs Product Owner approval;
  purely internal clean-up is allowed but reported.
- Never hide a problem found on the way: report it, then fix it only if it is in
  scope (otherwise record it as debt or as a proposal).
- Changes are delivered as git patches (`git am`); one coherent step per patch
  series.
- After structural changes, regenerate `docs/reboot-kit/LD_FileTree.md` and remind
  the owner to reload it into Project Knowledge.
- Facts about the code come from HEAD, never from memory.
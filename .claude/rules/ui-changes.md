# UI work goes through the design skill

Creating or changing any **component, page, layout, or style element** in this project means
invoking the `impeccable` skill first and doing the work inside its flow. Do not hand-write
UI changes directly.

## What this covers

- Component, page, layout, and form files: `src/components/**`, `src/pages/**`,
  `src/layouts/**`, `src/forms/**` (`.tsx`, `.jsx`)
- Any stylesheet or design-token file: `.css`, `.scss`, theme and token definitions
- Anything that changes what a user sees or feels: markup, layout, spacing, color,
  typography, motion, UX copy, and empty / loading / error states

**Not covered** — edit these normally: routing config, services, stores, schemas, types,
utils, hooks, i18n JSON, tests, and config.

## How to do it

1. Invoke the `impeccable` skill — Skill tool, or the user's `/impeccable <command>`. It
   lives in `.claude/skills/impeccable/`.
2. Run its Setup steps — they are non-optional. Skipping them produces generic output.
3. Pick the sub-command matching the intent: `craft` / `shape` to build, `critique` /
   `audit` to evaluate, `polish` / `harden` / `distill` to refine, `layout` / `typeset` /
   `colorize` / `animate` / `delight` to enhance, `clarify` / `adapt` / `optimize` to fix.
   If the intent is ambiguous, ask which one.
4. Make the edits inside that flow, honoring its rules and absolute bans.

A `PreToolUse` hook enforces this — UI file edits are blocked until the skill is loaded in
the session. If it blocks you, load the skill; do not route around it.

## Still applies

Project conventions are already documented — follow them rather than inventing new ones:
`docs/structure.md` for where files go, `docs/stack.md` for the approved libraries,
`PRODUCT.md` for brand, design principles, and the WCAG 2.1 AA bar.

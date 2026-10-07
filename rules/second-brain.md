# Second Brain - Research Order

The documentation *standard* lives in the `second-brain` skill. Load it when creating,
auditing, syncing, or restructuring docs, or when writing an impl-spec. This file keeps only
what every task needs up front.

## Research Order

**Before starting investigation or implementation**, skim the project's CLAUDE.md `## Documentation` section (the full index) and read the `docs/` files relevant to the task type *before* diving into source code. Don't grep code first — check whether decisions and context are already documented.

### Common Principles

- For any task type, skim `docs/ADR.md` at least once — to avoid proposing changes that conflict with past decisions.
- Uppercase doc filenames are the standard; treat a legacy lowercase file (`decisions.md` for `ADR.md`, etc.) as the same doc until migrated.
- If `docs/GLOSSARY.md` exists, use its canonical identifiers when naming or discussing domain concepts, and never introduce a banned alias.
- Records — ADR entries, `BUG-FIXES.md`, archived impl-specs, and any doc with a `YYYY-MM` date in its path — are history. Active impl-specs follow the `second-brain` skill's impl-spec Lifecycle. Write every other doc as current state: when you edit one for a changed fact, rewrite the sentence that states it and delete what it replaces, never append a dated section or a correction note beside the old claim; git keeps the history.
- The source of truth for **current code state** is the code itself and `ARCHITECTURE.md` — never `docs/impl-spec/`, which records what was planned, not what was built. Read a spec for intent, background, and rationale ("why did we do it this way?"), never as evidence of current state. The lifecycle and editing rules live in the `second-brain` skill.
- If relevant docs are missing or contradict the code, say so and proceed. Before relying on a line a doc marks unconfirmed (미확인, 확인 필요, TBD), check the same topic in `ADR.md`; when current-state docs or `ADR.md` disagree on a point the task relies on and the code cannot settle, quote both with `path:line` and ask the user which is current instead of choosing one.

### Order by Task Type

- **Bug fixing / debugging**: `BUG-FIXES.md` (similar cases) → `BUSINESS-LOGIC.md` (expected behavior) → `ADR.md` → relevant section of `ARCHITECTURE.md`
- **New feature implementation**: `docs/PRD.md`, if any — its `## Scope` subsection for the feature and `## Non-goals` (see the `second-brain` skill for when one is required) → `ARCHITECTURE.md` (integration points) → `BUSINESS-LOGIC.md` → `ADR.md` → *in-progress (unmerged) impl-spec, if any, for reference*
- **Refactoring / structural changes**: `ADR.md` (past decisions first) → `ARCHITECTURE.md` → `BUG-FIXES.md` (regression awareness)
- **DB / API / frontend changes**: the matching type above, plus `DB-SCHEMA.md` / `API-SPEC.md` / `FRONTEND-ARCHITECTURE.md`

Narrow the scope using context from the docs, then descend into code. Be careful not to propose changes that contradict documented decisions.

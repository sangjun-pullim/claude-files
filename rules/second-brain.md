# Second Brain - Research Order

The documentation *standard* — the `docs/` file set, Mermaid guidance, two-layer rule and
freshness stamps, impl-spec lifecycle, maintenance and coexistence rules — lives in the
`second-brain` skill. Load it when creating, auditing, syncing, or restructuring docs, or
when writing an impl-spec. This file keeps only what every task needs up front.

## Research Order

**Before starting investigation or implementation**, skim the project's CLAUDE.md `## Documentation` section (the full index) and read the `docs/` files relevant to the task type *before* diving into source code. Don't grep code first — check whether decisions and context are already documented.

### Common Principles

- For any task type, skim `docs/decisions.md` at least once — to avoid proposing changes that conflict with past decisions.
- The source of truth for **current code state** is the code itself and `architecture.md` — never `docs/impl-spec/`, which records what was planned, not what was built. An **archived** spec is frozen history: read it for intent, background, and rationale ("why did we do it this way?"), never as evidence of current state. An **active** spec is a working document and gets edited in place as the plan changes — see the `second-brain` skill for the editing rules.
- If relevant docs are missing or appear stale, say so to the user and proceed.

### Order by Task Type

- **Bug fixing / debugging**: `bug-fixes.md` (similar cases) → `business-logic.md` (expected behavior) → `decisions.md` → relevant section of `architecture.md`
- **New feature implementation**: `architecture.md` (integration points) → `business-logic.md` → `decisions.md` → *in-progress (unmerged) impl-spec, if any, for reference*
- **Refactoring / structural changes**: `decisions.md` (past decisions first) → `architecture.md` → `bug-fixes.md` (regression awareness)
- **DB / API / frontend changes**: the matching type above, plus `db-schema.md` / `api-spec.md` / `frontend-architecture.md`

Narrow the scope using context from the docs, then descend into code. Be careful not to propose changes that contradict documented decisions.

# Second Brain - Project Documentation Standard

## Standard docs/ Files

Every project should maintain these documentation files under `docs/`:

| File | Purpose | When Required |
|------|---------|---------------|
| `architecture.md` | System architecture, module relationships, data flow | Always |
| `db-schema.md` | Database schema, relations, indexes, migration notes | Prisma/DB projects |
| `api-spec.md` | API endpoints, request/response formats, auth | Projects with controllers/routes |
| `frontend-architecture.md` | Component tree, state management, routing | React/Next.js projects |
| `business-logic.md` | Domain rules, workflows, edge cases | Complex business logic |
| `decisions.md` | ADR (Architecture Decision Records) | Always |
| `bug-fixes.md` | Notable bug investigations and fixes | Always |

## Mermaid Diagrams

Use Mermaid diagrams in structure-related docs for visual clarity:

- `architecture.md`: System overview, module dependency graph, data flow
- `frontend-architecture.md`: Component hierarchy, state flow
- `db-schema.md`: ER diagrams for complex relations

Keep diagrams focused — one concept per diagram. Update diagrams when the structure changes.

## Two-Layer Rule & Freshness Stamps

Docs split into two layers by maintenance cost:

- **Hand-written layer** — why, invariants, rejected alternatives, business rules: things code cannot express. Maintained by hand; rarely invalidated.
- **Derivable layer** — facts reproducible from code (schema, endpoints, field/column mappings, indexes). NEVER hand-maintain these. Either generate them from code, or attach a freshness stamp so staleness is machine-checkable.

Stamp convention (frontmatter at the top of the doc):

```yaml
---
verified-against: a1b2c3d   # commit hash the doc was last verified against
sources: prisma/**, src/payment/**
---
```

- `git diff --name-only <hash>..HEAD -- <globs>` empty → doc is fresh; no judgment needed.
- Non-empty → potentially stale; the diff IS the sync-check scope.
- `/docs-sync` uses stamps for incremental checking and bumps them after a confirmed sync.
- When reading a stamped doc for derivable facts, trust it only if the stamp check passes; otherwise verify against code.
- A derivable-layer doc without a stamp is a defect, not an option: include the stamp when creating one (`/init-docs` scaffolds it), and when substantially updating an unstamped one, verify its facts against code and add the stamp in the same change.

## Lazy Loading Principle

**CLAUDE.md should be lightweight.** It serves as an index, not an encyclopedia.

- CLAUDE.md contains: project overview, quick-start commands, key conventions, and `## Documentation` section with references to `docs/`
- Detailed architecture, schemas, API specs live in `docs/` files
- Read `docs/` files only when the current task requires that context
- This keeps the context window lean and loads knowledge on-demand

Example `## Documentation` section in CLAUDE.md:

```markdown
## Documentation

Detailed docs live in `docs/`. Read as needed:
- `docs/architecture.md` — System architecture and module relationships (sources: src/**)
- `docs/db-schema.md` — Database schema and relations (sources: prisma/**)
- `docs/api-spec.md` — API endpoints and contracts (sources: src/**/*.controller.ts)
```

The `(sources: <glob>)` annotation makes update routing a lookup, not a judgment:
when a change touches a doc's sources glob, that doc is an update candidate.

## Research Order

**Before starting investigation or implementation**, skim the project's CLAUDE.md `## Documentation` section (the full index) and read the `docs/` files relevant to the task type *before* diving into source code. Don't grep code first — check whether decisions and context are already documented.

### Common Principles

- For any task type, skim `docs/decisions.md` at least once — to avoid proposing changes that conflict with past decisions.
- The source of truth for **current code state** is the code itself and `architecture.md`. `docs/impl-spec/` is a snapshot of the plan *at the time of writing*; do not use it as evidence of current state. Code may have changed since — treat impl-specs as a reference for **intent, background, and rationale ("why did we do it this way?")** only.
- If relevant docs are missing or appear stale, say so to the user and proceed.

### Order by Task Type

- **Bug fixing / debugging**: `bug-fixes.md` (similar cases) → `business-logic.md` (expected behavior) → `decisions.md` → relevant section of `architecture.md`
- **New feature implementation**: `architecture.md` (integration points) → `business-logic.md` → `decisions.md` → *in-progress (unmerged) impl-spec, if any, for reference*
- **Refactoring / structural changes**: `decisions.md` (past decisions first) → `architecture.md` → `bug-fixes.md` (regression awareness)
- **DB / API / frontend changes**: the matching type above, plus `db-schema.md` / `api-spec.md` / `frontend-architecture.md`

Narrow the scope using context from the docs, then descend into code. Be careful not to propose changes that contradict documented decisions.

## impl-spec Lifecycle

`docs/impl-spec/` documents are **frozen history, not maintained docs**. A spec claims "what we planned and why, at the time" — never "how the code is now" — so it is never synced against code drift; that claim cannot go stale. Durable why belongs in `decisions.md` (promote it there), current facts belong in `architecture.md` etc.

- **Born**: `/impl-plan` creates the spec with frontmatter `status: active` + `date` + the snapshot NOTE. This frontmatter is required for EVERY file created under `docs/impl-spec/`, including specs written ad-hoc (incident response, manual planning) without the skill — a spec file without it is a defect, same as an unstamped derivable doc.
- **Closed**: `/impl-execute` sets `status: done` and moves the file to `docs/impl-spec/archive/` when implementation passes review.
- **Superseded**: a new spec replacing an old one marks the old file `status: superseded-by: <NNN>` and archives it.
- **Reference rule**: only top-level (active) specs participate in planning/implementation routing. `archive/` is for archaeology — intent, background, rejected alternatives — and stays valid for that purpose at any age. Never cite an archived spec as evidence of current code state.

## Documentation Maintenance

- After completing a task that changes architecture, DB schema, API, or business logic, **suggest** updating the relevant `docs/` file
- Do NOT auto-update docs without user approval
- When suggesting, be specific: state which file and what section needs updating
- Keep docs concise — bullet points and diagrams over prose
- `bug-fixes.md` is append-only until promotion: when the same root-cause pattern appears 2+ times, promote it to a durable guard (test, lint rule, or a measurable CLAUDE.md rule) via `/docs-sync` Part 4. Promoted entries are compressed to a one-line reference — promotion doubles as compaction.

## Coexistence with Existing Files

- Standard files coexist with project-specific docs (e.g., `docs/deployment.md`, `docs/troubleshooting.md`)
- Never delete or rename existing documentation files (exception: moving closed impl-specs into `docs/impl-spec/archive/` per the lifecycle above)
- If an existing file covers the same topic as a standard file (e.g., `docs/architecture-proposal.md`), note it and let the user decide whether to merge

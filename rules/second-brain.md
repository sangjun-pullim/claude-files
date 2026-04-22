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
- `docs/architecture.md` — System architecture and module relationships
- `docs/db-schema.md` — Database schema and relations
- `docs/api-spec.md` — API endpoints and contracts
```

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

## Documentation Maintenance

- After completing a task that changes architecture, DB schema, API, or business logic, **suggest** updating the relevant `docs/` file
- Do NOT auto-update docs without user approval
- When suggesting, be specific: state which file and what section needs updating
- Keep docs concise — bullet points and diagrams over prose

## Coexistence with Existing Files

- Standard files coexist with project-specific docs (e.g., `docs/deployment.md`, `docs/troubleshooting.md`)
- Never delete or rename existing documentation files
- If an existing file covers the same topic as a standard file (e.g., `docs/architecture-proposal.md`), note it and let the user decide whether to merge

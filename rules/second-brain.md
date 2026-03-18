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

## Documentation Maintenance

- After completing a task that changes architecture, DB schema, API, or business logic, **suggest** updating the relevant `docs/` file
- Do NOT auto-update docs without user approval
- When suggesting, be specific: state which file and what section needs updating
- Keep docs concise — bullet points and diagrams over prose

## Coexistence with Existing Files

- Standard files coexist with project-specific docs (e.g., `docs/deployment.md`, `docs/troubleshooting.md`)
- Never delete or rename existing documentation files
- If an existing file covers the same topic as a standard file (e.g., `docs/architecture-proposal.md`), note it and let the user decide whether to merge

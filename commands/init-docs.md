---
description: Scaffold standard Second Brain docs/ structure and populate content from codebase analysis
---

Initialize the standard `docs/` documentation structure for this project, then **analyze the codebase to fill in actual content**. Follow these steps exactly.

## Step 1: Scan Existing docs/

List all files in `docs/` directory. If `docs/` doesn't exist, note that it will be created.

## Step 2: Detect Project Type

Check for these indicators to determine which standard files are needed:

| Indicator | Files to Include |
|-----------|-----------------|
| `prisma/schema.prisma` exists | `db-schema.md` |
| `src/**/*.controller.ts` or `src/**/routes*` exists | `api-spec.md` |
| `package.json` has react/next dependencies | `frontend-architecture.md` |
| Always | `architecture.md`, `decisions.md`, `bug-fixes.md` |
| Complex domain logic detected | `business-logic.md` |

## Step 3: Check for Similar Files

Before creating each standard file, check if a similar file already exists:
- Search for files containing keywords like "architecture", "schema", "api", "decision" in `docs/`
- If found (e.g., `docs/architecture-proposal.md`), report it and skip creating that standard file
- **Never overwrite or rename existing files**

## Step 4: Analyze Codebase

Before writing any docs, thoroughly explore the project to gather real content:

- **architecture.md**: Read `CLAUDE.md`, `package.json`, key entry points (`src/main.ts`, `src/app.module.ts`, etc.), and module directories. Identify modules, their responsibilities, data flow, and external integrations.
- **db-schema.md**: Read `prisma/schema.prisma`. Extract all models, relations, indexes, enums, and notable `@map`/`@@map` mappings.
- **api-spec.md**: Find all controllers/routes. Extract endpoints, HTTP methods, request/response DTOs, guards, and decorators.
- **frontend-architecture.md**: Scan component tree, routing config, state management setup, and key page components.
- **business-logic.md**: Identify domain services, workflow logic, state machines, validation rules, and edge case handling.
- **decisions.md**: Check git log and existing comments/docs for any architectural decisions already made.
- **bug-fixes.md**: Start with an empty log structure (no fake entries).

Use the Explore agent or parallel search agents to gather information efficiently. Do NOT guess — only document what you can confirm from the code.

## Step 5: Create and Populate Files

For each missing standard file that the project needs, create it with **real content** derived from Step 4.

Guidelines for content:
- Write concise bullet points over prose
- Use Mermaid diagrams in `architecture.md` and `frontend-architecture.md` to visualize module relationships, data flow, or component hierarchy
- For `db-schema.md`, include an ER diagram (Mermaid) for complex relations
- For `decisions.md`, create the ADR template structure with any decisions you can infer (e.g., framework choices, DB choices visible in the codebase)
- For `bug-fixes.md`, create only the empty log structure — do not fabricate entries
- Keep each file focused and scannable. Aim for completeness over length

## Step 6: Check CLAUDE.md Documentation Section

Read the project root `CLAUDE.md`:
- If `## Documentation` section exists: report OK
- If missing: suggest the following text to add (do NOT auto-modify):

```markdown
## Documentation

Detailed docs live in `docs/`. Read as needed:
- `docs/architecture.md` — System architecture and module relationships
- [list other created files with one-line descriptions]
```

## Step 7: Report

Output a summary table:

```
## Init Docs Report

| File | Status | Notes |
|------|--------|-------|
| architecture.md | CREATED / EXISTS / SIMILAR(filename) | ... |
| db-schema.md | CREATED / SKIPPED(not needed) / EXISTS | ... |
| ... | ... | ... |

### CLAUDE.md
- Documentation section: EXISTS / SUGGESTED (see above)

### Summary
- Created N files with content populated from codebase analysis
- [Any notable findings or gaps worth mentioning]
```

$ARGUMENTS

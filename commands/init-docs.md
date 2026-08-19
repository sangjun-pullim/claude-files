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
| `prisma/schema.prisma` exists | `DB-SCHEMA.md` |
| Controllers/routes exist AND the API has external consumers (internal-only: route code is the doc) | `API-SPEC.md` |
| `package.json` has react/next dependencies | `FRONTEND-ARCHITECTURE.md` |
| Always | `ARCHITECTURE.md`, `ADR.md`, `BUG-FIXES.md` |
| New project (per the `second-brain` skill's required-when) | `PRD/` (template only — see Step 4) |
| Complex domain logic detected | `BUSINESS-LOGIC.md` |
| The `second-brain` skill's `GLOSSARY.md` creation criterion is met | `GLOSSARY.md` |

## Step 3: Check for Similar Files

Before creating each standard file, check if a similar file already exists:
- Search for files containing keywords like "architecture", "schema", "api", "decision", "glossary", "business", "bug" in `docs/`
- If found (e.g., `docs/architecture-proposal.md`), report it and skip creating that standard file
- A legacy lowercase file (`decisions.md` for `ADR.md`, etc.) counts as EXISTS — on a case-insensitive filesystem the uppercase path resolves to the *same file*, so writing it would overwrite the legacy doc. Never write it; report `EXISTS (legacy name)` instead (`/docs-sync` owns the rename proposal)
- **Never overwrite or rename existing files**

## Step 4: Analyze Codebase

Before writing any docs, thoroughly explore the project to gather real content:

- **ARCHITECTURE.md**: Read `CLAUDE.md`, `package.json`, key entry points (`src/main.ts`, `src/app.module.ts`, etc.), and module directories. Identify modules, their responsibilities, data flow, and external integrations.
- **DB-SCHEMA.md**: Read `prisma/schema.prisma`. Extract all models, relations, indexes, enums, and notable `@map`/`@@map` mappings.
- **API-SPEC.md**: Find all controllers/routes. Extract endpoints, HTTP methods, request/response DTOs, guards, and decorators.
- **FRONTEND-ARCHITECTURE.md**: Scan component tree, routing config, state management setup, and key page components.
- **BUSINESS-LOGIC.md**: Identify domain services, workflow logic, state machines, validation rules, and edge case handling.
- **ADR.md**: Check git log and existing comments/docs for any architectural decisions already made.
- **BUG-FIXES.md**: Start with an empty log structure (no fake entries).
- **PRD/**: do NOT derive from code — intent is not in the code. Create `docs/PRD/000-product.md` with the template headings only (problem, target users, goal, scope, success criteria) and leave the content to the user; suggest a `grilling` session to fill it if the product intent is unclear.
- **GLOSSARY.md**: Collect domain terms from model names, service names, and CLAUDE.md; map each business term to its canonical code identifier with a one-line definition and banned aliases (format in the `second-brain` skill). Only include terms with real confusion potential — never pad with obvious vocabulary.

Use the Explore agent or parallel search agents to gather information efficiently. Do NOT guess — only document what you can confirm from the code.

## Step 5: Create and Populate Files

For each missing standard file that the project needs, create it with **real content** derived from Step 4.

Guidelines for content:
- **Derivable-layer docs MUST start with the freshness stamp frontmatter defined in the `second-brain` skill** — that skill decides which docs are derivable-layer and what the stamp contains.
- Write concise bullet points over prose
- Use Mermaid diagrams in `ARCHITECTURE.md` and `FRONTEND-ARCHITECTURE.md` to visualize module relationships, data flow, or component hierarchy
- For `DB-SCHEMA.md`, include an ER diagram (Mermaid) for complex relations
- For `ADR.md`, create the ADR template structure with any decisions you can infer (e.g., framework choices, DB choices visible in the codebase)
- For `BUG-FIXES.md`, create only the empty log structure — do not fabricate entries
- Keep each file focused and scannable. Aim for completeness over length

## Step 6: Check CLAUDE.md Documentation Section

Read the project root `CLAUDE.md`:
- If `## Documentation` section exists: report OK
- If missing: suggest the following text to add (do NOT auto-modify):

```markdown
## Documentation

Detailed docs live in `docs/`. Read as needed:
- `docs/ARCHITECTURE.md` — System architecture and module relationships (sources: src/**)
- [list other created files with one-line descriptions; derivable-layer docs get a `(sources: <glob>)` annotation matching their stamp]
```

## Step 7: Report

Output a summary table:

```
## Init Docs Report

| File | Status | Notes |
|------|--------|-------|
| ARCHITECTURE.md | CREATED / EXISTS / SIMILAR(filename) | ... |
| DB-SCHEMA.md | CREATED / SKIPPED(not needed) / EXISTS | ... |
| ... | ... | ... |

### CLAUDE.md
- Documentation section: EXISTS / SUGGESTED (see above)

### Summary
- Created N files with content populated from codebase analysis
- [Any notable findings or gaps worth mentioning]
```

$ARGUMENTS

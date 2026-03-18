---
description: Scaffold standard Second Brain docs/ structure for the current project
---

Initialize the standard `docs/` documentation structure for this project. Follow these steps exactly.

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

## Step 4: Create Missing Files Only

For each missing standard file that the project needs, create it with a minimal template:

```markdown
# [Title]

> TODO: Document [topic] for this project.

## Overview

<!-- Describe ... -->
```

For `architecture.md` and `frontend-architecture.md`, include a Mermaid diagram placeholder:

```markdown
# Architecture

> TODO: Document system architecture.

## Overview

<!-- Describe the high-level architecture -->

## Diagram

```mermaid
graph TD
    A[Component] --> B[Component]
```​
```

## Step 5: Check CLAUDE.md Documentation Section

Read the project root `CLAUDE.md`:
- If `## Documentation` section exists: report OK
- If missing: suggest the following text to add (do NOT auto-modify):

```markdown
## Documentation

Detailed docs live in `docs/`. Read as needed:
- `docs/architecture.md` — System architecture and module relationships
- [list other created files with one-line descriptions]
```

## Step 6: Report

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

### Next Steps
- [ ] Review created templates and fill in project-specific content
- [ ] Add ## Documentation section to CLAUDE.md (if suggested)
```

$ARGUMENTS

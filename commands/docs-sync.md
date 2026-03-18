---
description: Check if project CLAUDE.md and docs/ are in sync with the actual codebase
---

Audit the project root `CLAUDE.md` against the current codebase state. Do NOT modify the file — only report findings.

## Check Items

1. **Stack & Dependencies**: Compare `package.json` dependencies with documented tech stack
2. **Directory Structure**: Verify documented structure matches actual `ls` output
3. **Scripts & Commands**: Confirm documented npm scripts / CLI commands actually exist
4. **New Modules**: Identify significant new files/directories not mentioned in docs
5. **Removed Items**: Flag anything documented but no longer in the codebase
6. **Environment Variables**: Check if documented env vars match `.env.example` (do NOT read `.env`)
7. **Docs Structure**: Check `docs/` folder for standard Second Brain files.
   - Report which standard files exist vs missing (architecture.md, db-schema.md, api-spec.md, frontend-architecture.md, business-logic.md, decisions.md, bug-fixes.md)
   - Check if CLAUDE.md has `## Documentation` section with lazy-load references to `docs/`
   - If CLAUDE.md has inline content (Architecture/DB Schema/API sections longer than 20 lines), suggest extracting to `docs/`

## Output

```
## Docs Sync Report

| Category | Status | Details |
|----------|--------|---------|
| Stack | OK/DRIFT | ... |
| Structure | OK/DRIFT | ... |
| Scripts | OK/DRIFT | ... |
| New Modules | OK/DRIFT | ... |
| Removed Items | OK/DRIFT | ... |
| Env Vars | OK/DRIFT | ... |
| Docs Structure | OK/DRIFT | ... |

### Suggested Updates
- (list specific additions/removals/changes to CLAUDE.md)
```

If no CLAUDE.md exists at project root, offer to create one by scanning the codebase.

$ARGUMENTS

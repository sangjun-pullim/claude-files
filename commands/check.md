---
description: Quick check — run lint, type check, and tests during development (use /verify for full pre-push validation)
---

Check the project's package.json to identify available scripts, then run the following in order:

1. Lint — auto-fix what can be fixed
2. Type check (if TypeScript project) — fix any errors
3. Tests — fix failures
4. If all pass, provide a one-line summary of changes

If a step has issues, fix them before moving to the next.
Only report problems that cannot be auto-fixed.

$ARGUMENTS

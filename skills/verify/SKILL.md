---
name: verify
description: Run a 6-phase verification loop (build, types, lint, tests, security scan, diff review) before creating a PR or pushing code
---

# Verification Loop

Run all phases in order. Stop and fix if any phase fails before moving on.

## Phase 0: Detect Package Manager

Check which package manager the project uses (look for `pnpm-lock.yaml`, `yarn.lock`, `bun.lockb`, or `package-lock.json`). Use the detected package manager for all commands below. Default to `npm` if none found.

## Phase 1: Build

Run the project's build script via the detected package manager. If build fails, STOP. Fix build errors before continuing.

## Phase 2: Type Check

Run `tsc --noEmit` (via `npx` or the project's type-check script). Report and fix all type errors.

## Phase 3: Lint

Run the project's lint script. Auto-fix what can be fixed. Report remaining issues.

## Phase 4: Tests

Run the project's test script with coverage enabled. Report: total / passed / failed / coverage %. Target: minimum 80% coverage.

## Phase 5: Security Scan

Check for common security issues in changed files:

- Hardcoded secrets (API keys, tokens, passwords)
- `console.log` left in production code
- Unvalidated user input
- Raw SQL with string interpolation

## Phase 6: Diff Review

```bash
git diff --stat
git diff --name-only
```

Review each changed file for:
- Unintended changes
- Missing error handling
- Potential edge cases
- Files that shouldn't be committed (.env, node_modules, etc.)

## Output

```
VERIFICATION REPORT
===================
Build:     [PASS/FAIL]
Types:     [PASS/FAIL] (X errors)
Lint:      [PASS/FAIL] (X warnings)
Tests:     [PASS/FAIL] (X/Y passed, Z% coverage)
Security:  [PASS/FAIL] (X issues)
Diff:      [X files changed]

Overall:   [READY / NOT READY] for PR

Issues to Fix:
1. ...
```

$ARGUMENTS

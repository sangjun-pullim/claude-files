---
name: impl-execute
description: Execute an implementation plan and validate the result through a fresh-context review loop until the implementation fully matches the plan. Use this skill when the user says "impl-execute", "/impl-execute", "implement this plan", or provides a plan document and asks to build it. Also trigger when the user wants to implement changes from a spec in docs/impl-spec/.
---

# Implementation Execution with Code-Verified Review Loop

Implement changes based on a plan document, then validate the implementation against the plan through iterative fresh-context reviews until the reviewer confirms everything is correct.

## Do NOT use when

- No plan document exists — write one with `impl-plan` first
- One-line fixes or typos — the review loop costs more than the change
- The target spec sits in `archive/` or is `status: done` / `superseded-by` (frozen history)

## Why Fresh-Context Review After Implementation Matters

The agent that implements code develops blind spots -- it "knows" what it intended to write and tends to overlook gaps between intention and reality. A fresh-context reviewer reads the plan and the actual code independently, catching mismatches the implementer missed (forgotten steps, partial implementations, unintended side effects, imports not added).

## Inputs

- **Plan document path** (required): typically `docs/impl-spec/<name>.md`, provided as argument or by the user
- If no path given, list specs at the top level of `docs/impl-spec/` (NOT `archive/`) with frontmatter `status: active`, and ask the user which one to implement
- If the given spec has `status: done` or `superseded-by`, or lives in `archive/`, stop and confirm with the user — it is frozen history, likely not what they meant to implement

## Workflow

### Phase 1: Implementation

1. **Read the plan** -- understand all steps, affected files, and expected changes
2. **Implement step by step** -- follow the plan's implementation steps in order
   - After each step, run relevant checks (build, lint, type-check) to catch issues early
   - Keep a running summary of what was done per step
3. **Run verification** -- execute the plan's verification steps (build, lint, test)
4. **Generate change summary** -- produce a concise summary of what was implemented:
   - Which plan steps were completed
   - Files changed with brief description of each change
   - Any deviations from the plan and why
5. **Collect dependency map** -- for each changed file, grep for files that import it. Include this "affected dependents" list in the change summary. This gives the reviewer visibility into code that might break due to your changes, without requiring a separate analysis phase.

### Phase 2: Plan-vs-Implementation Review Loop

This loop repeats until the reviewer confirms the implementation matches the plan.

#### Step A: Fresh-Context Review

Spawn a **new** `reviewer` agent each iteration (fresh context is critical). Provide it with:

- The plan document (full path)
- The change summary from Phase 1 (or updated summary from Step C)
- If iteration 2+: the previous disposition table (Step B output)

The reviewer's job:
- Read the plan document
- Read every file that was changed (use git diff to identify them)
- For each plan step, verify the implementation matches the specification
- Check for: missing steps, incomplete changes, incorrect logic, missing imports
- **Side-effect checks** (use the dependency map from the change summary):
  - Changed function/method signatures: do all callers match the new signature?
  - New Guard/Middleware/Interceptor: does it accidentally apply to unintended endpoints (e.g., global registration affecting health checks)?
  - Removed or renamed exports: are other modules still importing the old name?
  - Existing tests: do changes break any test expectations?
- Report findings with severity: CRITICAL / HIGH / MEDIUM / LOW / INFO

**Severity definitions** (apply consistently across every reviewer so the same finding is scored the same way):
- **CRITICAL** — implementation broken or a security / data-loss risk. Blocks loop exit; fix immediately.
- **HIGH** — deviates from the plan, a test failure, or wrong logic. Must fix before the next iteration.
- **MEDIUM** — correct but suboptimal (missing edge case, weak error message). Note it; does not block.
- **LOW / INFO** — style, naming, readability. Never blocks the loop; surface once and move on.

#### Step B: Disposition

After receiving the review, evaluate each finding **with evidence**:

```
| Finding | Severity | Disposition | Rationale |
|---------|----------|-------------|-----------|
| Step 3 missing import for EmailChangeFailedException | CRITICAL | ACCEPTED | Verified: import not present in error-metadata.ts |
| extractRestrictionInfo fallback not implemented | HIGH | ACCEPTED | Only .action_list strategy exists, table.tbl missing |
| Variable name could be more descriptive | LOW | REJECTED | Matches existing codebase convention per blog.service.ts:120 |
```

Rules for disposition:
- **ACCEPTED**: fix the implementation to address the finding
- **REJECTED**: must include concrete evidence (file path, line number, or logical reasoning). "Already handled" without proof is not valid.

#### Step C: Apply Fixes

Fix all ACCEPTED findings. Update the change summary with what was fixed.

#### Step D: Next Iteration

Spawn a **new** fresh-context reviewer with:
- The plan document
- The updated change summary
- The disposition table from Step B

The new reviewer:
- Verifies ACCEPTED fixes were correctly applied
- Evaluates REJECTED dispositions -- if the rejection rationale is weak or incorrect, re-raise the finding
- Checks if the fixes introduced new issues
- Confirms each plan step is now fully implemented

**Regression / stall check** — before spawning the next iteration, compare this round's findings against the previous round's ACCEPTED findings. If a HIGH/CRITICAL finding of the same category reappears, or no CRITICAL/HIGH was resolved this round (no measurable progress), the loop is STALLED: stop and escalate to the user with the stuck findings instead of burning iterations toward the 5-round cap.

#### Loop Exit

When the reviewer reports **no CRITICAL or HIGH findings**, run **one final confirmation review** with a fresh-context reviewer. Provide it with the plan document and the latest change summary (disposition table is not needed for this round). This final round serves as a last sanity check — if it also finds no CRITICAL or HIGH findings, the loop exits. If new issues surface, return to Step B (Disposition) and continue the loop, counting toward the 5-iteration maximum.

Remaining MEDIUM/LOW items are noted but do not block.

Maximum iterations: **5**. The final confirmation round does not count toward this limit, but any issues found in it trigger iterations that do count.

### Phase 3: Close Spec & Report

1. **Close the spec** — the implementation passed review and verification, so the plan document's lifecycle ends here:
   - Set frontmatter `status: done` (add the lifecycle frontmatter block first if the spec predates it)
   - Move the file to `docs/impl-spec/archive/` (create the directory if missing; use `git mv` when the file is tracked)
   - This is part of the skill's normal completion, not a docs-update suggestion — do it without asking

2. **Report** — present the final result:
- Implementation summary (what was built, files changed)
- Review iterations summary (what was caught and fixed across rounds)
- Any remaining MEDIUM/LOW notes
- Verification results (build, lint, test status)

$ARGUMENTS

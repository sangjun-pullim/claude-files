---
name: impl-plan
description: Analyze impact scope and create an implementation plan, then validate it through a fresh-context code-review loop until no issues remain. Use this skill when the user asks to plan implementation, create an impl spec, or says "impl-plan", "/impl-plan". Also trigger when the user has a detailed spec/plan document and wants it verified against actual code.
---

# Implementation Plan with Code-Verified Review Loop

Create a concrete implementation plan, then validate every claim against the actual codebase through iterative fresh-context reviews until the plan is verified clean.

## Why the Review Loop Matters

The agent that writes a plan develops confirmation bias toward the code it read -- it tends to gloss over details it already "understands." A fresh-context reviewer reads the code from scratch with no preconceptions, catching discrepancies the planner missed (wrong line numbers, incorrect parameter counts, missing edge cases, overlooked dependencies).

## Workflow

### Phase 1: Plan Creation

1. **Scope analysis** -- spawn `planner` agent to explore affected files, dependencies, and blast radius
2. **Draft plan** -- write a structured implementation plan covering:
   - Context (what problem, why now)
   - Affected files with specific line numbers
   - Step-by-step changes with code snippets
   - Risks and edge cases
   - Verification steps
3. **Save plan** to the project's `docs/impl-spec/` directory
   - Filename: `<issue-number>-<short-description>.md` (e.g., `124-login-restricted-error-handling.md`)
   - If no issue number, use a descriptive kebab-case name
   - Create `docs/impl-spec/` if it doesn't exist

### Phase 2: Code-Verified Review Loop

This loop repeats until the reviewer reports no issues.

#### Step A: Fresh-Context Review

Spawn a **new** `planner` agent each iteration (fresh context is critical). Provide it with:

- The current plan document
- If iteration 2+: the previous review's disposition table (Step B output)

The reviewer's job:
- Read every file referenced in the plan
- Verify each claim (line numbers, parameter counts, types, branch conditions, existing patterns)
- Check for missing considerations (files not mentioned, side effects, import needs)
- **Reverse-trace impact**: grep for callers and consumers of every module/function the plan modifies or extends. If any existing code path is not addressed in the plan, raise as a finding.
- **Second-order effects**: for every operation the plan skips, changes, or adds, reason about what downstream behavior shifts as a result.
- **Pattern parity**: find analogous features in the codebase and compare. If an established pattern exists for similar flows but is absent from the plan, raise as a finding.
- Report findings with severity: CRITICAL / HIGH / MEDIUM / LOW / INFO

#### Step B: Disposition

After receiving the review, evaluate each finding **with evidence**:

For each item, produce a disposition entry:

```
| Finding | Severity | Disposition | Rationale |
|---------|----------|-------------|-----------|
| PasswordChangeFailedException missing from classifyErrorCode | CRITICAL | ACCEPTED | Verified: not present at error-metadata.ts:236-315 |
| Line 469 parameter count wrong | HIGH | ACCEPTED | Counted 6 params, plan says 7th -- corrected |
| Consider adding retry logic | LOW | REJECTED | Out of scope -- existing retry policy covers this per error-metadata.ts:180 |
```

Rules for disposition:
- **ACCEPTED**: update the plan to reflect the finding
- **REJECTED**: must include concrete evidence (file path, line number, or logical reasoning). "Not needed" without evidence is not valid.

#### Step C: Plan Update

Apply all ACCEPTED findings to the plan document in `docs/impl-spec/`. The file is the single source of truth -- all updates go directly to it.

#### Step D: Next Iteration

Spawn a **new** fresh-context reviewer with:
- The updated plan
- The disposition table from Step B

The new reviewer:
- Verifies ACCEPTED items were correctly applied
- Evaluates REJECTED dispositions -- if the rejection rationale is weak or incorrect, re-raise the finding
- Checks if the plan updates introduced new issues

#### Loop Exit

When a reviewer reports **no CRITICAL or HIGH findings**, run **one final confirmation review** with a fresh-context `planner` agent. Provide it with the current plan only (disposition table is not needed for this round — a fresh reviewer without prior anchors is the point). Instruct it to re-verify end-to-end, with emphasis on reverse-tracing, second-order effects, and pattern parity. If it also reports no CRITICAL/HIGH findings, the loop exits. If new issues surface, return to Step B (Disposition) and continue the loop.

Rationale: a reviewer with prior context tends to anchor on issues it already raised. A fresh reviewer on a "clean" plan occasionally catches things the previous pass missed.

Remaining MEDIUM/LOW items are noted but do not block.

Maximum iterations: **5**. The final confirmation round does not count toward this limit, but any issues found in it trigger iterations that do count. If issues persist after 5 rounds, present the remaining findings to the user for judgment.

### Phase 3: Present to User

Present the final plan with:
- The plan document
- Summary of review iterations (what was found and fixed)
- Any remaining MEDIUM/LOW notes

## Output Format

The plan document should follow this structure:

```markdown
# [Title]

## Context
[Problem description and motivation]

## Affected Files
1. `path/to/file.ts` -- brief description of change

## Implementation Steps

### Step N: [Title]
**File**: `path/to/file.ts`
- Change description with specific line references
- Code snippets where helpful

## Risks
- [Risk and mitigation]

## Verification
- [How to verify the changes work]
```

$ARGUMENTS

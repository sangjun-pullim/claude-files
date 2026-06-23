---
name: impl-plan
description: Analyze impact scope and create an implementation plan, then validate it through a fresh-context code-review loop until no issues remain. Use this skill when the user asks to plan implementation, create an impl spec, or says "impl-plan", "/impl-plan". Also trigger when the user has a detailed spec/plan document and wants it verified against actual code.
---

# Implementation Plan with Code-Verified Review Loop

Create a concrete implementation plan, then validate every claim against the actual codebase through iterative fresh-context reviews until the plan is verified clean.

## Why the Review Loop Matters

The agent that writes a plan develops confirmation bias toward the code it read -- it tends to gloss over details it already "understands." A fresh-context reviewer reads the code from scratch with no preconceptions, catching discrepancies the planner missed (wrong line numbers, incorrect parameter counts, missing edge cases, overlooked dependencies).

## Workflow

### Phase 0: Ambiguity Gate

Before plan creation, run a Socratic interview loop to bring the request below an ambiguity threshold. This phase is **always on**; bypass with `--no-interview`.

**Argument parsing:**
- If `$ARGUMENTS` contains `--no-interview`, strip the flag and skip Phase 0 (go straight to Phase 1 with the remaining text)
- Otherwise, treat the entire `$ARGUMENTS` as the initial vague request and enter the interview loop

**Ambiguity scoring:**

`ambiguity = 1 - (goal × 0.35 + constraints × 0.25 + criteria × 0.25 + context × 0.15)`

Each dimension is scored 0.0–1.0:
- **goal** — Can the objective be stated unambiguously in one sentence?
- **constraints** — Are boundaries (in-scope / out-of-scope) and limitations (perf, compat, deps) explicit?
- **criteria** — Are acceptance criteria testable?
- **context** — Is the relationship to existing code understood (which modules, which patterns, which side effects)?

**Loop:**

1. Score the current understanding across the four dimensions
2. If `ambiguity < 0.2`, exit the loop and proceed to Phase 1
3. Otherwise, ask **exactly one question** targeting the weakest dimension (never batch questions). Use the `AskUserQuestion` tool with 2–4 concrete options based on common patterns for the domain — "Other" (free-form input) is auto-appended by the tool, so do not include "직접 입력" or similar as a manual option. Fall back to plain text only when the answer space is genuinely unbounded (e.g., naming a file).
4. Wait for the user's answer, update the understanding, repeat from step 1

Report the current score and weakest dimension at the start of each round so the user can see progress.

**Bounds:**
- Soft warning at round 10 — note that the interview has run 10 rounds and suggest either narrowing remaining gaps or re-invoking with `--no-interview`
- Hard cap at round 20 — if `ambiguity ≥ 0.2`, present the current state and ask whether to proceed anyway or abort

**Output:**

Once the gate passes, produce a concise spec block (in-memory, not a separate file) covering:
- Goal (one sentence)
- In-scope / out-of-scope
- Acceptance criteria (testable bullet list)
- Known constraints
- Relevant context (files, modules, prior patterns to follow)

This block becomes the input for Phase 1's `planner` agent — pass it in place of the raw `$ARGUMENTS`.

### Phase 1: Plan Creation

1. **Scope analysis** -- spawn `planner` agent to explore affected files, dependencies, and blast radius
2. **Draft plan** -- write a structured implementation plan covering:
   - Context (what problem, why now)
   - Affected files with specific line numbers
   - Step-by-step changes with code snippets
   - Risks and edge cases
   - Verification steps
3. **Save plan** to the project's `docs/impl-spec/` directory
   - Filename: `<NNN>-<short-description>.md` (e.g., `001-login-restricted-error-handling.md`)
   - `NNN` is a 3-digit sequence number starting from `001`
   - **Before assigning**: list existing files in `docs/impl-spec/`, find the highest used number, and use `highest + 1` (zero-padded to 3 digits). If the directory is empty or missing, start from `001`.
   - Never reuse an existing number — if a collision is detected, pick the next available number
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

**Severity definitions** (apply consistently across every reviewer so the same finding is scored the same way):
- **CRITICAL** — a plan claim is factually wrong in a way that breaks implementation, or a security / data-loss risk. Blocks loop exit.
- **HIGH** — wrong line numbers / parameter counts / types, an unaddressed caller, or a missing required step. Must resolve before the next iteration.
- **MEDIUM** — correct but suboptimal (missing edge case, weak pattern parity). Note it; does not block.
- **LOW / INFO** — style, naming, wording. Never blocks the loop; surface once and move on.

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

**Logging policy** — what to persist in the plan document:

- **ACCEPTED** findings: reflect in the plan body only. Do NOT duplicate them into a log (the body already represents the current state of truth).
- **REJECTED** findings and **NOTED (out-of-scope)** findings: append to a `## Review Notes` section at the end of the plan document. Each entry should include the finding summary, severity, disposition, and the concrete rationale (file/line evidence or reason for out-of-scope).
- Iteration numbering is not required — the reason for exclusion matters, not which round it came from. New entries can simply be appended.

Purpose: future reviewers (and the implementer) can see what was deliberately rejected or deferred, without having to re-raise the same concerns. ACCEPTED items live in the body; REJECTED/NOTED items live at the bottom as an audit trail.

#### Step D: Next Iteration

Spawn a **new** fresh-context reviewer with:
- The updated plan
- The disposition table from Step B

The new reviewer:
- Verifies ACCEPTED items were correctly applied
- Reads the plan's `## Review Notes` section to avoid re-raising already-rejected items; may still re-raise if the rationale is weak or incorrect
- Evaluates REJECTED dispositions from the current round -- if weak, re-raise the finding
- Checks if the plan updates introduced new issues

**Regression / stall check** — before spawning the next iteration, compare this round's findings against the previous round's ACCEPTED findings. If a HIGH/CRITICAL finding of the same category reappears, or no CRITICAL/HIGH was resolved this round (no measurable progress), the loop is STALLED: stop and escalate to the user with the stuck findings instead of burning iterations toward the 5-round cap.

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

## Review Notes
<!-- Appended during Phase 2. Only REJECTED or out-of-scope NOTED findings live here. ACCEPTED findings are already reflected in the body above. -->

| Finding | Severity | Disposition | Rationale |
|---------|----------|-------------|-----------|
| [example] Add retry logic | LOW | REJECTED | Out of scope — existing retry covers this per error-metadata.ts:180 |
```

$ARGUMENTS

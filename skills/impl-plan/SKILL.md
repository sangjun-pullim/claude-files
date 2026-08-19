---
name: impl-plan
description: Analyze impact scope and create an implementation plan, then validate it through a fresh-context code-review loop until no issues remain. Use this skill when the user asks to plan implementation, create an impl spec, or says "impl-plan", "/impl-plan". Also trigger when the user has a detailed spec/plan document and wants it verified against actual code.
---

# Implementation Plan with Code-Verified Review Loop

Create a concrete implementation plan, then validate every claim against the actual codebase through iterative fresh-context reviews until the plan is verified clean.

## Do NOT use when

- tier-0 / tier-1 changes — the plan cell in `rules/risk-triage.md`'s tier table is enough
- The problem itself is still vague — clarify with `grilling` first
- An approved spec already exists and it is time to build (`impl-execute`)

## Why the Review Loop Matters

The agent that writes a plan develops confirmation bias toward the code it read -- it tends to gloss over details it already "understands." A fresh-context reviewer reads the code from scratch with no preconceptions, catching discrepancies the plan's author missed (wrong line numbers, incorrect parameter counts, missing edge cases, overlooked dependencies).

## Workflow

### Phase 0: Ambiguity Gate

Before plan creation, run a Socratic interview loop to bring the request below an ambiguity threshold. This phase is **always on**; bypass with `--no-interview`.

**PRD check (always runs, `--no-interview` included):** look under `docs/PRD/` for an entry covering this work. If one exists, load it — gate checks it already answers count as PASS, and carry its number into the spec's Context as a reference (never restate its content). If the request contradicts the loaded PRD, surface the mismatch before planning — an intent change means proposing a PRD update first (applied with the user's approval), a mistaken request means correcting course; only a PRD consistent with the request feeds the gate; if the user declines the update, proceed on their explicit call with the PRD excluded from the gate and unreferenced in the spec's Context. If the `second-brain` skill's PRD criteria apply and no PRD exists, suggest writing one first; proceed without it only on the user's explicit call.

**Argument parsing:**
- If `$ARGUMENTS` contains `--no-interview`, strip the flag and skip the interview loop below — the PRD check above still runs — then go straight to Phase 1 with the remaining text
- Otherwise, treat the entire `$ARGUMENTS` as the initial vague request and enter the interview loop

**Gate — four binary checks:**

Each check is PASS only if you can write the stated sentence *right now*, from what the
user has actually said or the loaded PRD states, with no hedging ("probably", "something like", "TBD"). Anything
less is FAIL. Do not average or weigh these — one FAIL keeps the gate closed.

- **goal** — one sentence naming what changes and for whom.
- **constraints** — one sentence for in-scope, one for out-of-scope.
- **criteria** — at least one acceptance check worded so it can only pass or fail.
- **context** — the specific files/modules the change lands in, plus what else reads them.

**Loop:**

1. Evaluate the four checks
2. All four PASS → exit the loop and proceed to Phase 1
3. Otherwise, ask **exactly one question** targeting the first FAIL (never batch questions). Use the `AskUserQuestion` tool with 2–4 concrete options based on common patterns for the domain — "Other" (free-form input) is auto-appended by the tool, so do not include "직접 입력" or similar as a manual option. Fall back to plain text only when the answer space is genuinely unbounded (e.g., naming a file).
4. Wait for the user's answer, update the understanding, repeat from step 1

State the four checks as PASS/FAIL at the start of each round so the user can see progress.

**Bounds:**
- Soft warning at round 10 — note that the interview has run 10 rounds and suggest either narrowing remaining gaps or re-invoking with `--no-interview`
- Hard cap at round 20 — if any check is still FAIL, present the current state and ask whether to proceed anyway or abort

**Output:**

Once the gate passes, produce a concise spec block (in-memory, not a separate file) covering:
- Goal (one sentence)
- In-scope / out-of-scope
- Acceptance criteria (testable bullet list)
- Known constraints
- Relevant context (files, modules, prior patterns to follow)

This block becomes the input for Phase 1's `planner` agent — pass it in place of the raw `$ARGUMENTS`.

### Phase 1: Plan Creation

1. **Scope analysis** -- spawn a `planner` agent; see `agents/planner.md` for what it returns. Adopt its findings, never its formatting: within this skill you are the sole author of the spec's step grammar.
   - If its `## Open Questions` is non-empty, resolve them with the user under Phase 0's loop and bounds before drafting. Nothing downstream reopens that channel, so an unanswered question here becomes a silent guess in the spec.
2. **Draft plan** -- write a structured implementation plan covering:
   - Context (what problem, why now; reference the PRD entry if one exists — never restate it)
   - The tier and risk-surface judgment (`rules/risk-triage.md`), recorded in the frontmatter — every later gate reads it from there. Re-judge it against the plan you drafted, not the scope that was surveyed: the planner judged what it explored, and a step you added can reach further.
   - The dependents the change must not break, and the conventions analogous features follow — these are the planner's costliest findings and they reach the implementer only if they land in the spec
   - Affected files with specific line numbers
   - Step-by-step changes with code snippets — each step heading written as `### [ ] Step N: <title>` (see Output Format)
   - Tests: what to add or change, and what each pins
   - Risks and edge cases
   - Verification steps
3. **Save plan** to the project's `docs/impl-spec/` directory
   - Filename: `<NNN>-<short-description>.md` (e.g., `001-login-restricted-error-handling.md`)
   - `NNN` is a 3-digit sequence number starting from `001`
   - **Before assigning**: list existing files in `docs/impl-spec/`, find the highest used number, and use `highest + 1` (zero-padded to 3 digits). If the directory is empty or missing, start from `001`.
   - Never reuse an existing number — if a collision is detected, pick the next available number
   - When counting existing numbers, include `docs/impl-spec/archive/` — archived specs keep their numbers
   - Create `docs/impl-spec/` if it doesn't exist
   - **Frontmatter + NOTE**: required at the top of every spec, exactly as given in `## Output Format` below — that block is the field list.

   - **Supersede check**: if this plan replaces an existing spec (same feature re-planned, or the user says so), set the old spec's frontmatter to `status: superseded-by: <new NNN>` and move it to `docs/impl-spec/archive/`

### Phase 2: Code-Verified Review Loop

The loop runs on the protocol in `~/.claude/docs/review-loop.md`; the steps below supply this skill's inputs and disposition rules.

#### Step A: Fresh-Context Review

Spawn a **new** `reviewer` agent each iteration (fresh context is critical) — it runs in **Plan verification** mode per `agents/reviewer.md`, which owns everything the reviewer knows. Restate none of it in the spawn prompt. Provide it with:

- The current plan document
- If iteration 2+: the previous review's disposition table (Step B output)

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
- **UNRESOLVED** entries: written only by the Loop Exit's abnormal-exit path, never by a normal round. They record findings that were never disposed at all. When a later round resolves one, delete its row or re-mark it `ACCEPTED`/`REJECTED` with evidence — the spec is unblocked only when zero `UNRESOLVED` rows remain.
- Iteration numbering is not required — the reason for exclusion matters, not which round it came from. New entries can simply be appended.

Purpose: future reviewers (and the implementer) can see what was deliberately rejected or deferred, without having to re-raise the same concerns. ACCEPTED items live in the body; REJECTED/NOTED items live at the bottom as an audit trail.

#### Step D: Next Iteration

Return to Step A and spawn the next reviewer there, with:
- The updated plan
- The disposition table from Step B

The next reviewer:
- Verifies ACCEPTED items were correctly applied
- Reads the plan's `## Review Notes` section to avoid re-raising already-rejected items; may still re-raise if the rationale is weak or incorrect. Rows marked `UNRESOLVED` are **open** findings, not disposed ones — re-raise them until they are cleared
- Evaluates REJECTED dispositions from the current round -- if weak, re-raise the finding
- Checks if the plan updates introduced new issues

Iteration, stall, cap, and exit rules live in `~/.claude/docs/review-loop.md` — that file owns them for both skills. Read it when the loop starts.

#### Loop Exit

Per `~/.claude/docs/review-loop.md`. This skill's input for the confirmation round is the current plan.

On an abnormal exit (cap, stall, or a persistently blocked reviewer): **still run Phase 3** — the plan and its tier judgment need presenting either way — but persist the state first. Append every open CRITICAL/HIGH to `## Review Notes` marked `UNRESOLVED`, since a conversational warning does not survive the session and nothing else distinguishes a not-review-clean plan from a verified one. Say plainly that the plan is not review-clean, and note that Phase 3's handoff does not apply: `/impl-execute` must not run on this spec until those entries are resolved.

### Phase 3: Present to User

Present the final plan with:
- The plan document
- The tier and risk-surface judgment recorded in its frontmatter, and what ceremony that implies
- Summary of review iterations (what was found and fixed)
- Any remaining MEDIUM/LOW notes

Then hand off explicitly: look up the recorded tier's ceremony in `rules/risk-triage.md` and state what it requires before building. A tier-0/1 judgment also means this skill was the wrong tool (see "Do NOT use when") — say so rather than proceeding as if the ceremony matched. Either way implementation runs through `/impl-execute` on this spec. Do not start implementing from this skill.

## Output Format

The plan document should follow this structure:

```markdown
---
status: active            # active | done | superseded-by: <NNN>
date: <YYYY-MM-DD>
tier: <0|1|2>             # normally 2 — a tier-0/1 judgment means this skill was the wrong tool (see "Do NOT use when")
risk-surface: <none | the matched item(s) from rules/risk-triage.md signal 1>
---
> NOTE: This is the plan, not a description of the code — never read it as evidence of current code state. While `status: active`, edit it in place as the plan changes; once archived it is frozen.

# [Title]

## Context
[Problem description and motivation]

## Affected Files
1. `path/to/file.ts` -- brief description of change

## Affected Dependents
[Code that must keep working but is not being changed: callers of every signature this touches,
consumers of every export it renames, routes behind a middleware it alters. One line each with a
path. The implementer never sees the scope analysis — this section is how it reaches them.]

## Implementation Steps

Every step heading carries a progress marker: `[ ]` unstarted, `[x]` implemented.
`/impl-execute` flips these as it works, so the spec shows where a partially
finished implementation left off. Write them all as `[ ]`.

### [ ] Step N: [Title]
**File**: `path/to/file.ts`
- Change description with specific line references
- Code snippets where helpful

## Tests
[Required. Name each test to add or change, and the behavior it pins. When `risk-surface` is
not `none`, "none needed" is not an available answer; off the risk surface it needs a reason.
Each entry is implemented alongside the step whose behavior it pins.]

## Risks
- [Risk and mitigation]

## Verification
- [How to verify the changes work]

## Review Notes
<!-- Appended during Phase 2. Holds REJECTED findings, out-of-scope NOTED findings, and UNRESOLVED findings left open by an abnormal exit. ACCEPTED findings are already reflected in the body above. An UNRESOLVED row blocks /impl-execute until it is cleared. -->

| Finding | Severity | Disposition | Rationale |
|---------|----------|-------------|-----------|
```

$ARGUMENTS

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

This is why the reviewer is a separate agent when *you* implemented — and why it does not need to be when Codex implemented. Delegating implementation makes you the fresh context; a second layer buys nothing there.

## Inputs

- **Plan document path** (required): typically `docs/impl-spec/<name>.md`, provided as argument or by the user
- If no path given, list specs at the top level of `docs/impl-spec/` (NOT `archive/`) with frontmatter `status: active`, and ask the user which one to implement
- If the given spec has `status: done` or `superseded-by`, or lives in `archive/`, stop and confirm with the user — it is frozen history, likely not what they meant to implement

## Who implements — you or Codex

Default: **you implement** (Phase 1 below). Delegate to Codex only when the user asked for it — "codex로 구현", "codex한테 시켜", "GPT로 진행" or equivalent. Never switch to delegation on your own initiative; a plan being large is not a reason.

**If you are Codex** (this skill was invoked by Codex, not by Claude): you are the implementer. Ignore Phase 1-C and Phase 2 entirely — run Phase 1 directly, then report facts and stop. Do not spawn workers, do not run the review loop, do not close the spec. The Claude orchestrator that dispatched you owns review and closing.

When the user did ask for Codex, run **Phase 1-C** instead of Phase 1, then continue at Phase 2.

### Phase 1-C: Delegated implementation (Codex)

1. **Read the plan** and find the resume point exactly as in Phase 1 steps 1–2.
2. **Decide the split.** Judge parallelizability from the plan yourself — the spec does not annotate it. Group the unchecked steps into workers so that:
   - **file sets are disjoint** — two concurrent workers must never touch the same file
   - a step that changes an exported signature, renames an export, or edits a schema/barrel/shared type is **serialized**: run it alone, before or after the parallel batch, never inside it
   - steps that change a signature and steps that change its callers go in the **same** worker
   - if a clean disjoint split isn't available, run sequentially — one worker at a time. Sequential is the correct answer more often than not.
3. **Ask the mode question** required by `rules/agents.md` (orca worktree vs in-place), once for the whole task.
4. **Dispatch** one `codex-worker` per group. Give each worker the **spec file path** and the step numbers it owns — do not paraphrase the spec into the prompt. Phrase the task as "codex로 구현하라", never "편집하라" (see `rules/agents.md`).
5. **Gate each worker's report mechanically** as it returns — this is a check, not a review:
   - `codex 호출 0회`, missing session id, or no `OpenAI Codex v` banner in `out.txt` → the change did not come from Codex. Failed run; re-dispatch.
   - any `검증: … → exit` non-zero → failed; send the failing output back to that worker's Codex session as a rework request
   - `스펙 외 변경 파일` non-empty → inspect those paths before accepting
   - all clear → confirm that group's steps are `[x]` in the spec. Codex marks them as it goes; if it did not, mark them yourself now so the resume point stays accurate.
   Do not review the diff here. A failing gate costs one rework round-trip and no review tokens. Each gate result is reported to the user in the turn it arrives (`rules/agents.md` Background Agent Turn Discipline) — never gate silently.
6. **After every worker is clear, assemble the union** — Phase 2 reviews one combined change, not N separate ones.
   - **in-place mode**: everything is already in one checkout. `git status --porcelain` + `git diff` is the union.
   - **orca worktree mode**: each worker's work sits on its own branch, so there is no combined tree yet. Create an integration branch off the base (`git switch -c <task>-integration <base>`) and merge each worker branch into it. Never merge into the base branch here — that is the user's call, per `rules/agents.md`.
     - A **merge conflict is a cross-worker collision** — two workers touched the same region. Resolve it only if the resolution is mechanical and obvious; otherwise treat it as a finding and send it back to the owning sessions.
     - After merging, **run build/lint/test on the integration branch**. Each worktree passing individually proves nothing about the union: stale imports and mismatched signatures only fail here. This is the cheapest cross-worker check there is — run it before spending any review effort.
   - Then go to Phase 2 with the union diff (`git diff <base>...HEAD` on the integration branch).

### Phase 1: Implementation

1. **Read the plan** -- understand all steps, affected files, and expected changes
2. **Find the resume point** -- step headings carry a progress marker (`### [ ] Step N` / `### [x] Step N`). `grep -n '^### \[ \]' <spec>` gives the first unimplemented step.
   - No markers at all (spec predates them) → normal run from Step 1; add `[ ]`/`[x]` markers to the step headings as you go
   - All `[ ]` → normal run from Step 1
   - Some `[x]` → this spec was interrupted. Tell the user which steps are already marked done and which one you are resuming from, and get confirmation before proceeding — the codebase may have moved since, and a marked step is only a claim that the code was written, not that it still holds.
   - A step marked `> BLOCKED: <reason>` needs the blocker resolved or the user's call before you touch it
3. **Implement step by step** -- follow the plan's implementation steps in order
   - After each step, run relevant checks (build, lint, type-check) to catch issues early
   - **Then flip that step's marker to `[x]` in the spec file immediately** — not batched at the end. This write is what survives an interrupted session; an in-context summary does not.
   - If a step cannot be completed, leave it `[ ]` and add a `> BLOCKED: <reason>` line under its heading
   - Keep a running summary of what was done per step
4. **Run verification** -- execute the plan's verification steps (build, lint, test)
5. **Generate change summary** -- produce a concise summary of what was implemented:
   - Which plan steps were completed
   - Files changed with brief description of each change
   - Any deviations from the plan and why
6. **Collect dependency map** -- for each changed file, grep for files that import it. Include this "affected dependents" list in the change summary. This gives the reviewer visibility into code that might break due to your changes, without requiring a separate analysis phase.

### Phase 2: Plan-vs-Implementation Review Loop

This loop repeats until the reviewer confirms the implementation matches the plan.

The review always covers **every** step in the spec, including ones already marked `[x]` by an earlier session. A marker records that the code was written, never that it was verified — correctness comes from this loop alone. Reviewing only the steps completed in this run would let an earlier session's mistakes ride out on a checked box.

#### Step A: Fresh-Context Review

**Who reviews depends on who implemented.**

- **You implemented (Phase 1)** → spawn a `reviewer` agent, as below. You wrote the code, so you carry the blind spot this loop exists to defeat.
- **Codex implemented (Phase 1-C)** → **review it yourself, no reviewer agent.** You never wrote this code, so you already are the fresh context. Read the union diff against the plan and apply the same checklist below. This is also where cross-worker breakage becomes visible for the first time — a per-worker reviewer could not have seen it, since each worker only produced part of the change.

  Spawn a `reviewer` agent in the Codex path only when one of these holds, and then **one reviewer over the whole union** — never one per worker:
  - the change touches the risk surface (`rules/risk-triage.md` requires a reviewer regardless)
  - the union diff is too large to read without crowding out the rest of the task

Whichever runs, the checklist, severities, and loop-exit rules below are identical.

Review results are reported in the turn they arrive — findings table first, then disposition. Going idle between review completion and the report is not an allowed state.

When spawning a reviewer, spawn a **new** one each iteration (fresh context is critical). Provide it with:

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

**Codex path**: do not fix the code yourself. Send each ACCEPTED finding back to the Codex session that produced that step — re-spawn `codex-worker` against the same worktree with the session id and state the correction plainly. The worker passes it to Codex verbatim; it will not diagnose for you. Group findings by owning worker so each session gets one rework request rather than several. Then gate the returned reports again (Phase 1-C step 5) before re-reviewing.

Exception: if no session id survives for that step, or the fix is a one-line mechanical correction that costs less than a round-trip, fix it yourself and say so in the report.

#### Step D: Next Iteration

Re-review with the updated change summary and the disposition table from Step B. If Step A used a `reviewer` agent, spawn a **new** one (never reuse — fresh context is the point) with:
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

1. **Close the spec** — only when every step is marked `[x]`. Verify with `grep -c '^### \[ \]' <spec>` (expect `0`):
   - Set frontmatter `status: done` (add the lifecycle frontmatter block first if the spec predates it)
   - Move the file to `docs/impl-spec/archive/` (create the directory if missing; use `git mv` when the file is tracked)
   - This is part of the skill's normal completion, not a docs-update suggestion — do it without asking

   If any step is still `[ ]`, **do not close or archive**. Leave `status: active`, report which steps remain (and any `> BLOCKED:` reasons), and tell the user `/impl-execute` on this spec will resume from the first unchecked step. A passing review does not close a spec that was never fully implemented.

2. **Report** — present the final result:
- Implementation summary (what was built, files changed)
- Review iterations summary (what was caught and fixed across rounds)
- Any remaining MEDIUM/LOW notes
- Verification results (build, lint, test status)
- **Codex path**: who implemented what — worker → steps owned → Codex session id — plus how many rework round-trips each took. Name the integration branch and the worker branches on it, and state plainly that nothing was merged into the base branch — that decision is the user's.

$ARGUMENTS

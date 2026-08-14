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

This is why the reviewer is always a separate agent, whoever implemented. When you implemented, you carry the blind spot directly. When Codex implemented you did not type the code — but you authored or approved the plan, split the work, and passed the gate, so tolerance toward your own instructions survives. Neither case leaves you as the fresh context this loop needs.

## Inputs

- **Plan document path** (required): typically `docs/impl-spec/<name>.md`, provided as argument or by the user
- If no path given, list specs at the top level of `docs/impl-spec/` (NOT `archive/`) with frontmatter `status: active`, and ask the user which one to implement
- If the given spec has `status: done` or `superseded-by`, or lives in `archive/`, stop and confirm with the user — it is frozen history, likely not what they meant to implement
- If its `## Review Notes` carries `UNRESOLVED` entries, the plan review never came back clean (`impl-plan` abnormal exit). Stop and tell the user: implementing an unverified plan is exactly what these loops exist to prevent. The remedy is to clear those rows — re-run `/impl-plan` on the spec, or dispose them by hand with evidence (`impl-plan` Step C)

## Who implements — you or Codex

Default: **you implement** (Phase 1 below). Delegate to Codex only when the user asked for it — "codex로 구현", "codex한테 시켜", "GPT로 진행" or equivalent. Never switch to delegation on your own initiative; a plan being large is not a reason.

**If you are Codex** (this skill was invoked by Codex, not by Claude): you are the implementer. Ignore Phase 1-C and Phase 2 entirely — run Phase 1 directly, **skipping step 3's marker flip: never write the spec file.** The orchestrator owns the spec (Phase 1-C step 5); if every worker also edits it, all of them collide on the one file the split was supposed to keep disjoint. Then report facts and stop. Do not spawn workers, do not run the review loop, do not close the spec. The Claude orchestrator that dispatched you owns review and closing.

When the user did ask for Codex, run **Phase 1-C** instead of Phase 1, then continue at Phase 2.

### Phase 1-C: Delegated implementation (Codex)

1. **Read the plan** and find the resume point exactly as in Phase 1 steps 1–2. **Record the base branch** (`git rev-parse --abbrev-ref HEAD` in the repo root) — steps 5, 6 and Phase 3 all refer to it as `<base>`, and each worker is given it explicitly rather than resolving its own.
2. **Decide the split.** Judge parallelizability from the plan yourself — the spec does not annotate it. Group the unchecked steps into workers so that:
   - **file sets are disjoint** — two concurrent workers must never touch the same file
   - a step that changes an exported signature, renames an export, or edits a schema/barrel/shared type is **serialized**: run it alone, before or after the parallel batch, never inside it
   - steps that change a signature and steps that change its callers go in the **same** worker
   - if a clean disjoint split isn't available, run sequentially — one worker at a time. Sequential is the correct answer more often than not.
   - each `## Tests` entry goes to the worker that owns the step it pins — workers are dispatched step numbers, so an unassigned test entry is written by nobody
3. **Ask the mode question** required by `rules/agents.md`.
4. **Dispatch** one `codex-worker` per group. Give each worker the **spec file path as an absolute path** — a worktree checkout may not contain the spec at all, and a repo-relative path resolves to nothing there — plus the step numbers it owns, and the `## Tests` entries assigned to those steps quoted from the spec — step numbers alone leave the tests undelivered. Do not paraphrase the spec into the prompt, and phrase the dispatch per `rules/agents.md`'s verb rule.
   - **In-place mode is single-worker**: dispatch one group, gate it, then dispatch the next — however many groups step 2 produced.
   - **Workers never write the spec file.** It is the one file every group would otherwise share, which would violate the disjoint-file-set rule and surface as a fake merge conflict. State that in the spawn prompt; you flip the markers yourself at step 5.
5. **Gate each worker's report mechanically** as it returns — this is a check, not a review:
   - `codex 호출 0회`, missing session id, or no `OpenAI Codex v` banner in `out.txt` → the change did not come from Codex. Failed run; re-dispatch.
   - any `검증: … → exit` non-zero → failed; send the failing output back to that worker's Codex session as a rework request
   - `스펙 외 변경 파일` non-empty → inspect those paths before accepting
   - **orca mode only** — the worker branch must actually carry a commit: `git -C <worktree> log <base>..HEAD --oneline` non-empty. Codex is not required to commit, and work left in the working tree merges as an *empty* union while also blocking cleanup later. If the branch is empty and the worktree is dirty, commit it there yourself — that is mechanical assembly, not implementation.
   - all clear → mark that group's steps `[x]` in the spec yourself, in the base checkout. Workers do not write the spec (step 4), so this is the only place markers move.
   **Bound the gate→rework cycle**: the same group failing the same check twice ends it. Stop dispatching, report the raw worker report and its log path, and let the user decide. `~/.claude/docs/review-loop.md`'s cap governs Phase 2 only, and a run that never reaches Phase 2 would otherwise spin forever on a worker that structurally cannot invoke codex.

   Do not review the diff here. A failing gate costs one rework round-trip and no review tokens. Each gate result is reported to the user in the turn it arrives (`rules/agents.md` Background Agent Turn Discipline) — never gate silently.
6. **After every worker is clear, assemble the union** — Phase 2 reviews one combined change, not N separate ones.
   - **in-place mode**: everything is already in one checkout. `git status --porcelain` + `git diff` is the union.
   - **orca worktree mode**: each worker's work sits on its own branch, so there is no combined tree yet. Work in the **repo-root checkout**, which must be clean apart from step 5's spec marker flips — those ride across the switch and belong on the integration branch. First pass: `git switch -c <task>-integration <base>`, **commit the spec marker flips there** (uncommitted they would ride back to `<base>` at Phase 3 step 3, leaving the merged branch without them and `<base>` dirty), then merge each worker branch into it. **Re-assembly after a Step C rework**: the branch already exists and is checked out — stay on it and merge the updated worker branches; `git switch -c` would abort. Either way this leaves the checkout on the integration branch; Phase 3 step 3 restores it. Never merge into the base branch here — see `rules/agents.md`.
     - A **merge conflict is a cross-worker collision** — two workers touched the same region. Resolve it only if the resolution is mechanical and obvious; otherwise treat it as a finding and send it back to the owning sessions.
     - After merging, **run build/lint/test on the integration branch**. Each worktree passing individually proves nothing about the union: stale imports and mismatched signatures only fail here. This is the cheapest cross-worker check there is — run it before spending any review effort.
   - Then read the union diff — `git diff` in in-place mode, `git diff <base>...HEAD` on the integration branch in orca mode.
7. **Produce the change summary and dependency map** for the union — Phase 1 steps 5–6 applied to the combined change, with each plan step attributed to the worker that implemented it. No worker produces this, and Phase 2's reviewer depends on it entirely: the reviewer has no Bash, so your explicit list of changed files is its only way to find them. Note the integration branch name and the absolute path of the checkout holding it — Phase 2 passes both. **On a resumed run, extend the file list beyond the union diff** to cover every step in the spec (Phase 1 step 5's last bullet): steps an earlier session already committed to `<base>` are absent from `git diff <base>...HEAD`, yet Phase 2 reviews them. Then go to Phase 2.

### Phase 1: Implementation

1. **Read the plan** -- understand all steps, affected files, and expected changes. Record the base branch (`git rev-parse --abbrev-ref HEAD`) as `<base>`; Phase 2 needs it to produce a patch.
2. **Find the resume point** -- step headings carry a progress marker (`### [ ] Step N` / `### [x] Step N`). `grep -n '^### \[ \]' <spec>` gives the first unimplemented step.
   - No markers at all (spec predates them) → normal run from Step 1; add `[ ]`/`[x]` markers to the step headings as you go
   - All `[ ]` → normal run from Step 1
   - Some `[x]` → this spec was interrupted. Tell the user which steps are already marked done and which one you are resuming from, and get confirmation before proceeding — the codebase may have moved since, and a marked step is only a claim that the code was written, not that it still holds.
   - **All `[x]` but `status: active`** → a previous run implemented everything and did not close. Two different states produce this and the spec cannot tell them apart: a clean orca run waiting on the user's merge (Phase 3 step 1), or a run that ended on an abnormal exit with findings still open. Implement nothing, but **run Phase 2** — the abnormal-exit case must re-surface its findings, and the merge-wait case gets a confirmation round.
     - Phase 2's inputs do not exist yet here: Phase 1 steps 5–6 never ran, and `git diff` is empty because the work is already committed. Build them instead from the spec — every file its `## Affected Files` and steps name is the change inventory — and produce the patch from the commit range that landed the work (`git log` the spec's creation date onward). If no range survives, tell the reviewer plainly that it is reviewing whole files with no patch, so it treats deletions as invisible rather than absent.
     - Close via Phase 3 step 1 only after Phase 2 exits clean AND the work is on `<base>`; if it is not on `<base>`, say so and stop, the branches are still unmerged.
   - A step marked `> BLOCKED: <reason>` needs the blocker resolved or the user's call before you touch it
3. **Implement step by step** -- follow the plan's implementation steps in order
   - After each step, run relevant checks (build, lint, type-check) to catch issues early
   - **Then flip that step's marker to `[x]` in the spec file immediately** — not batched at the end. This write is what survives an interrupted session; an in-context summary does not.
   - **Implement the tests the spec's `## Tests` section names**, alongside the step each one pins. They sit outside `## Implementation Steps` and carry no `[ ]` marker, so no grep and no resume point will catch them if you skip them — Phase 3 will not close the spec without them. (This writes test files, never the spec itself.)
   - If a step cannot be completed, leave it `[ ]` and add a `> BLOCKED: <reason>` line under its heading
   - Keep a running summary of what was done per step
4. **Run verification** -- execute the plan's verification steps (build, lint, test)
5. **Generate change summary** -- produce a concise summary of what was implemented:
   - Which plan steps were completed
   - Files changed with brief description of each change
   - Any deviations from the plan and why
   - **On a resumed run, cover every step in the spec**, not only the ones completed this run. Phase 2 reviews all of them, and the reviewer has no Bash — an earlier session's edits are invisible to it unless this list names the files.
6. **Collect dependency map** -- for each changed file, grep for files that import it. Include this "affected dependents" list in the change summary. This gives the reviewer visibility into code that might break due to your changes, without requiring a separate analysis phase.

### Phase 2: Plan-vs-Implementation Review Loop

The loop runs on the protocol in `~/.claude/docs/review-loop.md`; the steps below supply this skill's inputs and disposition rules.

The review always covers **every** step in the spec, including ones already marked `[x]` by an earlier session. A marker records that the code was written, never that it was verified — correctness comes from this loop alone. Reviewing only the steps completed in this run would let an earlier session's mistakes ride out on a checked box.

#### Step A: Fresh-Context Review

**A `reviewer` agent always runs — the implementer never reviews its own work.**

- **You implemented (Phase 1)** → you wrote the code, so you carry the blind spot this loop exists to defeat.
- **Codex implemented (Phase 1-C)** → you did not write the code, but you authored or approved the plan, split the work, and passed the gate. Spawn **one reviewer over the whole union diff**, never one per worker: cross-worker breakage (stale imports, mismatched signatures) exists only in the combined diff, and a worker-scoped reviewer would see just part of the change.

Reading the union diff yourself is still required in the Codex path — it is how you produce the change summary the reviewer needs (Phase 1-C step 7). That read informs what you hand the reviewer, never the verdict.

Spawn a **new** reviewer each iteration (fresh context is critical) — it runs in **Implementation verification** mode per `agents/reviewer.md`, which owns everything the reviewer knows. Restate none of it in the spawn prompt. Provide it with:

- The plan document (full path)
- The change summary and dependency map — Phase 1 steps 5–6, or Phase 1-C step 7 in the Codex path (updated summary from Step C on later iterations)
- **The change itself, as a file** — keyed on *mode*, not on who implemented:
  - **orca worktree**: `git diff <base>...HEAD > <scratch>/review-N.diff` on the integration branch.
  - **in-place, and the direct path**: `git add -A -N` first so created files appear at all — plain `git diff` silently omits them — then `git diff > <scratch>/review-N.diff`. If the work was committed as it went, diff from `<base>` instead.

  Pass that path. The reviewer has no Bash, so without the patch it can only read current file contents — which shows what the code says, never what changed or what was **deleted**.
- **Where the code is**: the absolute path of the checkout to read whole files in, plus the integration branch name **in orca worktree mode only** — no other mode creates one. Omit this and the reviewer reads the base tree and returns a clean verdict on a change it never saw.
- If iteration 2+: the previous disposition table (Step B output)

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

Fix all ACCEPTED findings. Then:

- **Re-run the plan's verification steps** (build, lint, test). A non-zero exit is itself an unresolved finding and blocks Step D. Phase 1's pre-fix results are never the ones you report as final.
- **Update the change summary and regenerate the dependency map** for every file the fixes touched. A fix can reach files absent from the original map, and the reviewer's side-effect checks key on it.

**Codex path**: do not fix the code yourself. Send each ACCEPTED finding back to the Codex session that produced that step — re-spawn `codex-worker` against the same worktree (orca) or the same checkout (in-place) with the session id and state the correction plainly. The worker passes it to Codex verbatim; it will not diagnose for you. Group findings by owning worker so each session gets one rework request rather than several. Then gate the returned reports again (Phase 1-C step 5) **and re-run steps 6 and 7**: rework commits land on worker branches, so without a re-merge the integration branch still holds the pre-fix union and the next reviewer would read it against a summary claiming the fixes are in.

Exception: if no session id survives for that step, or the fix is a one-line mechanical correction that costs less than a round-trip, fix it yourself and say so in the report. **In orca mode, commit such a fix on the integration branch before Step D** — the step 6 re-run and Phase 3 step 3's switch back to `<base>` both leave uncommitted work behind, and the user would then merge a branch missing a fix the review already cleared.

#### Step D: Next Iteration

Return to Step A and spawn the next reviewer there, with:
- The plan document
- The updated change summary and regenerated dependency map
- Where the code is (checkout path, plus the integration branch in the Codex path)
- The disposition table from Step B

The next reviewer:
- Verifies ACCEPTED fixes were correctly applied
- Evaluates REJECTED dispositions -- if the rejection rationale is weak or incorrect, re-raise the finding
- Checks if the fixes introduced new issues
- Confirms each plan step is now fully implemented

Iteration, stall, cap, and exit rules live in `~/.claude/docs/review-loop.md` — that file owns them for both skills. Read it when the loop starts.

#### Loop Exit

Per `~/.claude/docs/review-loop.md`. This skill's inputs for the confirmation round are Step A's, unchanged — it is the round that authorizes closing and archiving, so giving it less than Step A had would make the weakest review the decisive one.

On an abnormal exit (cap, stall, or a persistently blocked reviewer): stop reviewing, present the open findings for the user's judgment, **append each open CRITICAL/HIGH to the spec's `## Review Notes` marked `UNRESOLVED`** (same convention `impl-plan` uses — without it the spec is byte-identical to a clean run awaiting merge), and **still run Phase 3**. Phase 3 holds the handling for exactly this exit — the spec stays open, the checkout gets restored, and the worker artifacts get listed.

### Phase 3: Close Spec & Report

1. **Close the spec** — only when ALL THREE hold: every step is marked `[x]` (`grep -c '^### \[ \]' <spec>` → `0`), **the `## Tests` section is satisfied**, **and** Phase 2 exited clean rather than on any abnormal exit (`~/.claude/docs/review-loop.md`). A marker only claims the code was written; the clean exit is what says it was verified.
   - "Satisfied" means every named entry exists in the codebase — no marker tracks these, so check them by name. A section reading `none needed — <reason>` satisfies it as written.
   - A spec with **no `## Tests` section at all** and `risk-surface` not `none` (or absent) does not close: add the section first. Otherwise this condition is vacuous for exactly the specs that need it.
   - **orca worktree mode: defer closing entirely.** The code sits on an unmerged integration branch, so the archive commit would land either there (invisible on base, gone if the user discards) or on base (a spec marked done whose code is not on that branch). Report that the spec is ready to close, and close it after the user merges.
   - Set frontmatter `status: done` (add the lifecycle frontmatter block first if the spec predates it)
   - Move the file to `docs/impl-spec/archive/` (create the directory if missing; use `git mv` when the file is tracked)
   - This is part of the skill's normal completion, not a docs-update suggestion — do it without asking

   If any step is still `[ ]`, or Phase 2 ended on an abnormal exit — cap, stall, or a persistently blocked reviewer (`~/.claude/docs/review-loop.md`) — **do not close or archive**. Leave `status: active`, report which steps remain (and any `> BLOCKED:` reasons) or which findings are unresolved, and tell the user what a re-run does: resume from the first unchecked step, or — if every step is already `[x]` — re-enter Phase 2 without implementing (step 2's all-`[x]` branch). A passing review does not close a spec that was never fully implemented, and a capped-out loop is not a passing review.

2. **Report** — present the final result:
- Implementation summary (what was built, files changed)
- Review iterations summary (what was caught and fixed across rounds)
- Any remaining MEDIUM/LOW notes
- Verification results (build, lint, test status)
- **Codex path**: who implemented what — worker → steps owned → Codex session id — plus how many rework round-trips each took. Name the integration branch and the worker branches on it, and state plainly that nothing was merged into the base branch — that decision is the user's.

3. **List worker artifacts for cleanup** — Codex + orca worktree path only. Removal itself waits on the user's merge decision, which lands after this run ends, so this step produces a list and a command rather than a deletion. Worktrees and cards otherwise accumulate silently, and a card that no longer represents live or pending work is noise in the very dashboard that exists to show what *is* running.
   - **Do now, no decision needed**: return the repo-root checkout to `<base>` — Phase 1-C step 6 left it on the integration branch.
   - **List what is left standing**: each worker's worktree path, branch, and card, plus the integration branch.
   - **Hand the user the cleanup**: once they have merged or discarded, `orca worktree rm --worktree path:<worktree>` per worker (the cards go with them), then `git branch -D` on each worker branch and on `<task>-integration` — removing a worktree does not delete its branch. Never remove a worktree holding uncommitted changes, and never pass `--force` to get around that.
   - If the run exited incomplete, say that resuming requires the worker branches to be merged first — the spec's `[x]` markers describe code that is not on the base branch, so discarding would leave markers with nothing behind them.

$ARGUMENTS

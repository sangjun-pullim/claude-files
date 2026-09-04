---
name: impl-execute
description: Execute an implementation plan and validate the result through a fresh-context review loop until the implementation fully matches the plan. Use this skill when the user says "impl-execute", "/impl-execute", "implement this plan", or provides a plan document and asks to build it. Also trigger when the user wants to implement changes from a spec in docs/impl-spec/.
---

# Implementation Execution with Code-Verified Review Loop

Implement a spec from `docs/impl-spec/`, then have a fresh-context `reviewer` verify the code
against the spec. The implementer never reviews its own work — whoever wrote the code (you or
Codex) carries the blind spot this loop exists to defeat.

## Do NOT use when

- No spec exists — write one with `impl-plan` first
- One-line fixes or typos — the review loop costs more than the change
- The spec is in `archive/` or has `status: done` / `superseded-by` — frozen history

## Inputs

- Spec path (`docs/impl-spec/<NNN>-*.md`). If none given, list top-level specs with
  `status: active` and ask which one.
- If `## Review Notes` has `UNRESOLVED` rows, stop: the plan review never came back clean.
  Clear them first (re-run `/impl-plan`, or dispose them by hand with evidence).
- Record the base branch as `<base>` (`git rev-parse --abbrev-ref HEAD`).

**Who implements**: you, unless the user asked for Codex ("codex로 구현", "GPT로 진행") — then
follow the Codex path below instead of Phase 1. Never switch to Codex on your own.

**If you are Codex** reading this: implement the steps you were given, never write the spec file,
report facts, and stop — the Claude orchestrator owns markers, review, and closing.

## Phase 1: Implementation

1. **Resume point** — `grep -n '^### \[ \]' <spec>` gives the first unimplemented step.
   - Some steps already `[x]` → the spec was interrupted. Tell the user which steps are marked
     done and where you resume, and confirm before proceeding — a marker claims the code was
     written, not that it still holds.
   - All `[x]` but `status: active` → implement nothing; run Phase 2 on the committed work
     (build the change inventory from the spec's `## Affected Files` and the commits since its
     `date`), then close via Phase 3.
   - A step marked `> BLOCKED: <reason>` needs the blocker resolved or the user's call.
2. **Implement step by step.** After each step: run build/lint/type-check, then flip that
   step's marker to `[x]` in the spec immediately — this write is what survives an interrupted
   session. Implement each `## Tests` entry alongside the step it pins; they carry no marker, so
   nothing else will catch a skipped one. A step you cannot complete stays `[ ]` with a
   `> BLOCKED: <reason>` line under its heading.
3. **Verify** — run the spec's `## Verification` commands.
4. **Change summary** — steps completed, files changed with one line each, deviations from the
   plan and why, and a **dependency map**: for each changed file, the files that import it. On a
   resumed run cover every step in the spec, not only this session's.

## Phase 2: Review Loop

1. Write the change as a patch: `git add -A -N && git diff > <scratch>/review-N.diff` (from
   `<base>` if the work was committed as it went). The reviewer has no Bash — without the patch
   it sees current file contents but never what changed or was deleted.
2. Spawn a **new** `reviewer` agent each round with: the spec path, the change summary and
   dependency map, the patch path, the absolute checkout path, and (round 2+) the previous
   disposition table. It runs in Implementation verification mode (`agents/reviewer.md`).
3. **Disposition** — `ACCEPTED` (fix the code) or `REJECTED` with concrete evidence:

   | Finding | Severity | Disposition | Rationale |
   |---------|----------|-------------|-----------|

4. Fix ACCEPTED findings, re-run verification (a non-zero exit is itself an open finding), and
   update the change summary and dependency map for every file the fixes touched.
5. **Exit** when a round reports no CRITICAL/HIGH findings. **Cap: 3 rounds.** At the cap with
   CRITICAL/HIGH still open, or the same finding coming back after a fix: stop, append each open
   CRITICAL/HIGH to the spec's `## Review Notes` marked `UNRESOLVED`, present them to the user,
   and go to Phase 3 without closing.

## Phase 3: Close & Report

1. **Close the spec** only when all three hold: every step is `[x]`, every `## Tests` entry
   exists in the codebase (a section reading `none needed — <reason>` counts as written), and
   Phase 2 exited clean. Then set `status: done` and `git mv` the file to
   `docs/impl-spec/archive/` — this is part of the skill, not a docs suggestion. Otherwise leave
   `status: active` and report which steps, tests, or findings remain.
2. **Report**: what was built, files changed, what the review rounds caught, remaining
   MEDIUM/LOW notes, verification results.

## Codex path

Load the `codex-delegation` skill first — it owns the codex dispatch contract; the mode question itself is the CLAUDE.md 워크트리 분리 rule. Steps 4 and 6 hold whatever the worker was; skip this load when the worker is not codex.

1. **Split** the unchecked steps into workers with disjoint file sets. A step that changes an
   exported signature, schema, barrel, or shared type runs alone; a signature change and its
   callers stay in one worker; no clean split → sequential. Each `## Tests` entry goes to the
   worker owning the step it pins.
2. **Dispatch** one `codex-worker` per group with the spec's absolute path, the step numbers it
   owns, the `## Tests` entries for those steps quoted verbatim, and `<base>`. Workers never write
   the spec; you flip markers after gating. In-place mode: one worker at a time.
3. **Gate each report mechanically** (no diff review here): `codex 호출 0회` or no session id →
   failed, re-dispatch; any `검증 → exit` non-zero → send the failing output back as a rework
   request to the same session; `스펙 외 변경 파일` non-empty → inspect those paths; orca mode →
   `git -C <worktree> log <base>..HEAD` must be non-empty (commit a dirty worktree there
   yourself — that is assembly, not implementation). The same group failing the same check twice
   ends the run: report the raw worker report and log path and let the user decide.
   All clear → mark that group's steps `[x]` in the base checkout.
4. **Assemble the union** — Phase 2 reviews one combined change.
   - In-place: the checkout already holds it; `git add -A -N && git diff` is the union.
   - Orca worktree: `git switch -c <task>-integration <base>`, **commit the spec marker flips
     there**, merge each worker branch. A merge conflict is a cross-worker collision — resolve
     only if mechanical, otherwise send it back to the owning sessions. Run build/lint/test on
     the integration branch before any review: stale imports and mismatched signatures fail only
     here. The patch for Phase 2 is `git diff <base>...HEAD`; pass the integration branch name.
   - Write the change summary and dependency map for the union yourself, attributing each step
     to its worker.
5. **Phase 2 fixes** go back to the owning Codex session as rework (re-spawn the worker against
   the same worktree/checkout with the session id and the correction verbatim), then re-gate and
   re-assemble. A one-line mechanical fix may be done by you — say so, and in orca mode commit it
   on the integration branch.
6. **Phase 3 in orca worktree mode**, whatever the worker was: do not close the spec — the code sits on an unmerged integration
   branch. Return the repo-root checkout to `<base>`, then report: worker → steps → Codex
   worker id (codex: session id), the integration and worker branches, that nothing was merged into `<base>`, and
   the cleanup the user runs after merging: `orca worktree rm --worktree path:<worktree>` per
   worker, then `git branch -D` on each worker branch and `<task>-integration`. Never remove a
   worktree holding uncommitted changes. Close the spec after the user merges.

$ARGUMENTS

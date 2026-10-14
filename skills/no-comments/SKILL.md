---
name: no-comments
description: "Spawn Comment Sicko, fix accepted findings, and offer encodings for claimed constraints."
disable-model-invocation: true
---

# No comments

Spawn Comment Sicko. Act on accepted findings.

Defer to Comment Sicko's fresh perspective.

## Scope

Use the caller's files or diff. Otherwise use the current diff against the base branch, default `main`, including the working tree.

## Steps

1. Record the baseline: the commit `git stash create` prints, or `HEAD` when it exits 0 and prints nothing. If it fails, stop and report the error. The snapshot skips untracked files, so copy untracked files in scope to the scratchpad. Spawn `Agent` with `subagent_type: general-purpose`. Its prompt is [`references/comment-sicko.md`](references/comment-sicko.md) verbatim, then the scope. Do not restate its rules.
2. Inspect its report and its diff against the baseline: `git diff <baseline>`, plus the scratchpad copies for untracked files. Formatting-only changes from the `~/.claude/hooks/auto-format.sh` hook belong to the comment edit, not to application code. Reject application-code edits, scope escapes, exception-protected deletions, misstated `MUST KILL` reasons, and flags that treat kept intentional code as guilty. Reshape flags on our-code surprises stay actionable. Do not restore those comments. A keep survives only with proof it is about something we cannot change. Audit missed scoped lint and TypeScript suppressions. Correctness or safety suppressions stay actionable `MUST KILL`s. Restore deletions only with exact exceptions and scoped proof. Before accepting thin `IMPORTANT` or `do not remove` kills or keeps, trace their symbol the way [`references/comment-sicko.md`](references/comment-sicko.md) does. If a kill is ambiguous, do not restore. If a keep is refuted or still ambiguous, delete it. Revert one rejected report by restoring every tracked file `git diff --name-only <baseline>` lists (`git restore --source=<baseline> --worktree -- <file>`) and every untracked file from its scratchpad copy, then rerun with the failure named. Reject a second, report it open, and fail `/no-comments`.
3. If any fix needs a shape, sketch the interfaces and seams, types included, once for the accepted set and surrounding code, using the **codebase-design** skill. Stop at the sketch. Count the production files the fixes in this step and step 4 will change. At 5+, show the planned fixes, with the sketch when there is one, and wait for approval. The comment deletions from steps 1–2 do not count toward that 5+ file rule. Then fix trivial accepted flags directly by deleting a dead path, dropping a parameter, or using the real API. Step 4 implements.
4. Implement the smallest root-cause fix in scope. Remove every named workaround. If the root cause is out of scope, land the smallest in-scope fix and report the rest open. Keep the fix inside the fence, leaving instances outside it as open work. Never bolt on symptom guards.
5. Constraint comments say `do not remove`, `do not change wording`, or `talk to X before changing`. Leave keeps about things we cannot change. Offer the cheapest in-scope type, runtime, test, or CI lint. Wait for interactive approval. Unattended and eval require caller pre-approval. If approved, encode then delete. Otherwise delete, report the constraint open, and sketch out-of-scope work.
6. Report the deletion count, restored comments, reruns, shape sketch, fixes, encoding offers, encodings, unenforced constraints, and other open work.

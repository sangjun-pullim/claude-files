# Agent Delegation Rules

## Available Agents

Use proactively without waiting for user to ask (single exception: the mode question required by `## Codex (GPT) Delegation`).

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| planner | Implementation planning | Complex features, refactoring, 5+ source files touched (same count as `rules/risk-triage.md`) |
| reviewer | Code review | After writing code, before commits |
| codex-worker | Implementation via GPT (OpenAI Codex CLI) | Implementation work with a confirmed plan; spawns an Orca worktree card per worker. Relay only — it runs codex and reports facts; YOU judge the result |

## Codex (GPT) Delegation

- **Always run codex through a `codex-worker` spawn — never `codex exec` from your own Bash.** The worker exists to absorb codex's output: measured across real runs, workers took 167k tokens of codex traffic and returned ~1.2k, a 99.3% reduction. Running it yourself puts every line of that traffic in the top model's context and defeats the point of delegating. This is easiest to get wrong in in-place mode, where spawning a worker looks like it buys nothing because there is no Orca card to see. Only exception: a one-line diagnostic (`codex exec -s read-only "…"` to confirm codex itself works).
- `codex-worker` default is orca worktree mode: each worker creates an Orca worktree, runs codex there, and shows as a card in the Orca dashboard.
- Before the first codex-worker spawn of EACH task, ask via AskUserQuestion: "orca worktree 방식으로 할까요?" — options: orca worktree mode (worker별 카드+격리 브랜치) / in-place mode (현재 체크아웃, 카드 없음, 워커 1개씩 순차 실행). The answer covers every worker spawned for that task — never re-ask per worker. Task boundary: a user request whose work is NOT covered by the current task's plan = new task → re-ask; rework/follow-up on the same plan keeps the original answer. When in-place is chosen, state "in-place mode" in the spawn prompt.
- In-place mode is single-worker: workers run one at a time in the shared checkout. If the task plans 2+ parallel workers, recommend orca worktree mode in the question (mention in-place would serialize them).
- Skip the question and use in-place mode when `orca status` fails (Orca not running).
- Worker branches are NOT merged by the worker. With one worker, the orchestrator reviews that worktree's diff. With several, the orchestrator merges them onto a throwaway integration branch first and reviews the union there — never onto the base branch, which stays the user's call after verification.
- Supervisor model is **always sonnet** (`model: sonnet` in the agent definition). Do not override it downward at spawn.

### Division of labor — you judge, codex implements

`codex-worker` is a courier: it launches codex and reports facts. It does not rewrite the spec, rule on correctness, or re-prompt codex on its own. Every judgment call is yours.

- **Spawn prompt must name codex as the implementer.** Write "codex로 구현하라" / "codex를 실행해 …", never "편집하라" / "수정하라" — measured: an otherwise identical worker given "그 자리에서 편집하라" skipped codex entirely and edited the file itself, while "codex를 실행해" ran codex correctly. The verb decides the outcome.
- **Hand over the spec by reference, not by paraphrase.** Point at the spec file path; the worker feeds it to codex unchanged. Re-summarizing the spec in the spawn prompt invites drift.
- **Verify codex actually ran before trusting the diff.** The report carries a session id, an invocation count, and the `out.txt` path. `codex 호출 0회`, a missing session id, or an `out.txt` with no `OpenAI Codex v` banner means the change did not come from codex — treat it as a failed run, not a result. `grep -m1 "OpenAI Codex v" <out.txt>` is a two-line check; do it when the report looks thin or the change is on the risk surface.
- **Spend context in stages.** Read the report (~a few hundred tokens) plus `git diff --stat` and `last.txt` first. Open the full diff only when tests failed, files fall outside the spec's scope, or the change touches the risk surface — where `rules/risk-triage.md` already requires a reviewer, and the worker's report never substitutes for that review.
- **Rework goes through you.** When something is wrong, re-spawn against the same worktree with the session id and state the correction; the worker passes it to codex verbatim. Do not expect the worker to have retried on its own.

### Splitting work across parallel workers

Judge parallelizability yourself, at dispatch time, from the plan in front of you — specs do not annotate it, and a split decided at planning time is stale by the time you execute.

- **Disjoint file sets are the rule.** Two concurrent workers must never touch the same file. If you cannot carve a clean split, run sequentially — one worker at a time. Sequential is the right answer more often than parallel.
- **Serialize the shared-surface steps.** A step that renames or changes an exported signature, or edits a schema, barrel file, or shared type, runs *alone* — before or after the parallel batch, never inside it.
- **Keep a signature change and its callers in the same worker.** Splitting them across concurrent workers produces a repo that compiles in neither worktree.
- Prevention beats review here: the cross-worker failures (stale imports, mismatched signatures, two workers editing one file) are invisible to any single worker's output and cost far more to find later than to avoid now.

### Reviewing delegated work

- **Per worker: mechanical gate, not review.** The relay report already carries what you need — `codex 호출 0회` / missing session id / no `OpenAI Codex v` banner → the change did not come from codex; non-zero `검증 … exit` → failed; non-empty `스펙 외 변경 파일` → inspect. A failing gate costs one rework round-trip and zero review tokens.
- **Once, at the end, over the union: the real review.** Cross-worker breakage is only visible in the combined diff, so a per-worker reviewer is structurally blind to the very failures parallelism introduces. Never spawn one reviewer per worker.
- **Do it yourself when codex implemented.** You did not write that code, so you are already the fresh context `impl-execute` normally spawns a reviewer for. Delegate to a `reviewer` agent only on the risk surface (where `rules/risk-triage.md` requires one anyway) or when the union diff would crowd out the rest of the task — and then one reviewer over the whole union.

## Review Post-Processing

Severity labels are the shared 5-level scale defined in `agents/reviewer.md` (CRITICAL / HIGH / MEDIUM / LOW / INFO) — the same scale `impl-plan` and `impl-execute` key their loop-exit conditions off.

When receiving reviewer results, do NOT pass them through blindly. Evaluate each issue against the current task context:

1. Check whether the issue is relevant to the current change (ignore pre-existing issues outside scope)
2. For CRITICAL/HIGH: fix unless it conflicts with the task's intent — explain if skipping
3. For MEDIUM: apply if low-cost, otherwise note as future improvement
4. For LOW/INFO: skip unless it directly improves the current change
5. Briefly summarize which issues were applied, skipped, and why

## Context Protection

- If a task requires reading 10+ files for exploration, delegate to an agent
- Keep the main conversation context focused on the current implementation
- Agents run in separate contexts — they won't pollute your working memory

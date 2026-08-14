# Agent Delegation Rules

## Available Agents

Use proactively without waiting for user to ask (single exception: the mode question required by `## Codex (GPT) Delegation`).

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| planner | Scope analysis — maps affected files, reverse dependencies, blast radius; does not write the plan | Before planning a complex feature or refactor, or when blast radius reaches `rules/risk-triage.md` signal 3 |
| reviewer | Review — modes in `agents/reviewer.md` | After writing code, or editing anything `rules/risk-triage.md` classes as control-plane; before commits |
| codex-worker | Implementation via GPT (OpenAI Codex CLI) | Implementation work with a confirmed plan; spawns an Orca worktree card per worker. Relay only — it runs codex and reports facts; YOU judge the result |

## Codex (GPT) Delegation

- **Always run codex through a `codex-worker` spawn — never `codex exec` from your own Bash.** The worker absorbs codex's output (measured: 167k tokens of codex traffic in, ~1.2k reported back); running it yourself puts all that traffic in the top model's context. In-place mode — no Orca card to show for the spawn — is exactly where skipping the worker is most tempting. Only exception: a one-line diagnostic (`codex exec -s read-only "…"` to confirm codex itself works).
- `codex-worker` default is orca worktree mode: each worker creates an Orca worktree, runs codex there, and shows as a card in the Orca dashboard.
- Before the first codex-worker spawn of EACH task, ask via AskUserQuestion: "orca worktree 방식으로 할까요?" — options: orca worktree mode (worker별 카드+격리 브랜치) / in-place mode (현재 체크아웃, 카드 없음, 워커 1개씩 순차 실행). The answer covers every worker spawned for that task — never re-ask per worker. Task boundary: a user request whose work is NOT covered by the current task's plan = new task → re-ask; rework/follow-up on the same plan keeps the original answer. When in-place is chosen, state "in-place mode" in the spawn prompt.
- In-place mode is single-worker: workers run one at a time in the shared checkout. If the task plans 2+ parallel workers, recommend orca worktree mode in the question (mention in-place would serialize them).
- Skip the question and use in-place mode when `orca status` fails (Orca not running).
- Worker branches are NOT merged by the worker, and never onto the base branch — that stays the user's call. Union assembly: `impl-execute` Phase 1-C step 6.
- Worktrees and their cards are cleaned up only after that call. A card that no longer represents live or pending work is noise in the dashboard that exists to show what *is* running. Procedure: `impl-execute` Phase 3 step 3.
- Supervisor model is **always sonnet** (`model: sonnet` in the agent definition). Do not override it downward at spawn.

### Delegation practice — you judge, codex implements

`codex-worker` is a courier: it launches codex and reports facts — it never rewrites the spec, rules on correctness, or re-prompts codex on its own. Every judgment call is yours. The full dispatch procedure (split, gate, union assembly, review loop, rework) lives in `impl-execute` Phase 1-C / Phase 2; the contract below holds for ANY codex dispatch, ad-hoc included:

- **Name codex as the implementer in the spawn prompt** — "codex로 구현하라" / "codex를 실행해 …", never "편집하라" / "수정하라" (measured: the latter made a worker skip codex and edit files itself; the verb decides the outcome).
- **Hand over the spec by file path, not paraphrase** — the worker feeds it to codex unchanged; re-summarizing invites drift.
- **Gate each report mechanically before trusting the diff** — the checks, and the bound on re-dispatch, are `impl-execute` Phase 1-C step 5. At that gate open the full diff only on failure or out-of-scope files; the *union* diff is read unconditionally later, at assembly, and a reviewer agent judges it regardless (see the **Review once over the union** bullet).
- **Rework goes through you**: re-spawn against the same worktree with the session id and the correction stated verbatim. The worker never retries on its own.
- **Parallel split**: judge parallelizability at dispatch time, never at planning time. Disjoint file sets per worker; a step touching an exported signature, schema, barrel file, or shared type runs alone — never inside the parallel batch; a signature change and its callers stay in one worker; no clean split → sequential (the right answer more often than parallel).
- **Review once over the union, never per worker** — cross-worker breakage (stale imports, mismatched signatures) only shows in the combined diff. Codex implementing does not make you the reviewer: a `reviewer` agent reviews the union, always. Read the union diff yourself to write the change summary you hand it; the verdict is the reviewer's.

## Background Agent Turn Discipline

Spawned agents run in the background; yielding the turn while they run is normal — going silent is not:

- **Yield with a status line.** A turn that spawns or waits on background agents must end with text naming each running agent (role + what it owns) and what happens when it returns. Ending a spawn turn with no text is a failure.
- **Report on arrival.** The turn a completion notification triggers must end with that agent's outcome visible to the user: per-worker gate verdict, review findings + dispositions, or verification results. Review results lead with the findings table, then your disposition of them. The user cannot see agent output — only your text. Consuming a result and going idle without reporting it is a spec violation.
- **Describe agents by role, not ad-hoc label.** Labels like `union-review` are transient; say what the agent did ("union diff review over 3 worker branches"), label in parentheses at most.

## Review Post-Processing

Severity labels are the shared 5-level scale defined in `agents/reviewer.md` (CRITICAL / HIGH / MEDIUM / LOW / INFO).

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

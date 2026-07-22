# Agent Delegation Rules

## Available Agents

Use proactively without waiting for user to ask (single exception: the mode question required by `## Codex (GPT) Delegation`).

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| planner | Implementation planning | Complex features, refactoring, 5+ source files touched (same count as `rules/risk-triage.md`) |
| reviewer | Code review | After writing code, before commits |
| codex-worker | Implementation via GPT (OpenAI Codex CLI) | Implementation work with a confirmed plan; spawns an Orca worktree card per worker |

## Codex (GPT) Delegation

- `codex-worker` default is orca worktree mode: each worker creates an Orca worktree, runs codex there, and shows as a card in the Orca dashboard.
- Before the first codex-worker spawn of EACH task, ask via AskUserQuestion: "orca worktree 방식으로 할까요?" — options: orca worktree mode (worker별 카드+격리 브랜치) / in-place mode (현재 체크아웃, 카드 없음, 워커 1개씩 순차 실행). The answer covers every worker spawned for that task — never re-ask per worker. Task boundary: a user request whose work is NOT covered by the current task's plan = new task → re-ask; rework/follow-up on the same plan keeps the original answer. When in-place is chosen, state "in-place mode" in the spawn prompt.
- In-place mode is single-worker: workers run one at a time in the shared checkout. If the task plans 2+ parallel workers, recommend orca worktree mode in the question (mention in-place would serialize them).
- Skip the question and use in-place mode when `orca status` fails (Orca not running).
- Worker branches are NOT merged by the worker — the orchestrator reviews each worktree's diff, then merges (or asks the user) after verification.
- Supervisor model: haiku default; pass model: sonnet at spawn for tasks involving design judgment or hard failure diagnosis.

## Review Post-Processing

When receiving reviewer results, do NOT pass them through blindly. Evaluate each issue against the current task context:

1. Check whether the issue is relevant to the current change (ignore pre-existing issues outside scope)
2. For CRITICAL: fix unless it conflicts with the task's intent — explain if skipping
3. For WARNING: apply if low-cost, otherwise note as future improvement
4. For INFO: skip unless it directly improves the current change
5. Briefly summarize which issues were applied, skipped, and why

## Context Protection

- If a task requires reading 10+ files for exploration, delegate to an agent
- Keep the main conversation context focused on the current implementation
- Agents run in separate contexts — they won't pollute your working memory

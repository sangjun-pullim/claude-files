# Agent Delegation Rules

## Available Agents

Use `planner` and `reviewer` proactively without waiting for the user to ask. **Codex delegation is the exception: never on your own initiative** — it runs only when the user asks for it, and then the mode question in the `codex-delegation` skill comes first.

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| planner | Scope analysis — maps affected files, reverse dependencies, blast radius; does not write the plan | Before planning a complex feature or refactor, or when blast radius reaches `rules/risk-triage.md` signal 3 |
| reviewer | Review — modes in `agents/reviewer.md` | After writing code, or editing anything `rules/risk-triage.md` classes as control-plane; before commits |
| codex-worker | Implementation via GPT (OpenAI Codex CLI) | Implementation work with a confirmed plan; spawns an Orca worktree card per worker. Relay only — it runs codex and reports facts; YOU judge the result |

## Codex (GPT) Delegation

Only when the user asks for it. The full contract — worker-vs-direct, the mode question,
dispatch, gating, and union review — is the `codex-delegation` skill. Load it before the first
spawn of a task.

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

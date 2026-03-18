# Agent Delegation Rules

## Available Agents

Use proactively without waiting for user to ask.

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| planner | Implementation planning | Complex features, refactoring, 5+ files affected |
| reviewer | Code review | After writing code, before commits |

## Parallel Execution

ALWAYS launch independent agent tasks in parallel:

```
# GOOD: Parallel
Launch planner for module A + reviewer for module B simultaneously

# BAD: Sequential when not needed
First plan, wait, then review unrelated code
```

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

# CLAUDE.md Audit Protocol

When asked to review or improve any `CLAUDE.md` file (global, project, or subdirectory), follow this 4-step protocol to avoid removing measurable rules by mistake.

## When to Apply

- User asks to "improve / audit / clean up / refactor CLAUDE.md"
- User asks to apply a CLAUDE.md best-practice article to their files
- Self-triggered when proposing changes to `~/.claude/CLAUDE.md` or project CLAUDE.md

Skip for: simple appends (adding one new rule), typo fixes, rename refactors.

## Step 1 — Tag every existing line

Before proposing any change, read the file and tag each rule line:

| Tag | Definition | Action |
|---|---|---|
| `[verified]` | Sourced from established principles (Karpathy skill, Linus quotes, OWASP, etc.) | Keep. Rewrite into measurable form if abstract. |
| `[measurable]` | Has a number, threshold, forbidden word, or binary condition (e.g. "over 50 lines", "no console.log", "mock external deps") | Keep verbatim. NEVER remove without explicit user approval. |
| `[abstract]` | No measurable trigger; reader-dependent interpretation (e.g. "write clean code", "be careful") | Candidate for transformation or removal — see Step 2. |

If a line mixes both, split it.

## Step 2 — Decide per item

For each `[abstract]` line, in order:

1. **Transform** — can it become measurable? (add a number, a forbidden pattern, a binary check)
   - "write tests well" → "mock all external dependencies in tests"
   - "keep functions small" → "split functions over 50 lines"
2. **Substitute** — if not transformable, is there a `[verified]` principle that covers the intent?
3. **Remove** — only if both above fail.

For `[measurable]` lines, never remove based on your own judgment. If you believe one is obsolete, surface it as a question.

## Step 3 — Show diff before applying (global only)

For `~/.claude/CLAUDE.md`:
- Show the proposed change as a unified diff or before/after block.
- Get explicit user approval before writing.

For project `CLAUDE.md` and `rules/*.md`: direct edit is OK, but include the mapping table in Step 4.

## Step 4 — Mapping table after change

After writing, output a table that maps every original rule line to its new location (or `removed` with reason). Example:

```
| # | Original (first 60 chars)                              | Tag         | Destination          |
|---|--------------------------------------------------------|-------------|----------------------|
| 1 | Design data structures and their relationships first   | [verified]  | Discipline #2        |
| 2 | Write code that humans can read. Prefer clarity over.. | [abstract]  | removed (untransform)|
| 3 | If a piece of logic needs a comment to be understood.. | [measurable]| Discipline #6        |
```

If any `[measurable]` row ends with `removed`, **stop and re-confirm with the user**.

## Anti-patterns (lessons from past mistakes)

- ❌ Removing an entire section because "it feels abstract" without per-line tagging.
- ❌ Auto-adding rules from external articles without user approval, even if they match the article's principles.
- ❌ Treating "make file shorter" as the goal. The goal is a tighter guardrail, not fewer bytes.
- ❌ Trusting your own intuition over the mapping table. If the table shows a `[measurable]` line vanished, the change is wrong — even if the result looks clean.

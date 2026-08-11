---
description: Analyze changes and create a Conventional Commits format commit
---

1. Run the reviewer first per `rules/risk-triage.md` — skip it only for tier-0 changes with no executable code touched (prose/docs)
2. Check `git diff --staged` (if empty, check `git diff`)
3. Analyze the changes
4. Generate a Conventional Commits message
   - If multiple logical changes are mixed, suggest splitting into separate commits
5. Show me the message and commit only after my approval

Additional context: $ARGUMENTS

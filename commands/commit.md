---
description: Analyze changes and create a Conventional Commits format commit
---

1. If reviewer has not been run in this session, run it before proceeding
2. Check `git diff --staged` (if empty, check `git diff`)
3. Analyze the changes
4. Generate a Conventional Commits message
   - If multiple logical changes are mixed, suggest splitting into separate commits
4. Show me the message and commit only after my approval

Additional context: $ARGUMENTS

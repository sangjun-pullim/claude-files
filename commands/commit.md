---
description: Analyze changes and create a Conventional Commits format commit
---

1. Check `git diff --staged` (if empty, check `git diff`)
2. Run a `reviewer` agent on the diff — write it to a file and pass the path, plus the changed-file list. Skip only for prose/doc changes that touch no control-plane file (`CLAUDE.md` Hard Rules)
3. Analyze the changes
4. Generate a Conventional Commits message
   - If multiple logical changes are mixed, suggest splitting into separate commits
5. Show me the message and commit only after my approval

Additional context: $ARGUMENTS

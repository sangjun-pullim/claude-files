---
description: Analyze changes and create a Conventional Commits format commit
---

1. Check `git diff --staged` (if empty, check `git diff`) — the changed-file list has to exist before anything else can use it
2. Run the reviewer per `rules/risk-triage.md`, handing it **the diff itself** — write it to a file and pass the path — plus the changed-file list and whether the scope is staged or unstaged. Skip it only where the tier table in `rules/risk-triage.md` says to skip
3. Analyze the changes
4. Generate a Conventional Commits message
   - If multiple logical changes are mixed, suggest splitting into separate commits
5. Show me the message and commit only after my approval

Additional context: $ARGUMENTS

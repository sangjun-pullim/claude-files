---
name: resolving-merge-conflicts
description: "Use when you need to resolve an in-progress git merge/rebase conflict."
---

1. **See the current state** of the merge/rebase. Check git history, and the conflicting files.

2. **Find the primary sources** for each conflict. Understand deeply why each change was made, and what the original intent was. Read the commit messages, check the PRs, check original issues/tickets.

3. **Resolve each hunk.** Preserve both intents where possible. Where incompatible, pick the one matching the merge's stated goal and note the trade-off. Do **not** invent new behaviour. Always resolve; never `--abort`. If both intents are load-bearing and no stated goal arbitrates between them, leave that conflict in place, put the choice to the user, and stop here — do not run the later steps until they answer.

4. Discover the project's **automated checks** and run them — typically typecheck, then tests, then format. Fix anything the merge broke.

5. **Finish the merge/rebase.** Only when every hunk is resolved — a conflict left for the user means the merge stays in progress and nothing is committed. Stage everything and commit. If rebasing, continue the rebase process until all commits are rebased.

#!/bin/bash
# Hook: PreToolUse — Block spawning a subagent on a Fable model.
# Opus 5.5 matches or beats Fable 5.1 on coding at lower cost, so subagents run on
# their definition's model, or the one CLAUDE.md names (sonnet for Explore). A
# long-running session can still carry older skill text (re-injected after
# compaction) that says to spawn with `model: fable`.
# Fails open on unparsable input: blocking every Agent spawn costs more than one
# Fable spawn.
# Exit 0 = allow, Exit 2 = block

INPUT=$(cat)
MODEL=$(echo "$INPUT" | jq -r '.tool_input.model // empty' | tr 'A-Z' 'a-z')

case "$MODEL" in
  *fable*)
    echo "BLOCKED: Fable subagents are disabled by the user's hook. Spawn again without the model argument (or with sonnet for Explore). If the user explicitly asked for Fable, tell them this hook blocks it instead of substituting another model." >&2
    exit 2
    ;;
esac

exit 0

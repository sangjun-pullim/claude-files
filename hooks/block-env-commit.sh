#!/bin/bash
# Hook: PreToolUse — Block staging .env files via git add
# Exit 0 = allow, Exit 2 = block with message

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Only check Bash tool calls
[ "$TOOL_NAME" != "Bash" ] && exit 0

# Only check git add commands
echo "$COMMAND" | grep -qE '^\s*git\s+add\b' || exit 0

# Block if .env or .env.* files are being staged.
# Strip only complete template tokens at a boundary (space/glob/end) so real files
# like .env.example.local (template name as a prefix) are still blocked.
STRIPPED=$(echo "$COMMAND " | sed -E 's/\.env\.(example|sample|template)([[:space:]]|\*)/\2/g')
if echo "$STRIPPED" | grep -qE '\.env(\s|$|\.|\*)'; then
  echo "BLOCKED: Staging .env files is not allowed. Use .gitignore instead."
  exit 2
fi

exit 0

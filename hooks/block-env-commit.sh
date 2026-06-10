#!/bin/bash
# Hook: PreToolUse — Block staging or committing .env files
# Exit 0 = allow, Exit 2 = block with message

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Only check Bash tool calls
[ "$TOOL_NAME" != "Bash" ] && exit 0

# Case 1: git add at line start or after a command separator (&&, ;, |).
# Separator-only boundary: a quoted mention like `echo "git add .env"` must not block.
if echo "$COMMAND" | grep -qE '(^|[;&|])[[:space:]]*git[[:space:]]+add\b'; then
  # Block if .env or .env.* files are being staged.
  # Strip only complete template tokens at a boundary (space/glob/end) so real files
  # like .env.example.local (template name as a prefix) are still blocked.
  STRIPPED=$(echo "$COMMAND " | sed -E "s/\.env\.(example|sample|template)([[:space:]]|\*|'|\")/\2/g")
  if echo "$STRIPPED" | grep -qE "\.env([[:space:]]|\$|\.|\*|'|\")"; then
    echo "BLOCKED: Staging .env files is not allowed. Use .gitignore instead."
    exit 2
  fi
fi

# Case 2: git commit -a/-am/--all commits tracked .env files without git add
if echo "$COMMAND" | grep -qE '(^|[;&|])[[:space:]]*git[[:space:]]+commit\b' \
   && echo "$COMMAND" | grep -qE '[[:space:]](-[a-zA-Z]*a[a-zA-Z]*|--all)\b'; then
  TRACKED=$(git ls-files 2>/dev/null | grep -E '(^|/)\.env(\.|$)' | grep -vE '\.env\.(example|sample|template)$')
  if [ -n "$TRACKED" ]; then
    echo "BLOCKED: git commit -a would commit tracked .env file(s): $TRACKED. Untrack first (git rm --cached)."
    exit 2
  fi
fi

exit 0

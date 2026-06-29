#!/bin/bash
# Hook: PreToolUse — Block reading secret .env files, allow templates
# Exit 0 = allow, Exit 2 = block

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

[ "$TOOL_NAME" != "Read" ] && exit 0
[ -z "$FILE_PATH" ] && exit 0

BASENAME=$(basename "$FILE_PATH")
# Normalize for matching: lowercase (macOS FS is case-insensitive) + strip trailing ~ (editor backup)
MATCH=$(printf '%s' "$BASENAME" | tr 'A-Z' 'a-z')
MATCH=${MATCH%\~}

# Allow templates (committed, no secrets)
case "$MATCH" in
  .env.example|.env.sample|.env.template) exit 0 ;;
esac

# Block .env and any other .env.* (real or potential secrets)
case "$MATCH" in
  .env|.env.*)
    echo "BLOCKED: '$BASENAME' may contain secrets. Templates (.env.example/.sample/.template) are readable." >&2
    exit 2
    ;;
esac

exit 0

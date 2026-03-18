#!/bin/bash
# Hook: PostToolUse — Auto-format files after Write/Edit with prettier
# Runs npx prettier on supported file types, skips silently if prettier is unavailable

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Only run after Write or Edit
[ "$TOOL_NAME" != "Write" ] && [ "$TOOL_NAME" != "Edit" ] && exit 0

# Skip if no file path
[ -z "$FILE_PATH" ] && exit 0

# Only format supported file types
echo "$FILE_PATH" | grep -qE '\.(ts|tsx|js|jsx|json|css|scss)$' || exit 0

# Run prettier, skip silently if not available
npx prettier --write "$FILE_PATH" > /dev/null 2>&1 || true

exit 0

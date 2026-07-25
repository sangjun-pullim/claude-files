#!/bin/bash
# Hook: PostToolUse — Auto-format files after Write/Edit with prettier
# Runs ONLY when the edited file resolves to a real prettier config. Without that
# guard, prettier applies its defaults to projects that never opted in and
# rewrites the whole file, burying a small edit in hundreds of lines of churn.

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Only run after Write or Edit
[ "$TOOL_NAME" != "Write" ] && [ "$TOOL_NAME" != "Edit" ] && exit 0

# Skip if no file path
[ -z "$FILE_PATH" ] && exit 0

# Only format supported file types
echo "$FILE_PATH" | grep -qE '\.(ts|tsx|js|jsx|json|css|scss)$' || exit 0

# --no-install: never pull prettier from the registry for a project that lacks it.
# --find-config-path: prints a config path, or fails/prints nothing when the
# project has no prettier config — in which case formatting is not ours to do.
CONFIG=$(npx --no-install prettier --find-config-path "$FILE_PATH" 2>/dev/null) || exit 0
[ -z "$CONFIG" ] && exit 0

npx --no-install prettier --write "$FILE_PATH" > /dev/null 2>&1 || true

exit 0

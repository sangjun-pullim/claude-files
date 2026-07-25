#!/bin/bash
# Hook: PreToolUse — Block reading secret .env files via Read, Grep, or Bash.
# Templates (.env.example/.sample/.template) stay readable.
# Exit 0 = allow, Exit 2 = block
#
# Coverage note: any explicitly named .env target is blocked. A directory-wide
# `grep -r` cannot be resolved at hook time; that case is mitigated by ripgrep
# honoring .gitignore, where .env normally lives.
# Glob is intentionally not hooked — it returns path names only, never content.

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')

# True (0) when the basename is a secret-bearing .env file rather than a template.
is_secret_env() {
  local match
  match=$(printf '%s' "$1" | tr 'A-Z' 'a-z')
  match=${match%\~}  # strip editor backup suffix
  case "$match" in
    .env.example|.env.sample|.env.template) return 1 ;;
    .env|.env.*) return 0 ;;
  esac
  return 1
}

deny() {
  echo "BLOCKED: '$1' may contain secrets. Templates (.env.example/.sample/.template) are readable." >&2
  exit 2
}

case "$TOOL_NAME" in
  Read)
    FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
    [ -z "$FILE_PATH" ] && exit 0
    BASENAME=$(basename "$FILE_PATH")
    is_secret_env "$BASENAME" && deny "$BASENAME"
    ;;

  Grep)
    # Grep returns matching file CONTENT, so an explicit .env target leaks secrets.
    for FIELD in path glob; do
      VALUE=$(echo "$INPUT" | jq -r ".tool_input.$FIELD // empty")
      [ -z "$VALUE" ] && continue
      BASENAME=$(basename "$VALUE")
      is_secret_env "$BASENAME" && deny "$BASENAME"
    done
    ;;

  Bash)
    COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
    [ -z "$COMMAND" ] && exit 0
    # Stage 1: only commands that print file contents are candidates. Kept loose
    # on purpose — stage 2 is the actual gate, so a false positive here is free.
    echo "$COMMAND" | grep -qE '(^|[;&|[:space:]])(cat|bat|less|more|head|tail|nl|strings|xxd|od|grep|egrep|fgrep|rg|ag|awk|sed|source|\.)([[:space:]]|$)' || exit 0
    # Stage 2: strip complete template tokens at a boundary so .env.example stays
    # allowed, while .env.example.local (template name as prefix) is still caught.
    STRIPPED=$(echo "$COMMAND " | sed -E "s/\.env\.(example|sample|template)([[:space:]]|\*|'|\")/\2/g")
    if echo "$STRIPPED" | grep -qE "\.env([[:space:]]|\$|\.|\*|'|\")"; then
      echo "BLOCKED: reading .env via Bash is not allowed. Templates (.env.example/.sample/.template) are readable." >&2
      exit 2
    fi
    ;;
esac

exit 0

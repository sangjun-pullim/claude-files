#!/bin/bash
# PreToolUse guardrail: block destructive git commands before they execute.
# - Fails closed when the tool input cannot be parsed (jq missing).
# - Patterns anchor at a command position so quoted mentions (commit
#   messages, grep patterns) do not block. Known false-positive limits,
#   accepted because the alternative fails open on real invocations:
#   (a) text after ; & | inside quotes, (b) backticked mentions like
#   `git push` in a message (backtick stays in the anchor class because
#   backtick command substitution executes for real), (c) heredoc body
#   lines starting with a dangerous command (grep matches per line).
# - Flag matching is order-insensitive (git clean -xdf == -fdx).

if ! command -v jq >/dev/null 2>&1; then
  echo "BLOCKED: git guardrail cannot parse tool input (jq missing)." >&2
  exit 2
fi

INPUT=$(cat)
COMMAND=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty')
[ -z "$COMMAND" ] && exit 0

# "git" at a command position: start of line / after ; & | ` ( / shell
# keywords and wrappers / env assignments, optionally via a path
# (/usr/bin/git), optionally followed by global options (-C dir, -c k=v,
# --no-pager, --git-dir[= ]x, --work-tree[= ]x) before the subcommand.
P='((if|then|do|else|elif|while|until|\{|!|sudo|command|env|nice|time|xargs)[[:space:]]+|[A-Za-z_][A-Za-z0-9_]*=[^[:space:]]*[[:space:]]+)*'
O='([[:space:]]+(-C[[:space:]]+[^[:space:]]+|-c[[:space:]]+[^[:space:]]+|--no-pager|--git-dir(=|[[:space:]]+)[^[:space:]]+|--work-tree(=|[[:space:]]+)[^[:space:]]+))*'
G="(^|[;&|\`(])[[:space:]]*${P}([^[:space:]]*/)?git${O}[[:space:]]+"
E='([[:space:];&|)]|$)'
# whole-tree or directory discard targets: . ./ :/ or a dir arg ending in /
DOT='(--[[:space:]]+)?(\.|\./|:/|[^-[:space:];&|][^[:space:];&|]*/)'

BLOCKED=""
check() {
  [ -n "$BLOCKED" ] && return
  printf '%s' "$COMMAND" | grep -qE "$1" && BLOCKED="$2"
}

check "${G}push${E}"                                                  "git push"
check "${G}reset[^;&|]*[[:space:]]--hard${E}"                         "git reset --hard"
check "${G}clean[^;&|]*[[:space:]](-[a-zA-Z]*f[a-zA-Z]*|--force)${E}" "git clean (force)"
check "${G}branch[^;&|]*[[:space:]]-[a-zA-Z]*D[a-zA-Z]*${E}"          "git branch -D"
check "${G}branch[^;&|]*[[:space:]]--delete[^;&|]*[[:space:]]--force${E}" "git branch --delete --force"
check "${G}branch[^;&|]*[[:space:]]--force[^;&|]*[[:space:]]--delete${E}" "git branch --force --delete"
check "${G}(checkout|restore)[^;&|]*[[:space:]]${DOT}${E}"            "git checkout/restore <tree discard>"

if [ -n "$BLOCKED" ]; then
  echo "BLOCKED: command matches dangerous pattern '$BLOCKED'. The user has prevented you from doing this. If this step is required, hand the exact command to the user to run themselves." >&2
  exit 2
fi

exit 0

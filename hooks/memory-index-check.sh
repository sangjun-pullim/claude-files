#!/bin/bash
# Hook: PostToolUse — Warn when an auto-memory index (memory/MEMORY.md) drifts from
# the one-short-line-per-entry form.
# Claude Code says nothing until the index passes its load caps (200 lines,
# 25,000 chars), and by then the rest is already dropped at load.
# Thresholds: 120 chars keeps a title plus a short hook; 140 lines leaves room
# below the 200-line cap for new entries.
# Lines are split the way Claude Code counts them (whitespace-trimmed, split on "\n") and
# measured in characters: entries are mostly Korean and macOS awk counts bytes.
# The message carries the whole rule because the hook runs for every project's
# memory, and most projects have no rule file of their own.
# Never blocks: the write already happened, so the hook only adds context.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)

case "$FILE_PATH" in
  */.claude/projects/*/memory/MEMORY.md) ;;
  *) exit 0 ;;
esac
[ -f "$FILE_PATH" ] || exit 0

MAX_CHARS=120
MAX_LINES=140

REPORT=$(python3 -I -c '
import sys
max_chars, max_lines = int(sys.argv[2]), int(sys.argv[3])
with open(sys.argv[1], encoding="utf-8") as f:
    lines = f.read().strip().split("\n")
problems = []
long_lines = " ".join(f"{i}({len(l)})" for i, l in enumerate(lines, 1) if len(l) > max_chars)
if long_lines:
    problems.append(f"lines over {max_chars} chars, as line(chars): {long_lines}.")
if len(lines) > max_lines:
    problems.append(f"index has {len(lines)} lines, at most {max_lines}.")
print(" ".join(problems))
' "$FILE_PATH" "$MAX_CHARS" "$MAX_LINES" 2>/dev/null)
[ -z "$REPORT" ] && exit 0

MSG="MEMORY.md drifted from the index form: ${REPORT} Fix it now, without asking the user: shorten each flagged line; for a line-count warning, move memories of finished work into topic index files until the index is back to ${MAX_LINES} lines or fewer. Touch no other lines. Rule: one line per memory, '- [Title](file.md) — hook', where the hook says when to open that memory. Progress notes (deploy or check results, waiting states, measurements) belong in the memory file; a date or number that identifies the entry, or a date or condition for looking again, may stay in the line. If a memory file is stale, fix the file, not the index line. Move finished work only when the index is too long: into a topic index file (hist-*.md) listed by one line. Keep every 🔴 lesson that still applies beyond the finished work it came from (project-specific ones included) visible in the index: in the topic line's hook, or, when that would pass ${MAX_CHARS} chars, on a line of its own linking the memory file that holds it. Only memories moved into a topic index get such a line; for a memory that stays in the index, shorten its title and hook around the lesson."
jq -n --arg msg "$MSG" '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $msg}}'
exit 0

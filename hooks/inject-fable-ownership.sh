#!/bin/bash
# Hook: SessionStart, PostModelSwitch — Add the ownership sentence to context when
# the main session runs on Fable 5.2. Stdout of both events is added to context.
# settings.json has no per-model prompt key and hooks get no model env var, so the
# model id comes from stdin: `model` on SessionStart, `to_model` on PostModelSwitch.
# SessionStart omits `model` after /clear, so the last id seen is kept in a file
# keyed by the Claude Code process and read back when a start names no model.
# The key is $PPID plus that process's start time: /clear keeps the process, and
# the start time keeps a later process that reuses the PID from reading the file.
# The start time is read in UTC and the C locale so the key survives a system time
# zone change mid-session. Without a start time no file is written or read: a PID
# alone could hand a later process this one's model.
# $PPID is Claude Code only while settings.json registers this script as the single
# command `bash <path>`, which the wrapper shell execs; inside a compound command
# $PPID is a per-event shell and the file is never found again.
# The id is matched here, not by a hook matcher: Claude Code skips the matcher when
# it cannot canonicalize the model id.
# The digit guard keeps other ids that begin the same way (a dated Fable 5 id such
# as claude-fable-5-20261101) from matching.
# Always exits 0: this hook only adds context and must never block a session start
# or a model switch.

INPUT=$(cat)
MODEL=$(echo "$INPUT" | jq -r '.to_model // .model // empty' 2>/dev/null | tr 'A-Z' 'a-z')
STARTED=$(LC_ALL=C TZ=UTC ps -o lstart= -p "$PPID" 2>/dev/null | tr -cd '0-9A-Za-z')
STATE="${TMPDIR:-/tmp}/claude-session-model.$PPID.$STARTED"

if [ -n "$STARTED" ]; then
  if [ -n "$MODEL" ]; then
    echo "$MODEL" > "$STATE"
  else
    MODEL=$(cat "$STATE" 2>/dev/null)
  fi
fi

case "$MODEL" in
  *fable-5-2 | *fable-5-2[!0-9]*)
    echo "This codebase is yours: what it's for and how it's built are your call, and you'll keep building on it."
    ;;
esac

exit 0

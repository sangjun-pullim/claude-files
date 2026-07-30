#!/usr/bin/env python3
"""Claude Code statusline — lightweight, no external deps."""

import json
import os
import subprocess
import sys
import time

# ANSI colors
DIM = "\033[2m"
RESET = "\033[0m"
CYAN = "\033[36m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
MAGENTA = "\033[35m"
BLUE = "\033[34m"
RED = "\033[31m"
BOLD = "\033[1m"

# Progress bar characters
BAR_FILL = "\u2588"  # █
BAR_EMPTY = "\u2591"  # ░
BAR_WIDTH = 8


def progress_bar(pct, width=BAR_WIDTH):
    """Render a colored progress bar."""
    filled = round(pct / 100 * width)
    empty = width - filled
    c = limit_color(pct)
    return f"{c}{BAR_FILL * filled}{DIM}{BAR_EMPTY * empty}{RESET}"


def git_info(cwd):
    """Get branch name and file status counts."""
    env = {**os.environ, "GIT_OPTIONAL_LOCKS": "0"}
    opts = dict(cwd=cwd, capture_output=True, text=True, timeout=3, env=env)

    try:
        branch = subprocess.run(
            ["git", "symbolic-ref", "--short", "HEAD"], **opts
        ).stdout.strip()
        if not branch:
            branch = subprocess.run(
                ["git", "rev-parse", "--short", "HEAD"], **opts
            ).stdout.strip() or ""
    except Exception:
        return "", ""

    try:
        status = subprocess.run(
            ["git", "status", "--porcelain"], **opts
        ).stdout.strip()
        lines = [l for l in status.splitlines() if len(l) >= 2]
        added = sum(1 for l in lines if l[0] in "A?")
        modified = sum(1 for l in lines if l[0] in "MR" or l[1] == "M")
        deleted = sum(1 for l in lines if l[0] == "D" or l[1] == "D")

        parts = []
        if added:
            parts.append(f"{GREEN}+{added}{RESET}")
        if modified:
            parts.append(f"{YELLOW}~{modified}{RESET}")
        if deleted:
            parts.append(f"{RED}-{deleted}{RESET}")
        git_stat = "".join(parts)
    except Exception:
        git_stat = ""

    return branch, git_stat


def codex_workers():
    """Count running `codex exec` delegations.

    Each run spawns two processes -- a node wrapper plus the native binary --
    so counting `codex exec` matches alone doubles the total. Only the native
    process is named exactly `codex`, so intersecting the two sets yields one
    PID per run. Interactive `codex` sessions lack `codex exec` in their command
    line and are excluded. Counts PIDs only: process command lines can carry
    credentials and are never read.
    """
    def pids(*args):
        try:
            out = subprocess.run(
                ["pgrep", *args], capture_output=True, text=True, timeout=1
            ).stdout
            return {p for p in out.split() if p.isdigit()}
        except Exception:
            return set()

    return len(pids("-f", "codex exec") & pids("-x", "codex"))


def node_version(cwd):
    """Get Node.js version."""
    try:
        return subprocess.run(
            ["node", "-v"], cwd=cwd, capture_output=True, text=True, timeout=2
        ).stdout.strip() or ""
    except Exception:
        return ""


def format_duration(seconds):
    """Format seconds into human-readable duration."""
    if seconds <= 0:
        return ""
    h, rem = divmod(int(seconds), 3600)
    m = rem // 60
    if h > 0:
        return f"{h}h{m:02d}m"
    return f"{m}m"


def format_reset(epoch_now, resets_at):
    """Format time remaining until rate limit resets."""
    remaining = resets_at - epoch_now
    if remaining <= 0:
        return ""
    days, rem = divmod(int(remaining), 86400)
    hours = rem // 3600
    mins = (rem % 3600) // 60
    if days > 0:
        return f"{days}d{hours}h"
    if hours > 0:
        return f"{hours}h{mins:02d}m"
    return f"{mins}m"


def limit_color(pct):
    """Color based on usage percentage — green/yellow/red."""
    if pct >= 80:
        return RED
    if pct >= 50:
        return YELLOW
    return GREEN


def main():
    try:
        data = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return
    now = time.time()
    parts = []
    usage_parts = []

    # 1. Model name (bold cyan)
    model = data.get("model", {}).get("display_name", "").replace("Claude ", "")
    if model:
        parts.append(f"{BOLD}{CYAN}{model}{RESET}")

    # 2. Codex delegation — GPT is implementing, not this model
    workers = codex_workers()
    if workers:
        suffix = f"×{workers}" if workers > 1 else ""
        parts.append(f"{BOLD}{MAGENTA}⚡codex{suffix}{RESET}")

    # 3. Context usage — progress bar + %
    ctx_pct = data.get("context_window", {}).get("used_percentage")
    if ctx_pct is not None:
        pct = round(ctx_pct)
        bar = progress_bar(pct)
        c = limit_color(pct)
        parts.append(f"{DIM}ctx{RESET} {bar} {c}{pct}%{RESET}")

    # 3. Git branch + status (green branch, colored counts)
    cwd = data.get("workspace", {}).get("current_dir", ".")
    branch, git_stat = git_info(cwd)
    if branch:
        git_part = f"{GREEN}{branch}{RESET}"
        if git_stat:
            git_part += f" {git_stat}"
        parts.append(git_part)

    # 4. Worktree name (yellow, only when active)
    wt = data.get("worktree", {})
    wt_name = wt.get("name") if wt else None
    if wt_name:
        parts.append(f"{YELLOW}\u2387 {wt_name}{RESET}")

    # 5. Working directory (blue, ~ for home)
    if cwd:
        home = os.path.expanduser("~")
        display_cwd = cwd.replace(home, "~", 1) if cwd.startswith(home) else cwd
        parts.append(f"{BLUE}{display_cwd}{RESET}")

    # 6. Node.js version (dim)
    nv = node_version(cwd)
    if nv:
        parts.append(f"{DIM}{nv}{RESET}")

    # 7. Lines added/removed (green +N, red -N)
    lines_added = data.get("cost", {}).get("total_lines_added", 0)
    lines_removed = data.get("cost", {}).get("total_lines_removed", 0)
    if lines_added or lines_removed:
        line_parts = []
        if lines_added:
            line_parts.append(f"{GREEN}+{lines_added}{RESET}")
        if lines_removed:
            line_parts.append(f"{RED}-{lines_removed}{RESET}")
        joined = "".join(line_parts)
        usage_parts.append(f"{DIM}lines{RESET} {joined}")

    # 8. Cost (magenta)
    cost = data.get("cost", {}).get("total_cost_usd")
    if cost is not None and cost > 0:
        usage_parts.append(f"{MAGENTA}${cost:.2f}{RESET}")

    # 9. Session duration (dim)
    duration_ms = data.get("cost", {}).get("total_duration_ms")
    if duration_ms is not None and duration_ms > 0:
        dur = format_duration(duration_ms / 1000)
        if dur:
            usage_parts.append(f"{DIM}\u23f1 {dur}{RESET}")

    # 10. Rate limits — 5h session (bar + %, reset countdown)
    rate = data.get("rate_limits", {})

    five = rate.get("five_hour", {})
    five_pct = five.get("used_percentage")
    if five_pct is not None:
        pct = round(five_pct)
        c = limit_color(pct)
        bar = progress_bar(pct, 5)
        label = f"{DIM}5h{RESET} {bar} {c}{pct}%{RESET}"
        resets_at = five.get("resets_at")
        if resets_at:
            reset_str = format_reset(now, resets_at)
            if reset_str:
                label += f"{DIM}({reset_str}){RESET}"
        usage_parts.append(label)

    # 11. Rate limits — 7d weekly (bar + %, reset countdown)
    seven = rate.get("seven_day", {})
    seven_pct = seven.get("used_percentage")
    if seven_pct is not None:
        pct = round(seven_pct)
        c = limit_color(pct)
        bar = progress_bar(pct, 5)
        label = f"{DIM}7d{RESET} {bar} {c}{pct}%{RESET}"
        resets_at = seven.get("resets_at")
        if resets_at:
            reset_str = format_reset(now, resets_at)
            if reset_str:
                label += f"{DIM}({reset_str}){RESET}"
        usage_parts.append(label)

    sep = f" {DIM}\u00b7{RESET} "
    out_lines = []
    if parts:
        out_lines.append(sep.join(parts))
    if usage_parts:
        out_lines.append(sep.join(usage_parts))
    print("\n".join(out_lines), end="")


if __name__ == "__main__":
    main()

# Risk Triage — Task Tier Gate

Determines the task tier that gates the *ceremony weight* of `CLAUDE.md` Work Rules.
This file is the CANONICAL definition of tiers, risk surface, and edge cases — if
`CLAUDE.md` and this file ever disagree, this file wins.
Ceremony is gated by tier; the floors below are not.

## When to judge

Judge the tier AFTER skimming the docs index + `docs/decisions.md` (impact scope is
unknown before that), and BEFORE sharing a plan.

## Deterministic signals (priority order)

1. **Risk surface** — touched paths match any of: auth / authn / authz / login /
   session / token / payment / billing / checkout / permission / role / DB schema
   (`schema.prisma`, migrations) / external API contract (public route or response
   shape, webhook). → tier-2, file count irrelevant. Judge by what the change DOES,
   not only path keywords — touching authz/permission logic in a generically named
   file (utils, middleware) counts.
2. **Behavior change** — observable change in output or side effects for the same
   input. YES: error-message text, constant values, runtime dependency/lockfile
   bumps, data-access path (cache, index, query rewrite), deleting or renaming an
   exported symbol. NO: comments, docs, pure formatting, local-only renames,
   type-only changes with identical runtime, adding log lines. "Docs" here means
   documentation *about* code; a file whose text changes how a model behaves is
   control-plane, not docs, and counts as YES — see Special cases.
3. **Blast radius** — production source files touched (tests/snapshots/fixtures
   excluded), plus control-plane files per Special cases. 5+ combined → tier-2. Count the
   CUMULATIVE files of one logical change, even across multiple turns or commits —
   splitting a change to stay under the threshold is not allowed.

If you cannot prove the change avoids the risk surface, treat it as tier-2 (fail-closed).

## Tiers

| tier | condition | plan | tests | reviewer | docs read |
|---|---|---|---|---|---|
| 0 | ≤1 file, no behavior change, no risk surface | skip | skip | only if exec code or a control-plane file touched (prose/doc → skip) | decisions.md skim only |
| 1 | behavior change, no risk surface, <5 files | inline 2–4 line | yes (if test-pinnable) | yes (exec code or control-plane) | Research Order, scoped |
| 2 | any risk surface OR 5+ files | impl-plan, share+approve | yes (always for risk surface; n/a when tier-2 comes only from the control-plane count — the reviewer pass is the verification) | yes | full Research Order |

Where a Special case below conflicts with a cell in this table, the Special case wins.

## Non-negotiable floors (no tier can disable)

No tier weakens the verification and safety rules in `CLAUDE.md`, or the reading order in
`rules/second-brain.md`. Owned here:

- auth / payment / permission / migration → always write tests, regardless of size.
- Deny-list hooks stay on.
- A control-plane or tier-2 change with no `reviewer` agent spawn is never reported done —
  surface it as unreviewed, and say that an unreviewed control-plane edit is already in force
  for every new session until it is reviewed or reverted.

## Special cases (not caught by the three signals)

- Runtime dependency / lockfile change → min tier-1; major version bump or
  security-related package → tier-2.
- Deleting a file or exported symbol → min tier-1; existing callers → tier-2.
- CI / build / deploy config (Dockerfile, CI yaml, tsconfig, lint config) → min tier-1.
- Cache / DB index / query-path change → min tier-1 (index = DB schema → tier-2).
- Production data backfill / fix scripts → tier-2 (even without schema change).
- **Control-plane instruction/config** — files whose text changes how a model behaves in
  future sessions, as opposed to product code that runs: `~/.claude/**` (rules, agents,
  skills, commands, hooks, docs, settings.json) and any repo's `.claude/**`, plus `CLAUDE.md`
  / `AGENTS.md` at any level. For a path not listed, the test is binary: *would a model's
  future behavior differ if this file's text changed?* → **min tier-1, and a `reviewer` agent
  spawn is required** — the `CLAUDE.md` self-review fallback does not satisfy it — even
  though no `.ts`/`.py` file was touched. Control-plane files count toward signal 3's 5+
  threshold together with production source: one combined count, never two separate ones.
  - **tier-2 regardless of file count**: `settings.json`'s `permissions` or `hooks` blocks and
    `~/.claude/hooks/**` — signal 1's permission surface, and the enforcement path for the
    `.env` rule in `CLAUDE.md`.
  - **stays tier-0** when the edit cannot change what an instruction means — reflowing,
    formatting, and spelling fixes. No reviewer spawn, but **show the user the diff**: a
    one-character edit can invert a rule ("do not" → "do now"), and "it's just a typo" judged
    silently is the only thing between that and a live rule change. Anything that changes what
    the words say — including adding a single rule — is tier-1. Carve-outs written in other files govern their own
    ceremonies and never widen this one.
  - **also tier-0**: artifacts no human authors — auto-memory under
    `~/.claude/projects/**/memory/`, session state, generated output under
    `~/.claude/skills/benchmark-workspace/**`, and vendored `~/.claude/plugins/**` (installing
    or updating a plugin is a dependency change — see the dependency row above).

## Retry rule

tier-1 may retry on failure ONLY when an objective Verifier exists (build/test/lint
exit code). For subjective acceptance (prose, style), do not loop — one pass, then surface.

## Examples

- Fix typo in README → tier-0.
- Rename a *local* variable in one service file → tier-0 (renaming an *exported*
  symbol = behavior change → tier-1+).
- Add a nullable column + read it in one query → tier-2 (DB schema).
- Change button color in one component → tier-0.
- Add validation to a login handler → tier-2 (auth, even if 1 file).
- Refactor 6 files, no behavior change → tier-2 (5+ files).

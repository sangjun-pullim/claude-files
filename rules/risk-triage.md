# Risk Triage — Task Tier Gate

Determines the task tier that gates the *ceremony weight* of `CLAUDE.md` Work Rules.
This file is the CANONICAL definition of tiers, risk surface, and edge cases — if
`CLAUDE.md` and this file ever disagree, this file wins.
The verification floor (run test/build/lint before "done") and safety rules (.env,
deny-list) are NOT gated — they apply at every tier.

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
   type-only changes with identical runtime, adding log lines.
3. **Blast radius** — production source files touched (tests/snapshots/fixtures
   excluded). 5+ → tier-2 (matches `rules/agents.md` planner trigger). Count the
   CUMULATIVE files of one logical change, even across multiple turns or commits —
   splitting a change to stay under the threshold is not allowed.

If you cannot prove the change avoids the risk surface, treat it as tier-2 (fail-closed).

## Tiers

| tier | condition | plan | tests | reviewer | docs read |
|---|---|---|---|---|---|
| 0 | ≤1 file, no behavior change, no risk surface | skip | skip | only if exec code touched (prose/doc → skip) | decisions.md skim only |
| 1 | behavior change, no risk surface, <5 files | inline 2–4 line | yes (if test-pinnable) | yes (any exec code) | Research Order, scoped |
| 2 | any risk surface OR 5+ files | impl-plan, share+approve | yes (always for risk surface) | yes | full Research Order |

## Non-negotiable floors (no tier can disable)

- Run test/build/lint before reporting "done".
- Never read `.env`/secrets; deny-list hooks stay on.
- auth / payment / permission / migration → always write tests, regardless of size.
- `docs/decisions.md` skim at least once (second-brain.md).

## Special cases (not caught by the three signals)

- Runtime dependency / lockfile change → min tier-1; major version bump or
  security-related package → tier-2.
- Deleting a file or exported symbol → min tier-1; existing callers → tier-2.
- CI / build / deploy config (Dockerfile, CI yaml, tsconfig, lint config) → min tier-1.
- Cache / DB index / query-path change → min tier-1 (index = DB schema → tier-2).
- Production data backfill / fix scripts → tier-2 (even without schema change).

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

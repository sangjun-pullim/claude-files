---
name: impl-plan
description: Analyze impact scope and create an implementation plan, then validate it through a fresh-context code-review loop until no blocking issues remain. Use this skill when the user asks to plan implementation, create an impl spec, or says "impl-plan", "/impl-plan". Also trigger when the user has a detailed spec/plan document and wants it verified against actual code.
---

# Implementation Plan with Code-Verified Review Loop

Write an HTML plan into `docs/impl-spec/` — the human reads a packed copy and decides there, agents
read the source — then have a fresh-context `reviewer` verify every claim against the actual code.
The plan's author has already read the code and glosses over what
it "understands"; a reviewer that starts from scratch catches wrong line numbers, missed callers,
and skipped patterns.

## Do NOT use when

- The change touches under 5 production files — plan inline instead (a risk surface still needs tests and a reviewer per `CLAUDE.md` Hard Rules, not a spec)
- The problem itself is still vague — sharpen it with `grilling` first
- An approved spec already exists and it is time to build — `impl-execute`

## Phase 0: Requirements

- If `docs/PRD.md` exists, load it and find the `## Scope` subsection covering this work.
  If the request contradicts the PRD (`## Non-goals`, or a `## Scope` statement), surface the
  mismatch before planning: an intent change means proposing a PRD update first; a mistaken
  request means correcting course. If the `second-brain` skill's PRD criteria apply and no
  `## Scope` subsection exists, suggest adding it first; proceed without it only on the user's call.
- Before drafting, be able to state: the goal in one sentence, in-scope / out-of-scope, at least
  one pass/fail acceptance check, and the files the change lands in. Anything you cannot state
  from what the user or the PRD said, ask — one question at a time, `AskUserQuestion` with
  2–4 concrete options.

## Phase 1: Plan Creation

**Verifying an existing plan** (the user points at a plan document — an active
`docs/impl-spec/` file or any other): skip drafting and numbering — edit that file in place, and
add a `risk-surface` field if its status block predates it (an old `tier` field can stay).
- `.md` plan: follow `${CLAUDE_SKILL_DIR}/references/markdown-format.md`, Change Map rule included;
  keep it Markdown.
- `.html` plan: follow `${CLAUDE_SKILL_DIR}/references/html-format.md` and pass `--lint-only`. If
  its `--status` `undecided` is not 0, run Phase 1.5 first — `/impl-execute`'s decision gate
  sends plans here for this. If the user pasted a Respond answer after Phase 3, apply it per the
  Respond handling in `html-format.md` without re-packing.

Then go to Phase 2. For editing a step already marked done (`[x]` / `class="done"`), see the
`second-brain` skill's impl-spec Lifecycle.

1. **Scope analysis** — spawn a `scope-analyst` agent with the requirements above, and save its
   final report verbatim to `<scratch>/<short-description>-scope.md` (`<scratch>` per
   `html-format.md`); Phase 2 hands it to the reviewer. Resolve any `## Open Questions` it
   returns with the user before drafting; nothing downstream reopens them. Every option you put
   to the user, here or as a `<doc-ask>`, states both what it changes in existing behavior and
   what it newly lets in. Then settle the Forward Trace rows per `## Forward Trace Rows`.
2. **Draft the spec** — read `${CLAUDE_SKILL_DIR}/references/html-format.md` and
   `${CLAUDE_SKILL_DIR}/examples/scheduled-send.html`, then write every section in
   `## Spec Sections`. The scope-analyst's reverse dependencies and existing patterns go into
   Affected Dependents and the steps — the implementer never sees the scope analysis, so the spec is how
   they reach it. Forward Trace rows land per `## Forward Trace Rows`; each Risks & Unknowns row
   of the report lands as a Risks entry with its mitigation or with the evidence that rules it
   out. A reason or mitigation about what an input can be cites the input contract as the code
   has it or as a step of this plan changes it.
3. **Save** to `docs/impl-spec/<NNN>-<short-description>.html`. `NNN` = highest existing number
   across the `.md` and `.html` files in `docs/impl-spec/` and `docs/impl-spec/archive/` + 1,
   zero-padded to 3 digits; `001` if none. Create the directory if missing. After saving,
   `--lint-only` reports 0 errors.
   - If this plan replaces an existing spec, set the old one's status block to
     `status: superseded-by: <new NNN>` and move it to `docs/impl-spec/archive/`.

## Phase 1.5: Decisions

Run `--status` (`## Spec Sections`). `undecided` is 0 → go to Phase 2. Otherwise pack to a
new `.decide` path (Packing in `html-format.md`) with the pack command, give the user the packed path and one line — N decisions,
the checked option on each is my recommendation, and any left unopened gets asked afterwards —
and wait for the Respond answer.
Apply it per the Respond handling in `html-format.md`, then run `--lint-only`.

## Phase 2: Review Loop

1. Spawn a **new** `reviewer` agent (never reuse one — fresh context is the point) with only the
   spec path and, when Phase 1 saved one, the scope report path. It runs in Plan verification
   mode (`agents/reviewer.md`). Do not pass the previous
   round's disposition table: fixes are verified afresh from the spec, and declined findings are
   already in the spec's Review Notes (`## Spec Sections`), which the reviewer reads.
2. **Disposition** — for each CRITICAL/HIGH finding (CLAUDE.md **리뷰 루프**): `ACCEPTED` (fix the
   spec) or `REJECTED` with concrete
   evidence (file:line or reasoning). "Not needed" without evidence is not a rejection. A
   finding that a Forward Trace row has neither a step nor a recorded yes: `## Forward Trace
   Rows`.

   | Finding | Severity | Disposition | Rationale |
   |---------|----------|-------------|-----------|

3. Check the CLAUDE.md **리뷰 루프** stop triggers before applying anything. Append REJECTED and
   out-of-scope findings to Review Notes with their rationale, so later reviewers and the
   implementer see what was deliberately declined. Unless the round stopped, apply ACCEPTED
   findings to the spec body:
   - `.md` spec: follow the Change Map rule in `${CLAUDE_SKILL_DIR}/references/markdown-format.md`.
   - `.html` spec: when a fix adds a `<doc-ask>` or changes its options, ask that decision per
     `html-format.md` before applying it; run `--lint-only` after every fix.
4. **Exit and stop** follow CLAUDE.md **리뷰 루프**. After a stop, tell the user the spec is not
   review-clean — `/impl-execute` must not run on it until its `UNRESOLVED` rows are cleared.

## Phase 3: Present

Present the spec path, the risk surface recorded in its status block, what the review rounds
found and fixed, any remaining MEDIUM/LOW notes, and the REJECTED findings with their
rationale. Implementation runs through
`/impl-execute` on this spec — do not start implementing here.

For an `.html` spec, also re-pack to a new `.final` path, give the packed path, and add one line: the
decisions are applied, and the page's "N to answer" counter is runtime display that ignores
`data-decided`, so nothing needs answering again.

## Forward Trace Rows

A Forward Trace row in the scope report is a consumer the change newly reaches that still holds
an old-scope assumption. The plan updates every row to the new scope: each gets a step that
makes its "What happens" cell untrue. A row stays without such a step only on the user's yes.
Whenever you would leave a row without one — decided before drafting, while drafting, or on a
review finding — ask with the reason (deferred, or does not hold: code evidence `path:line`)
and the row's "What happens" cell quoted. Record a yes in Context with the row's `#`, consumer
`path:line`, reason, and quoted cell; on a no, add the step. A row with neither a step nor that record is not done.

## Spec Sections

This section owns the status block fields, what each section holds, and how each section maps
to the two formats. Skeletons and tree rules: `${CLAUDE_SKILL_DIR}/references/html-format.md`;
block syntax: `${CLAUDE_SKILL_DIR}/references/blocks.md`; the existing `.md` skeleton:
`${CLAUDE_SKILL_DIR}/references/markdown-format.md`.

| Section | What it holds (either format) | `.md` | `.html` |
|---|---|---|---|
| Status block | `status: active \| done \| superseded-by: <NNN>`, `date: <YYYY-MM-DD>`, `risk-surface: <none \| auth \| payment \| permission \| db-schema \| public-api>`, the NOTE sentence | YAML frontmatter at the top of the file, NOTE quote below it | the same YAML lines plus a NOTE line inside an HTML comment before `<!doctype html>` |
| Context | Problem and motivation, the user's answers to Open Questions, and the Forward Trace rows the user let stay (`## Forward Trace Rows`); when a PRD exists, point at its section and never restate it | `## Context` | `aux="background"` |
| Usage Sketch | Only when the change adds or changes a public interface (endpoint, exported function or type): the caller's code or a request/response example, as the caller will write it. The steps build toward this | `## Usage Sketch` | the figure of a level-1 tree node, `id="usage"` |
| Affected Files | `path — one line on what changes` | `## Affected Files` | `aux="files"` |
| Affected Dependents | Code that must keep working but is not changed: callers of every signature this touches, consumers of every export it renames, routes behind a middleware it alters, every doc sentence that restates a rule this changes (the scope-analyst's doc copies — one line per rule with every copy's path and the owner). One line each with a path | `## Affected Dependents` | `aux="dependents"` |
| Change Map | `.md` only — rule in `markdown-format.md` | `## Change Map` | none — the tree's call trees and flow diagrams |
| Implementation Steps | Per step: the file, the change with line references, code sketches where needed. All start not done | `### [ ] Step N:` / done `[x]` / blocked: `> BLOCKED: <reason>` under the heading | `<li id="step-N">` in `aux="steps"` / done `class="done"` / blocked: `<p>BLOCKED: <reason></p>` right after the `<h4>`; the body is HTML-escaped — unescape `&lt;` `&gt;` `&amp;` when copying it into code |
| Tests | Required. Each test to add or change and the behavior it pins. When `risk-surface` is not `none`, "none needed" is not an available answer; with `none` it needs a reason | `## Tests` | `aux="tests"` |
| Risks | Each risk and its mitigation | `## Risks` | `aux="risks"` |
| Verification | Commands that prove the change works | `## Verification` | `aux="verify"` — unescape `&amp;` `&lt;` `&gt;` before running |
| Review Notes | REJECTED and out-of-scope findings with rationale; `UNRESOLVED` rows block `/impl-execute`. Columns `Finding \| Severity \| Disposition \| Rationale` | `## Review Notes` table | `aux="review"` table |
| Decisions | Only forks that change what gets built, at most 5 (0 when there is no fork), the recommended option `checked` | none | `<doc-ask>`; once answered, `data-decided="YYYY-MM-DD"` and `neutral` |
| Reading state | Next not-done step, blocked steps, undecided decisions, `UNRESOLVED` row count | as before: `### [ ]` / `[x]` step headings, `> BLOCKED` lines, rows of the `## Review Notes` table holding `UNRESOLVED` | JSON from the `--status` command below; a non-zero exit means stop |

Commands (`.html` specs). `<scratch>` and the packed file names (a new `.decide-<HHMMSS>` path
in Phase 1.5, a new `.final-<HHMMSS>` path in Phase 3) are defined in `html-format.md`:

```bash
# lint only — after every edit, in every phase (.html specs)
node "${CLAUDE_SKILL_DIR}/runtime/pack.mjs" docs/impl-spec/128-foo.html --root . --lint-only
# packed copy for the user, always with -o outside the repo (.decide in Phase 1.5, .final in Phase 3)
node "${CLAUDE_SKILL_DIR}/runtime/pack.mjs" docs/impl-spec/128-foo.html --root . -o "<scratch>/128-foo.decide-<HHMMSS>.html"
# read progress, decisions and review state (absolute path — other skills and agents run this too)
node ~/.claude/skills/impl-plan/runtime/pack.mjs docs/impl-spec/128-foo.html --status
# → {"status":"active","steps":{"total":7,"done":3,"next":"step-4","blocked":[]},"undecided":0,"unresolved":0}
#   unreadable file or no <doc-plan> → reason on stderr, exit 2
```

$ARGUMENTS

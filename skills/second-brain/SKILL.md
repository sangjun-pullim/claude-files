---
name: second-brain
description: Project documentation standard — the docs/ file set, Mermaid guidance, two-layer rule and freshness stamps, impl-spec lifecycle, and maintenance rules. Use when creating, auditing, syncing, or restructuring docs/, or when writing or archiving an impl-spec.
---

# Second Brain — Project Documentation Standard

The always-loaded companion is `rules/second-brain.md` (Research Order — which docs to
read before starting a task). This file holds the authoring and maintenance standard,
loaded only when you are actually working on docs.

## Standard docs/ Files

Every project should maintain these documentation files under `docs/`:

The **Layer** column decides stamping: derivable-layer docs carry a freshness stamp, hand-written ones never do.

| File | Layer | Purpose | When Required |
|------|-------|---------|---------------|
| `architecture.md` | derivable | High-level map — module boundaries, integration points, data flow (not an exhaustive structure listing) | Always |
| `db-schema.md` | derivable | Modeling rationale, constraints, migration notes (the schema itself lives in `schema.prisma`) | Prisma/DB projects |
| `api-spec.md` | derivable | External API contract — the contract is the truth, not the code | APIs with external consumers (internal-only: route code is the doc) |
| `frontend-architecture.md` | derivable | Component tree, state management, routing | React/Next.js projects |
| `business-logic.md` | hand-written | Domain rules, workflows, edge cases — intended behavior, the baseline for judging bugs | Complex business logic |
| `decisions.md` | hand-written | ADR (Architecture Decision Records) | Always |
| `bug-fixes.md` | hand-written | Notable bug investigations and fixes | Always |
| `glossary.md` | hand-written | Domain term ↔ canonical code identifier mapping, with banned aliases | Only when a term has confused the model or a teammate at least once |

## glossary.md Format

One line per term, table-only. The 금지 표현 (banned aliases) column is the highest-value
part — negative constraints stop naming drift across sessions and subagents better than
definitions do.

```markdown
| 용어 | Canonical identifier | 정의 (1줄) | 금지 표현 |
|------|---------------------|-----------|----------|
| 정산 | `settlement` | 월말 판매대금 정산 프로세스 | adjustment, payout |
```

- A definition that outgrows one line (behavior rules, state transitions) belongs in
  `business-logic.md`; the glossary row keeps only a link. Never let the two files
  describe the same rule independently.
- Hand-written layer: no freshness stamp, effectively append-only.
- Creation criterion: a term has confused the model or a teammate at least once.
  Projects with obvious vocabulary skip this file.

## decisions.md — When to Record

Record a decision only when all three hold; if any is missing, skip it:

1. **Hard to reverse** — changing your mind later costs something real.
2. **Surprising without context** — a future reader would look at the code and wonder "why did they do it this way?"
3. **A real trade-off** — genuine alternatives existed and one was picked for specific reasons.

What qualifies: architectural shape; integration patterns between modules; technology choices that carry lock-in (not every library — the ones that would take a quarter to swap); boundary and scope decisions (the explicit no-s are as valuable as the yes-s); deliberate deviations from the obvious path (these stop the next engineer from "fixing" something deliberate); constraints not visible in the code; rejected alternatives when the rejection is non-obvious.

An entry can be a single paragraph — context, decision, why. The value is recording *that* a decision was made and *why*, not filling out sections.

## Mermaid Diagrams

Use Mermaid diagrams in structure-related docs for visual clarity:

- `architecture.md`: System overview, module dependency graph, data flow
- `frontend-architecture.md`: Component hierarchy, state flow
- `db-schema.md`: ER diagrams for complex relations

Keep diagrams focused — one concept per diagram. Update diagrams when the structure changes.

## Two-Layer Rule & Freshness Stamps

Docs split into two layers by maintenance cost:

- **Hand-written layer** — why, invariants, rejected alternatives, business rules: things code cannot express. Maintained by hand; rarely invalidated.
- **Derivable layer** — facts reproducible from code (schema, endpoints, field/column mappings, indexes). NEVER hand-maintain these. Either generate them from code, or attach a freshness stamp so staleness is machine-checkable.
- **Keep the derivable layer thin.** Agentic code search regenerates structure cheaply; a derivable doc earns its place by curation (high-level map, integration points, modeling rationale), not enumeration. A section that merely restates what code or schema already shows is a deletion candidate — a stale doc grounds the model in the wrong direction, which is worse than no doc.

Stamp convention (frontmatter at the top of the doc):

```yaml
---
verified-against: a1b2c3d   # commit hash the doc was last verified against
sources: prisma/**, src/payment/**
---
```

- `git diff --name-only <hash>..HEAD -- <globs>` empty → doc is fresh; no judgment needed.
- Non-empty → potentially stale; the diff IS the sync-check scope.
- `/docs-sync` uses stamps for incremental checking and bumps them after a confirmed sync.
- When reading a stamped doc for derivable facts, trust it only if the stamp check passes; otherwise verify against code.
- Harness protocol files under `~/.claude/docs/**` are hand-written-layer by definition — they describe procedure, not code — so they take no stamp either.
- A derivable-layer doc without a stamp is a defect, not an option: include the stamp when creating one (`/init-docs` scaffolds it), and when substantially updating an unstamped one, verify its facts against code and add the stamp in the same change.

## Lazy Loading Principle

**CLAUDE.md should be lightweight.** It serves as an index, not an encyclopedia.

- CLAUDE.md contains: project overview, quick-start commands, key conventions, and `## Documentation` section with references to `docs/`
- Detailed architecture, schemas, API specs live in `docs/` files
- Read `docs/` files only when the current task requires that context
- This keeps the context window lean and loads knowledge on-demand

Example `## Documentation` section in CLAUDE.md:

```markdown
## Documentation

Detailed docs live in `docs/`. Read as needed:
- `docs/architecture.md` — System architecture and module relationships (sources: src/**)
- `docs/db-schema.md` — Database schema and relations (sources: prisma/**)
- `docs/api-spec.md` — API endpoints and contracts (sources: src/**/*.controller.ts)
```

The `(sources: <glob>)` annotation makes update routing a lookup, not a judgment:
when a change touches a doc's sources glob, that doc is an update candidate.

## impl-spec Lifecycle

A spec's status decides whether it is editable. **Active specs are working documents; archived specs are frozen history.** Neither is ever synced against code drift — a spec claims what we planned, never "how the code is now" — but that is a reason not to *maintain* them as current-state docs, not a reason to preserve superseded instructions inside an active one.

- **Active (`status: active`, top level) — edit in place.** When the plan changes, rewrite the affected steps to say what you now intend. Do NOT append "update notes" alongside text you no longer mean. A spec carrying both the original and a correction is ambiguous to a machine, and it is read verbatim as an instruction set — it will sometimes get implemented as written. The original plan is not lost: these files are tracked, so `git log -p` is the record of what you planned at the time.
  - **Exception — steps already marked `[x]`.** A marker asserts "implemented as written here", so editing that step's instructions makes it lie and corrupts the resume logic. Either flip it back to `[ ]` so it gets redone, or leave it and add the change as a new step.
- **Archived (`status: done` / `superseded-by`, or under `archive/`) — never edit.** This is the record of what we decided and why, at the time. Frozen means frozen.

Durable why belongs in `decisions.md` (promote a genuine change of direction there when it meets the recording criteria above), current facts belong in `architecture.md` etc.

- **Born**: `/impl-plan` creates the spec with the frontmatter block defined in that skill's `## Output Format`, plus the snapshot NOTE — `impl-plan` owns the field list; never restate it elsewhere. The block is required for every file **created** under `docs/impl-spec/`, including specs written ad-hoc (incident response, manual planning) without the skill — a newly created spec without it is a defect, same as an unstamped derivable doc. A spec that predates a later-added field is not a defect.
- **Closed**: `/impl-execute` sets `status: done` and moves the file to `docs/impl-spec/archive/` on the conditions its Phase 3 step 1 defines — that skill owns them. A spec with unchecked steps stays `active` no matter how clean the review; it was never fully implemented.
- **Superseded**: a new spec replacing an old one marks the old file `status: superseded-by: <NNN>` and archives it.
- **Reference rule**: only top-level (active) specs participate in planning/implementation routing. `archive/` is for archaeology — intent, background, rejected alternatives — and stays valid for that purpose at any age. Never cite an archived spec as evidence of current code state.

## Documentation Maintenance

- After completing a task that changes architecture, DB schema, API, or business logic, **suggest** updating the relevant `docs/` file
- Do NOT auto-update docs without user approval
- When suggesting, be specific: state which file and what section needs updating
- Keep docs concise — bullet points and diagrams over prose
- `bug-fixes.md` is append-only until promotion: when the same root-cause pattern appears 2+ times, promote it to a durable guard (test, lint rule, or a measurable CLAUDE.md rule) via `/docs-sync` Part 5. Promoted entries are compressed to a one-line reference — promotion doubles as compaction.

## Coexistence with Existing Files

- Standard files coexist with project-specific docs (e.g., `docs/deployment.md`, `docs/troubleshooting.md`)
- Never delete or rename existing documentation files (exception: moving closed impl-specs into `docs/impl-spec/archive/` per the lifecycle above)
- If an existing file covers the same topic as a standard file (e.g., `docs/architecture-proposal.md`), note it and let the user decide whether to merge

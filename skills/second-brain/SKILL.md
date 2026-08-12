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

| File | Purpose | When Required |
|------|---------|---------------|
| `architecture.md` | High-level map — module boundaries, integration points, data flow (not an exhaustive structure listing) | Always |
| `db-schema.md` | Modeling rationale, constraints, migration notes (the schema itself lives in `schema.prisma`) | Prisma/DB projects |
| `api-spec.md` | External API contract — the contract is the truth, not the code | APIs with external consumers (internal-only: route code is the doc) |
| `frontend-architecture.md` | Component tree, state management, routing | React/Next.js projects |
| `business-logic.md` | Domain rules, workflows, edge cases — intended behavior, the baseline for judging bugs | Complex business logic |
| `decisions.md` | ADR (Architecture Decision Records) | Always |
| `bug-fixes.md` | Notable bug investigations and fixes | Always |
| `glossary.md` | Domain term ↔ canonical code identifier mapping, with banned aliases | Only when a term has confused the model or a teammate at least once |

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

- **Active (`status: active`, top level) — edit in place.** When the plan changes, rewrite the affected steps to say what you now intend. Do NOT append "update notes" alongside text you no longer mean: `/impl-plan`'s review loop already treats the body as the single source of truth, and `/impl-execute` hands the file to the implementer — Codex reads it verbatim as its instruction set, down to line numbers. A spec carrying both the original and a correction is ambiguous to a machine and will sometimes get implemented as written. The original plan is not lost: these files are tracked, so `git log -p` is the record of what you planned at the time.
  - **Exception — steps already marked `[x]`.** A marker asserts "implemented as written here", so editing that step's instructions makes it lie and corrupts the resume logic. Either flip it back to `[ ]` so it gets redone, or leave it and add the change as a new step.
- **Archived (`status: done` / `superseded-by`, or under `archive/`) — never edit.** This is the record of what we decided and why, at the time. Frozen means frozen.

Durable why belongs in `decisions.md` (promote a genuine change of direction there), current facts belong in `architecture.md` etc.

- **Born**: `/impl-plan` creates the spec with frontmatter `status: active` + `date` + the snapshot NOTE. This frontmatter is required for EVERY file created under `docs/impl-spec/`, including specs written ad-hoc (incident response, manual planning) without the skill — a spec file without it is a defect, same as an unstamped derivable doc.
- **Closed**: `/impl-execute` sets `status: done` and moves the file to `docs/impl-spec/archive/` once every implementation step is marked `[x]` *and* the review passes. A spec with unchecked steps stays `active` no matter how clean the review — it was never fully implemented.
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

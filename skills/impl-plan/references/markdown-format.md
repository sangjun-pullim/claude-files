# Markdown plan format

Use this only to verify an existing `.md` plan. A new plan uses `html-format.md`.

What each section holds is in `~/.claude/skills/impl-plan/SKILL.md` `## Spec Sections`; this file
holds only the `.md` skeleton and the Change Map rule. Keep the plan Markdown.

## Skeleton

```markdown
---
status: active            # values: `## Spec Sections` status block
date: <YYYY-MM-DD>
risk-surface: <value>
---
> NOTE: This is the plan, not a description of the code — never read it as evidence of current code state. While `status: active`, edit it in place as the plan changes; once archived it is frozen.

# [Title]

## Context
[`## Spec Sections` — Context]

## Usage Sketch
[`## Spec Sections` — Usage Sketch]

## Affected Files
[`## Spec Sections` — Affected Files]

## Affected Dependents
[`## Spec Sections` — Affected Dependents]

## Change Map
[Change Map rule below]

## Implementation Steps

Every step heading carries a progress marker: `[ ]` unstarted, `[x]` implemented.
`/impl-execute` flips these as it works. Write them all as `[ ]`.

### [ ] Step N: [Title]
**File**: `path/to/file.ts`
[`## Spec Sections` — Implementation Steps]

## Tests
[`## Spec Sections` — Tests]

## Risks
[`## Spec Sections` — Risks]

## Verification
[`## Spec Sections` — Verification]

## Review Notes
<!-- REJECTED / out-of-scope findings with rationale; UNRESOLVED rows block /impl-execute. -->

| Finding | Severity | Disposition | Rationale |
|---------|----------|-------------|-----------|
```

## Change Map rule

`## Change Map` is one Mermaid flowchart with one node per entry of Affected Files and Affected
Dependents and no others; edges point from each node to what it depends on (calls, imports, is
registered behind, or restates); changed files are styled apart from dependents.

Redraw it to match whenever the two lists change: when verifying a plan that has both list
sections, add or redraw it; in the review loop, redraw it when an ACCEPTED fix changes Affected
Files or Affected Dependents.

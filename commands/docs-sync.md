---
description: Check if project CLAUDE.md and docs/ are in sync with the actual codebase
---

Audit the project's CLAUDE.md and docs/ files against the current codebase state. Do NOT modify files except after explicit user approval; the `verified-against` stamp bump is the only write that follows automatically from the user confirming the sync report (see Part 3).

## Part 1: CLAUDE.md Sync

1. **Stack & Dependencies**: Compare `package.json` dependencies with documented tech stack
2. **Directory Structure**: Verify documented structure matches actual `ls` output
3. **Scripts & Commands**: Confirm documented npm scripts / CLI commands actually exist
4. **New Modules**: Identify significant new files/directories not mentioned in docs
5. **Removed Items**: Flag anything documented but no longer in the codebase
6. **Environment Variables**: Check if documented env vars match `.env.example` (do NOT read `.env`)

## Part 2: docs/ Structure

7. **Docs Existence**: Check `docs/` folder for standard Second Brain files.
   - Report which standard files exist vs missing (PRD/, ARCHITECTURE.md, DB-SCHEMA.md, API-SPEC.md, FRONTEND-ARCHITECTURE.md, BUSINESS-LOGIC.md, ADR.md, BUG-FIXES.md, GLOSSARY.md — flag PRD/ and GLOSSARY.md as missing only per the `second-brain` skill's required-when/creation criteria)
   - A legacy lowercase file (`decisions.md` for `ADR.md`, etc.) counts as EXISTS — report it as `EXISTS (legacy name)` and add a `git mv` rename to the uppercase name in Suggested Updates (apply only with user approval)
   - Check if CLAUDE.md has `## Documentation` section with lazy-load references to `docs/`
   - If CLAUDE.md has inline content (Architecture/DB Schema/API sections longer than 20 lines), suggest extracting to `docs/`

## Part 3: docs/ Content Sync

### Incremental mode (stamp-based — check FIRST)

Before any deep comparison: skip the files the `second-brain` skill exempts from stamping, and for the rest read the stamp it defines.

- Stamp present → run `git diff --name-only <commit>..HEAD -- <globs>`.
  - Empty diff → mark the doc **OK (stamp-verified)** and SKIP its deep comparison below.
  - Non-empty diff → deep-compare ONLY against the changed files (the diff is the scope).
- Stamp missing → full comparison as below, and suggest adding a stamp in the report.
- After the user confirms a doc is in sync, bump its `verified-against` to current HEAD (the one allowed write).

### Full comparison

For each docs/ file not cleared by its stamp, compare its content against the actual codebase. Use the Explore agent or parallel search agents for efficiency.

8. **ARCHITECTURE.md** ↔ 실제 모듈 구조
   - 문서에 있는 모듈이 실제로 존재하는지, 새로 추가된 모듈이 누락되지 않았는지
   - 모듈 간 의존관계나 데이터 흐름 다이어그램이 현재 코드와 일치하는지
9. **DB-SCHEMA.md** ↔ `prisma/schema.prisma`
   - 문서의 모델/필드/관계가 실제 스키마와 일치하는지
   - 새로 추가되거나 삭제된 모델, 변경된 필드 탐지
10. **API-SPEC.md** ↔ 실제 controller/route 파일
    - 문서에 없는 새 엔드포인트, 삭제된 엔드포인트, 변경된 request/response 형식 탐지
11. **FRONTEND-ARCHITECTURE.md** ↔ 실제 컴포넌트/라우팅 구조
    - 컴포넌트 트리, 상태 관리, 라우팅 설정이 현재 코드와 일치하는지
12. **BUSINESS-LOGIC.md** ↔ 도메인 서비스/워크플로우
    - 문서화된 비즈니스 규칙이 현재 구현과 일치하는지

존재하지 않는 docs/ 파일은 건너뛴다. 드리프트 발견 시 **구체적으로 어떤 내용을 추가/수정/삭제해야 하는지** 제안한다.

## Part 4: impl-spec Lifecycle Hygiene

Audit `docs/impl-spec/` against the lifecycle in the `second-brain` skill. Specs are never synced against code drift — they record what was planned, not what exists — so this audit only checks lifecycle state, never spec content. Archived specs are frozen; active ones are working documents their owner edits directly:

1. **Frontmatter check**: every `.md` under `docs/impl-spec/` (top level AND `archive/`) must START with the frontmatter block that `impl-plan`'s `## Output Format` defines (that skill owns the field list). Missing or malformed (e.g., status written as a body bullet) → flag; propose adding it with `date` derived from `git log --diff-filter=A --follow`. Specs predating a field are not defects — flag only a missing or malformed block.
2. **Closed-but-not-archived**: for each top-level spec with `status: active`, look for completion evidence — a merged PR/commit referencing the spec number, or the spec body itself declaring 구현/완료. Evidence found → propose `status: done` + `git mv` into `docs/impl-spec/archive/` **only when `impl-execute` Phase 3 step 1's close conditions all hold — read them there, do not work from memory**. Any `UNRESOLVED` row in the spec's `## Review Notes` is a mechanical no: flag it as "close via `/impl-execute`". This command is not a second door to `done`. (Shelved/paused specs stay top-level as `active` with the pause noted in the body.)
3. **Archived-but-active**: files inside `archive/` whose status is still `active` → flag (must be `done` or `superseded-by`).

Report findings in the table; apply frontmatter additions and moves only after user approval (same write policy as Part 3 stamp bumps).

## Part 5: BUG-FIXES.md Promotion

Scan `BUG-FIXES.md` for recurring patterns — 2+ entries sharing a root-cause category (e.g., same API misuse, same race condition shape, same validation gap).

For each recurring pattern, propose ONE promotion target (most durable first):
1. **Test** — a regression test that pins the behavior
2. **Lint rule / hook** — a mechanical check that blocks the pattern
3. **CLAUDE.md / rules line** — only if not machine-checkable; must meet the Self-Improvement bar in `~/.claude/CLAUDE.md`

For entries already covered by an existing guard, propose compaction: compress to a one-line reference (`- <date> <title> → promoted to <guard>`). Promotion doubles as compaction — this keeps the file from growing unboundedly.

Report only; apply promotions and compaction after user approval.

## Output

```
## Docs Sync Report

### CLAUDE.md
| Category | Status | Details |
|----------|--------|---------|
| Stack | OK/DRIFT | ... |
| Structure | OK/DRIFT | ... |
| Scripts | OK/DRIFT | ... |
| New Modules | OK/DRIFT | ... |
| Removed Items | OK/DRIFT | ... |
| Env Vars | OK/DRIFT | ... |

### docs/ Structure
| File | Status | Details |
|------|--------|---------|
| ARCHITECTURE.md | EXISTS/MISSING | ... |
| DB-SCHEMA.md | EXISTS/MISSING/N/A | ... |
| ... | ... | ... |

### docs/ Content Sync
| File | Status | Drift Details |
|------|--------|---------------|
| ARCHITECTURE.md | OK (stamp-verified)/OK/DRIFT/NO STAMP | ... |
| DB-SCHEMA.md | OK (stamp-verified)/OK/DRIFT/NO STAMP | ... |
| ... | ... | ... |

### impl-spec Lifecycle
| Spec | Issue | Proposed Fix |
|------|-------|--------------|
| ... | NO FRONTMATTER / CLOSED-NOT-ARCHIVED / ARCHIVED-ACTIVE | ... |

### BUG-FIXES.md Promotion
| Pattern (2+ entries) | Entries | Proposed Guard | Compaction |
|----------------------|---------|----------------|------------|
| ... | ... | test/lint/rule | ... |

### Suggested Updates
- (file path, section, and specific change needed)
- (stamp additions/bumps for confirmed docs)
```

If no CLAUDE.md exists at project root, offer to create one by scanning the codebase.

$ARGUMENTS

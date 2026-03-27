---
description: Check if project CLAUDE.md and docs/ are in sync with the actual codebase
---

Audit the project's CLAUDE.md and docs/ files against the current codebase state. Do NOT modify files — only report findings and suggest updates.

## Part 1: CLAUDE.md Sync

1. **Stack & Dependencies**: Compare `package.json` dependencies with documented tech stack
2. **Directory Structure**: Verify documented structure matches actual `ls` output
3. **Scripts & Commands**: Confirm documented npm scripts / CLI commands actually exist
4. **New Modules**: Identify significant new files/directories not mentioned in docs
5. **Removed Items**: Flag anything documented but no longer in the codebase
6. **Environment Variables**: Check if documented env vars match `.env.example` (do NOT read `.env`)

## Part 2: docs/ Structure

7. **Docs Existence**: Check `docs/` folder for standard Second Brain files.
   - Report which standard files exist vs missing (architecture.md, db-schema.md, api-spec.md, frontend-architecture.md, business-logic.md, decisions.md, bug-fixes.md)
   - Check if CLAUDE.md has `## Documentation` section with lazy-load references to `docs/`
   - If CLAUDE.md has inline content (Architecture/DB Schema/API sections longer than 20 lines), suggest extracting to `docs/`

## Part 3: docs/ Content Sync

For each existing docs/ file, compare its content against the actual codebase. Use the Explore agent or parallel search agents for efficiency.

8. **architecture.md** ↔ 실제 모듈 구조
   - 문서에 있는 모듈이 실제로 존재하는지, 새로 추가된 모듈이 누락되지 않았는지
   - 모듈 간 의존관계나 데이터 흐름 다이어그램이 현재 코드와 일치하는지
9. **db-schema.md** ↔ `prisma/schema.prisma`
   - 문서의 모델/필드/관계가 실제 스키마와 일치하는지
   - 새로 추가되거나 삭제된 모델, 변경된 필드 탐지
10. **api-spec.md** ↔ 실제 controller/route 파일
    - 문서에 없는 새 엔드포인트, 삭제된 엔드포인트, 변경된 request/response 형식 탐지
11. **frontend-architecture.md** ↔ 실제 컴포넌트/라우팅 구조
    - 컴포넌트 트리, 상태 관리, 라우팅 설정이 현재 코드와 일치하는지
12. **business-logic.md** ↔ 도메인 서비스/워크플로우
    - 문서화된 비즈니스 규칙이 현재 구현과 일치하는지

존재하지 않는 docs/ 파일은 건너뛴다. 드리프트 발견 시 **구체적으로 어떤 내용을 추가/수정/삭제해야 하는지** 제안한다.

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
| architecture.md | EXISTS/MISSING | ... |
| db-schema.md | EXISTS/MISSING/N/A | ... |
| ... | ... | ... |

### docs/ Content Sync
| File | Status | Drift Details |
|------|--------|---------------|
| architecture.md | OK/DRIFT | ... |
| db-schema.md | OK/DRIFT | ... |
| ... | ... | ... |

### Suggested Updates
- (file path, section, and specific change needed)
```

If no CLAUDE.md exists at project root, offer to create one by scanning the codebase.

$ARGUMENTS

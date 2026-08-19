# claude-files

`~/.claude/` global configuration files backup repository.

## Contents

- `CLAUDE.md` — Global instructions
- `settings.json` — Global settings (permissions, hooks)
- `commands/` — Slash commands
- `rules/` — Global rules (always loaded into every session)
- `docs/` — On-demand protocols, read only when referenced
- `agents/` — Agent definitions
- `hooks/` — Hook scripts
- `skills/` — Skill definitions
- `statusline-command.py` — Status line renderer

## Skills & Commands

언제 어떤 걸 쓰는지 요약. 스킬은 대화 내용에 따라 자동 발동되고(수동 전용은 표시), 명령어는 `/이름`으로 직접 호출한다.

### 개발 워크플로우

기능 하나가 흘러가는 순서대로:

| 이름 | 언제 | 무엇을 해주나 |
|------|------|--------------|
| `grilling` | 아이디어·요구사항이 아직 모호할 때 ("갈궈줘") | 답할 수 있는 질문 전부를 라운드로 묶어 캐물어서 설계를 명확하게 만든다. 확정된 용어·결정은 세션 끝에 GLOSSARY/ADR 갱신으로 제안 |
| `codebase-design` | 새 모듈의 인터페이스를 잡거나, 테스트 걸 곳(seam)이 애매하거나, mock이 덕지덕지 붙을 때 | deep module 설계 어휘와 원칙 제공. 필요시 서브에이전트 3안 병렬 설계 비교(design-it-twice) |
| `impl-plan` | tier-2 작업(위험 영역 or 5+ 파일)을 구현하기 전 | 영향 범위 조사 → `docs/impl-spec/` 스펙 작성 → 코드와 대조하는 리뷰 루프. PRD가 있으면 로드해서 인터뷰 단축 |
| `impl-execute` | 승인된 impl-spec을 실제로 구현할 때 | 스펙의 첫 미완료 단계부터 구현 → 전체 diff 독립 리뷰 → 조건 충족 시 스펙 종료·보관 |
| `tdd` | 테스트 먼저 개발하고 싶을 때 ("red-green") | seam 합의 → 실패 테스트 → 최소 구현 반복. 좋은 테스트/안티패턴 기준 포함 |
| `diagnosing-bugs` | 원인이 바로 안 보이는 어려운 버그·성능 저하 | 가설보다 먼저 "빨간불 뜨는 재현 루프"를 만들게 강제하는 6단계 진단 규율. 명백한 버그는 그냥 고치면 됨 |
| `resolving-merge-conflicts` | merge/rebase 충돌이 났을 때 | 양쪽 의도를 파악해 해소하고 검사 실행. 판단 불가 hunk는 사용자에게 넘김 |
| `/improve-codebase-architecture` (수동) | 코드베이스 구조 개선 지점을 찾고 싶을 때 | 핫스팟 스캔 → 개선 후보를 Before/After 다이어그램 리포트(Artifact)로 제시 → 고른 후보를 grilling으로 구체화 |

### 문서 (Second Brain)

| 이름 | 언제 | 무엇을 해주나 |
|------|------|--------------|
| `second-brain` | docs/ 문서를 만들거나 고칠 때 자동 로드 | 표준 문서 세트(PRD/, ARCHITECTURE.md, ADR.md 등)와 작성·유지 규칙. ADR 기록 판정 3-게이트 포함 |
| `/init-docs` | 기존 프로젝트에 표준 docs/를 처음 깔 때 | 코드베이스를 분석해 문서를 실제 내용으로 채워 생성. PRD는 템플릿만 |
| `/docs-sync` | 코드 변경 후 문서가 낡았는지 확인할 때 | freshness stamp 기반으로 코드↔문서 드리프트를 보고. 수정은 승인 후 |

### Git

| 이름 | 언제 | 무엇을 해주나 |
|------|------|--------------|
| `/commit` | 변경사항을 커밋할 때 | 변경 분석 후 Conventional Commits 형식(한국어 설명)으로 커밋 |
| `/weekly-report` | 주간 보고 쓸 때 | git 이력 기반 주간업무보고서 생성 |

### 위임·기타

| 이름 | 언제 | 무엇을 해주나 |
|------|------|--------------|
| `codex-delegation` | 사용자가 "codex로/GPT로 구현해"라고 명시했을 때만 | codex-worker 위임 계약: 모드 질문, 디스패치, 게이팅, union 리뷰 |
| `orca-cli` | Orca를 직접 언급했을 때만 | orca CLI로 워크트리·터미널·자동화 관리 |
| `writing-for-agents` | 스킬·CLAUDE.md 등 에이전트용 문서를 쓸 때 | context pointer, progressive disclosure, no-op 사냥 등 작성 원칙 |

비활성(`settings.json` skillOverrides): api-design, db-migrations, orchestration, security-checklist. `benchmark-workspace/`는 평가 실행 기록용.

### Agents

| 이름 | 역할 |
|------|------|
| `planner` | 변경 전 영향 범위(관련 파일·역의존성·blast radius) 읽기 전용 조사 |
| `reviewer` | 코드/계획/구현 리뷰. control-plane·tier-2 변경엔 필수 |
| `codex-worker` | codex CLI 실행·전달만 하는 워커 (판단은 부모가) |

### Hooks

| 스크립트 | 차단 대상 |
|----------|----------|
| `block-env-read.sh` | .env 등 시크릿 파일 읽기 |
| `block-env-commit.sh` | .env 파일 git 추가/커밋 |
| `block-dangerous-git.sh` | git push, reset --hard, clean -f, branch -D, checkout/restore로 트리 폐기 |
| `auto-format.sh` | (차단 아님) Write/Edit 후 자동 포맷 |

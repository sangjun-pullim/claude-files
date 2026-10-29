# claude-files

`~/.claude/` global configuration files backup repository.

## Contents

- `CLAUDE.md` — Global instructions (communication, scope, standards, hard rules, agents, delegation, docs). 위험 영역·5+ 파일·워크트리 분리·머지·control-plane 게이트가 여기 있다
- `settings.json` — Global settings (permissions, autoMode 규칙, hooks, statusLine, 플러그인, 기본 모델·effort, 모델별 effort·autoCompactWindow, 서브에이전트 기본 모델(`env`), `showThinkingSummaries` 등 기타 플래그)
- `rules/` — Always-loaded rules (`second-brain.md`: docs research order, 현재 상태 문서 고쳐 쓰기, 문서 간 충돌 시 사용자 확인)
- `commands/` — Slash commands
- `agents/` — Agent definitions
- `hooks/` — Hook scripts
- `skills/` — Skill definitions
- `statusline-command.py` — Status line renderer

## Skills & Commands

언제 어떤 걸 쓰는지 요약. 스킬은 대화 내용에 따라 자동 발동되고(수동 전용은 표시), 명령어는 `/이름`으로 직접 호출한다.

### 개발 워크플로우

기능 하나가 흘러가는 순서대로:

| 이름 | 언제 | 무엇을 해주나 | 예시 |
|------|------|--------------|------|
| `grilling` 🅼 | 아이디어·요구사항이 아직 모호할 때 ("갈궈줘") | 답할 수 있는 질문 전부를 라운드로 묶어 캐물어서 설계를 명확하게 만든다. 확정된 용어·결정은 세션 끝에 GLOSSARY/ADR 갱신으로 제안 | "정산 재처리 기능 만들려는데 갈궈줘" |
| `codebase-design` 🅼 | 새 모듈의 인터페이스를 잡거나, 테스트 걸 곳(seam)이 애매하거나, mock이 덕지덕지 붙을 때 | deep module 설계 어휘와 원칙 제공. 필요시 서브에이전트 3개 이상으로 병렬 설계 비교(design-it-twice) | "수집 재시도 모듈 인터페이스 어떻게 잡는 게 좋을까?" |
| `impl-plan` | 프로덕션 파일 5개 이상을 건드리는 변경을 구현하기 전 | 영향 범위 조사 → `docs/impl-spec/`에 HTML 계획서 작성(동작 트리 + 결정 항목, 브라우저에서 결정 후 Respond) → 결정 반영 → 코드와 대조하는 리뷰 루프(최대 3회). 새로 들어오는 것이 닿는데 옛 범위를 전제한 곳(정방향 추적 행)은 모두 고치는 것이 기본이고, 빼려면 사용자 승인이 필요하며 리뷰가 이를 확인. PRD가 있으면 대조. 기존 .md 계획서는 .md 그대로 검증 | "/impl-plan 주문 출고 재처리 기능" |
| `impl-execute` | 승인된 impl-spec을 실제로 구현할 때 | 스펙의 첫 미완료 단계부터 구현 → 전체 diff 독립 리뷰(최대 3회) → 조건 충족 시 스펙 종료·보관 | "/impl-execute 042 스펙 구현해줘" |
| `tdd` 🅼 | 테스트 먼저 개발하고 싶을 때 ("red-green") | seam 합의 → 실패 테스트 → 최소 구현 반복. 좋은 테스트/안티패턴 기준 포함 | "이 기능 테스트 먼저 쓰면서 만들자" |
| `diagnosing-bugs` 🅼 | 원인이 바로 안 보이는 어려운 버그·성능 저하 | 가설보다 먼저 "빨간불 뜨는 재현 루프"를 만들게 강제하는 6단계 진단 규율. 명백한 버그는 그냥 고치면 됨 | "수집 워커가 간헐적으로 멈춰. diagnose 해줘" |
| `resolving-merge-conflicts` 🅼 | merge/rebase 충돌이 났을 때 | 양쪽 의도를 파악해 해소하고 검사 실행. 판단 불가 hunk는 사용자에게 넘김 | "rebase 하다 충돌났어, 해결해줘" |
| `/improve-codebase-architecture` 🅼 (수동) | 코드베이스 구조 개선 지점을 찾고 싶을 때 | 핫스팟 스캔 → 개선 후보를 Before/After 다이어그램 리포트(Artifact)로 제시 → 고른 후보를 grilling으로 구체화 | "/improve-codebase-architecture collector 모듈 위주로" |

### 문서 (Second Brain)

| 이름 | 언제 | 무엇을 해주나 | 예시 |
|------|------|--------------|------|
| `second-brain` | docs/ 문서를 만들거나 고칠 때 자동 로드 | 표준 문서 세트(PRD.md, ARCHITECTURE.md, ADR.md 등)와 작성·유지 규칙. ADR 기록 판정 3-게이트 포함 | "BUSINESS-LOGIC.md에 정산 규칙 정리해줘" |
| `/init-docs` | 기존 프로젝트에 표준 docs/를 처음 깔 때 | 코드베이스를 분석해 문서를 실제 내용으로 채워 생성. PRD는 템플릿만 | "/init-docs" |
| `/docs-sync` | 코드 변경 후 문서가 낡았는지 확인할 때 | freshness stamp 기반으로 코드↔문서 드리프트를 보고. 수정은 승인 후 | "/docs-sync" |

### Git

| 이름 | 언제 | 무엇을 해주나 | 예시 |
|------|------|--------------|------|
| `/commit` | 변경사항을 커밋할 때 | diff 확인 → `reviewer`로 검토(control-plane 파일이 없는 문서 변경은 생략) → 변경 분석 후 Conventional Commits 형식(한국어 설명) 메시지 제안 → 승인 후 커밋 | "/commit" |
| `/weekly-report` | 주간 보고 쓸 때 | git 이력 기반 주간업무보고서 생성 | "/weekly-report" |

### 위임·기타

| 이름 | 언제 | 무엇을 해주나 | 예시 |
|------|------|--------------|------|
| `codex-delegation` | 사용자가 "codex로/GPT로 구현해"라고 명시했을 때만 | codex-worker 위임 계약: 디스패치, 게이팅, union 리뷰 (worktree/in-place 모드 질문은 `CLAUDE.md`의 **워크트리 분리** 규칙 소관) | "이 스펙 codex한테 구현시켜" |
| `orca-cli` | Orca를 직접 언급했을 때, 또는 **워크트리 분리** 규칙이 감독 디스패치·full handoff로 라우팅할 때 | orca CLI로 워크트리·터미널·자동화 관리. 「Full Handoffs」(넘기고 손 뗌) 와 「Supervised Dispatch」(내가 게이팅·리뷰·통합 브랜치 조립, base 브랜치 병합은 사용자) 절차를 나눠 정의 | "orca 워크트리 목록 보여줘" / "이 작업 다른 에이전트한테 넘겨줘" |
| `writing-for-agents` 🅼 | 스킬·CLAUDE.md 등 에이전트용 문서를 쓸 때 | context pointer, progressive disclosure, no-op 사냥, 런타임 시스템 지침과 겹치는 규칙 금지, control-plane 파일 편집 규칙 | "디버깅용 스킬 하나 새로 만들자" |

> **출처**: 🅼 표시가 붙은 스킬은 [mattpocock/skills](https://github.com/mattpocock/skills)(MIT)에서 가져와 이 하네스(Second Brain 문서 체계)에 맞게 각색한 것. `second-brain`의 ADR 기록 3-게이트도 같은 저장소의 domain-modeling에서 가져옴.
>
> `impl-plan`의 HTML 계획서 런타임·참조 문서·예시는 anthropics/claude-plugins-community의 html-plan(Thariq Shihipar — plugin.json MIT, 저장소 Apache-2.0)에서 가져와 각색함 — `skills/impl-plan/runtime/NOTICE.md`.

### Agents

| 이름 | 역할 |
|------|------|
| `scope-analyst` (Opus high) | 변경 전 영향 범위(관련 파일·역의존성·blast radius) 읽기 전용 조사. 정방향 추적: 변경이 새로 들여보내는 데이터·입력·상태를 시스템 밖으로 나갈 때까지 따라가며 옛 범위를 전제한 소비처(분기·프롬프트·고객 문구)를 번호 붙여 보고하고, 입력 계약이 강제하지 않는 문서 전제는 위험 항목으로 보고. 바뀌는 규칙마다 그 규칙을 다시 적은 현재 상태 문서 문장(사본)의 수·위치·소유도 보고 |
| `implementer` (Opus medium) | 리드가 넘긴 자족적 스펙을 현재 체크아웃에서 구현하고 diff·검증 결과·가정을 보고 |
| `editor` (Sonnet low) | 정확한 before/after 규칙을 여러 파일에 기계적으로 적용하고 위치별로 보고 |
| `reviewer` (Opus xhigh) | 코드/계획/구현/control-plane 리뷰. 위험 영역·control-plane 변경엔 필수. 불필요한 코드(규칙 위반 주석·도달 불가 분기·중복 헬퍼·검사 회피 캐스트)도 Excess로 지적. CRITICAL/HIGH는 종류별 증거(입력·경로·잘못된 결과, 스펙 줄과 코드 줄 등)가 없으면 MEDIUM 이하 |
| `codex-worker` (Sonnet) | codex CLI 실행·전달만 하는 워커 (판단은 부모가). 기본은 orca 워크트리에서 실행하고, `orca status`가 실패하거나 스폰 프롬프트에 in-place mode가 있으면 현재 체크아웃에서 실행 |

### Hooks

| 스크립트 | 차단 대상 |
|----------|----------|
| `block-env-read.sh` | .env 등 시크릿 파일 읽기 |
| `block-env-commit.sh` | .env 파일 git 추가/커밋 |
| `block-dangerous-git.sh` | reset --hard, clean -f, branch -D, checkout/restore로 트리 폐기 |
| `block-fable-subagent.sh` | 서브에이전트를 Fable 모델로 띄우기(`Agent` 도구의 `model` 인자) |
| `auto-format.sh` | (차단 아님) Write/Edit 후, 프로젝트에 prettier 설정이 있을 때만 ts·tsx·js·jsx·json·css·scss 파일을 설치된 prettier로 포맷 |
| `settings.json` 인라인 명령 (12개 이벤트) | (차단 아님) Orca 앱이 넣은 훅. 레포 밖의 `~/.orca/agent-hooks/claude-hook.sh`가 있으면 이벤트 입력을 넘기고, 없으면 `{}`만 출력 |

# claude-files

`~/.claude/` global configuration files backup repository.

## Contents

- `CLAUDE.md` — Global instructions (communication, scope, standards, hard rules, agents). 위험 영역·5+ 파일·워크트리 분리·머지·control-plane 게이트가 여기 있다
- `settings.json` — Global settings (permissions, hooks, 모델별 effort, `showThinkingSummaries`)
- `rules/` — Always-loaded rules (`second-brain.md`: docs research order)
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
| `codebase-design` 🅼 | 새 모듈의 인터페이스를 잡거나, 테스트 걸 곳(seam)이 애매하거나, mock이 덕지덕지 붙을 때 | deep module 설계 어휘와 원칙 제공. 필요시 서브에이전트 3안 병렬 설계 비교(design-it-twice) | "수집 재시도 모듈 인터페이스 어떻게 잡는 게 좋을까?" |
| `impl-plan` | 프로덕션 파일 5개 이상을 건드리는 변경을 구현하기 전 | 영향 범위 조사 → `docs/impl-spec/` 스펙 작성 → 코드와 대조하는 리뷰 루프(최대 3회). PRD가 있으면 대조 | "/impl-plan 주문 출고 재처리 기능" |
| `impl-execute` | 승인된 impl-spec을 실제로 구현할 때 | 스펙의 첫 미완료 단계부터 구현 → 전체 diff 독립 리뷰(최대 3회) → 조건 충족 시 스펙 종료·보관 | "/impl-execute 042 스펙 구현해줘" |
| `tdd` 🅼 | 테스트 먼저 개발하고 싶을 때 ("red-green") | seam 합의 → 실패 테스트 → 최소 구현 반복. 좋은 테스트/안티패턴 기준 포함 | "이 기능 테스트 먼저 쓰면서 만들자" |
| `diagnosing-bugs` 🅼 | 원인이 바로 안 보이는 어려운 버그·성능 저하 | 가설보다 먼저 "빨간불 뜨는 재현 루프"를 만들게 강제하는 6단계 진단 규율. 명백한 버그는 그냥 고치면 됨 | "수집 워커가 간헐적으로 멈춰. diagnose 해줘" |
| `resolving-merge-conflicts` 🅼 | merge/rebase 충돌이 났을 때 | 양쪽 의도를 파악해 해소하고 검사 실행. 판단 불가 hunk는 사용자에게 넘김 | "rebase 하다 충돌났어, 해결해줘" |
| `/improve-codebase-architecture` 🅼 (수동) | 코드베이스 구조 개선 지점을 찾고 싶을 때 | 핫스팟 스캔 → 개선 후보를 Before/After 다이어그램 리포트(Artifact)로 제시 → 고른 후보를 grilling으로 구체화 | "/improve-codebase-architecture collector 모듈 위주로" |

### 화면 설계

| 이름 | 언제 | 무엇을 해주나 | 예시 |
|------|------|--------------|------|
| `ux-wireframe` | 관리자 콘솔·백오피스 화면을 그릴 때 ("와이어프레임", "화면 그려줘", "UX 정리안", "관리자 화면 설계") | 계약 문서를 기술 명세로 두고 화면·문구만 사람의 말로 다시 짠 단일 HTML. 사이드바=위계도, 요소 ID + 번호 주석, 무채색 상태 표시, 빈 상태·오류 포함. 에셋은 `${CLAUDE_SKILL_DIR}/assets/`의 skeleton + base.css 인라인 | "정산 관리자 화면 UX 정리안 만들어줘" |

### 문서 (Second Brain)

| 이름 | 언제 | 무엇을 해주나 | 예시 |
|------|------|--------------|------|
| `second-brain` | docs/ 문서를 만들거나 고칠 때 자동 로드 | 표준 문서 세트(PRD.md, ARCHITECTURE.md, ADR.md 등)와 작성·유지 규칙. ADR 기록 판정 3-게이트 포함 | "BUSINESS-LOGIC.md에 정산 규칙 정리해줘" |
| `/init-docs` | 기존 프로젝트에 표준 docs/를 처음 깔 때 | 코드베이스를 분석해 문서를 실제 내용으로 채워 생성. PRD는 템플릿만 | "/init-docs" |
| `/docs-sync` | 코드 변경 후 문서가 낡았는지 확인할 때 | freshness stamp 기반으로 코드↔문서 드리프트를 보고. 수정은 승인 후 | "/docs-sync" |

### Git

| 이름 | 언제 | 무엇을 해주나 | 예시 |
|------|------|--------------|------|
| `/commit` | 변경사항을 커밋할 때 | 변경 분석 후 Conventional Commits 형식(한국어 설명)으로 커밋 | "/commit" |
| `/weekly-report` | 주간 보고 쓸 때 | git 이력 기반 주간업무보고서 생성 | "/weekly-report" |

### 위임·기타

| 이름 | 언제 | 무엇을 해주나 | 예시 |
|------|------|--------------|------|
| `codex-delegation` | 사용자가 "codex로/GPT로 구현해"라고 명시했을 때만 | codex-worker 위임 계약: 디스패치, 게이팅, union 리뷰 (worktree/in-place 모드 질문은 `CLAUDE.md`의 **워크트리 분리** 규칙 소관) | "이 스펙 codex한테 구현시켜" |
| `orca-cli` | Orca를 직접 언급했을 때, 또는 **워크트리 분리** 규칙이 감독 디스패치·full handoff로 라우팅할 때 | orca CLI로 워크트리·터미널·자동화 관리. 「Full Handoffs」(넘기고 손 뗌) 와 「Supervised Dispatch」(내가 게이팅·리뷰·병합) 절차를 나눠 정의 | "orca 워크트리 목록 보여줘" / "이 작업 다른 에이전트한테 넘겨줘" |
| `writing-for-agents` 🅼 | 스킬·CLAUDE.md 등 에이전트용 문서를 쓸 때 | context pointer, progressive disclosure, no-op 사냥, control-plane 파일 편집 규칙 | "디버깅용 스킬 하나 새로 만들자" |

`benchmark-workspace/`는 평가 실행 기록용.

> **출처**: 🅼 표시가 붙은 스킬은 [mattpocock/skills](https://github.com/mattpocock/skills)(MIT)에서 가져와 이 하네스(Second Brain 문서 체계)에 맞게 각색한 것. `second-brain`의 ADR 기록 3-게이트도 같은 저장소의 domain-modeling에서 가져옴.

### Agents

| 이름 | 역할 |
|------|------|
| `planner` | 변경 전 영향 범위(관련 파일·역의존성·blast radius) 읽기 전용 조사 |
| `reviewer` | 코드/계획/구현/control-plane 리뷰. 위험 영역·control-plane 변경엔 필수 |
| `codex-worker` | codex CLI 실행·전달만 하는 워커 (판단은 부모가) |

### Hooks

| 스크립트 | 차단 대상 |
|----------|----------|
| `block-env-read.sh` | .env 등 시크릿 파일 읽기 |
| `block-env-commit.sh` | .env 파일 git 추가/커밋 |
| `block-dangerous-git.sh` | reset --hard, clean -f, branch -D, checkout/restore로 트리 폐기 |
| `auto-format.sh` | (차단 아님) Write/Edit 후 자동 포맷 |

## 변경 이력

**2026-08 — 규제 프롬프트 정리.** Fable 5 / Opus 5 기준으로 모델이 기본으로 하는 행동을 규제하던 항목을 제거했다: `CLAUDE.md` Discipline·Self-Improvement 섹션, `rules/risk-triage.md`(티어 표) · `rules/agents.md` · `rules/standards.md`(CLAUDE.md에 흡수), `docs/review-loop.md`(스킬에 인라인), 꺼져 있던 스킬 4개(api-design, db-migrations, orchestration, security-checklist), agent teams 플래그. 항상 로드되는 컨텍스트 약 250줄 → 약 70줄. 복구는 git 이력에서.

**2026-09 — Fable 5.1 가이드 반영과 규칙 추가.** 5.1에서 자주 보고된 행동에 맞춰 `CLAUDE.md`에 `## Scope`(요청 범위 밖 수정 억제, 국소 편집 우선), mannered prose 금지, 테스트 분량 기준을 넣고, `settings.json`의 `claude-fable-5-1` effort를 `xhigh` → `high`로 낮추고 `showThinkingSummaries`를 켰다. 같은 시기에 **워크트리 분리** Hard Rule이 신설되어 다른 에이전트에게 작업을 넘길 때의 worktree/in-place 질문이 `codex-delegation`에서 `CLAUDE.md`로 옮겨졌고, `orca-cli`가 「Full Handoffs」/「Supervised Dispatch」로 나뉘었다. `ux-wireframe` 스킬 추가.

이어서 8월에 지웠던 **Simplicity 원칙을 되살렸다** — `## Scope`에 "가장 단순한 해결책을 먼저"가 돌아왔고, 함수 50줄 분할 규칙에는 깊은 모듈 설계와 충돌하지 않도록 "쪼갠 조각을 인터페이스에 새로 노출하지 않는다" 단서가 붙었다. `autoMode`의 자동 승인 범위도 좁혔다: 라이브 DB에 쓰는 `pnpm smoke:*`를 allow에서 빼고, `aws s3 ls` 패턴에 버킷을 명시했다(기존 패턴은 다른 버킷과 `--endpoint-url` 임의 호스트까지 자동 승인했다).

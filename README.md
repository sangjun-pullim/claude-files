# claude-files

`~/.claude/` global configuration files backup repository.

## Contents

- `CLAUDE.md` — Global instructions (communication, scope, standards, hard rules, agents). 위험 영역·5+ 파일·워크트리 분리·머지·control-plane 게이트가 여기 있다
- `settings.json` — Global settings (permissions, hooks, 모델별 effort, `showThinkingSummaries`)
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
| `codebase-design` 🅼 | 새 모듈의 인터페이스를 잡거나, 테스트 걸 곳(seam)이 애매하거나, mock이 덕지덕지 붙을 때 | deep module 설계 어휘와 원칙 제공. 필요시 서브에이전트 3안 병렬 설계 비교(design-it-twice) | "수집 재시도 모듈 인터페이스 어떻게 잡는 게 좋을까?" |
| `impl-plan` | 프로덕션 파일 5개 이상을 건드리는 변경을 구현하기 전 | 영향 범위 조사 → `docs/impl-spec/` 스펙 작성(바뀌는 파일·의존 코드·규칙 사본을 그린 Mermaid `## Change Map` 포함) → 코드와 대조하는 리뷰 루프(최대 3회). PRD가 있으면 대조 | "/impl-plan 주문 출고 재처리 기능" |
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
| `writing-for-agents` 🅼 | 스킬·CLAUDE.md 등 에이전트용 문서를 쓸 때 | context pointer, progressive disclosure, no-op 사냥, 런타임 시스템 지침과 겹치는 규칙 금지, control-plane 파일 편집 규칙 | "디버깅용 스킬 하나 새로 만들자" |

`benchmark-workspace/`는 평가 실행 기록용.

> **출처**: 🅼 표시가 붙은 스킬은 [mattpocock/skills](https://github.com/mattpocock/skills)(MIT)에서 가져와 이 하네스(Second Brain 문서 체계)에 맞게 각색한 것. `second-brain`의 ADR 기록 3-게이트도 같은 저장소의 domain-modeling에서 가져옴.

### Agents

| 이름 | 역할 |
|------|------|
| `scope-analyst` (Opus high) | 변경 전 영향 범위(관련 파일·역의존성·blast radius) 읽기 전용 조사. 바뀌는 규칙마다 그 규칙을 다시 적은 현재 상태 문서 문장(사본)의 수·위치·소유도 보고 |
| `implementer` (Opus medium) | 리드가 넘긴 자족적 스펙을 현재 체크아웃에서 구현하고 diff·검증 결과·가정을 보고 |
| `editor` (Sonnet low) | 정확한 before/after 규칙을 여러 파일에 기계적으로 적용하고 위치별로 보고 |
| `reviewer` (Opus xhigh) | 코드/계획/구현/control-plane 리뷰. 위험 영역·control-plane 변경엔 필수. 불필요한 코드(규칙 위반 주석·도달 불가 분기·중복 헬퍼·검사 회피 캐스트)도 Excess로 지적. CRITICAL/HIGH는 종류별 증거(입력·경로·잘못된 결과, 스펙 줄과 코드 줄 등)가 없으면 MEDIUM 이하 |
| `codex-worker` | codex CLI 실행·전달만 하는 워커 (판단은 부모가) |

### Hooks

| 스크립트 | 차단 대상 |
|----------|----------|
| `block-env-read.sh` | .env 등 시크릿 파일 읽기 |
| `block-env-commit.sh` | .env 파일 git 추가/커밋 |
| `block-dangerous-git.sh` | reset --hard, clean -f, branch -D, checkout/restore로 트리 폐기 |
| `block-fable-subagent.sh` | 서브에이전트를 Fable 모델로 띄우기(`Agent` 도구의 `model` 인자) |
| `auto-format.sh` | (차단 아님) Write/Edit 후 자동 포맷 |

## 변경 이력

**2026-08 — 규제 프롬프트 정리.** Fable 5 / Opus 5 기준으로 모델이 기본으로 하는 행동을 규제하던 항목을 제거했다: `CLAUDE.md` Discipline·Self-Improvement 섹션, `rules/risk-triage.md`(티어 표) · `rules/agents.md` · `rules/standards.md`(CLAUDE.md에 흡수), `docs/review-loop.md`(스킬에 인라인), 꺼져 있던 스킬 4개(api-design, db-migrations, orchestration, security-checklist), agent teams 플래그. 항상 로드되는 컨텍스트 약 250줄 → 약 70줄. 복구는 git 이력에서.

**2026-09 — Fable 5.1 가이드 반영과 규칙 추가.** 5.1에서 자주 보고된 행동에 맞춰 `CLAUDE.md`에 `## Scope`(요청 범위 밖 수정 억제, 국소 편집 우선), mannered prose 금지, 테스트 분량 기준을 넣고, `settings.json`의 `claude-fable-5-1` effort를 `xhigh` → `high`로 낮추고 `showThinkingSummaries`를 켰다. 같은 시기에 **워크트리 분리** Hard Rule이 신설되어 다른 에이전트에게 작업을 넘길 때의 worktree/in-place 질문이 `codex-delegation`에서 `CLAUDE.md`로 옮겨졌고, `orca-cli`가 「Full Handoffs」/「Supervised Dispatch」로 나뉘었다. `ux-wireframe` 스킬 추가.

이어서 8월에 지웠던 **Simplicity 원칙을 되살렸다** — `## Scope`에 "가장 단순한 해결책을 먼저"가 돌아왔고, 함수 50줄 분할 규칙에는 깊은 모듈 설계와 충돌하지 않도록 "쪼갠 조각을 인터페이스에 새로 노출하지 않는다" 단서가 붙었다. `autoMode`의 자동 승인 범위도 좁혔다: 라이브 DB에 쓰는 `pnpm smoke:*`를 allow에서 빼고, `aws s3 ls` 패턴에 버킷을 명시했다(기존 패턴은 다른 버킷과 `--endpoint-url` 임의 호스트까지 자동 승인했다).

5.1 가이드 재점검(9월 초): 가이드 스니펫 대부분(진행 보고, 자율 완주, 병렬 툴 호출, 국소 편집)은 Claude Code 하네스가 이미 넣고 있어 중복 추가하지 않았다. 남은 공백인 「변경·테스트를 요청 범위로 제한」만 `CLAUDE.md`에 반영 — 모호한 요청은 한 해석으로 구현하고 가정을 적기, 테스트는 명시된 동작당 하나 정도, 검증용 스크래치를 영구 테스트로 승격하지 않기.

**2026-09 (중순) — 구독 사용량 최소화 위임.** 리드(현재 세션)가 키워드 없이 난이도를 판단해 저렴한 워커에 자동 배정하는 `## Delegation` 섹션을 `CLAUDE.md`에 추가. 워커 `implementer`(Sonnet high, 일반 구현·조사)와 `editor`(Sonnet low, 기계적 편집) 신설, `planner`를 Opus → Sonnet high로 변경, `settings.json`에 `CLAUDE_CODE_SUBAGENT_MODEL=sonnet`을 넣어 모델 미지정 서브에이전트의 기본값을 Sonnet으로 내렸다. 빌트인 Explore는 이 env와 무관하게 리드 모델을 상속하므로, `CLAUDE.md` Delegation이 호출 시 `model: "sonnet"`을 지정하게 한다(2026-10 시험: 문서 의미 검색에서 Sonnet이 Opus와 같은 7/7을 찾음 — 토큰 33.6k·52.6k 대 Opus 118.7k, Haiku 5.5는 4/7). `reviewer`는 Opus 기본, 위험 영역·control-plane 리뷰만 `model: fable`로 스폰. Haiku는 쓰지 않는다(최소 Sonnet). Codex 쪽의 Astra/Sol/Terra/Luna 배분과 같은 취지.

리뷰 루프 독립성(9월 하순): `impl-plan`·`impl-execute`의 2라운드 이후 reviewer에게 이전 판정표 전체를 넘기던 것을 중단. ACCEPTED 행은 넘기지 않아 고침을 패치·스펙에서 새로 검증하게 하고, impl-execute는 REJECTED 행과 근거만("근거가 틀렸을 때만 다시 올려라") 넘긴다. impl-plan은 REJECTED가 이미 스펙 `## Review Notes`에 있어 별도 전달 없음.

**2026-09 (말) — Hard Rules 리뷰도 Opus로.** Opus 5.5가 코딩 벤치마크에서 Fable 5.1과 같거나 앞서고 비용은 60% 낮아, 위험 영역·control-plane 리뷰의 `model: fable` 스폰 예외를 없앴다. 모든 리뷰가 `reviewer` 기본값(`opus` 별칭)으로 돈다. 작성자와 다른 모델의 시각이 필요한 고위험 변경은 요청 시 Fable로 지정한다. 더 강한 모델이 나오면 다시 검토.

**2026-09 (말) — 에이전트 effort 고정.** "Spending your effort"(Anthropic 블로그) 기준에 맞춰 워커·리뷰어 effort를 정의 파일에 고정했다. 세션 effort를 낮춰도 리뷰가 따라 내려가지 않도록 `reviewer`는 `xhigh`, 숨은 역의존성을 찾는 `planner`는 `xhigh`(같은 날 `scope-analyst`로 개명하며 Opus `high`로 변경), 상세 스펙을 받아 구현하는 `implementer`는 `medium`(낮은 effort로 구현, 높은 effort로 검증; `path:line` 조사도 medium으로 돈다), 기계적 편집 `editor`는 `low` 유지. `codex-worker`는 고정하지 않아 세션 effort를 따르고, 리드 세션 effort는 `/effort`로 그때그때 조정한다.

**2026-09 (말) — `planner` → `scope-analyst` 개명, Opus로 복귀.** 8월에 역할이 "계획 작성"에서 "범위 조사"로 줄었는데 이름만 남아 있던 것을 실제 역할에 맞췄다. 호출 빈도가 낮고(복잡한 변경의 계획 전에만), NestJS 의존성 주입·이벤트로 얽힌 간접 의존성 추적과 위험 영역 판정은 모델 성능 차이가 나는 작업이며, Opus 5.5와 Sonnet 5의 단가 차이가 2배로 줄어 Opus `high`로 올렸다.

**2026-09 (말) — 리드 직접 처리 기준에 컨텍스트 재사용 추가.** 서브에이전트는 리드의 컨텍스트·캐시를 공유하지 않으므로, 필요한 파일·결정이 이미 리드 컨텍스트에 있고 위임 시 리드 출력(스폰 프롬프트+결과 검토)이 직접 구현 출력의 절반 이상이면 리드가 직접 한다(Opus 리드·Sonnet 워커 기준). 컨텍스트에 있다는 것만으로는 해당하지 않는다. `impl-execute`는 implementer에 스펙 본문 대신 경로와 스텝 번호만 넘긴다.

**2026-10 — Change Map, 응답·주석·문서 규칙, 리뷰 루프 정지, 런타임 지침 중복 금지, Fable 서브에이전트 차단, implementer Opus 전환.**

- Change Map: `impl-plan` 스펙 템플릿에 Affected Files·Affected Dependents 항목을 노드로 하는 Mermaid 흐름도를 넣고, 리뷰로 목록이 바뀌면 다시 그리게 했다. 승인할 때 호출·의존 관계를 사람이 목록에서 재구성하지 않아도 된다.
- 응답 문장: 최근 1주 대화형 세션 10개(129턴)를 감사해 사용자가 되묻거나 정정한 턴과 연결된 규칙만 `CLAUDE.md` Communication에 넣었다 — 한 대상 한 이름, 답은 최종 메시지 첫 문장에, 추천 하나와 그 추천이 바뀌는 조건, 사실은 이름·수치·위치로, 처음 쓰는 용어 풀어 쓰기, 절차는 번호 목록·경고는 단계 앞에, 진행 메시지도 한국어.
- 코드 주석과 리뷰 Excess: 한 프로젝트 세션 5개의 AI 코드 편집 168건과 reviewer 지적 136건을 감사했다. 가장 많은 결함은 계획·리뷰 번호와 변경 이력을 담은 주석(37건)이었고 이를 지적한 리뷰는 0건이었다. 코드를 더하라는 지적 48건 중 5건은 보고서 스스로 도달 불가라 한 상태를 막자는 것이었다. `CLAUDE.md` Standards에 「주석은 이전 코드를 모르는 독자에게도 참인 이유만」 규칙을, `reviewer`에 7번 기준 Excess와 「상태 가드를 추가하라는 지적은 그 상태의 도달 경로를 댄다」 조건을 넣고, 기준 1–7을 구현 검증 모드의 diff 코드에도 적용하게 했다.
- 현재 상태 문서: 날짜별로 덧붙여진 문서에 남은 옛 「미확인」 문장을 근거로 에이전트가 사용자가 확인한 사실을 뒤집은 사고에서 나왔다. `rules/second-brain.md`에서 기록(ADR·BUG-FIXES·보관된 impl-spec·경로에 날짜가 있는 문서)만 이력으로 두고, 나머지 문서는 바뀐 사실의 문장을 고쳐 쓰고 옛 문장을 지우게 했다. 미확인 문장은 ADR과 대조하고, 코드로 판정할 수 없는 문서 간 충돌은 고르지 않고 양쪽을 인용해 사용자에게 묻는다.
- 리뷰 루프 정지: 계획 리뷰가 5회차까지 「같은 규칙의 사본을 또 놓침」 HIGH를 반복한 사례에서 나왔다(`impl-plan` 스킬이 컨텍스트 요약으로 빠져 3회 상한이 적용되지 않았고, 리드는 검색어를 넓혀 패치를 이어 갔다). `CLAUDE.md` Scope에 차단 지적이 두 회차 연속 이번 변경이 바꾸는 같은 규칙·결정을 가리키면 패치를 멈추고 원인과 설계 방향을 먼저 보고하는 규칙을 넣었다. 재현 시험에서 규칙이 없으면 0/3, 있으면 5/5가 멈췄고, 독립 지적 대조 2/2는 멈추지 않았다. `scope-analyst`는 바뀌는 규칙의 문서 사본 수·위치·소유를 보고하고(그 사례에서 리뷰 1~4회차가 놓친 사본 8곳 중 미리 찾은 수 1 → 5~6), `impl-plan`은 그 사본을 Affected Dependents와 Change Map에 넣는다.
- 런타임 지침 중복 금지: 리드가 auto 모드에서 여러 줄 치환을 Python 스크립트로 했다. Claude Code 시스템 지침은 여러 줄·정확 치환에 `Edit`을 쓰라고 하는데 지키지 않은 것이다. 리드가 「파일 수정은 항상 `Edit`」 규칙을 `CLAUDE.md`에 넣자고 했으나, 사용자는 공식 지침을 그대로 따르기로 했다. `writing-for-agents` Pruning에 런타임(Claude Code·Codex CLI) 기본 시스템 지침도 정본이라, 그 지침이 모든 모드에서 정한 동작은 다시 쓰지 않는다는 항목을 넣었다 — 모델이 가끔 어겨도 지침의 빈틈이 아니라 미준수로 보고 규칙 없음을 권하며, 사용자가 그래도 원하거나 서로 다른 세션 2개 이상에서 사용자가 고치거나 되돌려야 한 결과가 났을 때만 제안한다. 서브에이전트는 메인 시스템 지침을 받지 않으므로, 서브에이전트가 그 상황을 만날 수 있는 `CLAUDE.md`·`rules/` 줄은 사본으로 보지 않는다. 이 항목을 적용해 `CLAUDE.md` Communication의 `<pasted_content>` 처리 문장(시스템 지침 `# Harness` 절과 글자 그대로 같음)을 지웠다.
- Fable 서브에이전트 차단: 9월 말에 Hard Rules 리뷰의 `model: fable` 예외를 지웠는데도, 9/22에 시작해 컨텍스트 요약을 여러 번 거친 luxury-collector 세션 하나가 10/13까지 reviewer를 Fable로 띄웠다. 요약 때 다시 주입된 옛 `impl-execute` 본문에 「위험 영역이면 `model: fable`로 스폰」이 남아 있었다. 규칙 문서를 고쳐도 오래 이어진 세션에는 닿지 않으므로, `Agent` 도구의 `model` 인자가 Fable이면 막는 PreToolUse 훅 `block-fable-subagent.sh`를 넣었다. 9월 말 항목의 「요청 시 Fable로 지정」 경로도 이 훅이 막는다(다시 쓰려면 `settings.json`에서 이 훅 항목을 뺀다). 훅은 세션 시작 때 읽히므로, 이미 실행 중인 세션에는 다시 시작해야 적용된다.
- `implementer`를 Opus로: 구현 품질은 Opus가 Sonnet보다 높아, 일반 구현·`path:line` 조사를 맡는 `implementer`를 Sonnet `medium` → Opus `medium`으로 바꿨다. 단순·기계적 편집은 Sonnet `editor`가 계속 맡는다. 같은 Opus여도 리드(`xhigh`)보다 effort가 낮아 위임하면 생각 토큰이 줄므로, `CLAUDE.md` Delegation의 「위임 시 리드 출력이 직접 구현 출력의 절반 이상이면 리드가 직접」 비교는 그대로 두고, 그 전제 표기만 「Opus 리드·Sonnet 워커」에서 「워커가 리드보다 낮은 effort나 싼 모델로 도는」으로 바꿨다.

**2026-10 (중순) — 리뷰 루프 수렴 규칙, 사용량 효율 기준.**

- 배경: 「Claude Code에 같은 코드를 다시 리뷰시키면 왜 매번 새 버그가 나오나」를 묻는 X 포스트(답글 342개)를 분석했다. 다수 의견은 「둘 다」였다 — 첫 회차들은 실제로 놓친 버그를 찾고, 회차가 쌓일수록 트집·오탐이 늘어난다. 사용자도 같은 경험을 했다.
- 리뷰 루프: `CLAUDE.md` Scope에 스킬 안팎의 모든 `reviewer` 루프가 따르는 **리뷰 루프** 규칙을 정본으로 두고, `impl-plan`·`impl-execute`의 종료·상한 문장은 이를 가리키게 했다. 회차마다 CRITICAL/HIGH만 처리하고 MEDIUM/LOW와 REJECTED는 완료 보고로 보낸다. 동작 지적(입력·상태와 잘못된 결과를 증거로 단 코드 지적)의 수정은 Bug fix로 다뤄, 재현 테스트가 실패하지 않으면 REJECTED로 바꾼다. 고친 것이 없는 회차에서 끝낸다 — 그 뒤 회차는 같은 대상을 다시 훑을 뿐이다. 정지는 고치기 전에 판정하고(3회차, 고친 지적 재발, 같은 규칙 두 회차 연속 — 기존 정지 규칙을 흡수), 「계속」 뒤에는 새 루프로 센다. `impl-execute`는 스펙을 닫을 때 마지막 상태에서 검증 통과를 요구한다.
- reviewer 증거: CRITICAL/HIGH는 종류별 증거(입력·경로·잘못된 결과, 스펙 줄과 코드 줄, 호출부 위치, control-plane 실패 추적)를 달고, 없으면 MEDIUM 이하로 낮춘다. 「No issues found.」는 완결된 리뷰로 명시했다.
- `tdd`: 리팩터는 루프 밖이고, 리뷰의 MEDIUM/LOW로 완료 보고에 남아 사용자가 적용 여부를 정한다.
- 사용량 기준: `CLAUDE.md` Delegation의 목적을 「구독 사용량을 줄이기 위해」에서 「효율적으로 쓰기 위해」로 바꿨다. 줄일 대상은 결과에 보탬이 안 되는 소모이고, 복잡한 작업에 필요한 토큰은 아끼지 않는다.
- 수렴 과정: 첫 설계는 정지 뒤 재시작 절차와 세션을 넘는 `UNRESOLVED` 행 수명까지 새로 정하다가, reviewer 루프 2개가 각각 2회차에 같은 규칙의 HIGH로 정지했다. 범위를 「루프 안 처리와 종료」로 고정하고, 회차 간 상태를 두지 않고, 기존 Bug fix 규칙을 재사용하고, 리뷰는 이번 diff가 만든 문제만 지적하게 하자 세 번째 루프가 2회차에 종료했다. 의도적으로 남긴 것: Excess 지적(주석 규칙 위반 등)은 MEDIUM 이하라 루프 안에서 고치지 않는다 — 쌓이면 Standards 위반을 HIGH가 될 수 있는 증거 종류로 추가한다.

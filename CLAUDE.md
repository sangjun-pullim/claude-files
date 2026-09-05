# Global CLAUDE.md

Backend + Fullstack developer (Node.js / TypeScript, NestJS, Prisma).

## Communication

- 대화는 한국어, 코드 주석은 영어, 커밋 메시지는 한국어.
- 변경마다 코드 + 한 줄 이유. 바뀌지 않은 코드는 출력하지 않는다.
- 선택지가 여럿이면 트레이드오프를 비교하고 하나를 추천한다.
- 겉멋 든 문체(mannered prose)를 쓰지 않는다 — 비유·수식·리듬을 위한 문장 없이 평서문으로.

## Scope

- 가장 단순한 해결책을 먼저 시도한다. 200줄로 쓴 것이 50줄이 되면 다시 쓴다. 버그는 단순한 확인부터 — 그게 실패하면 `diagnosing-bugs` 스킬.
- 요청이 요구하는 곳만 건드린다. 눈에 띈 기존 버그·성능 문제는 고치지 말고 후속 항목으로 보고한다.
- 요청 자체가 재작성·재구조화이거나 새 파일을 만드는 경우가 아니면, 파일 전체를 다시 쓰지 말고 국소 편집을 쓴다.

## Standards

- Files: kebab-case (`user-auth.service.ts`). Exception: standard project docs — see the `second-brain` skill.
- Prisma: PascalCase model name, snake_case columns via `@map`.
- One function = one responsibility; split over 50 lines. A module has one responsibility. 단, 쪼갠 조각을 인터페이스에 새로 노출하지는 않는다(내부 헬퍼 분할은 항상 허용) — 깊은 모듈 설계는 `codebase-design` 스킬.
- Custom error classes, never bare `throw new Error()`. Separate user-facing errors from internal ones.
- New feature = tests. Bug fix = reproduction test first. Test names: "should + behavior". Mock external dependencies. 새 테스트는 같은 모듈의 기존 테스트 파일과 같은 형식·규모로 쓰고, 새 러너나 하네스를 들이지 않는다. 위 두 문장과 Hard Rules가 요구하는 테스트는 이 제한의 예외 — 레포에 테스트가 하나도 없어도 쓴다.
- Never interpolate user input into raw SQL. No hardcoded keys, tokens, or passwords.
- Commit: `<type>(<scope>): <한국어 설명>` — type/scope 영어. Types: feat, fix, refactor, test, docs, chore. One commit = one logical change.

## Hard Rules

- **Risk surface** — auth / payment / permission / DB schema (`schema.prisma`, migrations) / public API contract: tests required, and a `reviewer` agent reviews before you report done. Judge by what the change does, not the file name.
- **5+ production files** in one logical change: share the plan first and get approval (`impl-plan`).
- **워크트리 분리** — 사용자가 감독 없이 넘기라고 하면(판정 목록은 `orca-cli` 「Full Handoffs」) 구현자와 무관하게 「Full Handoffs」로 가고 이 규칙은 발화하지 않는다. 그 외에 사용자 작업을 **다른 에이전트에게** 별도 체크아웃으로 넘길 때(codex·claude 무관), 계획이 확정된 뒤 첫 디스패치 전에 `orca worktree`(워커별 격리 브랜치+Orca 카드) / in-place(현재 체크아웃·카드 없음·워커 1개 직렬)를 AskUserQuestion으로 묻는다. `orca status`가 실패하면 묻지 않고 in-place. 답은 그 task 전체에 적용 — 현재 task의 계획이 덮지 않는 새 요청 = 새 task → 재질문. worktree일 때 구현자별로 갈라진다: codex는 `codex-worker` 스폰(`codex-delegation`), 그 외 워커는 `orca-cli` 스킬 「Supervised Dispatch」. 내가 격리 브랜치에서 직접 작업하는 것은 그냥 worktree 사용이고, `Agent` 도구의 `isolation: "worktree"`도 이 규칙 밖이다.
- **Merging is the user's call** — never merge a PR or write to the default branch (`gh pr merge` including `--auto`/`--admin`, `gh api …/merge`, direct push to `main`) unless the user explicitly says to merge; `--admin` only when the user names it. Approving *what* to deploy is not approval to merge it. Report the PR URL and stop. Merging a worker branch into an integration branch is not this rule.
- **Control-plane** — `~/.claude/**`, any repo's `.claude/**`, `CLAUDE.md` / `AGENTS.md`: the text is live in every new session, so a `reviewer` agent reviews before you report done, and show the diff. Exempt: harness-written artifacts (`projects/**/memory/`, session state, `skills/benchmark-workspace/**`, edits to vendored `plugins/**`). Installing or updating a plugin is not exempt — it ships hooks, agents, and commands live into every session.
- Report which review ran. If the reviewer spawn failed, mark the work `UNREVIEWED` and quote the spawn error — no attempt on record is not a failed spawn.
- After changes to architecture, DB schema, API, or business logic, *suggest* a `docs/` update with a specific file and section — never auto-update.
- Files: plans → `docs/`, config → `~/.claude/`. If unspecified, ask.

## Agents

| Agent | Purpose | When |
|---|---|---|
| planner | Scope analysis — affected files, reverse dependencies, blast radius. Does not write the plan | Before planning a complex feature or refactor |
| reviewer | Code / plan / implementation review — modes in `agents/reviewer.md` | After writing code, before commits, and wherever Hard Rules require it |
| codex-worker | Implementation via OpenAI Codex CLI; relays facts, never judges | **Only when the user asks for codex/GPT** — load the `codex-delegation` skill first |

## Docs

Read the project's `docs/` before touching code — order in `rules/second-brain.md`.

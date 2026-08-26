# Global CLAUDE.md

Backend + Fullstack developer (Node.js / TypeScript, NestJS, Prisma).

## Communication

- 대화는 한국어, 코드 주석은 영어, 커밋 메시지는 한국어.
- 변경마다 코드 + 한 줄 이유. 바뀌지 않은 코드는 출력하지 않는다.
- 선택지가 여럿이면 트레이드오프를 비교하고 하나를 추천한다.

## Standards

- Files: kebab-case (`user-auth.service.ts`). Exception: standard project docs — see the `second-brain` skill.
- Prisma: PascalCase model name, snake_case columns via `@map`.
- One function = one responsibility; split over 50 lines. A module has one responsibility.
- Custom error classes, never bare `throw new Error()`. Separate user-facing errors from internal ones.
- New feature = tests. Bug fix = reproduction test first. Test names: "should + behavior". Mock external dependencies.
- Never interpolate user input into raw SQL. No hardcoded keys, tokens, or passwords.
- Commit: `<type>(<scope>): <한국어 설명>` — type/scope 영어. Types: feat, fix, refactor, test, docs, chore. One commit = one logical change.

## Hard Rules

- **Risk surface** — auth / payment / permission / DB schema (`schema.prisma`, migrations) / public API contract: tests required, and a `reviewer` agent reviews before you report done. Judge by what the change does, not the file name.
- **5+ production files** in one logical change: share the plan first and get approval (`impl-plan`).
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

# Standards

## Naming

- Files: kebab-case (user-auth.service.ts). Exception: standard project docs — see the `second-brain` skill.
- DB tables (Prisma): PascalCase model name, snake_case columns via @map

## Code

- One function = one responsibility. Split if over 50 lines. A module has one responsibility.

## Error Handling

- Use custom error classes. Avoid bare `throw new Error()`.
- Separate user-facing errors from internal errors.

## Testing

- New feature = tests required. Bug fix = reproduction test first.
- Test names: "should + behavior" format.
- External dependencies must be mocked/stubbed.

## Git

- Commit format: `<type>(<scope>): <한국어 설명>`
- type/scope는 영어, description은 한국어로 작성
- Types: feat, fix, refactor, test, docs, chore
- One commit = one logical change.

## Deeper References

Loaded on demand, by path — the Skill tool may not offer these:

- Prisma/PostgreSQL migrations → `~/.claude/skills/db-migrations/SKILL.md`
- NestJS REST endpoint design → `~/.claude/skills/api-design/SKILL.md`
- Full security audit of an existing codebase → `~/.claude/skills/security-checklist/SKILL.md`

## Security

- No hardcoded keys, tokens, or passwords.
- Always validate user input.
- Never interpolate user input directly into raw SQL queries.

# Standards

## Naming

- Files: kebab-case (user-auth.service.ts)
- Classes/Components: PascalCase
- Functions/Variables: camelCase
- Constants: UPPER_SNAKE_CASE
- Booleans: is/has/can/should prefix
- DB tables (Prisma): PascalCase model name, snake_case columns via @map

## Code

- TypeScript: `no-explicit-any: off` in ESLint, `strictNullChecks: false` in tsconfig. Gradually tightening.
- One function = one responsibility. Split if over 50 lines.
- Use an object when parameters exceed 3.
- Early return pattern (minimize nested if).
- No magic numbers. Extract to named constants.
- Use framework logger instead of console.log.

## Error Handling

- Use custom error classes. Avoid bare `throw new Error()`.
- Never swallow errors in catch. At minimum, log them.
- Separate user-facing errors from internal errors.

## Testing

- New feature = tests required. Bug fix = reproduction test first.
- Test names: "should + behavior" format.
- External dependencies must be mocked/stubbed.

## Git

- Commit format: `<type>(<scope>): <description>`
- Types: feat, fix, refactor, test, docs, chore
- One commit = one logical change.

## Security

- No hardcoded keys, tokens, or passwords.
- Always validate user input.
- Never interpolate user input directly into raw SQL queries.

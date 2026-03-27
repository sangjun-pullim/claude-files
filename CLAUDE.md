# Global CLAUDE.md

## Identity

Backend + Fullstack developer.
Node.js, NestJS, Prisma, Puppeteer, React, Next.js, Electron stack.
Working on 2-3 projects simultaneously; consistent quality matters.

## Philosophy

When writing code, follow these principles:

- Design data structures and their relationships first, then write code around them.
  The shape of the data determines the shape of the code.
- Write code that humans can read. Prefer clarity over cleverness.
  If a piece of logic needs a comment to be understood, simplify the logic first.
- Build incrementally. No prototypes — just build and polish as you go.
  Each step should be small, testable, and shippable.
- When complexity grows, break it down. Keep the core simple.
  A function does one thing. A module has one responsibility.

## Discipline

- Simplicity first: no features beyond what was asked. No abstractions for single-use code.
  If 200 lines could be 50, rewrite it.
- Surgical changes: touch only what the request requires. Don't "improve" adjacent code.
  Remove only what YOUR changes made unused.

## Communication

- Conversation in Korean. Code comments in English. Commit messages in Korean.
- Provide moderate explanations: code + one-line reasoning for changes.
- When there are multiple options, compare tradeoffs and recommend one.
- Skip what I already know. Don't restate obvious context.
- Never output unchanged code.

## Work Rules

- IMPORTANT: Always plan before implementing. Share the plan, get approval, then build.
- IMPORTANT: When implementing features or fixing bugs, write tests first (or alongside), then run them to verify.
- IMPORTANT: After completing implementation, run the reviewer agent before reporting done.
- IMPORTANT: After code changes that affect architecture, DB schema, API, or business logic, check if `docs/` files need updating and suggest specific changes. Do NOT auto-update without approval.
- IMPORTANT: Never read .env, secret, or credential files.
- Break large changes into stages. Each stage should be independently verifiable.
- If unsure, say so honestly rather than guessing.

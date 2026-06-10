# Global CLAUDE.md

## Identity

Backend + Fullstack developer.
Node.js, NestJS, Prisma, Puppeteer, React, Next.js, Electron stack.

## Discipline

- Think before coding: state the goal, data shape, and 2–4 line approach in plain text *before* writing any code. If the goal is unclear, ask.
- Design data structures and their relationships first, then write code around them. The shape of the data determines the shape of the code.
- Simplicity first: no features beyond what was asked. No abstractions for single-use code. If 200 lines could be 50, rewrite it.
- No speculative code: don't write defensive branches, options, hooks, or config for hypothetical future needs. Only code paths exercised by the current task.
- If a piece of logic needs a comment to be understood, simplify the logic first.
- For bugs, try the simplest possible fix first. Don't propose type refactors or complex algorithms before a straightforward check has failed.
- Surgical changes: touch only what the request requires. Don't "improve" adjacent code. Remove only what YOUR changes made unused.
- Investigate root cause before suggesting workarounds or wrappers.
- When given a plan or document to implement, start implementation immediately. Don't just read and summarize.
- Build incrementally — each step small, independently verifiable, shippable. No throwaway prototypes.
- Don't report "done" until verified: run the relevant test/build/lint command and confirm it passes. "It should work" ≠ done.

## Communication

- Conversation in Korean. Code comments in English. Commit messages in Korean.
- For each change: code + one-line reasoning. Never output unchanged code.
- When multiple options exist, compare tradeoffs and recommend one.
- Skip what I already know. Don't restate obvious context.
- State non-obvious assumptions explicitly. If multiple interpretations exist, present them — don't pick silently.

## Task Tier (Risk Triage)

Before planning, classify the task by deterministic signals (touched paths/content + behavior change), not by gut feel. When uncertain, pick the higher tier (fail-closed). Canonical definitions, special cases (deps / deletion / CI / cache / backfill), and examples: `rules/risk-triage.md` — if this section and that file disagree, that file wins.

- **Risk surface** = auth / payment / permission / DB schema / migration / external API contract (full list in `rules/risk-triage.md`; judged by what the change does, not just path).
- **tier-0**: ≤1 file, no behavior change, no risk surface. Plan ceremony optional; lint/build/test still required; reviewer still required if executable code is touched.
- **tier-1**: behavior change, no risk surface, <5 files. Lightweight plan + tests + reviewer.
- **tier-2**: any risk surface OR 5+ files. Full harness (impl-plan → impl-execute → verify).
- **HARD OVERRIDE**: touches the risk surface, or you can't prove it doesn't → tier-2 regardless of file count.

## Work Rules

- IMPORTANT: Always skim the project's CLAUDE.md `## Documentation` index and `docs/decisions.md` before starting (every tier). For tier-1+ or any behavior change, follow the full `docs/` Research Order (decisions, architecture, business-logic, bug-fixes first) per `rules/second-brain.md` before diving into source.
- IMPORTANT: Plan before implementing, then share it and get approval before building — required whenever the change alters behavior or touches 5+ files (tier-1+). tier-0 (as defined in `rules/risk-triage.md`) may skip the plan ceremony only.
- IMPORTANT: For features/bugfixes that are test-pinnable, write tests first (or alongside) and run them to verify. auth/payment/permission/migration changes always get tests regardless of size. Running test/build/lint before reporting "done" is required at every tier.
- IMPORTANT: After touching any executable code (not prose/`.md`/comments), run the reviewer agent before reporting done. Pure-prose changes (tier-0 docs) are exempt.
- IMPORTANT: After changes to architecture, DB schema, API, or business logic, *suggest* `docs/` updates with specific file/section. Never auto-update without approval.
- IMPORTANT: Never read .env, secret, or credential files.
- If unsure, ask back rather than guess. Get solid evidence before proceeding.
- Transform tasks into verifiable goals before starting. "Fix the bug" → "Write a test that reproduces it, then make it pass."
- When saving files, use the correct location. Plans → `docs/`, config → `~/.claude/`. If unspecified, ask.

## Self-Improvement

- When the user says "don't repeat this mistake" or "add this to CLAUDE.md", immediately propose which file/section to update and what exact lines to add — wait for approval before writing.
- If you notice yourself repeating the same mistake twice in a session, proactively propose a CLAUDE.md update before the user has to ask.
- Rules added this way MUST be measurable. ❌ "write good tests" / ✅ "mock all external dependencies in tests".
- Prefer updating an existing rule over appending a new one. Keep this file under 100 lines.
- When modifying any CLAUDE.md, follow `rules/claude-md-audit.md` (tag → decide → diff → mapping table).

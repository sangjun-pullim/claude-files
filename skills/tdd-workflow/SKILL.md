---
name: tdd
description: Guides feature development or bug fixing through a strict RED → GREEN → REFACTOR TDD cycle
---

# TDD Workflow

Follow this cycle strictly. Do NOT skip steps.

## Step 1: Understand (before any code)

- Identify the user story or bug to fix
- List the expected behaviors as test cases
- Ask clarifying questions if requirements are ambiguous

## Step 2: RED — Write Failing Tests

Write tests FIRST. They must fail before any implementation.

- **Unit tests**: Isolated function/service logic (Jest or Vitest)
- **Integration tests**: API endpoints, DB operations, service interactions
- **E2E tests**: Full user workflows (Playwright, if applicable)

Run the tests. Confirm they fail with the expected reasons.
Use the project's package manager (detect from lock file) and test script to run specific test files.

## Step 3: GREEN — Minimal Implementation

Write the **minimum code** to make all tests pass. Nothing more.

- No premature optimization
- No extra features
- No "while I'm here" cleanups

Run the tests. Confirm they all pass.

## Step 4: REFACTOR — Improve Quality

Now clean up, with tests as your safety net:

- Remove duplication
- Improve naming
- Simplify logic
- Extract functions if needed

Run the tests after each change. They must stay green.

## Step 5: Coverage Check

Verify coverage meets the bar:

- Minimum 80% coverage (unit + integration)
- All error paths tested
- Edge cases covered (null, empty, boundary values)

## Rules

- Tests are not optional. They are the safety net for confident refactoring.
- Test behavior, not implementation details.
- Mock external dependencies (DB, APIs, file system).
- Each test must be independent — no shared mutable state between tests.
- Name tests: "should [expected behavior] when [condition]"

$ARGUMENTS

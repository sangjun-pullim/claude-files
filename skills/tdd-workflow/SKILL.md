---
name: tdd-workflow
description: Drives implementing a NEW feature with non-trivial logic, or fixing a bug by first reproducing it with a failing test, through a strict RED → GREEN → REFACTOR cycle. Use when behavior can be pinned by tests. Not for spikes, config/docs/rename-only edits, or untestable work.
---

# TDD Workflow

Follow this cycle strictly. Do NOT skip steps.

## Do NOT use when

- Exploratory spikes or throwaway prototypes (code you intend to discard)
- Config-only or documentation-only changes
- Simple renames or mechanical refactors with no behavior change
- Work where a test would be meaningless or impossible to write meaningfully

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

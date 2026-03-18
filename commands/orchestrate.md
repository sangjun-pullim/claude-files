# Orchestrate Workflow

Run a structured workflow based on the given type. Parse the first word of `$ARGUMENTS` as the workflow type and the rest as the description.

If `$ARGUMENTS` is empty or the first word is not one of `feature`, `bugfix`, `refactor`, show this usage guide and stop:

```
/orchestrate <type> <description>

Types:
  feature  <description>   Plan → Approve → Implement(+test) → Review → Report
  bugfix   <description>   Reproduce → Test → Fix → Review → Report
  refactor <description>   Plan → Approve → Baseline test → Refactor → Review → Report

Examples:
  /orchestrate feature "사용자 프로필 이미지 업로드 기능"
  /orchestrate bugfix "로그인 시 JWT 만료 에러 미처리"
  /orchestrate refactor "AuthModule Guard 구조 개선"
```

## Workflow Types

### `feature <description>`

1. **Plan**: Launch the planner agent to analyze scope and create an implementation plan for: $ARGUMENTS
2. **Approve**: Present the plan to the user and wait for explicit approval before proceeding
3. **Implement**: Build the feature incrementally, writing tests alongside the implementation (TDD where possible)
4. **Review**: Launch the reviewer agent to check the completed code for quality, security, and correctness
5. **Report**: Summarize what was built, files changed, and test results

### `bugfix <description>`

1. **Reproduce**: Identify and confirm the bug described in: $ARGUMENTS
2. **Test**: Write a failing test that reproduces the bug
3. **Fix**: Implement the minimal fix to make the test pass
4. **Review**: Launch the reviewer agent to verify the fix doesn't introduce regressions
5. **Report**: Summarize the root cause, fix applied, and test coverage

### `refactor <description>`

1. **Plan**: Launch the planner agent to design the refactoring strategy for: $ARGUMENTS
2. **Approve**: Present the plan to the user and wait for explicit approval before proceeding
3. **Verify baseline**: Run existing tests to confirm they all pass before making changes
4. **Refactor**: Apply changes incrementally, running tests after each step to ensure no regressions
5. **Review**: Launch the reviewer agent to check the refactored code
6. **Report**: Summarize structural changes made and confirm all tests still pass

## Rules

- Always get user approval before starting implementation (feature/refactor)
- Tests must pass at every stage — never leave a broken state
- Use the planner agent for tasks touching 5+ files
- Use the reviewer agent before reporting completion
- If any step fails, stop and report the issue instead of continuing

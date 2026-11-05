---
name: commit-quiz
description: Quiz the user on the change they are about to commit, so they understand it well enough to defend it to a maintainer.
disable-model-invocation: true
---

# Commit Quiz

Purpose: check that the user understands the change they are about to commit **well enough to defend it in front of the person who will maintain it**. This guards against review sliding into rubber stamping. The goal is not to test the user into failing, but to let them discover what they do not yet know.

Use this skill only when the user explicitly runs it. Never step in on your own.

## Absolute rules

- **Read-only.** Never run anything that changes repository state: editing files, `git add`, `git commit`, stash, reset, and the like.
- Whether to commit is the user's decision. The quiz result neither blocks nor forces a commit.
- Never leak hints or answers before hearing the user's answer.
- Grade strictly, but keep the tone plain and respectful.

## Step 1: Fix the scope

1. Check the commit target with `git diff --staged --stat` and `git diff --staged`.
2. If nothing is staged, check `git diff --stat` (unstaged) and ask the user in one line which to quiz on. If both are empty, say there is no change to quiz on and stop.
3. Read as much of the changed files' surrounding context as needed (callers, related tests, config). Never write questions from the diff alone.
4. If an agent made the change in this session, also draw on that conversation (requirements, what the user said).

## Step 2: Get the user's explanation first (before showing the report)

Once the user has read the report, other possibilities become hard to see, so draw out their mental model first. Ask these two and wait for the answers:

- Explain in 2–3 sentences what this commit changes and why.
- Where do you think this change can have impact (users, other modules, data)?

After the answers, briefly note where they diverge from or miss the actual change (do not show the note yet; feed it into the quiz).

## Step 3: Change report

Show the following concisely. Do not let the summary end in "everything went fine."

1. **Change summary**: one or two lines per file.
2. **Decisions and assumptions the agent (or author) made on the user's behalf**: the core of the report. For example:
   - default choices; handling of empty, null, and boundary values
   - what was left out of scope
   - which reading was taken when two requirements conflicted
   - changes to ordering, transaction boundaries, concurrency, or error handling
   - existing behavior that changed silently
3. **Verification status**: which tests and checks cover this change, and **what they prove and what they do not**. If a test may share the feature's assumptions and so be wrong together with it, point that out.

## Step 4: Quiz

### Question principles

- 5–7 questions. For a very small change, as few as 3.
- Write questions **that cannot be answered just by rereading the report**. The report shows "what was decided"; the quiz asks "so how does it behave, and why."
- Ask each question as **multiple choice** in the `AskUserQuestion` selection dialog, even though a quiz question is not a decision: three answer options, then "I don't know" as the fourth. Tag no option "(Recommended)" — that tag names the answer. Make every wrong option a misreading a hasty reader would actually pick and none that the Step 3 report already rules out, and have each option state both what happens and why. Order the three answer options alphabetically by label, with no letter or number prefix on any label, so the correct option's position follows from its wording rather than your choice; "I don't know" always stays last. Put the `file:line` and code the question is about in the question text itself, since the dialog can hide earlier messages.
- Mix these types:
  - **Random line**: pick a line from the diff that is easy to overlook, show its `file:line` and code, and ask what it does and why it is needed. Use this type for at least 2 questions, picking from the middle parts that matter structurally but are easy to skim.
  - **Behavior / boundary conditions**: how it behaves on a specific input (empty value, maximum, concurrent requests, failed response, etc.).
  - **Reason for a decision and the alternative**: take one decision from Step 3 and ask what would change had the other choice been made.
  - **Limits of verification**: "Even if this test passes, what scenario could still break?"
  - **Falsification**: "If this change were wrong, what symptom would show it? How could you check?"
  - **Blast radius**: what other code, users, or data must be checked because of this change?
- Cover every point the user missed or misunderstood in Step 2 in the quiz, asking how the change behaves and why rather than what was decided.

### How to run it

- Ask **one question at a time** and wait for the answer.
- The user may look at the diff or the code again. Tell them once, at the start, that asking the agent for the answer is not allowed.
- "I don't know" is a normal answer. Treat it the same as a wrong answer, without adding pressure.
- Grade each answer:
  - **Correct**: confirm briefly; if the user missed a detail, add it in one line.
  - **Partially correct / wrong**: explain what was missing or wrong, citing the supporting `file:line`. Then ask **one new question in the same area** (never repeat the same question).
- Re-ask at most once per area. If the user still does not get it, record it as a "needs review" area and move on.

### Pass criterion

Every question (re-asks included) must be graded correct to **pass**. If any "needs review" area remains, the result is **not passed**.

## Step 5: Result

End in this format, writing the result block and the closing prompt in the language of the conversation.

```
## Commit Quiz result: Pass / Not passed

- Questions: M of N correct (K re-asked)
- Needs review:
  - <area> — <file:line> — <one line on what to look at again>
- Not covered by verification:
  - <one per line>
```

Then ask the user to write down one thing themselves:

> Write down **one thing in this commit that nobody (not the tests, not the agent, not you) checked**.

When the user writes it, respond briefly and stop. Even when not passed, respect that committing is the user's call; only mention that they can revisit the needs-review areas and run `/commit-quiz` again.

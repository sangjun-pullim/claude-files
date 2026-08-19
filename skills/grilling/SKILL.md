---
name: grilling
description: Clarify a half-formed problem, plan, or design by questioning the user relentlessly, in frontier rounds, until it is sharp. Trigger on "grill me", "grill this", "갈궈줘", "털어줘", "캐물어줘", "질문 좀 해줘", "stress-test this", "poke holes in this", "what am I missing" — or whenever the user wants to talk a vague idea into a clear one before anything gets built.
---

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round: number each question and give your recommended answer. Then wait for the user's answers before the next round.

Each question should be formatted like so:

```
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>
```

Each round the user answers reshapes the tree: settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (filesystem, tools, etc.), dispatch a sub-agent to find it; don't ask the user for anything you could look up yourself. Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait for the sub-agent to report; ask the rest of the frontier now. The _decisions_ are the user's: put each to them and wait.

Challenge terms the moment they conflict with `docs/glossary.md` ("glossary는 X라고 정의하는데 지금 Y 의미로 쓰신 것 같아요 — 어느 쪽인가요?"), and sharpen vague or overloaded terms into a canonical one. Collect the domain terms and decisions that settle along the way (per the recording criteria in the `second-brain` skill), and once the frontier is empty propose the matching `docs/glossary.md` / `docs/decisions.md` updates in one batch — applied only with the user's approval. During the session this skill still only talks.

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. Do not act on it until the user confirms you have reached a shared understanding.

## Do NOT use when

- The request is already unambiguous — questioning a clear ask is friction, not rigor.
- A spec document is what's wanted (`impl-plan` writes one; this skill only talks).
- Reviewing code that already exists (`reviewer` agent / `/code-review`).

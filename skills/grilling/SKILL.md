---
name: grilling
description: Clarify a half-formed problem, plan, or design by questioning the user relentlessly, one question at a time, until it is sharp. Trigger on "grill me", "grill this", "갈궈줘", "털어줘", "캐물어줘", "질문 좀 해줘", "stress-test this", "poke holes in this", "what am I missing" — or whenever the user wants to talk a vague idea into a clear one before anything gets built.
---

Interview me relentlessly about every aspect of this plan until we reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. For each question, provide your recommended answer.

Ask the questions one at a time, waiting for feedback on each question before continuing. Asking multiple questions at once is bewildering.

If a question can be answered by exploring the codebase, explore the codebase instead.

Do not enact the plan until I confirm we have reached a shared understanding.

## Do NOT use when

- The request is already unambiguous — questioning a clear ask is friction, not rigor.
- A spec document is what's wanted (`impl-plan` writes one; this skill only talks).
- Reviewing code that already exists (`reviewer` agent / `/code-review`).

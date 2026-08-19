---
name: improve-codebase-architecture
description: Scan a codebase for deepening opportunities, present them as a visual Artifact report, then grill through whichever one you pick.
disable-model-invocation: true
---

# Improve Codebase Architecture

Surface architectural friction and propose **deepening opportunities** — refactors that turn shallow modules into deep ones. The aim is testability and AI-navigability.

This command is _informed_ by the project's domain model and built on a shared design vocabulary:

- Call the Skill tool with "codebase-design" — it owns the architecture vocabulary and principles. Use its canonical terms exactly in every suggestion; never substitute an alias it bans.
- The domain language in `docs/glossary.md` gives names to good seams; `docs/decisions.md` records decisions this command should not re-litigate.

## Process

### 1. Explore

**Scope before you scan — YAGNI.** Deepening a module pays off by making future changes to it easier, so put extra weight on the parts of the codebase that have recently changed. Decide *where* to look before you look:

- If the user named a direction — a module, a subsystem, a pain point — take it, and skip the inference below.
- Otherwise, walk back a good stretch of the commit history (`git log --oneline`) to find the codebase's hot spots — the files and areas that keep coming up — and let those paths pull your attention first. If the changes are scattered with no clear hot spot, widen the net.

Follow the refactoring Research Order in `~/.claude/rules/second-brain.md` first.

Then spawn a sub-agent to walk the codebase. Don't follow rigid heuristics — explore organically and note where you experience friction:

- Where does understanding one concept require bouncing between many small modules?
- Where are modules **shallow** — interface nearly as complex as the implementation?
- Where have pure functions been extracted just for testability, but the real bugs hide in how they're called (no **locality**)?
- Where do tightly-coupled modules leak across their seams?
- Which parts of the codebase are untested, or hard to test through their current interface?

Apply codebase-design's **deletion test** to anything you suspect is shallow — a "yes, concentrates" verdict is the signal you want.

### 2. Present candidates as an Artifact report

Publish the review as an Artifact. Load the `artifact-design` and `artifact-diagramming` skills before writing it — they govern styling, theming, and inline-SVG mechanics; Artifacts render Mermaid natively (```mermaid fences), so no external libraries are involved. If Artifact publishing is unavailable in the session, write the same report as a self-contained Markdown file in the OS temp directory instead and give the user the path.

Render one card per candidate and a closing **Top recommendation** — [REPORT.md](REPORT.md) owns the card anatomy, report structure, diagram patterns, and vocabulary rules.

**Use `docs/glossary.md` vocabulary for the domain, and the codebase-design vocabulary for the architecture.** If the glossary defines "정산" as `settlement`, talk about "the settlement module" — not "the FooBarHandler," and not a banned alias.

**Decision conflicts**: if a candidate contradicts an entry in `docs/decisions.md`, only surface it when the friction is real enough to warrant revisiting the decision. Mark it clearly in the card (e.g. a warning callout: _"contradicts the 2026-03 event-sourcing decision — but worth reopening because…"_). Don't list every theoretical refactor a past decision forbids.

Do NOT propose interfaces yet. After publishing, give the user the Artifact link and ask: "Which of these would you like to explore?"

### 3. Grilling loop

Once the user picks a candidate, call the Skill tool with "grilling" to walk the decision tree with them — constraints, dependencies, the shape of the deepened module, what sits behind the seam, what tests survive.

As decisions crystallize, propose the matching docs updates — applied only with the user's approval, per the maintenance rules in the `second-brain` skill:

- **Naming a deepened module after a concept not in `docs/glossary.md`?** Propose the glossary row.
- **Sharpening a fuzzy term during the conversation?** Propose the correction right there.
- **User rejects the candidate with a load-bearing reason?** Offer a `docs/decisions.md` entry when it meets the recording criteria in the `second-brain` skill, framed as: _"이걸 decisions.md에 기록해서 다음 아키텍처 리뷰가 같은 걸 다시 제안하지 않게 할까요?"_ Skip ephemeral reasons ("not worth it right now") and self-evident ones.
- **Want to explore alternative interfaces for the deepened module?** Call the Skill tool with "codebase-design" and use its design-it-twice parallel sub-agent pattern.

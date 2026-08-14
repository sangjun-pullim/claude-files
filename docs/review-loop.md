# Fresh-Context Review Loop

The iteration protocol shared by `/impl-plan` and `/impl-execute`. The calling skill owns
everything that goes **into** a round. This file owns **when the loop iterates, stalls, and
stops**.

Severity labels are defined once, in `agents/reviewer.md`.

## Round structure

One **iteration** = one reviewer spawn that returns findings. A spawn that comes back blocked is
not an iteration and does not count toward the cap.

Every iteration spawns a **new** reviewer — never reuse one, fresh context is the entire point.
The sequence *within* an iteration, including any gate that must pass before re-spawning, is
defined by the calling skill's Steps A–D; this file does not restate it.

Report each iteration's results per `rules/agents.md` Background Agent Turn Discipline.

## Loop exit

Exit when a reviewer reports **no CRITICAL or HIGH findings** and one confirmation round agrees.
The confirmation round runs a fresh reviewer on the current artifact with **no disposition
table**: removing the anchor is the whole value, since the previous reviewer had its own calls
in hand and tends to defend them.

**Skip the confirmation round when nothing changed since the clean verdict** — that is, the
clean round applied no ACCEPTED findings and carried no disposition table. Its inputs would be
identical to the round that just came back clean, so it has no new information to act on. A
first-round-clean run therefore costs one review, not two.

If the confirmation round surfaces new **CRITICAL or HIGH** findings, return to disposition and
continue; those iterations count toward the cap. New MEDIUM/LOW findings are recorded and do not
restart the loop.

One limit on the anchor removal: the artifact's own `## Review Notes` log travels with it and
cannot be withheld. "No disposition table" means the current round's table — treat anything in
`## Review Notes` as informational, never as a reason to suppress a finding.

Remaining MEDIUM/LOW items are recorded but never block.

## Abnormal exits

Three ways the loop stops without a clean verdict. In all three: stop reviewing, report the open
findings to the user for judgment, and hand the artifact to the calling skill's abnormal-exit
handling. **Never treat the artifact as verified** — an abnormal exit is not a pass.

- **Cap** — maximum **5** iterations. The confirmation round does not count toward it, but any
  issues it surfaces trigger iterations that do.
- **Stall** — checked before spawning the next round. STALLED when either holds:
  - **two consecutive rounds raise a CRITICAL/HIGH of the same category, whatever the
    disposition.** Disposition-independent on purpose: the party being reviewed decides
    ACCEPTED vs REJECTED, so a rule keyed on it lets a repeatedly-rejected CRITICAL burn all
    five rounds instead of escalating on round two.
  - the previous round's ACCEPTED CRITICAL/HIGH findings all reappear in this round — fixes
    were applied and none of them took.

  Escalate rather than burning iterations toward the cap.
- **Blocked reviewer** — a reviewer that reports itself blocked (`agents/reviewer.md` Output
  Contract) does not count as an iteration and never permits exit. Re-spawn **once** with what it says was missing; a second block escalates.
  Without that bound the exit is self-judged and the loop has no terminal condition.

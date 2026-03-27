# Lesson 7: Debugging with Competing Hypotheses
**Status:** COMPLETED
**Date:** 2026-03-27 — 2026-03-27

## Quick Reference
Use an agent team to investigate a bug from multiple angles simultaneously. Each teammate holds a different hypothesis and actively tries to disprove the others. The theory that survives scrutiny is most likely the root cause. This fights anchoring bias — the tendency to stop looking once you find one plausible explanation.

## Concepts
- **What it is** — Spawning 3–5 debugging teammates each assigned a different hypothesis for the same symptom. They investigate independently, then challenge each other's theories. The hypothesis that can't be disproved is the root cause.
- **Why it exists** — Sequential debugging anchors on the first plausible explanation. An agent team runs all hypotheses simultaneously and forces adversarial scrutiny — teammates actively trying to invalidate each other's theories produces better signal than teammates agreeing.
- **When to use it** — Ambiguous bugs where the symptom has multiple plausible causes. Intermittent failures. Bugs that have survived one or more solo debugging sessions. Bugs where you have a "feeling" about the cause but want it challenged.
- **When NOT to use it** — Obvious bugs with a single clear cause. Compilation errors. Simple null references. Any bug where the stack trace points directly at the problem.
- **Common mistakes** — Assigning overlapping hypotheses (teammates end up investigating the same thing). Not requiring teammates to actively disprove others (they just report their own findings). Accepting the first surviving hypothesis without confirming it with a reproduction.

## Key Commands & Syntax
- **Hypothesis framing** — Each teammate gets exactly one hypothesis: "Investigate whether this is caused by X"
- **Adversarial step** — Explicitly prompt: "Have them talk to each other to try to disprove each other's theories"
- **Consensus emergence** — The surviving hypothesis wins; lead asks teammates to confirm with a reproduction

## Exercise
### Setup
A subtle bug was planted in `src/modules/todo-tracker/index.ts` (line 133). The symptom: when the user runs `devkit todo --tag TODO`, the results are wrong — they get FIXME and HACK comments instead of TODO comments. The bug has multiple plausible explanations.

### Steps
1. Planted bug: `===` changed to `!==` in tag filter on line 133
2. Spawned 4 debugging teammates, each assigned one hypothesis
3. Teammates investigated independently
4. Teammate 3 (filter-investigator) identified the exact line and explained the inversion precisely
5. All other teammates agreed — unanimous consensus, no prolonged debate
6. Bug fixed: `!==` restored to `===`

### Prompts Used

**Competing Hypotheses Debug Team:**
```
Users report that `devkit todo --tag TODO` returns the wrong comments —
it shows FIXME and HACK items but not TODOs. Running without --tag returns
all comments correctly.

Spawn 4 agent teammates to investigate different hypotheses:

- Teammate 1: Investigate whether this is a tag comparison case-sensitivity issue —
  is the tag being normalized to the wrong case somewhere between the regex
  match and the filter?

- Teammate 2: Investigate whether the regex (COMMENT_PATTERN) is capturing the
  wrong group, or whether the tag field on ParsedComment is being set incorrectly.

- Teammate 3: Investigate whether the filter logic itself has a bug — is the
  filtering condition correct, or is there an inversion or off-by-one in the
  filter predicate?

- Teammate 4: Investigate whether the bug is upstream of filtering — maybe
  the --tag CLI option is being parsed or passed incorrectly, so the wrong
  value reaches the filter.

Have them talk to each other to try to disprove each other's theories.
Update findings as consensus emerges. The theory that survives scrutiny
is most likely the actual root cause. Once a winner is identified,
confirm it by pointing at the exact line.
```

### Team Output
- **Teammate 1 (case-sensitivity)** — eliminated own hypothesis: tag is uppercased consistently on both sides (`c.tag` via `.toUpperCase()` on capture, `tagFilter` via `.toUpperCase()` on option). Case is not the issue.
- **Teammate 2 (regex/capture)** — eliminated own hypothesis: regex captures group 1 correctly, `.toUpperCase()` is applied, `ParsedComment.tag` is always uppercased. The data going into the filter is correct.
- **Teammate 3 (filter logic)** — **found it**: `!==` inverts the predicate. When `tagFilter === "TODO"`, the filter keeps every comment whose tag is NOT "TODO" — exactly the observed symptom (FIXME and HACK survive, TODOs are discarded). The no-tag path bypasses the filter entirely via `!tagFilter`, explaining why `--tag` omitted works correctly.
- **Teammate 4 (CLI parsing)** — eliminated own hypothesis: Commander parses `--tag TODO` correctly, `.toUpperCase()` is applied before the filter, the value reaching the filter is the correct string "TODO".
- **Consensus:** unanimous on Teammate 3's finding. All others confirmed their hypotheses were eliminated by their own investigation.

**Root cause:** `allComments.filter((c) => c.tag !== tagFilter)` — single character bug (`!==` vs `===`).

## Build Log
### Files Created
_To be filled after exercise completes._

### Files Modified
| File | What Changed | Why |
|------|-------------|-----|
| `src/modules/todo-tracker/index.ts` | Planted bug on line 133: `===` changed to `!==` in tag filter | Set up the debugging exercise |

### Decisions Made
- **4 hypotheses was the right team size** — each hypothesis covered a distinct layer (case normalization → regex capture → filter predicate → CLI parsing), giving clean separation and no overlapping investigations.
- **Convergence was fast** — when one hypothesis produces a precise, verifiable explanation ("the `!==` inverts the predicate, which mechanically produces exactly the observed output"), the other teammates can self-eliminate quickly. No prolonged debate needed.

### Issues Encountered
- None — the exercise ran cleanly. The bug was simple enough that the filter-investigator found it quickly, and the other investigators reached firm eliminations without needing the cross-challenge step to resolve ambiguity.

## Connections
- **Builds on Lesson 6** — Lesson 6's review surfaced real potential bugs. Lesson 7 practices the debugging pattern when a bug is known to exist but the cause is unclear.
- **Sets up Lesson 8** — Advanced patterns — after fixing the bug here, Lesson 8 introduces task dependencies and cross-layer coordination for the unified report feature.

# Lesson 10: Retrospective and Patterns Reference
**Status:** COMPLETED
**Date:** 2026-03-27

## Quick Reference
Course retrospective — honest post-mortem on what worked, what didn't, and what the 9 lessons revealed about agent teams in practice. Includes the patterns cheat sheet updated with real observations, the common pitfalls we actually hit, and the open issues left by the Lesson 9 review as a concrete example of what integration reviews surface.

---

## What Actually Happened — Lesson by Lesson

| # | Pattern | Result | Surprise? |
|---|---------|--------|-----------|
| 1 | Research (2 teammates) | Clean parallel research, organic cross-sharing | No — low-risk entry point as expected |
| 2 | Research (3 teammates) | Architecture produced; design tension surfaced and resolved | Design tensions surface naturally without prompting |
| 3 | Single session (deliberate) | Scaffolding faster and simpler without a team | Confirmed: sequential setup is not a team use case |
| 4 | Parallel Build (4 teammates) | All 4 modules built with zero file conflicts; teammates shared patterns organically | Teammates shared glob tips and mocking approaches without being asked |
| 5 | Build + Review (2 + 1) | Reviewer caught severity type mismatch mid-build | Reviewer caught a contract violation the builders missed |
| 6 | Multi-Lens Review (3 reviewers) | Cross-challenge produced 5 downgrades, 1 upgrade, 4 merges | SSRF unanimously downgraded — threat model context changes severity |
| 7 | Competing Hypotheses (4 investigators) | Unanimous consensus, no debate — filter-investigator found it fast | Fast convergence is a feature; debate is only needed when no hypothesis produces a precise explanation |
| 8 | Cross-Layer with Dependencies (4 teammates) | Dependency chain enforced; teammates waited correctly | Blocked teammates need explicit unblock messages — dependencies don't create notifications |
| 9 | Integration + Polish + Testing (3 teammates) | Zero conflicts; report.ts was the integration seam caught from two angles | External code review found what the internal team missed — form vs. function gap |

---

## Discussion

### When did agent teams save time vs add overhead?

**Clear wins:**
- Lesson 4 (Parallel Build) — 4 modules in parallel with no coordination cost. Completion order didn't matter because each module was fully independent. This is the canonical agent teams use case.
- Lesson 6 (Multi-Lens Review) — three reviewers in parallel surfaced issues that no single reviewer would have caught with equal depth. The cross-challenge round added quality that sequential review can't replicate.
- Lesson 8 (Cross-Layer) — schema-first dependency chain made the critical-path constraint explicit and mechanical rather than relying on teammates to self-organize.

**Overhead not worth it:**
- Lesson 3 was deliberately a single session — scaffolding is sequential by nature, teams would have added coordination overhead with no parallelism benefit.

**Nuanced:**
- Lesson 5 (Build + Review): the reviewer added value but required more careful spawn prompting than the builders. A lazy reviewer prompt produces a reviewer that just agrees with everything.
- Lesson 7 (Competing Hypotheses): 4 teammates for a 1-line bug. Worth it as a learning exercise; in practice you'd only spawn competing hypotheses if a bug had survived solo debugging.

### Which lessons produced the best team dynamics?

Lesson 4 and Lesson 6. In both cases teammates operated autonomously — in Lesson 4 sharing patterns without prompting, in Lesson 6 challenging each other without being told to. The common factor: clear independent domains with an explicit deliverable per teammate.

### What team sizes worked best?

3 was the sweet spot for most patterns. Enough to cover distinct domains, small enough for the lead to monitor. 4 worked for Lesson 8 because the dependency chain made coordination explicit. The Lesson 7 4-teammate debug team could have been 3 — one hypothesis was redundant.

### Token cost: agent teams vs single session

Each teammate has an **independent context window** — they don't share the lead's conversation history. Token costs scale roughly linearly with team size:

| Configuration | Approximate token multiplier |
|--------------|------------------------------|
| Single session | 1× baseline |
| 3-teammate team | ~3–4× |
| 4-teammate team | ~4–5× |
| 4+ teammates with plan mode | up to 7× |

The tradeoff is well-characterized: multi-agent systems use 4–15× more tokens than single-agent approaches, but each agent uses only ~40% of its context window (vs. 80–90% for a single agent doing equivalent work). The cost is real — a 3-teammate team on a long lesson could cost as much as 3 sequential sessions — but the wall-clock time saved and the qualitative difference in review thoroughness (Lesson 6) or debugging breadth (Lesson 7) often justify it.

**Cost-effective patterns:** Research, parallel builds, multi-lens review — tasks where parallelism produces better outcomes, not just faster ones.

**Not cost-effective:** Sequential setup work (Lesson 3), simple single-file bugs with an obvious cause, anything where the coordination overhead approaches the actual work time.

In this course: token cost was not noticeable in practice — the Sonnet 4.6 model is efficient enough that even 4-teammate lessons didn't feel expensive. The lessons most likely to have cost the most were Lesson 6 (3 full reviewers reading the entire codebase) and Lesson 8 (4 teammates + plan approval round-trips).

### When did you need to steer vs let the team self-organize?

**No steering was needed across the entire course** — every team completed its tasks without correction or redirection. The only required lead interventions were structural, not corrective:
- Lesson 5: plan approval (reviewing and approving plans is part of the mechanic, not steering)
- Lesson 8: explicit unblock messages when Task 1 completed (dependency mechanic, not a correction)

**Self-organized without any prompting:**
- Lesson 4: teammates shared glob tips and mocking approaches via DM without being asked
- Lesson 6: reviewers challenged each other's severity ratings and merged duplicate findings
- Lesson 7: investigators self-eliminated their own hypotheses and reached unanimous consensus

The practical implication: **if your spawn prompts are specific enough, the team will run itself.** The investment is in writing a good prompt upfront, not in managing the team during execution.

### What surprised you?

**The ease of creating agent teams.** The friction expected — complex configuration, brittle tooling, teams failing to coordinate — didn't materialize. Spawning a 4-teammate team with task dependencies and plan approval was as straightforward as writing a detailed prompt. The mechanics (mailboxes, task lists, dependency resolution) worked without any setup beyond the environment variable.

The gap between the *concept* of multi-agent coordination and the *practice* of it turned out to be much smaller than expected. The hard part isn't the tooling — it's writing spawn prompts specific enough that teammates can operate independently without inheriting your context.

### What did the Lesson 9 external review reveal?

The review returned 3 critical, 6 important, 5 minor findings and a "not ready for 1.0" verdict. The most instructive findings:

**C1 + C3 — same root cause, both in report.ts:**
The integration team fixed the *code pattern* (add `loadConfig`, `formatError`) without checking the *behavioral wiring* (config never passed downstream, `validate()` never called). The external reviewer found it by asking "does config actually affect output?" rather than "does this file follow the same pattern as the others?" This is the form vs. function gap — internal teams check consistency, external reviewers check correctness.

**C2 — test mock tied to wrong import string:**
`git-stats` uses `'fs'` instead of `'node:fs'`, and the mock matches `'fs'`. If the import is corrected the mock silently stops working. An external reviewer spotted this because it was looking at the whole picture — the internal team built the mock to match the code, which validated the bug rather than catching it.

**I2 — known gap not fixed:**
`loadConfig` throwing on invalid config was surfaced in Lesson 6's review. It wasn't fixed in Lessons 7, 8, or 9. Known issues don't fix themselves — they need explicit owners and tasks.

**The open issues (intentionally left unfixed for this retrospective):**
- C1: `report.ts` config loaded but never passed into `generateReport`
- C2: `git-stats` uses `'fs'` instead of `'node:fs'`
- C3: `report` command skips `validate()` entirely
- I1: `dep-audit` reads `registryUrl` via unsafe cast
- I2: `loadConfig` throws but no command catches it
- I3: `smoke.test.ts` makes live network calls
- I4: `code-health` coverage detection is opt-out not opt-in
- I5: No `--json` integration test for `report`
- I6: `docs/architecture.md` still says "4 modules"

---

## Patterns Cheat Sheet (Updated from Experience)

| Pattern | Team Size | Use When | Observed Result |
|---------|-----------|----------|-----------------|
| Research | 2–3 | Exploring options, comparing alternatives | Organic cross-sharing without prompting; design tensions surface naturally |
| Parallel Build | 3–5 | Independent modules, clear file ownership | Zero conflicts when file ownership is explicit; completion order doesn't matter |
| Build + Review | N builders + 1 reviewer | Quality matters, new shared infrastructure | Catches contract violations mid-build; reviewer needs rich context in spawn prompt |
| Multi-Lens Review | 3 | Security + Performance + Correctness | Cross-challenge is the most valuable step; same bug looks different from different lenses |
| Competing Hypotheses | 3–5 | Ambiguous bugs that survived solo debugging | Fast convergence when one hypothesis produces a precise explanation; debate only for judgment calls |
| Cross-Layer | 3–4 | Features with a critical-path schema/contract | Dependency chain enforces ordering; lead must send explicit unblock messages |
| Integration | 2–3 | Final assembly after parallel build | Catches pattern vs. function gaps; pair with external code review |

---

## Common Pitfalls — What We Actually Hit

1. **Using teams for sequential work** — Lesson 3 proved this deliberately. Scaffolding with a team would have been slower, not faster.
2. **Blocked teammates don't self-notify** — Lesson 8: when Task 1 completed, Teammates 2 and 3 did not start automatically. Dependencies enforce ordering; they don't create notifications. The lead must send an explicit unblock message.
3. **Broadcast shutdown doesn't support structured messages** — surfaced in Lesson 4. Teammates must be shut down individually.
4. **Reviewer needs explicit "do NOT write code" instruction** — without it, reviewers drift into making fixes rather than flagging issues.
5. **External review after integration is not optional** — Lessons 5–9 all had internal review. The external review in Lesson 9 still found 3 critical issues the team missed. Internal teams check consistency; external reviewers check correctness against spec.
6. **Pattern matching vs. behavioral wiring** — the integration team in Lesson 9 added the right imports without connecting them. Code that looks right is not the same as code that works.

---

## Build Log
### Files Created
| File | Description | Reason for Being |
|------|-------------|-----------------|
| `docs/lesson_10.md` | Course retrospective and patterns reference | Final lesson — reflection rather than implementation |

### Files Modified
None.

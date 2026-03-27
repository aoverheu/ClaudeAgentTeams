# Lesson 6: Multi-Lens Review
**Status:** COMPLETED
**Date:** 2026-03-26 — 2026-03-27

## Quick Reference
Use an agent team to review the entire codebase from three independent angles simultaneously: security, performance, and correctness. Each reviewer produces severity-rated findings, then teammates challenge each other before finalizing. Key concept: different reviewers naturally catch different issues — parallelizing lenses is more thorough than any single reviewer.

## Concepts
- **What it is** — Spawning 3+ review teammates each focused on a different quality dimension (security, performance, correctness/edge cases). They work in parallel then cross-validate findings before finalizing.
- **Why it exists** — A single reviewer anchors on one type of issue. Security reviewers miss edge cases; correctness reviewers miss timing bugs. Splitting lenses forces dedicated attention on each domain.
- **When to use it** — Pre-merge review on security-sensitive or shared infrastructure code. After a major build phase before moving on. When you suspect issues in a specific domain but want full coverage.
- **When NOT to use it** — Routine PRs, small changes, or code with narrow scope. The token cost is high — reserve for code that many things depend on.
- **Common mistakes** — Letting reviewers converge too fast (they should challenge each other, not just agree). Not giving reviewers enough codebase context in the spawn prompt. Treating all severity ratings as equal (prioritize critical/high).

## Key Commands & Syntax
- **Spawn prompt pattern** — Give each reviewer a named domain and specific things to look for
- **Challenge step** — Explicitly tell teammates to "challenge each other's findings before finalizing"
- **Severity ratings** — critical / high / medium / low — always ask for these to enable triage
- **Findings report** — Ask each reviewer to produce a structured report with file+line references

## Exercise
### Setup
All 4 modules implemented in Lesson 4. Shared integration layer built and reviewed in Lesson 5. This lesson reviews the entire `src/` tree.

### Steps
1. Spawned 3 reviewer teammates: Security Reviewer, Performance Reviewer, Correctness Reviewer
2. All 3 reviewed independently in parallel — each produced their own findings report
3. Teammates challenged each other's findings (cross-challenge round)
4. Cross-challenge produced: 5 severity downgrades, 1 severity upgrade, 4 finding merges
5. Lead synthesized the final consolidated report (`docs/review_final.md`)

### Prompts Used

**Multi-Lens Review (from plan.md):**
```
Create an agent team to review the entire devkit codebase. Spawn 3 reviewers:

- Teammate 1 (Security Reviewer): Check for command injection risks (we shell out
  to git and npm), path traversal, dependency confusion, unsafe regex (ReDoS),
  and secrets in config handling.

- Teammate 2 (Performance Reviewer): Check for unnecessary file system scans,
  memory usage with large repos, missing caching opportunities, and async/await
  correctness.

- Teammate 3 (Correctness Reviewer): Check for edge cases — empty repos, missing
  package.json, binary files, symlinks, monorepos, Windows path compatibility,
  and error messages that help users fix the problem.

Each reviewer should produce a findings report with severity ratings (critical/high/medium/low).
Have them challenge each other's findings before finalizing.
```

### Team Output

**Independent findings before cross-challenge:**
- Security: 0 critical, 1 high, 3 medium, 3 low (SSRF, path traversal, prototype pollution, scoped packages, regex, rate limiting, info disclosure)
- Performance: 0 critical, 3 high, 3 medium, 3 low (sequential scanning, N+1 git diffs, memory, Math.spread, binary files)
- Correctness: 0 critical, 2 high, 4 medium, 4 low (version comparison bug, stack overflow, binary files, scoped packages, CLI flag merge order, parseInt NaN)

**Cross-challenge outcomes:**
- SSRF: HIGH → LOW (security threat model doesn't apply to a local CLI where the attacker already controls the filesystem)
- Prototype pollution: MEDIUM → LOW (JSON.parse + validateConfig makes it non-exploitable in practice)
- Sequential file scanning: 2× HIGH → 1× MEDIUM (SSD impact overstated, same root cause merged)
- Math.min/max spread: MEDIUM (perf) + HIGH (correctness) → HIGH (hard crash framing wins)
- Scoped package encoding: independently found by both security + correctness → merged into 1× MEDIUM
- Config merge order: LOW (correctness) → MEDIUM (security reviewer upgraded: real user-visible bug)
- Command handler try/catch: MEDIUM → LOW (contract not violated in current code)

**Final consolidated counts:** 0 critical, 3 high, 7 medium, 6 low (16 total)

**Top 3 HIGH findings:**
1. `git-stats` Math.min/max spread crashes on repos with 65K+ commits — hard `RangeError`
2. `dep-audit` version comparison wrong when local version is ahead of registry — false "update available"
3. `git-stats` 50 sequential `git diff` spawns — 5–10 seconds on Windows

## Build Log
### Files Created
| File | Description | Reason for Being |
|------|-------------|-----------------|
| `docs/review_security.md` | Security reviewer's independent findings | Per-lens report for traceability |
| `docs/review_performance.md` | Performance reviewer's independent findings | Per-lens report for traceability |
| `docs/review_correctness.md` | Correctness reviewer's independent findings | Per-lens report for traceability |
| `docs/review_final.md` | Consolidated report post-cross-challenge | Synthesized action list for the team |

### Files Modified
None — this was a review-only exercise.

### Decisions Made
- **Keep per-lens reports alongside the final report** — preserves the reasoning trail, especially useful for seeing how severity decisions changed across the cross-challenge round.
- **SSRF stays LOW** — unanimous agreement that local CLI threat model doesn't warrant HIGH; noted as a flag for any future service deployment.
- **Config merge order upgraded to MEDIUM** — originally flagged LOW by correctness reviewer; security reviewer's challenge surfaced that this is user-visible (CLI flags being silently overridden is a confusing bug), not just a theoretical issue.

### Issues Encountered
- The cross-challenge round surfaced 4 duplicate root causes between reviewers (scoped packages, binary files, memory, Math.spread) — these were caught and merged cleanly. The pattern: performance reviewers frame issues as slow, correctness reviewers frame the same code as wrong — both are right, and merging produces a sharper finding.

## Connections
- **Builds on Lesson 5** — In Lesson 5, a reviewer caught issues in real-time during a build. This lesson applies the review concept at a larger scale: post-build, full codebase, specialized lenses.
- **Builds on Lesson 4** — The 4 modules built in Lesson 4 are the primary review target.
- **Sets up Lesson 7** — If reviewers surface bugs, Lesson 7's competing-hypotheses debugging pattern is how to investigate them.

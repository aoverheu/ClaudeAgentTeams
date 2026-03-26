# DevKit Agent Teams Course — Lesson Index

A hands-on deep-dive into Claude Code agent teams. Each lesson doc is a self-contained reference — open any one to review that topic.

## Lessons

| # | Lesson | Concept | Doc | Status |
|---|--------|---------|-----|--------|
| 1 | Understanding Agent Teams | Architecture, when to use teams vs subagents | [lesson_01.md](lesson_01.md) | Completed |
| 2 | Research Team | Spawn prompts, team sizing, research-first approach | [lesson_02.md](lesson_02.md) | Completed |
| 3 | Project Scaffolding | When NOT to use teams (single session) | [lesson_03.md](lesson_03.md) | Completed |
| 4 | Parallel Module Build | File ownership, self-claiming, 4-teammate coordination | [lesson_04.md](lesson_04.md) | Completed |
| 5 | Quality Gates | Reviewer teammate, plan approval, hooks, external auditor | [lesson_05.md](lesson_05.md) | Not started |
| 6 | Multi-Lens Review | Parallel review with security/performance/correctness lenses | [lesson_06.md](lesson_06.md) | Not started |
| 7 | Competing Hypotheses | Adversarial debugging with parallel investigation | [lesson_07.md](lesson_07.md) | Not started |
| 8 | Advanced Patterns | Task dependencies, cross-layer coordination, steering | [lesson_08.md](lesson_08.md) | Not started |
| 9 | Integration & Polish | Final assembly, E2E testing, full code review | [lesson_09.md](lesson_09.md) | Not started |
| 10 | Retrospective | Patterns cheat sheet, lessons learned | [lesson_10.md](lesson_10.md) | Not started |

## Technical Details

Deep-dive docs on how agent team mechanics work under the hood. Created when a lesson introduces new infrastructure, not just a new use case.

| Lesson | Doc | Mechanics Covered |
|--------|-----|-------------------|
| 1 | [lesson_01_technical_details.md](lesson_01_technical_details.md) | TeamCreate, TaskCreate, Agent spawning, mailbox system, shutdown protocol |
| 2 | [lesson_02_technical_details.md](lesson_02_technical_details.md) | Task dependencies (blockedBy), broadcast messaging, peer-to-peer DMs |

## How to Use This Reference

- **Quick refresher on a concept?** — Open the lesson doc, read the **Quick Reference** and **Concepts** sections
- **Need a prompt template?** — Check the **Key Commands & Syntax** and **Prompts Used** sections
- **Want to see what was built?** — Check the **Build Log** section
- **Looking for gotchas?** — Check **Common Mistakes** and **Issues Encountered**
- **How does it work under the hood?** — Check the **Technical Details** docs

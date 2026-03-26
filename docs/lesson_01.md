# Lesson 01: Understanding Agent Teams
**Status:** IN PROGRESS
**Date:** 2026-03-26 —

## Quick Reference
Agent teams coordinate multiple Claude Code instances working in parallel. A team lead spawns teammates, each with their own context window, that communicate via a shared task list and mailbox. Use teams when work is parallelizable and teammates need to talk to each other — use subagents when you just need focused workers that report back.

## Concepts
- **What it is** — Agent teams are multiple Claude Code sessions coordinated by a lead. Each teammate is a fully independent instance with its own context window, tools, and permissions. They share a task list and can message each other directly.

- **Why it exists** — A single Claude Code session has one context window and works sequentially. For tasks where parallel exploration adds value (research, independent modules, debugging), agent teams let multiple sessions work simultaneously and share findings.

- **Architecture components:**
  | Component | Role |
  |-----------|------|
  | **Team lead** | Your main session. Creates the team, spawns teammates, coordinates work, synthesizes results |
  | **Teammates** | Separate Claude Code instances. Each has its own context, works on assigned tasks |
  | **Task list** | Shared work items with states: pending → in progress → completed. Supports dependencies |
  | **Mailbox** | Messaging system. Teammates send messages to each other or broadcast to all |

- **When to use it:**
  - Research from multiple angles simultaneously
  - Building independent modules/features in parallel
  - Debugging with competing hypotheses
  - Cross-layer coordination (frontend + backend + tests)
  - Parallel code review with different lenses

- **When NOT to use it:**
  - Sequential tasks where each step depends on the previous
  - Same-file edits (causes conflicts)
  - Simple tasks a single session handles fine
  - Work with many interdependencies between steps

- **Teams vs Subagents vs Single Session:**
  | Approach | Context | Communication | Best For |
  |----------|---------|---------------|----------|
  | Single session | One context window | N/A | Sequential work, simple tasks |
  | Subagents | Own context, results return to caller | Report back to main agent only | Focused tasks, only result matters |
  | Agent teams | Own context, fully independent | Teammates message each other directly | Complex parallel work needing collaboration |

- **Common mistakes:**
  - Using teams for sequential work (adds overhead, no speed benefit)
  - Not giving teammates enough context in spawn prompts (they don't inherit lead's conversation history)
  - Letting teammates edit the same files (causes overwrites)
  - Too many teammates (coordination overhead exceeds benefit — start with 3-5)
  - Not monitoring progress (teammates can drift or get stuck)
  - Forgetting to clean up teams when done

## Key Commands & Syntax

### Enable Agent Teams
Add to `settings.json`:
```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

### Display Modes
- **In-process** (default): all teammates in your terminal
  - `Shift+Down` — cycle through teammates
  - `Ctrl+T` — toggle task list
  - `Enter` — view a teammate's session
  - `Escape` — interrupt teammate's current turn
- **Split-pane**: each teammate in its own tmux/iTerm2 pane
  ```json
  { "teammateMode": "tmux" }
  ```
  Or per-session: `claude --teammate-mode in-process`

### Team Lifecycle Commands (natural language to the lead)
```
Create an agent team with [N] teammates to [task description]
```
```
Ask the [name] teammate to shut down
```
```
Clean up the team
```
```
Wait for your teammates to complete their tasks before proceeding
```

### Storage Locations
- Team config: `~/.claude/teams/{team-name}/config.json`
- Task list: `~/.claude/tasks/{team-name}/`

## Exercise

### Setup
- Claude Code v2.1.32+ installed
- Agent teams enabled in settings.json
- No project code yet — this is pure exploration

### Steps
1. Verify prerequisites (Claude Code version, agent teams enabled)
2. Create a simple 2-teammate research team
3. Observe team mechanics: task list, teammate cycling, communication
4. Clean up the team
5. Reflect on what happened

### Prompts Used
**Research team prompt:**
```
Create an agent team with 2 teammates to research CLI frameworks for a new
TypeScript project. One teammate should investigate Commander.js and the other
Yargs. Each should report: API design, TypeScript support, ecosystem/plugins,
and bundle size. Have them compare notes and recommend one.
```
Why structured this way:
- 2 teammates keeps it simple for a first run
- Research task = read-only, low risk, clear boundaries
- Specific criteria (API design, TS support, etc.) gives teammates focus
- "Compare notes" forces inter-teammate communication

### Team Output
_(to be filled after exercise)_

## Build Log
### Files Created
_(no code files in this lesson — concept exploration only)_

### Files Modified
_(none expected)_

### Decisions Made
_(to be filled after exercise)_

### Issues Encountered
_(to be filled after exercise)_

## Connections
- **Previous:** None — this is the foundation
- **Next:** Lesson 2 uses a larger research team (3 teammates) to design the DevKit architecture, building on the team mechanics learned here
- **Key dependency:** Everything in the course depends on understanding these fundamentals

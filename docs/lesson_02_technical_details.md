# Lesson 02: Technical Details — Task Dependencies and Cross-Team Communication

## New Mechanics Introduced

This lesson introduced two mechanics not covered in Lesson 1's technical details:

1. **Task dependencies** (`blockedBy`/`addBlocks`) — tasks that cannot start until other tasks complete
2. **Broadcast messaging** — sending a single message to all teammates simultaneously

## Task Dependencies

### How They Work

Tasks support `blockedBy` and `addBlocks` relationships via `TaskUpdate`:

```
TaskUpdate({ taskId: "4", addBlockedBy: ["1", "2", "3"] })
```

This means Task #4 cannot be claimed or started until Tasks #1, #2, and #3 are all marked `completed`.

### What Happens on Disk

Tasks are stored in `~/.claude/tasks/{team-name}/`. Each task file includes a `blockedBy` array of task IDs. When a teammate calls `TaskList`, blocked tasks show their blocking dependencies. The system prevents status transitions to `in_progress` while blockers remain open.

### Dependency Chain Used

```
Task #1 (CLI Architect research)     ──┐
Task #2 (Module Designer research)   ──├── blocks ──→ Task #4 (Share findings) ──→ blocks ──→ Task #5 (Architecture doc)
Task #3 (DX Researcher research)     ──┘
```

Tasks #1-3 ran in parallel. Task #4 unblocked when all three completed. Task #5 unblocked when #4 completed.

### Observed Behavior

- Teammates naturally checked `TaskList` after completing their primary task
- Module Designer noted Task #4 was "still formally blocked" and worked around it by proactively sharing findings via direct messages
- The formal task dependency enforced ordering, but teammates communicated informally before the blocked task officially unblocked
- This suggests dependencies are guardrails, not the only coordination mechanism — mailbox messages supplement them

## Broadcast Messaging

### How It Works

```
SendMessage({ to: "*", summary: "...", message: "..." })
```

The `*` target sends the message to all teammates' inboxes. The system confirms delivery to each teammate by name.

### Response from System

```json
{
  "success": true,
  "message": "Message broadcast to 3 teammate(s): cli-architect, module-designer, dx-researcher",
  "recipients": ["cli-architect", "module-designer", "dx-researcher"]
}
```

### When to Use

- Alignment checks ("confirm your designs are compatible")
- Decisions that affect everyone ("we're going with pure-data modules")
- Status updates ("all research tasks complete, moving to synthesis")

### Cost Note

Broadcasts are "expensive (linear in team size)" per the tool docs — each teammate wakes up, processes the message, and responds. For a 3-person team this is fine; for larger teams, prefer targeted messages.

## Peer-to-Peer Communication

### How Teammates Message Each Other

Teammates used `SendMessage` to message each other directly (not just the team lead). This was visible to the team lead via **idle notification summaries**:

```json
{
  "type": "idle_notification",
  "from": "module-designer",
  "summary": "[to cli-architect] Integration feedback on CLI architecture + module contract"
}
```

The team lead sees a one-line summary of peer DMs in idle notifications. This provides visibility without flooding the lead with full message content.

### Observed Pattern

1. Module Designer finished Task #2, sent findings to CLI Architect
2. CLI Architect received the message, reviewed it, sent confirmation back
3. Both went idle; team lead saw summaries of the exchange
4. No lead intervention needed — teammates self-organized the alignment

## Key Differences from Lesson 1

| Mechanic | Lesson 1 | Lesson 2 |
|----------|----------|----------|
| Task dependencies | Not used | `blockedBy` chains (3→1→1) |
| Broadcast messaging | Not used | `SendMessage({ to: "*" })` for team-wide alignment |
| Peer DMs | Not observed | Teammates messaged each other directly |
| Team lead role | Observed mechanics | Actively coordinated: set dependencies, resolved design tension, wrote synthesis |
| Task count | Simple (2 tasks) | 5 tasks with dependency graph |
| Team size | 2 | 3 |

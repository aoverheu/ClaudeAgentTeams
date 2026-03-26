# Lesson 01: Technical Details — How Agent Teams Work Under the Hood

## Step 1: `TeamCreate` — Creating the Team

When `TeamCreate({ team_name: "cli-research" })` is called, two things are created on disk:

**Team config file:** `~/.claude/teams/cli-research/config.json`
```
~/.claude/teams/cli-research/
├── config.json          ← team metadata + member registry
└── inboxes/             ← mailbox system (one JSON file per agent)
    ├── team-lead.json
    ├── commander-researcher.json
    └── yargs-researcher.json
```

**Task list directory:** `~/.claude/tasks/cli-research/`
```
~/.claude/tasks/cli-research/
├── .highwatermark       ← next task ID counter (currently "3")
└── .lock                ← concurrency lock for task operations
```

The `config.json` initially only has the **team lead** (the main Claude session) as a member. Teammates get added to this file when they're spawned.

## Step 2: `TaskCreate` — Shared Task List

Tasks are created using `TaskCreate` and stored in `~/.claude/tasks/cli-research/`. They are accessible to **every agent on the team**. The `.highwatermark` file tracks the next ID (it reads `3` after creating tasks 1-3).

Task #3 had `addBlockedBy: ["1", "2"]` set via `TaskUpdate`, meaning no one could claim it until both research tasks were marked completed.

## Step 3: `Agent` — Spawning Teammates

When the lead calls:

```
Agent({
  name: "commander-researcher",
  team_name: "cli-research",
  prompt: "You are a teammate on the cli-research team...",
  run_in_background: true
})
```

Here's what happens:

1. **A new Claude Code subprocess is launched** — a completely separate Claude instance with its own context window. This is NOT a subagent in the traditional sense (subagents return a result and die). This is a **persistent process** that stays alive and can receive messages.

2. **The agent is registered in `config.json`** — its name, agentId (`commander-researcher@cli-research`), model, and working directory are added to the `members` array.

3. **An inbox file is created** — `inboxes/commander-researcher.json` — this is how messages get delivered to it.

4. **The agent receives only the prompt given to it** — it does NOT inherit the lead's conversation history. It starts fresh with just those instructions. This is why spawn prompts need to be detailed and self-contained.

5. **`run_in_background: true`** means the lead session continues without waiting. Both teammates run simultaneously.

## Step 4: Communication — The Mailbox System

The inboxes are plain JSON arrays. Here's what actually happened in the cli-research exercise:

**`commander-researcher.json` (messages TO the commander researcher):**
- A self-assignment notification for task #1
- Full Yargs research findings FROM yargs-researcher (the peer exchange)
- yargs-researcher's comparison and recommendation for task #3
- The shutdown request from team-lead

**`yargs-researcher.json` (messages TO the yargs researcher):**
- A self-assignment notification for task #2
- Full Commander.js research findings FROM commander-researcher (the peer exchange)
- commander-researcher's "I agree" response
- Team lead's request for the final report
- The shutdown request from team-lead

**`team-lead.json` (messages TO the lead):**
- All idle notifications from both teammates
- commander-researcher's summary report
- yargs-researcher's comparison report and final detailed report
- Shutdown approval confirmations

Every `SendMessage` call writes a JSON object to the recipient's inbox file. The recipient's process polls its inbox and picks up new messages.

## Step 5: How Teammates Actually Ran

Each teammate was a **separate `claude` CLI process** running in the background:

- **Display mode: `in-process`** — both ran inside the terminal session (the default). You can cycle through them with Shift+Down.
- **Each had full tool access** — they could use `WebSearch`, `WebFetch`, `Read`, `Write`, `Edit`, `TaskUpdate`, `SendMessage`, etc. That's how the yargs-researcher was able to edit `lesson_01.md`, `progress.md`, and `plan.md` directly.
- **They shared the same working directory** (`C:\Deleteme\Projects\ClaudeAgentTeams`) but had independent context windows.
- **They went idle between turns** — after completing an action and sending a message, they'd go idle (waiting for input). The idle notifications are the system reporting "this teammate is available."

## Step 6: Shutdown

`SendMessage({ to: "commander-researcher", message: { type: "shutdown_request" } })` sends a structured JSON message. The teammate sees it, responds with `shutdown_approved`, and its process terminates.

## Key Distinction: Agent Teams vs Subagents

| | Subagents (`Agent` without `team_name`) | Teammates (`Agent` with `team_name`) |
|---|---|---|
| Lifetime | Run once, return result, die | Persist until shutdown |
| Communication | Only report back to caller | Message any teammate directly |
| Shared state | None | Shared task list + mailboxes |
| File on disk | None | config.json, inbox JSON files, task files |
| Context | Isolated, prompt-only | Isolated, but can read team config to discover peers |
| Registration | Not tracked | Listed in `config.json` members array |

## What There Isn't

- **No `.md` files for agents** — teammates don't have their own documentation files. Their identity lives in `config.json`.
- **No separate code/scripts** — teammates are vanilla Claude Code instances. The only customization is the spawn prompt.
- **No persistent memory across restarts** — if a teammate shuts down, its context is gone. The inbox JSON files persist (you can still read the message history), but the agent itself has no memory file.

# Developing with Claude Code

This repo is actively developed with Claude Code, using the conventions in `CLAUDE.md`:

**Sub-agents** (spawned inline via the `Agent` tool after each completed task):

| Agent | Spec | Purpose |
|---|---|---|
| CommitAgent | `.claude/architecture/commit-agent.md` | Writes the commit message and commits (`model: haiku`) |
| mobile-reviewer | `.claude/agents/mobile-reviewer.md` | Reviews changed `.tsx` files for touch targets, dark mode, responsive layout |

**Hooks** (`.claude/settings.json`, implemented in `hooks/`):

| Event | What it does |
|---|---|
| `PreToolUse` (Read) | Caps unbounded file reads to 200 lines if a file is over 50KB |
| `PostToolUse` (all) | Logs tool usage/telemetry, compresses large (>20KB) tool outputs into a preview, tracks edited `.tsx` files for the mobile-review trigger |
| `SessionStart` | Records the starting git SHA, resets the session's edited-`.tsx` log |
| `Stop` | Fires the mobile-reviewer if `.tsx` files changed this session; syncs any `[DONE]` backlog tasks into `completed.md` |

**Task tracking** (`.claude/tasks/`): `backlog.md` holds not-yet-started work as
`## TASK-NNN` sections. `completed.md` and TaskLoggerAgent are retired — git history is
the record of finished work.

Design plans for larger features (like the MCP connector) are written to
`~/.claude/plans/*.md` before implementation and kept up to date as phases complete.

← [Back to README](../README.md)

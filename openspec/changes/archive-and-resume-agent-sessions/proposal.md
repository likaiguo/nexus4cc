## Why

Nexus can recreate tmux project/channel structure after restart, but once a zsh/Codex/Claude/cfuse window is closed there is no durable audit trail of what happened in that terminal. Users also need a practical way to resume or continue agent work from a closed channel instead of starting from an empty launcher.

## What Changes

- Persist terminal session archives before a channel is closed and during live channel activity, including project/channel identity, cwd, launcher, timestamps, captured scrollback text, and best-effort agent-native session metadata.
- Add archive APIs for listing, reading, creating snapshots, closing with archive, and restoring a channel from an archive.
- Add launcher-aware restore commands:
  - Codex archives resume with `codex resume <session-id>` when a Codex session id is known.
  - Claude archives resume with `claude --resume <session-id>` when a Claude session id is known.
  - Unknown or unsupported launchers restore to the original launcher and expose archived context for manual continuation.
- Add a compact UI entry for session archives so users can inspect closed-session history and restore a channel.
- Discover resumable Codex/OMO, Claude, and cfuse histories from their local stores, persist their channel links, and expose a one-click continue-reply action from the history panel.
- Preserve native session links across tmux reconciliation and service restarts so a restored channel resumes the same agent conversation instead of starting a new one.
- Keep raw local archive data as the source of truth. Memory/MCP style summaries can be layered later, but they do not replace durable local archives.
- Add tests for archive persistence, command construction, route behavior, and frontend type/build correctness.

## Capabilities

### New Capabilities
- `agent-session-archives`: Durable terminal/agent session archive capture, viewing, and restore behavior.

### Modified Capabilities
- `tmux-mapping-restore`: Active tmux registry restoration should prefer launcher-aware resume commands when archived agent session metadata is available.

## Impact

- Backend storage: add SQLite archive tables and helpers under the existing Nexus data directory.
- Backend APIs: add authenticated archive endpoints and integrate archive capture into channel close/restore paths.
- Launcher behavior: extend launcher command construction to accept optional resume metadata without breaking existing `claude`, `codex`, and `bash` startup.
- Frontend: add a small archive panel/list integrated with the existing terminal command center style.
- Agent history discovery: read local agent indexes without copying or mutating their source transcripts.
- Tests: update storage/launcher tests and add route-level coverage where feasible.

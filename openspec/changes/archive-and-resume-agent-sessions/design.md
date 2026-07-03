## Context

Nexus models projects as tmux sessions and channels as tmux windows. The current registry can recreate the tmux shape after a restart, and the existing history overlay can read scrollback from a live tmux pane. That does not solve post-close auditability: once a window is killed, tmux scrollback is gone unless Nexus captured it first.

Codex and Claude already keep their own local session stores and expose resume commands on this host. Codex supports `codex resume <session-id>`, and Claude supports `claude --resume <session-id>`. `cfuse` is available locally and presents a Claude-compatible CLI surface. Those native logs are useful for true conversation resume, but Nexus cannot rely on every launcher having a readable native store. Nexus needs its own local archive as the source of truth.

## Goals / Non-Goals

**Goals:**
- Persist a durable archive record for closed or manually snapshotted terminal channels.
- Capture enough metadata to understand where the work happened: project, channel, cwd, launcher, profile, timestamps, window name, and captured scrollback text.
- Detect agent-native session ids from local Codex/Claude/cfuse evidence when available and use them for native resume.
- Provide archive list/read/restore APIs and a compact UI entry to inspect and restore archives.
- Keep archive data in the existing Nexus SQLite database under the resolved home data directory.
- Add tests for storage behavior, launcher command construction, route behavior, and frontend build/type correctness.

**Non-Goals:**
- Restore killed process memory or terminal process state.
- Guarantee native resume for launchers that do not expose a stable session id.
- Introduce a required external memory service, MCP server, vector database, or cloud sync.
- Summarize archives with an LLM in this change.
- Replace the live terminal history overlay; it remains the fast path for currently open panes.

## Decisions

### D1. Store raw local archives in SQLite as the source of truth

Add `agent_session_archives` with an immutable archive id, project/channel scope, launcher metadata, timestamps, captured text, and JSON metadata for agent ids and restore provenance.

**Rationale:** Nexus already uses SQLite in `~/.nexus4cc/data`. Storing archives there keeps backup/upgrade semantics aligned with the recent home data directory migration.

**Alternative considered:** Use Claude memory MCP or ccf as the primary store. That is useful as an optional semantic layer, but it is not a reliable audit log because it may summarize, omit tool output, fail independently, or miss non-agent zsh sessions.

### D2. Capture before destructive close and allow manual snapshots

Before `DELETE /api/sessions/:id` kills a tmux window, capture scrollback with the same tmux mechanism used by the history overlay. Add an explicit snapshot endpoint so a live channel can be archived without closing.

**Rationale:** Post-mortem capture after `tmux kill-window` is impossible. Periodic/manual snapshots reduce loss from crashes or accidental closes.

**Alternative considered:** Depend only on tmux history. tmux history is finite and disappears with the pane.

### D3. Use native resume when the archive has a known session id

Extend launcher command construction to accept restore metadata:
- `codex` with `agentSessionId` uses `codex resume <id>`.
- `claude` with `agentSessionId` uses `claude --resume <id>`.
- `cfuse` with `agentSessionId` uses `cfuse --resume <id>`.
- `bash`/`zsh` and unsupported launchers open the configured interactive shell or original launcher without claiming conversation-level resume.

**Rationale:** Native resume is the only way to continue a prior agent conversation with full model-side state. Archive text alone can support contextual continuation, not exact resume.

**Alternative considered:** Always inject archived transcript into a new prompt. That works for unsupported launchers but is inferior when Codex/Claude can resume directly.

### D4. Keep restore explicit and non-destructive

Restoring an archive creates a new tmux channel by default and records `restoredFromArchiveId` in channel metadata. It does not overwrite the old closed channel index or delete the archive.

**Rationale:** Closed-channel archives are audit records. Restore should be reversible and should not hide previous history.

**Alternative considered:** Reopen into the same tmux index. That can collide with live windows and makes repeated restores harder to reason about.

### D5. UI stays operational and compact

Add a panel matching the existing Nexus dense command-center style. It lists archives newest-first, supports filtering by current project, shows metadata and transcript preview, and exposes restore/open actions.

**Rationale:** The workflow is repeated operational work, not a marketing surface. The UI should be scannable and avoid decorative layout.

**Alternative considered:** Put archives only in the existing history overlay. That conflates live scrollback with durable closed-session records.

## Risks / Trade-offs

- **Agent session id detection may be incomplete** -> Store best-effort ids when available and still persist raw scrollback so archive viewing works for every launcher.
- **Captured scrollback can contain secrets** -> Keep archives local in the existing authenticated Nexus surface and do not sync externally in this change.
- **Large transcripts can grow SQLite** -> Store bounded captured text using existing scrollback limits; future retention settings can prune by age or size.
- **Native resume command can fail if the underlying tool deleted its own logs** -> Restore command falls back to a visible interactive shell/launcher failure path and the archive remains readable.
- **Close flow must not lose windows if archive capture fails** -> Close still proceeds, but the API reports archive failure metadata where possible and logs the backend error.

## Migration Plan

1. Add SQLite schema/migration for archive records and storage helpers.
2. Extend launcher command construction for `cfuse` and native resume metadata.
3. Add capture helpers and archive APIs.
4. Integrate archive-before-close and restore-from-archive into tmux project/channel creation paths.
5. Add frontend archive panel and toolbar/session entry.
6. Add backend and frontend tests, run build/type checks, and perform visual/manual QA.
7. Deploy by restarting the `nexus` service and verify it is reachable. If unreachable after restart, rollback code immediately while preserving `~/.nexus4cc/data`.

## Open Questions

- Automatic periodic snapshot interval and retention policy are intentionally deferred unless manual close/snapshot capture proves insufficient.
- External memory MCP integration remains optional future work after the local archive contract is stable.

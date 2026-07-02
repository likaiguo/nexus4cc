## Context

Nexus represents projects as tmux sessions and channels as tmux windows. SQLite currently stores user preferences, input history, drafts, task indexes, and attention events, but not the live tmux topology. The database and profile JSON files live under the repository `data/` directory, which couples user data to code upgrades.

Two separate persistence problems need to be handled:

```
code checkout             user-home runtime data             tmux server
─────────────             ──────────────────────             ───────────
server.js                 ~/.nexus4cc/data/nexus.sqlite      live sessions
frontend/                 ~/.nexus4cc/data/configs/*.json    live windows
openspec/                 ~/.nexus4cc/data/...               live scrollback
```

The runtime data must outlive code checkouts, and Nexus must be able to recreate the tmux project/channel shape after a reboot. Recreating a tmux window does not recreate an interrupted process or complete scrollback; it restarts the configured launcher in the recorded working directory.

## Goals / Non-Goals

**Goals:**
- Store runtime data in `~/.nexus4cc/data` by default, with `NEXUS_DATA_DIR` override.
- Migrate existing repository-local `data/` content into the resolved data directory without deleting the old files.
- Persist project and channel registry records when Nexus creates, renames, switches, lists, or closes tmux sessions/windows.
- Restore missing tmux sessions/windows from registry records at startup and before project listing.
- Make launcher restoration generic enough for `claude`, `codex`, `bash`, and unknown/future launchers.
- Preserve tmux as the live authority for what currently exists and SQLite as the restore registry.

**Non-Goals:**
- Persist full tmux scrollback, raw PTY bytes, or arbitrary process memory.
- Guarantee that a killed Claude/Codex process resumes the exact conversation automatically.
- Add multi-user data isolation or cloud sync.
- Require a new external database or service.

## Decisions

### D1. Resolve data directory once during backend startup

Use this precedence:
1. `NEXUS_DATA_DIR`, if set.
2. `~/.nexus4cc/data`, using `os.homedir()` or `process.env.HOME`.

The repository `data/` directory remains the legacy migration source. `CONFIGS_DIR`, `TASKS_FILE`, and SQLite all use the resolved data directory.

**Rationale:** User data should not live inside a mutable code checkout. An env override keeps Docker/PM2 users able to place data on a mounted volume.

**Alternative considered:** Keep `./data` and document it as a required volume. That still leaves local upgrades and checkout replacement risky, and it does not address non-Docker installs.

### D2. Copy legacy data into the home directory, never move or delete it

On startup, if the resolved data directory differs from repo-local `data/`, copy missing legacy files/directories from repo-local `data/` into the resolved directory:
- `nexus.sqlite`, `nexus.sqlite-wal`, `nexus.sqlite-shm`
- `toolbar-config.json`
- `tasks.json`
- `configs/`

Existing destination files win. Legacy files remain in place as rollback evidence.

**Rationale:** This is the least surprising migration. It avoids destructive file operations and lets an immediate code rollback still find old repo-local data.

**Alternative considered:** Rename/move the old directory. That is more atomic but violates the rollback-friendly constraint.

### D3. Add a tmux restore registry to SQLite

Add registry tables:
- `tmux_projects`: session name, cwd, display name, default launcher, profile, last channel, status, created/updated/restored timestamps.
- `tmux_channels`: project, tmux window index, name, cwd, launcher, profile, restore command metadata, status, created/updated/restored timestamps.

The registry records enough to recreate tmux structure. It does not replace tmux listing for active runtime state.

**Rationale:** Project/channel order tables only store display order. They cannot recreate sessions because they lack cwd, launcher, profile, and close/restore state.

**Alternative considered:** Serialize `tmux list-sessions/list-windows` output to JSON. SQLite fits the existing storage layer, supports idempotent upserts, and can evolve with schema migrations.

### D4. Centralize launcher command construction

Introduce backend helpers that normalize launcher values and build commands:
- `bash`: start the interactive shell.
- `claude`: use `nexus-run-claude.sh` when a profile is present, otherwise direct `claude`.
- `codex`: start `codex` in the recorded cwd, with fallback to interactive shell if the command exits or is unavailable.
- unknown: fallback to interactive shell and preserve the original launcher value in registry metadata.

Project/channel creation and restore use the same helpers. This avoids restoring Codex-created channels as Claude or losing profile/cwd mapping.

**Rationale:** Current command construction is duplicated and defaults everything non-bash to Claude. That cannot safely restore Codex windows.

**Alternative considered:** Store the exact shell command and replay it. That is brittle and can persist stale paths/secrets. Storing launcher intent plus profile/cwd is safer.

### D5. Reconcile live tmux with the registry opportunistically

Whenever projects/channels are listed, Nexus upserts live sessions/windows into the registry:
- Existing Nexus-created records keep their launcher/profile.
- Unregistered live windows are recorded with cwd/name/index and a best-effort launcher inference from window name or pane command.
- If inference fails, use `bash` as the restore launcher.

**Rationale:** This protects current sessions that existed before this change. It is especially important for Codex sessions started outside the new APIs.

**Alternative considered:** Only persist windows created through Nexus after this change. That would not help the current live Codex/tmux state the user explicitly called out.

### D6. Restore only active registry records

Closing a project/window through Nexus marks the registry record closed before or after killing tmux. Startup restore skips closed records. Rename updates registry keys.

**Rationale:** Users expect deliberately closed sessions to stay closed after restart.

**Alternative considered:** Delete records on close. Keeping closed records gives better auditability and allows future undo/reopen behavior, while restore can still skip them.

## Risks / Trade-offs

- **Launcher inference can be wrong** -> Prefer preserving explicit Nexus-created metadata; for unregistered windows, use `pane_current_command` and window names only as best effort, then fallback to `bash`.
- **Restore can duplicate windows** -> Check existing tmux sessions/windows before creating; registry restore is idempotent.
- **Window indexes may change** -> Try to create windows with the saved index via tmux target/index options where possible; otherwise update the registry to the actual live index during reconciliation.
- **SQLite copy with WAL files can be inconsistent if service is running** -> Migration runs before opening SQLite in the new location. If destination already exists, skip copy. WAL files are copied only as missing legacy companions.
- **Codex command may not be installed on a host** -> Restore command prints a Nexus fallback message and opens the interactive shell instead of creating a dead window.
- **Service restart could fail after data path change** -> Deployment must restart `nexus`, verify accessibility, and rollback code immediately if unreachable while preserving `~/.nexus4cc/data`.

## Migration Plan

1. Add data directory resolution and legacy data copy before store initialization.
2. Add SQLite registry tables and access helpers.
3. Centralize launcher normalization and command construction.
4. Persist explicit metadata from project/channel creation, rename, switch, and close flows.
5. Reconcile live tmux state into the registry during listing.
6. Restore active registry records on startup and before `/api/projects` returns.
7. Update docs and tests.
8. Deploy by restarting `nexus` and verifying the service is reachable. If unreachable, rollback code immediately and keep `~/.nexus4cc/data` intact for diagnosis.

## Open Questions

- Exact Codex resume semantics are intentionally not assumed here. The first implementation restarts `codex` in the right cwd; conversation-level resume can be added later once the desired Codex command-line behavior is confirmed.

## 1. Home Data Directory

- [x] 1.1 Add backend data directory resolution with `NEXUS_DATA_DIR` override and `~/.nexus4cc/data` default
- [x] 1.2 Copy missing legacy repository-local `data/` runtime files into the resolved data directory before SQLite opens
- [x] 1.3 Route SQLite, profile configs, toolbar legacy config, and task legacy file paths through the resolved data directory
- [x] 1.4 Expose the resolved data directory in backend config or logs for diagnostics without leaking secrets

## 2. Tmux Registry Storage

- [x] 2.1 Add SQLite schema migrations for persisted tmux project and channel registry tables
- [x] 2.2 Implement storage helpers to upsert, list, rename, close, and mark-restored registry records
- [x] 2.3 Preserve existing project/channel display ordering behavior while adding registry writes

## 3. Launcher Metadata and Command Construction

- [x] 3.1 Centralize proxy environment collection and launcher command construction for project/channel creation and restore
- [x] 3.2 Support launcher types `claude`, `codex`, and `bash`, with unknown launchers falling back to interactive shell
- [x] 3.3 Persist explicit launcher/profile/cwd metadata for Nexus-created projects and channels
- [x] 3.4 Reconcile unregistered live tmux windows into the registry with best-effort launcher inference

## 4. Restore Flow

- [x] 4.1 Restore active registry projects and channels on service startup without duplicating live tmux state
- [x] 4.2 Run an idempotent restore/reconcile pass before `/api/projects` returns
- [x] 4.3 Mark intentionally closed projects/channels inactive so startup restore skips them
- [x] 4.4 Update rename and last-active-channel flows to keep registry metadata aligned with tmux

## 5. Tests and Documentation

- [x] 5.1 Add unit tests for data directory resolution and legacy copy behavior
- [x] 5.2 Add storage tests for tmux registry CRUD, close, rename, and schema idempotence
- [x] 5.3 Add command-construction tests for Claude, Codex, Bash, and unknown launcher fallback
- [x] 5.4 Update architecture, quickstart, and env docs for home data, migration, restore limits, and `NEXUS_DATA_DIR`

## 6. Verification and Deployment

- [x] 6.1 Run backend and frontend test suites/builds relevant to this change
- [x] 6.2 Restart the `nexus` service after code changes
- [x] 6.3 Verify the service is reachable after restart and rollback code immediately if it is not

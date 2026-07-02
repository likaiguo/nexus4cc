## Why

Nexus already has SQLite, but it stores only selected user state inside the repository `data/` directory while live projects, channels, and scrollback remain in tmux. After a machine reboot or code upgrade, tmux sessions disappear and repository-local data can be deleted or replaced, so users lose the project/channel mapping they expect Nexus to remember.

## What Changes

- Move Nexus runtime data to a dedicated user-home directory by default, with `NEXUS_DATA_DIR` as an override.
- Migrate existing repository-local `data/` files into the new home data directory without deleting the old files.
- Persist a lightweight tmux mapping registry for projects and channels, including working directory, launcher type, profile, window name, last active channel, and restore status.
- Restore missing tmux sessions/windows from the registry on service startup and before project listing, while still treating tmux as the live source of truth.
- Support launcher-agnostic restore metadata so channels started as Claude, Codex, bash, or another supported shell can be recreated with the correct command family.
- Keep full scrollback and process state out of SQLite; restore recreates tmux structure and launcher command, not the killed process state.
- Update documentation and tests for home-directory persistence, migration, and restore boundaries.

## Capabilities

### New Capabilities
- `home-data-directory`: Dedicated user-home runtime data directory, environment override, and repository-local data migration.
- `tmux-mapping-restore`: Persistent project/channel mapping registry and launcher-aware tmux structure restore.

### Modified Capabilities
- `project-channel-navigation`: Project/channel navigation must include restored tmux sessions/windows in the same safe target-resolution flow as live sessions.

## Impact

- **Backend**: `server.js` data path resolution, storage initialization, project/channel creation, startup restore, project/channel listing, and launcher command construction.
- **Storage**: SQLite schema migration for project/channel registry tables and APIs to upsert/list/mark restore state.
- **Configuration**: new `NEXUS_DATA_DIR` environment setting and default `~/.nexus4cc/data`.
- **Docs**: architecture and environment documentation must describe data location, migration, and restore limits.
- **Tests**: storage migration/registry unit coverage and route-level command construction where practical.
- **Deployment**: service restart is required; after restart the `nexus` service must be reachable or code must be rolled back immediately while preserving the home data directory.

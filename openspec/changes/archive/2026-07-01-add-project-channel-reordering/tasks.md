## 1. Persistence

- [x] 1.1 Add SQLite schema support for saved project order and per-project channel order.
- [x] 1.2 Add store methods to read, save, merge, validate, and prune project/channel order data against live tmux items.

## 2. Backend API

- [x] 2.1 Apply saved ordering in `GET /api/projects` while preserving default ordering for unseen projects.
- [x] 2.2 Apply saved ordering in `GET /api/projects/:name/channels` while preserving tmux channel indexes.
- [x] 2.3 Add reorder write APIs for project order and per-project channel order with validation against live tmux state.
- [x] 2.4 Migrate saved project channel-order scope when a project is renamed.

## 3. Frontend Interaction

- [x] 3.1 Add reusable reorder helpers/state for project and channel rows in `SessionManagerV2`.
- [x] 3.2 Support press-and-drag vertical reordering in modal project and channel lists.
- [x] 3.3 Support press-and-drag vertical reordering in sidebar project and channel lists.
- [x] 3.4 Persist reordered project/channel arrays on drop and refetch on save failure.
- [x] 3.5 Prevent accidental project/channel activation after a drag while preserving tap activation.

## 4. Verification

- [x] 4.1 Add or update backend tests for order merge, stale item pruning, duplicate validation, and rename migration where the project test setup supports it.
- [x] 4.2 Run relevant type checks, tests, and build commands.
- [x] 4.3 Restart the `nexus` service and verify it is reachable after deployment.
- [x] 4.4 Sync OpenSpec delta specs to main specs and archive the completed change.

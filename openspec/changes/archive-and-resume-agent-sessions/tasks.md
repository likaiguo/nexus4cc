## 1. Storage and Launcher Foundations

- [x] 1.1 Add failing storage tests for archive create/list/detail behavior.
- [x] 1.2 Add SQLite archive schema, mapping helpers, and storage methods.
- [x] 1.3 Add failing launcher tests for cfuse and native resume commands.
- [x] 1.4 Extend launcher command construction for cfuse and archive resume metadata.

## 2. Backend Archive APIs

- [x] 2.1 Add failing backend route tests or focused helper tests for archive snapshot, list/detail, close, and restore behavior.
- [x] 2.2 Add tmux capture/archive helper functions that reuse existing scrollback cleanup.
- [x] 2.3 Add authenticated archive list/detail/snapshot/restore endpoints.
- [x] 2.4 Integrate archive capture into channel close before `tmux kill-window`.
- [x] 2.5 Ensure restored archive channels are persisted in tmux registry metadata.

## 3. Frontend Archive UI

- [x] 3.1 Add archive API types and a compact archive panel component using the existing Nexus design system.
- [x] 3.2 Wire archive panel open/close, list/detail loading, selectable transcript display, and restore action into `Terminal`.
- [x] 3.3 Add the archive entry to the existing terminal command center without disturbing quick phrases, history, or workspace controls.

## 4. Verification and Deployment

- [x] 4.1 Run backend unit tests covering storage, launcher, and archive route/helper behavior.
- [x] 4.2 Run frontend type/build checks.
- [x] 4.3 Run OpenSpec validation for the change.
- [x] 4.4 Run visual/manual QA for the archive UI.
- [x] 4.5 Restart the `nexus` service and verify the service is reachable, rolling back if unreachable.
- [x] 4.6 Commit only the files related to this change.

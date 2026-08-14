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

## 5. Native History Linking and Quick Reply

- [x] 5.1 Add tests for native history discovery, durable channel links, and reconcile metadata preservation.
- [x] 5.2 Add local Codex/OMO and Claude-compatible history discovery with deterministic live-channel backfill.
- [x] 5.3 Persist native agent session links and resume directly from channel metadata after restart.
- [x] 5.4 Merge native histories into the archive API surface and add reuse-or-resume quick reply behavior.
- [x] 5.5 Update the history panel to show linked native sessions and open the composer after continue reply.
- [x] 5.6 Run backend/frontend verification, browser QA, restart `nexus`, and verify accessibility with rollback on failure.

## 6. Explicit History-to-Channel Binding

- [x] 6.1 Add failing tests for conflict-safe manual binding, link migration, and frontend request parsing.
- [x] 6.2 Add an authenticated manual-link endpoint that persists the selected native session id on an active target channel.
- [x] 6.3 Add a project-channel selector, conflict confirmation, and success/error feedback to the history panel.
- [x] 6.4 Verify manual binding survives store/service restart without automatic backfill undoing an explicit migration.
- [x] 6.5 Run browser QA, restart `nexus`, and verify service accessibility with rollback on failure.

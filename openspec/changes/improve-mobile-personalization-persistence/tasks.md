## 1. SQLite Storage Foundation

- [x] 1.1 Select and add a SQLite dependency, then verify install/build works in the project environment
- [x] 1.2 Add a backend storage module for opening `data/nexus.sqlite`, applying WAL/busy timeout, and running idempotent schema migrations
- [x] 1.3 Create tables for schema metadata, settings, toolbar layouts, shortcut usage, input history, composer drafts, tasks, and attention events
- [x] 1.4 Implement safe JSON helpers and database access helpers with bounded result sizes and consistent error handling
- [x] 1.5 Add migration logic for `data/toolbar-config.json` into active toolbar layouts while preserving the original file
- [x] 1.6 Add migration logic for `data/tasks.json` into SQLite task records while preserving the original file
- [x] 1.7 Keep legacy JSON fallback behavior when SQLite initialization or migration fails
- [x] 1.8 Add `node --check` or equivalent syntax verification for new backend modules

## 2. Settings and Privacy Controls

- [x] 2.1 Add authenticated settings read/update endpoints backed by SQLite
- [x] 2.2 Add default settings for Composer mode, append-Enter behavior, input history enabled state, and input history retention days
- [x] 2.3 Add backend cleanup logic for expired input history based on retention settings
- [x] 2.4 Extend `GeneralSettings.tsx` with input history privacy controls, including disable recording and clear history
- [x] 2.5 Add zh-CN and en i18n strings for settings and privacy controls

## 3. Toolbar and Shortcut Personalization Backend

- [x] 3.1 Replace `/api/toolbar-config` internals with SQLite-backed active layout read/write while preserving `{ pinned, expanded, custom }` response compatibility
- [x] 3.2 Add authenticated toolbar layout endpoints supporting `mobile` and `desktop` device types
- [x] 3.3 Add validation for custom shortcut IDs, labels, terminal sequences, and UI actions
- [x] 3.4 Add shortcut usage recording endpoint that stores only key ID, device type, count, and last-used timestamp
- [x] 3.5 Add recommendation endpoint or response field for high-frequency shortcut suggestions

## 4. Toolbar and Shortcut Personalization UI

- [x] 4.1 Update `Toolbar.tsx` to load/save device-specific layouts based on viewport/device type
- [x] 4.2 Add preset definitions for factory default, Claude frequent, Shell frequent, and mobile minimal layouts
- [x] 4.3 Add one-click preset application UI without deleting user custom shortcut definitions
- [x] 4.4 Report shortcut usage when toolbar keys are clicked, without recording terminal output or command text
- [x] 4.5 Show high-frequency shortcut recommendations in the toolbar edit view and let users ignore or apply them
- [x] 4.6 Add tests or focused pure-function coverage for preset application and custom shortcut validation where practical

## 5. Mobile Command Composer Backend

- [x] 5.1 Add authenticated input history list/create/delete endpoints backed by SQLite
- [x] 5.2 Add authenticated composer draft read/update/delete endpoints scoped by project and channel
- [x] 5.3 Ensure input history is written only for explicit Composer submissions when history recording is enabled
- [x] 5.4 Ensure composer drafts persist text and cursor position and are cleared after successful submit
- [x] 5.5 Add backend bounds for input history text length, result count, and draft size

## 6. Mobile Command Composer UI

- [x] 6.1 Add a mobile Composer panel/component with visible draft text, cursor editing, clear, send, and mode toggle controls
- [x] 6.2 Preserve Direct Terminal mode and existing xterm/hidden-input behavior for raw terminal interactions
- [x] 6.3 Restore unsent Composer drafts when returning to the same project/channel
- [x] 6.4 Save Composer drafts and cursor position on edit with debounce
- [x] 6.5 Add input history recall UI sorted by recent entries with current project/channel entries prioritized
- [x] 6.6 Implement append-Enter behavior according to persisted settings
- [x] 6.7 Verify IME composition does not send intermediate text before the user taps send
- [x] 6.8 Add mobile layout checks so Composer, toolbar, terminal, and keyboard do not overlap incoherently

## 7. Attention Events Backend

- [x] 7.1 Add attention event data access helpers with stable dedupe keys and bounded summary length
- [x] 7.2 Extend channel attention detection to create/update `needs-confirm` and `done` attention events
- [x] 7.3 Change channel seen behavior so entering a channel clears the status dot sticky state but marks related events as `seen` instead of deleting/resolving them
- [x] 7.4 Extend task completion and failure paths to create/update task attention events
- [x] 7.5 Add authenticated attention events list/count/update/resolve/dismiss endpoints
- [x] 7.6 Ensure attention event summaries do not store full tmux scrollback or raw PTY streams

## 8. Attention Center UI

- [x] 8.1 Add an Attention Center component showing unresolved events with project, channel, type, summary, timestamp, and status
- [x] 8.2 Add a global Attention Center entry in desktop and mobile layouts with unresolved count
- [x] 8.3 Implement event click behavior that switches to the associated project/channel
- [x] 8.4 Implement resolve and dismiss actions that remove events from the default unresolved list
- [x] 8.5 Update channel/project status indicator behavior so status dots and Attention Center event states do not conflict
- [x] 8.6 Add browser notification and page-title/badge integration for new high-priority events without exposing full sensitive output
- [x] 8.7 Add zh-CN and en i18n strings for Attention Center labels, event types, counts, and actions

## 9. Integration and Compatibility

- [x] 9.1 Verify existing login, tmux WebSocket attach, project/channel switching, file upload, and task APIs still work after SQLite integration
- [x] 9.2 Verify legacy `/api/toolbar-config` and `/api/tasks` response shapes remain compatible
- [x] 9.3 Verify old JSON files are preserved after successful migration and service can still start if SQLite migration fails
- [x] 9.4 Verify tmux remains the source for project/channel existence and scrollback after database records are present
- [x] 9.5 Update architecture or PRD documentation to describe SQLite as user-state storage, not session storage

## 10. Verification and Deployment

- [x] 10.1 Run frontend build and TypeScript checks
- [x] 10.2 Run backend syntax checks and any available tests
- [x] 10.3 Manually verify mobile Composer on a narrow viewport, including IME input, draft restore, history recall, and append-Enter behavior
- [x] 10.4 Manually verify shortcut presets, device-specific layouts, usage recommendations, and custom shortcut persistence
- [x] 10.5 Manually verify Attention Center event creation, seen/resolved/dismissed flows, count badges, and project/channel jump
- [x] 10.6 Restart the `nexus` service after deployment
- [x] 10.7 Verify the service is accessible after restart
- [x] 10.8 If the service is unreachable after restart, rollback the deployed code to the previous version immediately

## 1. Backend Persistence

- [x] 1.1 Add idempotent `quick_phrases` SQLite schema with ordering, append-enter, usage, and timestamps
- [x] 1.2 Add store methods to list, create, update, delete, reorder, and mark quick phrase usage
- [x] 1.3 Enforce validation and length limits for title and phrase text

## 2. Backend API

- [x] 2.1 Add authenticated `GET /api/quick-phrases` list endpoint
- [x] 2.2 Add authenticated create/update/delete endpoints for quick phrase management
- [x] 2.3 Add authenticated reorder endpoint that persists user order and keeps omitted phrases available
- [x] 2.4 Add authenticated usage endpoint to update count and last-used time without writing input history

## 3. Frontend Quick Phrase UI

- [x] 3.1 Add quick phrase i18n strings and icon support
- [x] 3.2 Add quick phrase state loading and management UI for list, empty state, add, edit, delete, and reorder
- [x] 3.3 Wire phrase selection to send text directly to the active terminal, appending Enter when enabled
- [x] 3.4 Ensure phrase sends do not open Composer, modify Composer drafts, or post to input history

## 4. Toolbar Integration

- [x] 4.1 Add the mobile quick phrase icon before the browse workspace icon in the first-row system action group
- [x] 4.2 Add desktop access near existing workspace actions for consistency
- [x] 4.3 Keep mobile fixed shortcut rows stable and verify 390px layout constraints

## 5. Verification

- [x] 5.1 Add or update focused tests for quick phrase storage/API behavior where practical
- [x] 5.2 Run backend tests
- [x] 5.3 Run frontend tests/build
- [x] 5.4 Validate OpenSpec change
- [x] 5.5 Restart the `nexus` service after code changes
- [x] 5.6 Verify the service is accessible after restart and rollback immediately if unreachable

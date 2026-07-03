## Why

Users repeatedly send the same high-frequency prompts and command phrases while working in Nexus terminals. Today those phrases must be retyped, pasted from outside the app, or recovered from Composer input history, none of which provides an explicit, editable, globally shared quick-send list.

## What Changes

- Add a global quick phrase capability for storing high-frequency reusable terminal text in SQLite.
- Add a visible quick phrase icon before the existing "browse workspace" entry so users can open the list quickly.
- Provide a compact quick phrase list that can send an item directly to the current active terminal.
- Provide management controls for adding, editing, deleting, and reordering phrases.
- Persist phrase content, order, append-Enter preference, usage count, and last-used time in the local database.
- Keep quick phrases separate from Composer input history; sending a quick phrase SHALL NOT require Composer and SHALL NOT create an input-history item.

## Capabilities

### New Capabilities

- `global-quick-phrases`: Global quick phrase storage, management, ordering, and direct terminal send behavior.

### Modified Capabilities

- `mobile-command-controls`: Mobile toolbar system action order changes to place the quick phrase entry before the browse workspace entry.

## Impact

- Backend `storage.js`: add SQLite schema and store methods for global quick phrases.
- Backend `server.js`: add authenticated quick phrase CRUD, ordering, and usage/send recording endpoints.
- Frontend `frontend/src/Terminal.tsx`: wire quick phrase opening and direct send behavior to the active terminal.
- Frontend `frontend/src/Toolbar.tsx`: add the quick phrase icon before workspace browsing and expose the panel from mobile and desktop toolbar surfaces.
- Frontend i18n locale files and icons: add labels and icon support for quick phrases.
- Tests: add focused storage/API tests where practical and run frontend build/type checks.
- Deployment: restart the `nexus` service after implementation and verify accessibility; rollback if the service becomes unreachable.

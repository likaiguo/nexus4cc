## Why

Project and channel lists currently follow tmux enumeration order with a simple reverse, so users cannot keep frequently used workspaces near the top. Supporting press-and-drag reordering makes navigation faster and keeps shared project/channel URLs usable without changing tmux window indexes.

## What Changes

- Add persistent custom display ordering for projects.
- Add persistent custom display ordering for channels within each project.
- Let users press/hold and drag project or channel rows up and down to reorder them.
- Merge saved order with the live tmux source list so new items appear predictably and deleted items do not break rendering.
- Keep project/channel activation, context menus, attention badges, and shareable URLs working after reorder.

## Capabilities

### New Capabilities
- `project-channel-reordering`: Persistent display ordering and drag-based reorder behavior for project and channel navigation lists.

### Modified Capabilities
- `shareable-project-channel-url`: Reordered channel display must not change project/channel URL targeting semantics.

## Impact

- Backend APIs in `server.js` for reading ordered project/channel lists and saving reordered lists.
- SQLite persistence in `storage.js` for project order and per-project channel order.
- Frontend project/channel navigation in `frontend/src/SessionManagerV2.tsx`, including mobile long-press interactions and sidebar/modal row rendering.
- Existing channel-index keyed data such as shareable URLs, composer drafts, and attention state must remain keyed by tmux window index rather than display position.

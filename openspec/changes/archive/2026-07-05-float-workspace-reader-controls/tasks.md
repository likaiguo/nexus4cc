## 1. Floating Toolbar

- [x] 1.1 Add overlay-local floating toolbar state and pointer drag handling.
- [x] 1.2 Move zoom out, reset, and zoom in actions into a compact left-side floating toolbar.
- [x] 1.3 Prevent toolbar dragging from triggering accidental button actions or content scrolling.

## 2. Top and Bottom Navigation

- [x] 2.1 Add scroll-surface refs for Markdown preview and CodeMirror wrapper surfaces.
- [x] 2.2 Add floating toolbar actions to jump to the active surface top and bottom.
- [x] 2.3 Preserve existing preview/edit, pinch zoom, selection, and horizontal scrolling behavior.

## 3. Tests and Validation

- [x] 3.1 Add/update source-level tests for floating toolbar placement and draggable state.
- [x] 3.2 Add/update source-level tests for zoom controls and top/bottom navigation actions.
- [x] 3.3 Run relevant frontend/backend tests, frontend build, and OpenSpec validation.

## 4. Deployment and Commit

- [x] 4.1 Smoke test the built service on an isolated port without touching the live service.
- [x] 4.2 Restart the `nexus` service and verify it is reachable; rollback immediately if verification fails.
- [x] 4.3 Archive/sync the OpenSpec change after implementation is complete.
- [x] 4.4 Commit the completed fix with only relevant files staged.

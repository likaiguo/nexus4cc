## 1. Preview Mode Behavior

- [x] 1.1 Add a general preview/edit mode state for workspace text files.
- [x] 1.2 Open supported text files in preview mode by default from double-click, edit, view, and context-menu actions.
- [x] 1.3 Keep unsupported file view/download behavior on the direct file endpoint.

## 2. Highlighted Preview and Mobile Scrolling

- [x] 2.1 Extend `WorkspaceCodeEditor` to support read-only highlighted preview mode.
- [x] 2.2 Make code preview/editor surfaces horizontally and vertically scrollable on mobile and desktop.
- [x] 2.3 Keep Markdown sanitized preview as the default Markdown view while preserving CodeMirror source editing.

## 3. Tests and Validation

- [x] 3.1 Add/update frontend tests for preview-first behavior and highlighted text view routing.
- [x] 3.2 Add/update source-level tests for scrollable CodeMirror container behavior.
- [x] 3.3 Run frontend/backend relevant tests, frontend build, and OpenSpec validation.

## 4. Deployment and Commit

- [x] 4.1 Smoke test the built service on an isolated port without touching the live service.
- [x] 4.2 Restart the `nexus` service and verify it is reachable; rollback immediately if verification fails.
- [x] 4.3 Archive/sync the OpenSpec change after implementation is complete.
- [x] 4.4 Commit the completed fix with only relevant files staged.

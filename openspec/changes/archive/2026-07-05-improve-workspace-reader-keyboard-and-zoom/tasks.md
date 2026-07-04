## 1. Reader/Edit Mode Semantics

- [x] 1.1 Extend `WorkspaceCodeEditor` so preview mode sets CodeMirror DOM editability to false while edit mode remains editable.
- [x] 1.2 Ensure preview mode keeps syntax highlighting, scrolling, selection, and copying behavior without exposing save/input behavior.
- [x] 1.3 Ensure edit mode remains the only state that can focus for text input and show save controls.

## 2. Zoom Controls and Gestures

- [x] 2.1 Add visible decrease, reset, and increase font-size controls outside the scrollable editor content.
- [x] 2.2 Route button zoom and two-finger pinch zoom through the same bounded font-size behavior.
- [x] 2.3 Preserve existing one-finger scrolling, horizontal scrolling, and text selection behavior.

## 3. Tests and Validation

- [x] 3.1 Add/update source-level tests for non-editable preview DOM and editable edit mode.
- [x] 3.2 Add/update source-level tests for visible zoom controls and bounded zoom behavior.
- [x] 3.3 Run relevant frontend/backend tests, frontend build, and OpenSpec validation.

## 4. Deployment and Commit

- [x] 4.1 Smoke test the built service on an isolated port without touching the live service.
- [x] 4.2 Restart the `nexus` service and verify it is reachable; rollback immediately if verification fails.
- [x] 4.3 Archive/sync the OpenSpec change after implementation is complete.
- [x] 4.4 Commit the completed fix with only relevant files staged.

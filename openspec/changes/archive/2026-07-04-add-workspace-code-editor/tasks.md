## 1. Dependencies and Editor Helpers

- [x] 1.1 Add CodeMirror 6 React/editor and language dependencies to the frontend package and lockfile.
- [x] 1.2 Create a tested frontend language-detection helper for editable text files and CodeMirror language extensions.
- [x] 1.3 Create a reusable workspace code editor component that supports controlled content, language mode, font size, and full-height rendering.

## 2. Workspace Browser Integration

- [x] 2.1 Replace the textarea editing surface in `WorkspaceBrowser` with the reusable code editor component.
- [x] 2.2 Preserve Markdown preview toggling and unsaved editor content when switching between edit and preview modes.
- [x] 2.3 Keep workspace browser navigation, direct view/download, and editor open/close behavior stable.

## 3. Backend File Safety

- [x] 3.1 Add backend editable-file helpers for size limit, binary detection, metadata, and safe UTF-8 content loading.
- [x] 3.2 Update `GET /api/workspace/file` to return content plus editable-file metadata and clear non-2xx errors for oversized/binary files.
- [x] 3.3 Update `PUT /api/workspace/file` to reject stale saves with HTTP 409 when caller metadata is older than the current file.
- [x] 3.4 Keep existing authenticated workspace path behavior and direct file view/download behavior unchanged.

## 4. Tests and Validation

- [x] 4.1 Add frontend tests for language detection, editable-file classification, and key supported extensions including SQL, Python, JavaScript, TypeScript, and Markdown.
- [x] 4.2 Add backend tests for editable file load metadata, oversized rejection, binary rejection, successful save, and stale-save conflict.
- [x] 4.3 Run frontend build/tests and backend tests relevant to the changed files.
- [x] 4.4 Run OpenSpec status/validation for the change and ensure all tasks are complete.

## 5. Deployment Verification

- [x] 5.1 Restart the `nexus` service after code changes are deployed.
- [x] 5.2 Verify the service is reachable after restart; if unreachable, roll back the deployed code immediately and verify reachability again.

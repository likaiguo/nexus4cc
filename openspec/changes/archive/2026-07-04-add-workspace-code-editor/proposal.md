## Why

The workspace browser currently opens text files in a plain textarea, so common development files such as SQL, Python, JavaScript, TypeScript, and Markdown lack syntax highlighting and editor ergonomics. Users need a stable, community-backed in-browser editor that can safely view and edit source files from the current workspace.

## What Changes

- Replace the workspace text editing surface with a mature code editor component backed by CodeMirror 6.
- Support syntax highlighting and editing for SQL, Python, JavaScript, TypeScript, Markdown, JSON, HTML, CSS, shell/config-style text, and extensionless text files.
- Preserve Markdown preview mode while using the code editor for Markdown editing.
- Add backend guardrails for editable workspace files, including text/binary detection, maximum editable file size, file metadata, and stale-save conflict detection.
- Add focused frontend and backend tests covering language selection, editor behavior boundaries, safe file loading, safe saving, and conflict handling.

## Capabilities

### New Capabilities
- `workspace-code-editor`: Workspace text-file viewing and editing with syntax highlighting, supported language mapping, and safe save behavior.

### Modified Capabilities
- None.

## Impact

- Frontend: `frontend/src/WorkspaceBrowser.tsx`, new editor helper/component files as needed, locale text, and package dependencies.
- Backend: `server.js` workspace file read/write endpoints and focused helper extraction if needed for testability.
- Tests: frontend unit tests for language/editor behavior and backend API/helper tests for editable-file validation and conflict handling.
- Dependencies: CodeMirror 6 packages and a React wrapper; no service API authentication model changes.

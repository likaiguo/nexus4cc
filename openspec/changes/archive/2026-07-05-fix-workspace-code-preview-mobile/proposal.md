## Why

The new workspace code editor still opens source files directly into edit mode, uses the old view/download path for previews, and can trap wide code on mobile without usable scrolling. Users need a safe default preview mode that reuses syntax highlighting and allows horizontal/vertical scrolling before they choose to edit.

## What Changes

- Open supported text/code files in an in-app highlighted preview mode by default.
- Reuse the CodeMirror highlighting surface for read-only previews instead of the direct `/workspace?...` browser/download view.
- Add an explicit edit toggle/action for text files, with save controls shown only in edit mode.
- Ensure long lines and large code blocks scroll horizontally and vertically on mobile and desktop.
- Keep direct view/download available for unsupported or binary-style files.
- Add tests covering default preview, edit toggling, read-only highlighting, and scrollable editor containers.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `workspace-code-editor`: Change supported text-file opening behavior from edit-first to preview-first, and require highlighted in-app preview with scrollable code surfaces.

## Impact

- Frontend: `WorkspaceBrowser`, `WorkspaceCodeEditor`, editor helper/tests, and source-level regression tests.
- Specs: update `workspace-code-editor`.
- Deployment: frontend rebuild and `nexus` service restart with reachability verification.

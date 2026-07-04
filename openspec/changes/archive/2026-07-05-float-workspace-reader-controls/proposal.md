## Why

The workspace reader/editor now has zoom controls, but placing them in the footer makes frequent navigation and zoom adjustments awkward on tall files. Users need a lightweight floating control surface that stays near the reading area, can be repositioned, and provides fast movement to the top or bottom of the file.

## What Changes

- Move workspace reader/editor quick controls into a left-side floating toolbar inside the overlay.
- Allow users to drag the floating toolbar vertically so it can avoid covering important text.
- Keep zoom in, reset, and zoom out controls available from the floating toolbar.
- Add jump-to-top and jump-to-bottom controls for the active Markdown preview, code preview, or code editor surface.
- Keep the controls outside the scrollable code content and preserve existing scrolling, selection, editing, and pinch zoom behavior.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `workspace-code-editor`: Require draggable floating reader controls with zoom and top/bottom navigation for workspace preview/editor surfaces.

## Impact

- Frontend: `WorkspaceBrowser`, source-level workspace browser tests, and possibly icon usage.
- Specs: update `workspace-code-editor`.
- Deployment: frontend build, smoke test, `nexus` service restart, and reachability verification.

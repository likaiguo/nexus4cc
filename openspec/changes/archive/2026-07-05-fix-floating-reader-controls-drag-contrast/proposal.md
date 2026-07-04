## Why

The workspace reader floating controls are currently constrained to vertical movement, which makes them hard to reposition when they cover code or sit under a thumb on small screens. Their surface also blends into the editor background, so the controls can disappear against dark preview content.

## What Changes

- Allow the floating reader toolbar to be dragged horizontally and vertically within the editor overlay.
- Keep toolbar dragging isolated from code scrolling, selection, editing, and pinch zoom.
- Increase the toolbar and button contrast so controls remain visible against code and Markdown preview backgrounds.
- Preserve existing zoom and jump-to-top/bottom behavior.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `workspace-code-editor`: Strengthen floating control requirements for two-axis repositioning and visible contrast.

## Impact

- Frontend `frontend/src/WorkspaceBrowser.tsx`: floating toolbar positioning, pointer drag handling, and visual styling.
- Frontend tests covering workspace browser/editor behavior.
- OpenSpec `workspace-code-editor` requirement updates.

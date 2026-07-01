## Why

On first web entry, switching projects from the sidebar and collapsing the sidebar can leave the terminal area black until the page is refreshed. The switch path can drop the backend-provided last channel and briefly target an invalid channel, leaving the frontend with cleared windows and no valid active terminal target.

## What Changes

- Preserve the selected project's `lastChannel` when switching from the desktop sidebar.
- Resolve every project switch against the target project's live channel list before updating terminal state.
- Fall back to the target project's active channel or first available channel when the requested channel is missing.
- Keep URL, localStorage, window list, active channel, and WebSocket target in sync after project switch.
- Add focused tests/assertions for the sidebar project-switch callback and safe channel resolution behavior.

## Capabilities

### New Capabilities

- `project-channel-navigation`: Stable project/channel activation behavior for initial load, sidebar switching, URL state, and fallback channel resolution.

### Modified Capabilities

- None

## Impact

- Affects `frontend/src/Terminal.tsx` project switch state handling.
- Adds focused source-level regression tests for project switch behavior.
- Adds an OpenSpec capability for project/channel navigation stability.

## Why

Terminal input and navigation currently have several interaction regressions: opening the command draft can turn the input area black until text is typed, cursor movement is not visibly reflected in Codex and ordinary shell command lines, long terminal history is hard or impossible to scroll further upward, and project/channel lists can become unreachable when reorder gestures capture normal scrolling.

These defects block core terminal use: editing a pending command, moving around a command line, reviewing earlier output, and selecting projects or channels near the end of long lists must work reliably without requiring trial input, refreshes, or hidden gestures.

## What Changes

- Keep the command draft/Composer panel visibly rendered immediately when opened or focused, including with an empty draft.
- Ensure Direct Terminal cursor movement remains visible for Codex sessions and ordinary shell sessions when users press arrow keys or line-editing shortcuts.
- Make terminal history overlay scrolling responsive and allow users to continue moving toward older output without getting stuck or being returned early.
- Let project and channel lists with many items scroll to their final rows even though drag-to-reorder is available.
- Separate tap/click navigation, scroll gestures, and reorder gestures so each interaction has a clear trigger and does not steal the others.

## Capabilities

### New Capabilities

- `terminal-input-stability`: Direct Terminal and Composer input surfaces remain visible, focused, and cursor-accurate across Codex and ordinary shell command editing.

### Modified Capabilities

- `terminal-history-readability`: History overlay scrolling must remain responsive and support reaching older output without premature close or gesture dead zones.
- `project-channel-reordering`: Project/channel reorder interactions must coexist with normal list scrolling and keep every list item reachable.

## Impact

- Frontend `frontend/src/Terminal.tsx`: Composer open/focus behavior, xterm keyboard interception, resize/repaint behavior after input mode changes, terminal history overlay scroll handling, and manual QA paths for Codex and shell channels.
- Frontend `frontend/src/SessionManagerV2.tsx`: project/channel row pointer handling, drag threshold behavior, scroll-container touch behavior, and sidebar/modal long-list reachability.
- Frontend styling in `frontend/src/index.css` or component class names if needed for xterm cursor visibility, Composer panel dimensions, and touch-action behavior.
- Existing APIs are expected to remain unchanged; this is a frontend interaction fix unless implementation discovers a backend scrollback limit or repaint issue.
- Deployment must restart the `nexus` service after code changes and verify the service is reachable; rollback if it becomes unreachable after restart.

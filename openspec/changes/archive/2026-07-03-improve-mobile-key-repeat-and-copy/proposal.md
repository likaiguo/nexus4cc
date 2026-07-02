## Why

Mobile terminal control currently treats every toolbar shortcut press as a one-shot event, so holding arrow keys cannot move the cursor or history selection continuously. Mobile copy flows are also too fragile: terminal copy uses a readonly textarea that can trigger browser text-field behavior, and history view lacks the quick selection-copy affordance already outlined in the history redesign notes.

## What Changes

- Add repeat-on-hold behavior for repeatable terminal shortcut keys, focused on navigation keys such as up/down/left/right.
- Keep one-shot behavior for destructive or control shortcuts such as Ctrl-C, Enter, paste, upload, settings, and copy actions.
- Replace the mobile terminal copy sheet's textarea-first interaction with selectable rendered text and explicit copy actions.
- Add history-view selection copying: long-press/select history text, show a floating copy action when a selection exists, and copy the selected text without leaving history mode.
- Preserve existing history entry/exit behavior, including closing history when the user scrolls back to the bottom.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `mobile-command-controls`: mobile shortcut buttons gain repeat-on-hold behavior for repeatable terminal navigation keys while preserving one-shot semantics for other actions.
- `terminal-history-readability`: history view gains reliable text selection and selected-text copy behavior.

## Impact

- Frontend `frontend/src/Toolbar.tsx`: pointer lifecycle handling for repeatable shortcut buttons and safer terminal copy sheet rendering.
- Frontend `frontend/src/Terminal.tsx`: copy-sheet rendering and history selection-copy state/handlers.
- Specs/tests: focused coverage for repeatable shortcut behavior and selectable copy/history interactions.
- No backend API, persistence schema, or tmux protocol changes are expected.

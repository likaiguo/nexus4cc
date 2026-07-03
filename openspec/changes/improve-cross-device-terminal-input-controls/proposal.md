## Why

Terminal history access, clipboard handling, and multi-line input are currently inconsistent between mobile and desktop. Mobile has gesture-driven history and Composer-oriented input history, while desktop lacks clear history/Composer entry points and exposes paste behavior that mixes text paste, image upload, and terminal control semantics in surprising ways.

## What Changes

- Add a cross-device terminal history entry so both PC and mobile users can open tmux scrollback/history explicitly, without relying only on a mobile gesture.
- Clarify and separate terminal output history from Composer input history in UI labels and actions.
- Make mobile history gestures match user expectations for viewing older output, while keeping an explicit button/menu path as the reliable path.
- Add desktop Composer support for visible drafts, input-history recall, and multi-line editing.
- Standardize multi-line keyboard behavior: `Shift+Enter` inserts a newline in Composer, while `Enter` sends; `Ctrl/Cmd+Enter` remains a send shortcut.
- Normalize clipboard behavior on PC: keyboard paste should paste text into the terminal, while image/file upload should use explicit upload actions instead of being triggered by a confusing `^V` toolbar action.
- Rename or redesign toolbar paste actions so app-level paste/upload actions are visually distinct from terminal control-key shortcuts.

## Capabilities

### New Capabilities

- `terminal-history-access`: Cross-device access to tmux scrollback/history, including explicit PC/mobile entry points, gesture semantics, and terminology that distinguishes terminal output history from Composer input history.
- `terminal-input-composer`: Cross-device Composer behavior for visible drafts, input-history recall, multi-line editing, send shortcuts, and clipboard semantics.

### Modified Capabilities

- `mobile-command-controls`: Mobile toolbar and menu requirements change to expose terminal history access and maintain convenient Composer/history controls without breaking the compact mobile layout.

## Impact

- Frontend `frontend/src/Terminal.tsx`: history entry wiring, mobile gesture direction handling, desktop Composer rendering, keyboard handling for multi-line input, and clipboard path separation.
- Frontend `frontend/src/Toolbar.tsx`: new or renamed actions for terminal history, Composer/input history, paste text, and upload; desktop and mobile toolbar/menu affordances.
- Frontend `frontend/src/toolbarDefaults.ts` and presets: toolbar action definitions and default/preset placement for history and paste/upload actions.
- Frontend i18n locale files: terminology for terminal history, input history, paste text, upload, and multi-line Composer hints.
- Tests: focused static/unit coverage for toolbar action semantics, PC/mobile Composer availability, `Shift+Enter` behavior, and history entry discoverability.
- Deployment: implementation will require a `nexus` service restart after code changes and accessibility verification per repository constraints.

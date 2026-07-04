## Why

Workspace code preview currently renders through CodeMirror in read-only state, but the underlying editor surface can still be focusable on mobile and may summon the keyboard while the user is only reading. The preview/editor also has pinch-to-zoom behavior but lacks explicit zoom controls, making font adjustment hard to discover and inconsistent with a production-grade mobile reader.

## What Changes

- Make workspace code preview a true read surface: highlighted, scrollable, selectable, and copyable, but not DOM-editable or mobile-keyboard-triggering.
- Keep edit mode as the only state that exposes an editable CodeMirror surface and save behavior.
- Add visible font zoom controls for workspace Markdown preview, code preview, and code editing.
- Preserve two-finger pinch zoom for all workspace editor surfaces without breaking one-finger scrolling, horizontal code scrolling, or text selection.
- Add regression tests for read/edit keyboard boundaries, zoom controls, and pinch behavior.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `workspace-code-editor`: Strengthen preview/edit mode semantics so reading does not summon input, and require explicit and gesture-based zoom controls across preview and edit surfaces.

## Impact

- Frontend: `WorkspaceBrowser`, `WorkspaceCodeEditor`, workspace editor styles, icon library if a suitable zoom icon is not already available, and source-level tests.
- OpenSpec: update `workspace-code-editor` requirements.
- Deployment: frontend build, service smoke test, `nexus` service restart, and reachability verification.

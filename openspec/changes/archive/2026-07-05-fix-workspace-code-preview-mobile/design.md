## Context

The workspace browser now has CodeMirror support, but the user-facing flow is still edit-first for supported text files. The old `view` action still opens `/workspace?path=...` in a separate browser context, which means text previews do not reuse highlighting. The editor container also disables normal touch behavior and wraps lines, making wide code hard to inspect on phones.

## Goals / Non-Goals

**Goals:**
- Default supported text files to in-app preview mode.
- Render preview and edit through the same CodeMirror language/highlighting setup.
- Make the preview/editor surface scroll vertically and horizontally on mobile.
- Keep save/error behavior only in edit mode.
- Preserve direct view/download for unsupported files.

**Non-Goals:**
- Add diff/merge UI.
- Add language-server features.
- Change auth, file upload, or workspace URL routing.

## Decisions

### D1. Use one CodeMirror component for preview and edit

Extend `WorkspaceCodeEditor` with `readOnly` and `lineWrapping` props. Preview mode uses `readOnly=true` and no content update callback; edit mode uses `readOnly=false`.

Rationale: syntax highlighting, language mapping, and scrolling behavior stay consistent between modes.

### D2. Make preview the initial mode for supported text files

Rename the internal mode from Markdown-only preview to a general `editorMode: 'preview' | 'edit'`. `openEditor` loads a supported text file and sets `preview` first. The explicit edit button switches to `edit`.

Rationale: browsing source should be safe by default and should not imply an editable state.

### D3. Route text-file view actions to in-app preview

For supported text files, the `view` action and context-menu view action call the in-app file opener. For unsupported files, they continue using the direct `/workspace?path=...` target.

Rationale: preview should reuse highlighting for code, while non-text files still need the existing direct view behavior.

### D4. Allow horizontal and vertical scrolling

Disable line wrapping by default for code preview/editing and set CodeMirror scrollers to `overflow: auto`. Remove `touch-none` from the editor container except while handling two-finger font scaling.

Rationale: long code lines need horizontal scroll on phones, and normal one-finger scrolling must work.

## Risks / Trade-offs

- [Risk] Users who relied on double-click to edit now see preview first. -> Mitigation: keep a clearly visible edit toggle in the header.
- [Risk] Horizontal scrolling can be less convenient than wrapping for prose. -> Mitigation: Markdown still has a rendered preview path; source mode prioritizes code inspection.
- [Risk] CodeMirror read-only setup may still allow focus/selection. -> Mitigation: use read-only state, not disabled rendering, so selection and copying remain possible.

## Context

The workspace browser already opens supported text files in preview mode and uses CodeMirror for highlighted code preview/editing. The CodeMirror preview currently uses `readOnly`, which prevents document edits but does not necessarily make the content DOM non-editable or unfocusable. On mobile browsers, a focusable editor-like DOM can still bring up the software keyboard during reading. The workspace browser also has pinch-to-zoom state, but the only visible zoom affordance is a reset-like font-size label shown after the font size changes.

## Goals / Non-Goals

**Goals:**
- Ensure preview/read mode cannot summon the mobile input method by making the CodeMirror DOM non-editable.
- Preserve selection/copying and horizontal/vertical scrolling in preview mode.
- Keep edit mode fully editable and keyboard-capable.
- Add discoverable zoom controls that work in Markdown preview, code preview, and code editing.
- Keep two-finger pinch zoom available across the same surfaces.
- Cover behavior with focused source-level tests and existing build/service validation.

**Non-Goals:**
- Add persistence for per-file or global workspace editor font size.
- Add editor minimap, search UI, or language-server features.
- Replace CodeMirror or change backend file APIs.

## Decisions

### D1. Separate read-only state from DOM editability

`WorkspaceCodeEditor` should accept an explicit editable/read mode signal and pass both `readOnly` and `editable` behavior into CodeMirror. Preview mode uses `readOnly=true` and `editable=false`; edit mode uses `readOnly=false` and `editable=true`.

Rationale: CodeMirror distinguishes state-level read-only protection from DOM editability. Using both makes preview safe while keeping edit mode normal.

### D2. Put zoom controls in the editor footer

The footer already contains character count, font-size reset, and path. Add compact icon controls near the character count: decrease, current font size/reset, and increase. Keep the header focused on file identity, save, preview/edit, and close.

Rationale: Footer controls remain outside scrollable content, apply to the whole reader/editor surface, and avoid crowding critical top actions on mobile.

### D3. Use a single bounded font-size adjustment path

Introduce small helper behavior for clamping and stepping font size, using the existing 8px to 32px range. Buttons use a fixed step; pinch uses distance ratio against the same clamp.

Rationale: A shared path avoids divergent limits between buttons and gestures and makes tests simple.

### D4. Preserve normal gestures

Continue preventing default touch behavior only for active two-finger pinch zoom. One-finger scroll, horizontal scroll, and text selection should remain browser-native.

Rationale: The previous mobile-scroll fix relies on preserving one-finger behavior; zoom must not regress that.

## Risks / Trade-offs

- [Risk] `editable=false` could affect CodeMirror-native selection behavior in some browsers. -> Mitigation: keep the preview DOM visible and selectable, add source-level tests for `editable=false`, and manually smoke the built service.
- [Risk] Footer controls may crowd the path on small phones. -> Mitigation: use compact icon buttons, allow the path to truncate, and keep controls outside the scrollable code content.
- [Risk] Pinch gestures can interfere with page/browser zoom. -> Mitigation: prevent default only when two touches are active inside the editor surface.

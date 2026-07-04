## Context

Workspace preview/editor overlays support Markdown preview, CodeMirror preview, CodeMirror editing, pinch zoom, and footer zoom buttons. The footer controls are discoverable but not ergonomic for long files because zoom and navigation actions are separated from the reading position. The overlay already owns touch handlers for pinch zoom, so drag handling must avoid interfering with one-finger scrolling and text selection inside the content.

## Goals / Non-Goals

**Goals:**
- Add a compact floating toolbar on the left side of the workspace editor overlay.
- Support vertical dragging of the toolbar within overlay bounds.
- Provide zoom out, reset font size, zoom in, jump to top, and jump to bottom actions.
- Apply navigation to the currently active scroll surface, whether Markdown preview or CodeMirror preview/edit.
- Preserve current keyboard, save, scroll, selection, and pinch zoom behavior.

**Non-Goals:**
- Persist toolbar position across files or sessions.
- Add a minimap, scroll percentage indicator, or search controls.
- Change backend workspace file APIs.

## Decisions

### D1. Use an overlay-local floating toolbar

Render the controls as an absolutely positioned element inside the editor overlay, anchored near the left edge. Store only a vertical offset in component state and clamp it to the viewport with CSS constraints.

Rationale: Left-side placement matches the request, keeps controls near the reading surface, and avoids reflowing the editor content.

### D2. Drag only from the toolbar container

Handle pointer down/move/up on the floating toolbar and capture the pointer during drag. Track movement distance so a drag does not accidentally activate a button click.

Rationale: This keeps normal text selection, code scrolling, and pinch zoom inside the content surface intact.

### D3. Scroll the active content wrapper

Attach a ref to the active scroll container wrapper around Markdown preview and CodeMirror. Jump actions call `scrollTo({ top: 0 })` and `scrollTo({ top: scrollHeight })` on that wrapper.

Rationale: This avoids coupling to CodeMirror internals and works for both Markdown and code surfaces because the app already wraps them in scrollable containers.

### D4. Keep footer informational

Remove primary zoom buttons from the footer and leave it for character count and path. The floating toolbar becomes the primary command surface.

Rationale: Avoid duplicate controls and keep fixed UI surfaces compact.

## Risks / Trade-offs

- [Risk] The toolbar can cover code near the left edge. -> Mitigation: make it draggable and compact, and position it outside the scrollable content flow.
- [Risk] Drag gestures can conflict with clicks. -> Mitigation: suppress button action when pointer movement crosses a small drag threshold.
- [Risk] Scroll-to-bottom may not reach CodeMirror's internal content if only the wrapper scrolls. -> Mitigation: the CodeMirror wrapper is already the scroll boundary; tests should assert shared ref usage and manual smoke verifies behavior.

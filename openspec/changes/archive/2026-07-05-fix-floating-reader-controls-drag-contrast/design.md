## Context

Workspace code and Markdown previews already expose a compact floating toolbar for zoom and top/bottom navigation. The toolbar is overlay-local and uses pointer capture, but it only tracks vertical position and uses a surface color close to the editor background. On mobile this can leave controls covering important content with no horizontal escape path, and on dark editor surfaces the toolbar can be hard to distinguish.

## Goals / Non-Goals

**Goals:**
- Make the floating toolbar draggable on both axes while keeping it inside the editor overlay.
- Preserve current zoom, reset, top, and bottom actions.
- Keep toolbar drag gestures separate from content scrolling, text selection, editing, and pinch zoom.
- Give the toolbar and its buttons a distinct, durable visual treatment against the existing Nexus editor surfaces.

**Non-Goals:**
- Persist toolbar position across files, sessions, or devices.
- Add new toolbar actions, minimaps, search, or scroll indicators.
- Change backend workspace file APIs or editor save behavior.

## Decisions

### D1. Track an overlay-local `{ x, y }` position

Replace the top-only state with a two-axis position object. Pointer drag state records the pointer id, start client coordinates, and start toolbar position; pointer move applies both deltas and clamps the result to the visible viewport area used by the overlay.

Alternative considered: keep a left-side rail and only improve vertical drag. That does not solve the user's reported inability to move controls away from covered code or thumb reach zones.

### D2. Clamp movement to the viewport bounds

The editor overlay already fills the viewport. Use stable toolbar width/height constants plus a small gap to prevent the control from being dragged completely off-screen. This keeps the implementation deterministic and easy to test without introducing layout measurement side effects.

Alternative considered: measure the rendered toolbar with `getBoundingClientRect()` on each move. That would fit dynamic content more tightly but adds layout reads to every pointer move for a fixed-size command strip.

### D3. Make the control surface visually distinct

Use a stronger border, raised shadow, ring, and high-contrast button backgrounds instead of a near-transparent editor-colored surface. Disabled controls keep visible shape while reducing opacity, so the toolbar remains findable even when zoom limits are reached.

Alternative considered: use accent-colored buttons for every action. That improves visibility but makes secondary navigation and zoom actions look like primary destructive/submit actions.

## Risks / Trade-offs

- [Risk] A freely dragged toolbar can cover content in more places. -> Mitigation: keep it compact, draggable in both axes, and bounded so it can always be moved away.
- [Risk] Stronger contrast may feel heavier than the previous subtle toolbar. -> Mitigation: use existing Nexus tokens and restrained border/shadow styling instead of introducing a new palette.
- [Risk] Fixed toolbar dimensions can drift if future toolbar content changes. -> Mitigation: keep source-level tests tied to the positioning constants and update them with any future toolbar size change.

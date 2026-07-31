## Context

The terminal UI is centered in `frontend/src/Terminal.tsx`. The same component owns the xterm instance, WebSocket attach/repaint flow, Direct Terminal keyboard interception, Composer draft state, Composer focus restoration, and the terminal history overlay. Project/channel navigation and reorder behavior live in `frontend/src/SessionManagerV2.tsx`, which is used both as a modal and as the desktop sidebar.

The reported bugs share one theme: gesture and focus handlers are currently competing with render and scroll surfaces. Composer opening depends on async state plus focus restoration; Direct Terminal intercepts special keys before xterm can always show cursor movement; scrollback closes when it thinks the overlay reached the bottom; and project/channel rows capture pointer movement for reordering across the full row, which can steal normal list scroll.

## Goals / Non-Goals

**Goals:**

- Make Composer/command draft opening idempotent and visually stable before the user types anything.
- Preserve visible cursor movement in Codex command lines and ordinary shell command lines when users move through existing input.
- Keep terminal-history overlay scrolling responsive while users move toward older output.
- Allow long project and channel lists to scroll to their final items in both modal and sidebar layouts.
- Keep existing APIs and persistence contracts unless implementation proves a backend change is required.

**Non-Goals:**

- Do not redesign the terminal toolbar or Composer feature set.
- Do not replace xterm, tmux scrollback, or the current WebSocket attach flow.
- Do not remove project/channel reordering.
- Do not change tmux session/window identity, saved ordering semantics, or URL behavior.
- Do not add new backend storage for terminal history.

## Decisions

### D1. Treat Composer open as a show-then-focus operation

`openComposer` should synchronously commit Composer mode, leave the panel mounted with stable dimensions, and then focus the textarea after the DOM exists. Focus retries should verify that Composer mode is still current and should not toggle the panel off when the user clicks the draft entry repeatedly.

Alternative considered: wait for draft load before rendering the textarea. That preserves remote draft correctness but creates an empty/black transition surface and makes focus depend on network timing.

### D2. Keep Direct Terminal cursor movement observable through xterm repaint paths

Special keys may still be mapped to terminal sequences, but the implementation must ensure the terminal receives the sequence through the same visible path that causes command-line redraw. If global key interception bypasses xterm's input handling, the terminal should still remain focused and repaint after the shell/Codex responds. Implementation should check whether the current `attachCustomKeyEventHandler`/global `keydown` split is suppressing xterm cursor updates and adjust the flow rather than layering extra fake cursor UI.

Alternative considered: render an application-level cursor overlay. That would drift from xterm's buffer state and break shell/Codex editing modes.

### D3. Make scrollback overlay explicitly scrollable until the user exits or reaches the bottom intentionally

The history overlay should not get stuck while moving upward, and it should not auto-close from minor layout changes, selection changes, or initial positioning. Auto-return-to-terminal can remain when the user intentionally scrolls to the live-output end, but it needs direction/threshold guards so exploring older output is stable.

Alternative considered: remove auto-close entirely. That is safe but changes an existing shortcut; guarded auto-close preserves the current return path while fixing accidental exits.

### D4. Separate row activation, scrolling, and reordering in SessionManagerV2

Project/channel rows should no longer make the entire scrollable row a `touch-none` drag target. Reordering should start only after a deliberate drag gesture, preferably from a clear handle or after a threshold that does not block natural vertical scroll. Scroll containers should retain native momentum scrolling and allow the last rows to be reached.

Alternative considered: disable reordering on touch devices. That would fix scrolling but remove a feature users already have; separating gestures keeps both.

### D5. Verify through the real terminal surface

Implementation must be checked in a running Nexus UI with at least one Codex channel and one ordinary shell channel. The important evidence is observable behavior: open Composer before typing, move the cursor inside an existing command, scroll older terminal history, and reach the last project/channel item in a long list.

## Risks / Trade-offs

- [Risk] Changing keyboard interception can regress IME or clipboard behavior. -> Mitigation: preserve existing printable-character and paste paths; verify IME-sensitive branches are not broadened.
- [Risk] Guarding history auto-close may make returning to live output less immediate. -> Mitigation: keep explicit close and bottom-return behavior, but require an intentional downward/bottom scroll.
- [Risk] Reorder gesture changes may make drag slightly less eager. -> Mitigation: use a clear drag threshold or handle so tap navigation and scrolling remain first-class.
- [Risk] Composer focus timing differs across desktop and mobile browsers. -> Mitigation: use mode refs plus requestAnimationFrame/short retry only while Composer remains active, and test both desktop and mobile-width layouts.

## Migration Plan

No data migration is expected. Implement frontend changes, run the frontend build/type checks, then drive the UI manually against the relevant terminal surfaces. Deployment must restart the `nexus` service after code changes and verify the service is accessible. If the service is unreachable after restart, rollback the deployed code to the previous version immediately.

## Open Questions

- Should project/channel reorder use a visible handle in both sidebar and modal, or only on touch/mobile surfaces?
- Should the terminal history overlay keep auto-close-on-bottom, or should implementation switch to explicit close only if the guarded behavior remains hard to make reliable?

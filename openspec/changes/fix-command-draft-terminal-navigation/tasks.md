## 1. Input Surface Stability

- [x] 1.1 Reproduce Composer command-draft black surface by opening the draft entry with an empty draft and with a saved draft.
- [x] 1.2 Update `frontend/src/Terminal.tsx` Composer open/focus flow so opening the draft mounts a visible textarea before typing and repeated draft-entry clicks only refocus it.
- [x] 1.3 Verify Composer open/close preserves terminal visibility, draft text, and cursor position on desktop and mobile-width layouts.

## 2. Direct Terminal Cursor Movement

- [x] 2.1 Reproduce invisible cursor movement in one Codex channel and one ordinary shell channel with existing typed command text.
- [x] 2.2 Audit `Terminal.tsx` global keydown and xterm custom key handler paths for Left/Right/Home/End and line-editing shortcuts.
- [x] 2.3 Adjust special-key handling so cursor movement reaches the terminal in a way that visibly repaints the active prompt without regressing printable input, paste, or IME composition.
- [x] 2.4 Verify cursor movement is visible in Codex and shell prompts before typing any additional printable character.

## 3. Terminal History Scrolling

- [x] 3.1 Reproduce scrollback overlay getting stuck or returning early while scrolling toward older terminal output.
- [x] 3.2 Update `fetchScrollback`, initial scroll positioning, and `handleOverlayScroll` guards so initial layout, selection changes, and upward/momentum scrolling do not close or freeze the overlay.
- [x] 3.3 Preserve explicit close behavior and intentional return-to-live-output behavior at the bottom of the history overlay.
- [x] 3.4 Verify long scrollback can be opened, scrolled upward repeatedly, selected/copied, and closed explicitly.

## 4. Project And Channel List Scrolling

- [x] 4.1 Reproduce overflowed project/channel lists where reorder pointer handling prevents reaching the final item.
- [x] 4.2 Update `frontend/src/SessionManagerV2.tsx` row pointer handling so native list scrolling is not captured as reorder.
- [x] 4.3 Keep deliberate project and channel reorder working through a clear drag threshold or handle and save through existing order APIs.
- [x] 4.4 Verify sidebar and modal layouts can scroll to the final project and final channel and still activate those rows.

## 5. Verification And Deployment

- [x] 5.1 Run frontend type/build checks for changed files.
- [x] 5.2 Drive the fixed UI through a running Nexus instance: Composer draft open, Codex cursor movement, shell cursor movement, terminal history scroll, and long project/channel list scroll.
- [x] 5.3 Restart the `nexus` service after deployment and verify it is accessible.
- [x] 5.4 Roll back the deployed code immediately if the service is unreachable after restart.

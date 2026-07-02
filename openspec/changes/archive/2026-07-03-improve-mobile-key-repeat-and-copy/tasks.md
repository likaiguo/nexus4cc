## 1. Shortcut Repeat

- [x] 1.1 Add a reusable toolbar shortcut pointer handler that sends once immediately and repeats eligible keys after an initial delay
- [x] 1.2 Limit repeat eligibility to safe shortcut IDs, including `up`, `down`, `left`, and `right`
- [x] 1.3 Stop repeat timers on pointer end, pointer cancel, pointer leave, lost capture, blur, and unmount
- [x] 1.4 Ensure repeated sends record shortcut usage only once per press

## 2. Copy Interactions

- [x] 2.1 Replace the terminal copy sheet textarea with selectable static text and explicit copy actions
- [x] 2.2 Copy selected copy-sheet text when available, otherwise copy all terminal text
- [x] 2.3 Add history-mode selection tracking and show a floating copy action for selections inside the history overlay
- [x] 2.4 Copy selected history text without closing history mode, and avoid bottom-scroll auto-close while a history selection is active

## 3. Verification

- [x] 3.1 Add or update focused frontend tests for repeatable shortcuts and copy/history selection behavior
- [x] 3.2 Run OpenSpec validation and relevant frontend test/build commands
- [x] 3.3 Manually inspect the mobile UI behavior enough to catch layout or interaction regressions

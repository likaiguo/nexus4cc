## 1. Terminal History Access

- [x] 1.1 Add a first-class terminal-history action definition and i18n labels distinct from Composer input history
- [x] 1.2 Expose an `openTerminalHistory` callback from `Terminal.tsx` that reuses the existing scrollback fetch and overlay flow
- [x] 1.3 Wire PC toolbar/sidebar controls to open terminal history for the active project/channel
- [x] 1.4 Wire mobile more/settings menu or compact controls to open terminal history without relying on gestures
- [x] 1.5 Correct mobile history gesture direction or gesture documentation so it matches the view-older-output mental model
- [x] 1.6 Ensure closing history restores the prior terminal or Composer input path on PC and mobile

## 2. Cross-Device Composer

- [x] 2.1 Remove mobile-only gating where appropriate so PC can open Composer while preserving mobile compact behavior
- [x] 2.2 Render a desktop-friendly Composer panel with visible draft, cursor metadata, send action, close action, and history action
- [x] 2.3 Reuse existing composer draft load/save/delete APIs for PC and mobile scopes
- [x] 2.4 Reuse existing input-history query and apply behavior for PC and mobile Composer history recall
- [x] 2.5 Keep non-empty drafts discoverable without forcing the Composer panel to stay open

## 3. Keyboard and Multi-Line Semantics

- [x] 3.1 Update Composer key handling so `Enter` sends, `Shift+Enter` inserts newline, and `Ctrl/Cmd+Enter` sends
- [x] 3.2 Preserve IME composition guards so Enter-related key events do not send unconfirmed composition text
- [x] 3.3 Add Direct Terminal `Shift+Enter` handling on PC to send a line-feed/newline sequence instead of normal Enter
- [x] 3.4 Ensure mobile Composer still supports visible send button behavior and editable multi-line drafts
- [x] 3.5 Add focused tests for Composer key semantics and Direct Terminal `Shift+Enter`

## 4. Clipboard and Toolbar Semantics

- [x] 4.1 Split terminal Ctrl+V from app-level paste/upload actions in toolbar key definitions
- [x] 4.2 Update toolbar rendering so app-level paste/upload actions are not displayed only as `^V`
- [x] 4.3 Ensure toolbar `^V`, when present as a terminal shortcut, sends the real terminal Ctrl+V control sequence
- [x] 4.4 Keep PC keyboard `Ctrl/Cmd+V` as native text paste into xterm or Composer without opening upload UI
- [x] 4.5 Ensure image/file upload requires an explicit upload or paste-upload action
- [x] 4.6 Update default toolbar presets carefully without destroying existing custom toolbar entries

## 5. Text and Layout Polish

- [x] 5.1 Add zh-CN and en locale keys for terminal history, input history, paste text, paste/upload, and multi-line Composer actions
- [x] 5.2 Review PC layout for sidebar-collapsed and sidebar-expanded states so history and Composer controls remain discoverable
- [x] 5.3 Review mobile 390px layout so new history/menu entries do not alter fixed shortcut order or cause overlap
- [x] 5.4 Ensure tooltips and aria-labels distinguish terminal history from input history

## 6. Verification and Deployment

- [x] 6.1 Add or update static/unit tests for terminal-history entry discoverability, toolbar action semantics, and PC/mobile Composer availability
- [x] 6.2 Run frontend build with `npm run build` in `frontend/`
- [x] 6.3 Run relevant existing focused tests such as `npx tsx frontend/mobileInput.test.ts` and `npx tsx frontend/toolbarPresets.test.ts`
- [x] 6.4 Restart the `nexus` service after deploying code changes
- [x] 6.5 Verify the restarted service is accessible
- [x] 6.6 If the service is unreachable after restart, rollback deployed code to the previous version immediately

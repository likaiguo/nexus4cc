## 1. Toolbar Definitions And Presets

- [x] 1.1 Update `frontend/src/toolbarDefaults.ts` so built-in `ctrl-v` has label `^V`, no terminal sequence, `action: 'pasteClipboard'`, and paste/upload description.
- [x] 1.2 Remove `paste-text` from factory expanded defaults unless it is retained only as a non-default compatibility key.
- [x] 1.3 Update `frontend/src/toolbarPresets.ts` so built-in presets do not add duplicate text-only paste actions and preserve unrelated terminal history/copy/fit ordering.
- [x] 1.4 Verify mobile factory fixed shortcut order still contains `ctrl-v` in the existing position.

## 2. Paste Upload Workflow

- [x] 2.1 Restore `frontend/src/Toolbar.tsx` `pasteClipboard` handling to read clipboard image items first and upload exposed images through `onUploadFile`.
- [x] 2.2 Restore fallback behavior so toolbar `^V` opens the unified paste/upload sheet when no clipboard image is handled.
- [x] 2.3 Restore paste/upload sheet copy, placeholder, editable textarea, Send action, pasted-image upload handling, and explicit file picker.
- [x] 2.4 Preserve native keyboard `Ctrl/Cmd+V` text paste inside xterm and Composer; do not route keyboard text paste through the sheet.
- [x] 2.5 Restore terminal-surface image paste upload in `frontend/src/Terminal.tsx` with guards for input, textarea, Composer textarea, and contenteditable targets.

## 3. Locale And Accessibility Text

- [x] 3.1 Update zh-CN and en toolbar locale keys so `ctrl-v` describes paste/upload rather than terminal literal-next.
- [x] 3.2 Restore paste/upload sheet labels for title, placeholder, Send, and file selection where they regressed to text-only wording.
- [x] 3.3 Ensure aria-labels/tooltips for toolbar `^V` and upload controls clearly describe paste/upload behavior.

## 4. Tests

- [x] 4.1 Update `frontend/toolbarPresets.test.ts` assertions so `ctrl-v` is locked as app-level paste/upload and not `\x16`.
- [x] 4.2 Add static coverage that the paste/upload sheet supports pasted image upload and file picker behavior.
- [x] 4.3 Add static coverage that keyboard `Ctrl/Cmd+V` is still allowed to pass through for native text paste.
- [x] 4.4 Run focused tests: `npx tsx frontend/toolbarPresets.test.ts` and any paste/mobile input tests affected by the change.

## 5. Manual QA And Deployment

- [x] 5.1 Run `npm run build` in `frontend/`.
- [x] 5.2 Drive a running Nexus UI on desktop: toolbar `^V` opens paste/upload sheet, pasted text can be edited and sent, clipboard image uploads, file picker opens, and keyboard `Ctrl/Cmd+V` text paste remains native.
- [x] 5.3 Drive a running Nexus UI at mobile width around 390px: fixed `^V` keeps its position, opens paste/upload, supports text edit/send, and supports image/file upload.
- [x] 5.4 Restart the `nexus` service after deploying code changes and verify `http://localhost:59000` is accessible.
- [x] 5.5 If the restarted service is unreachable, rollback the deployed code to the previous version immediately.

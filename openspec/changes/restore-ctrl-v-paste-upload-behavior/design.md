## Context

Nexus historically used the toolbar `ctrl-v` key (`^V`) as an app-level paste/upload workflow. Pressing that toolbar shortcut tried to read clipboard images for upload; if no image was handled, it opened a unified paste sheet where users could paste or edit text, paste an image, send the text to the terminal, or choose a file.

The cross-device terminal input change reinterpreted toolbar `^V` as the terminal literal-next control byte (`\x16`) and introduced a separate text-only `Paste` action. That split is too surprising for the Nexus toolbar because users relied on `^V` as the visible paste/upload entry. The restore should be narrow: bring back the old paste/upload behavior without undoing terminal history, Composer, or multiline input changes.

## Goals / Non-Goals

**Goals:**

- Restore default toolbar `ctrl-v` to app-level paste/upload behavior on PC and mobile.
- Restore the unified paste/upload sheet with editable text, image paste upload, send, and file picker.
- Restore clipboard image upload from terminal surfaces when the paste target is not an input, textarea, or Composer editor.
- Keep native keyboard `Ctrl/Cmd+V` text paste behavior in xterm and Composer.
- Keep terminal history, cross-device Composer, input history, and multiline key semantics from the previous change.
- Preserve user custom toolbar entries and fixed mobile shortcut order.

**Non-Goals:**

- Do not remove terminal control-key support in custom shortcuts generally.
- Do not redesign the upload queue or backend upload APIs.
- Do not change Composer draft persistence, input history storage, or tmux scrollback.
- Do not add a new backend endpoint or data migration.

## Decisions

### D1. Restore `ctrl-v` as the default paste/upload action

`frontend/src/toolbarDefaults.ts` should define the built-in `ctrl-v` key with label `^V`, empty terminal sequence, `action: 'pasteClipboard'`, and paste/upload wording. This matches the pre-regression behavior and keeps the visible fixed shortcut meaningful for most users.

Alternative considered: keep `ctrl-v` as literal-next and add another default paste button. That duplicates controls and keeps the surprising behavior the user asked to undo.

### D2. Keep native keyboard paste separate from toolbar `^V`

PC keyboard `Ctrl/Cmd+V` should continue to follow browser/xterm or textarea behavior for text paste. The restore targets the toolbar/action button, not the physical keyboard shortcut path. This avoids reintroducing text-paste interception while still restoring the visible paste/upload affordance.

Alternative considered: intercept every keyboard paste and open the sheet. That would regress direct terminal and Composer text entry.

### D3. Bring back the unified paste/upload sheet

The paste sheet should again be titled as paste/upload, use the paste/upload placeholder, accept text paste into the textarea for editing, handle pasted image clipboard items via `onUploadFile`, expose a Send action, and include a file picker. This restores both text and image/file workflows behind one familiar `^V` affordance.

Alternative considered: keep the text-only sheet and rely on separate upload menus. That preserves the regression for users who used `^V` to paste screenshots or choose files.

### D4. Restore image paste upload with input guards

The global paste image handler can be restored if it ignores `INPUT`, `TEXTAREA`, and contenteditable targets. This keeps Composer and paste-sheet text editing safe while allowing image paste into the terminal surface to upload as before.

Alternative considered: only upload images from inside the paste sheet. That misses the original fast path for pasting screenshots directly onto the terminal surface.

### D5. Preserve custom toolbar safety

Implementation should update built-in defaults and presets without deleting user custom keys. Existing custom keys named `ctrl-v` should resolve to the restored built-in semantics unless they are truly user-defined custom entries with another ID. `paste-text` entries introduced by the previous change should be removed from factory defaults and presets, or left only as non-default custom-compatible definitions if needed for migration.

Alternative considered: reset toolbar configs globally. That risks destroying user customization and is outside the requested restore.

## Risks / Trade-offs

- [Risk] Browser clipboard image APIs may fail on insecure origins or denied permissions. -> Mitigation: always fall back to the paste/upload sheet and file picker.
- [Risk] Reintroducing global image paste could interfere with text editing. -> Mitigation: ignore input, textarea, and contenteditable targets, and test Composer/paste sheet paste paths.
- [Risk] Users who adopted literal terminal `^V` could lose that default shortcut. -> Mitigation: this is intentional for built-ins; literal-next can remain possible through a custom shortcut if needed.
- [Risk] Preset migration could reorder mobile shortcuts. -> Mitigation: keep fixed-row order unchanged and only remove the duplicate `paste-text` expanded entry.

## Migration Plan

No backend data migration is required.

1. Update frontend toolbar definitions, presets, paste sheet, and image paste handler.
2. Update locale keys only where wording currently describes literal terminal Ctrl+V or text-only paste.
3. Update focused toolbar tests to assert restored `^V` paste/upload semantics and preserved fixed shortcut order.
4. Run focused tests and frontend build.
5. Drive the running UI through toolbar `^V` text paste, image paste/upload, file picker, and native keyboard text paste paths on PC and mobile-width layouts.
6. Restart the `nexus` service and verify it is accessible. If unreachable after restart, rollback the deployed code immediately.

## Open Questions

- None for the restore scope. The user explicitly asked to recover the original `Ctrl+V` behavior.

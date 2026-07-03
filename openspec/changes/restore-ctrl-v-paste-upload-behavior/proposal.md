## Why

The recent toolbar clipboard change made `^V` behave like a terminal literal-next control key, but users expect the existing Nexus `^V` toolbar shortcut to open the paste/upload workflow. This needs to be restored because paste text, paste image, and paste file are core mobile and desktop terminal workflows.

## What Changes

- Restore the default toolbar `ctrl-v` entry to the prior app-level paste/upload action instead of sending `\x16` to the terminal.
- Restore the unified paste/upload sheet title, placeholder, image paste handling, send action, and file picker behavior.
- Restore clipboard image handling so pasted images can be uploaded through the paste workflow.
- Remove or demote the newer `paste-text` toolbar default/preset entry where it duplicates the restored `^V` behavior.
- Preserve unrelated improvements from the prior change, including terminal history access, cross-device Composer, input history, and multi-line Composer behavior.
- Keep native keyboard `Ctrl/Cmd+V` text paste into xterm or Composer intact; this change targets the toolbar `^V` action and explicit paste/upload surfaces.

## Capabilities

### New Capabilities

- `toolbar-paste-upload-controls`: Cross-device toolbar paste/upload behavior, including `^V` shortcut semantics, editable paste sheet, clipboard image upload, and file upload entry points.

### Modified Capabilities

- `mobile-command-controls`: The mobile fixed shortcut `ctrl-v` must retain the restored paste/upload behavior while preserving fixed-row order and layout stability.

## Impact

- Frontend `frontend/src/toolbarDefaults.ts`: restore `ctrl-v` action metadata and default expanded entries affected by the clipboard split.
- Frontend `frontend/src/toolbarPresets.ts`: remove duplicate paste-text defaults/presets or migrate them back to restored `ctrl-v` semantics without changing unrelated shortcut order.
- Frontend `frontend/src/Toolbar.tsx`: restore app-level paste/upload handling, unified paste sheet, image paste upload, and file picker behavior.
- Frontend `frontend/src/Terminal.tsx`: restore global clipboard image upload only where needed for the prior paste behavior, without intercepting text input fields or Composer text paste.
- Frontend locale files: restore or retain paste/upload copy so `^V` describes paste/upload rather than terminal literal-next.
- Tests: update focused toolbar/paste tests to lock restored `^V` semantics and prevent accidental replacement with literal terminal Ctrl+V.
- Deployment: implementation will require a `nexus` service restart and accessibility verification per repository constraints.

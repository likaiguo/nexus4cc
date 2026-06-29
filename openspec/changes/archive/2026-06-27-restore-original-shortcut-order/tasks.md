## 1. Default Shortcut Order

- [x] 1.1 Inspect `toolbarDefaults.ts` and git history as needed to identify the original default fixed shortcut order.
- [x] 1.2 Restore or confirm `FACTORY_CONFIG.pinned` uses that original default order.
- [x] 1.3 Ensure mobile fixed rows render directly from `config.pinned` without category sorting or system-button interleaving.
- [x] 1.4 Preserve existing user-saved toolbar configurations unless the user explicitly resets to default.

## 2. Custom Shortcut Placement

- [x] 2.1 Change custom shortcut creation so new custom keys append to `config.pinned`.
- [x] 2.2 Ensure new custom keys are appended after all existing fixed shortcuts and do not alter default key relative order.
- [x] 2.3 Keep manual edit controls for moving custom keys between fixed and expanded sections.
- [x] 2.4 Add or update focused tests for custom key default placement and fixed-order preservation.

## 3. Mobile System Row Alignment

- [x] 3.1 Adjust the mobile system quick-action row so settings/more is aligned to the right.
- [x] 3.2 Keep edit shortcuts, expand/collapse, Composer draft, and Attention visible before the right-aligned settings/more entry.
- [x] 3.3 Confirm settings/more menu positioning still stays within the viewport when opened from the right side.
- [x] 3.4 Keep low-frequency actions such as theme, files, copy location, append Enter, history, and clear draft inside settings/more.

## 4. Compatibility

- [x] 4.1 Keep PC toolbar behavior unchanged.
- [x] 4.2 Keep embedded sidebar toolbar behavior unchanged.
- [x] 4.3 Keep Composer draft idempotent open/focus behavior unchanged.
- [x] 4.4 Update zh-CN/en labels only if implementation introduces new text.

## 5. Verification And Deployment

- [x] 5.1 Run focused toolbar/custom-shortcut tests.
- [x] 5.2 Run frontend build.
- [x] 5.3 Verify 390px mobile width still shows one system row and two fixed shortcut rows without overlap.
- [x] 5.4 Restart the `nexus` service after code changes.
- [x] 5.5 Verify the service is accessible after restart; if unreachable, rollback the deployed code immediately.

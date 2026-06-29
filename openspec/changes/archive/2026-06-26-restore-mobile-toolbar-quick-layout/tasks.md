## 1. Mobile Toolbar Layout

- [x] 1.1 Change the mobile `Toolbar.tsx` default layout from one compact row to three quick rows.
- [x] 1.2 Put system quick actions in the first row: settings/more, edit shortcuts, expand/collapse, Composer draft, and Attention badge when present.
- [x] 1.3 Split pinned shortcut IDs into two visible mobile rows while preserving user order.
- [x] 1.4 Keep low-frequency actions such as theme, files, upload, copy location, append Enter, history, and clear draft in the settings/more menu.

## 2. Composer Draft Reliability

- [x] 2.1 Make the Composer draft toolbar action an idempotent open/focus action, not a toggle.
- [x] 2.2 Ensure repeated taps on the draft action keep the Composer textarea visible and editable.
- [x] 2.3 Ensure explicit close/direct actions still return to Direct Terminal and hide an empty Composer panel.
- [x] 2.4 Ensure unsent drafts remain visible/discoverable after navigation or reload.

## 3. Polish And Compatibility

- [x] 3.1 Keep PC toolbar and embedded sidebar toolbar behavior unchanged.
- [x] 3.2 Update zh-CN/en labels if quick-row actions need new text.
- [x] 3.3 Verify 390px mobile width has stable three-row toolbar height with no overlap or accidental wrapping.

## 4. Verification And Deployment

- [x] 4.1 Run focused toolbar tests.
- [x] 4.2 Run frontend build.
- [x] 4.3 Restart the `nexus` service after code changes.
- [x] 4.4 Verify the service is accessible after restart; if unreachable, rollback the deployed code immediately.

## 1. Shortcut Layout

- [x] 1.1 Refactor mobile expanded shortcut rows to use the same width-distributing grid model as pinned rows.
- [x] 1.2 Preserve expanded shortcut order and touch behavior while removing obvious right-side blank space.
- [x] 1.3 Keep fixed shortcut rows unchanged.

## 2. Toolbar Menu Action

- [x] 2.1 Add a compact first-row quick action in the mobile settings/more menu to collapse the expanded shortcut section.
- [x] 2.2 Ensure the menu collapse action closes the menu and leaves fixed shortcut rows visible.
- [x] 2.3 Keep existing edit shortcuts/settings/history menu actions available.

## 3. Composer Draft And History

- [x] 3.1 Allow Composer panel to collapse when draft text is non-empty while preserving the draft.
- [x] 3.2 Keep the Composer draft entry visible/highlighted when a collapsed draft exists.
- [x] 3.3 Make selecting an input history item open Composer, fill the draft text, set the cursor to the end, and focus the textarea.
- [x] 3.4 Keep input history persistence and retrieval APIs unchanged.

## 4. Verification

- [x] 4.1 Update focused static tests for expanded grid layout, menu collapse action, collapsible draft logic, and history replay behavior.
- [x] 4.2 Run focused toolbar/composer tests.
- [x] 4.3 Run frontend build.
- [x] 4.4 Run server syntax check and whitespace diff check.
- [x] 4.5 Verify 390px mobile expectations with static checks.

## 5. Deployment And OpenSpec

- [x] 5.1 Restart the `nexus` service after code changes.
- [x] 5.2 Verify the service is accessible after restart; if unreachable, rollback the deployed code immediately.
- [x] 5.3 Sync the main `mobile-command-controls` spec with this change.
- [x] 5.4 Archive the completed OpenSpec change.

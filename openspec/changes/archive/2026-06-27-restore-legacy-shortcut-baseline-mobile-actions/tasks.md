## 1. Shortcut Baseline

- [x] 1.1 Restore `FACTORY_PINNED` to the 14-key pre-regression order.
- [x] 1.2 Restore `FACTORY_EXPANDED` to the 21-key pre-regression order.
- [x] 1.3 Ensure factory preset/reset paths use the restored baseline without duplicating a second order source.

## 2. Custom Shortcut Placement

- [x] 2.1 Replace the pin-only custom shortcut helper with a section-aware append helper.
- [x] 2.2 Update custom shortcut creation UI so users can add a new custom key to either fixed row or expanded section.
- [x] 2.3 Keep existing manual controls for moving custom keys between fixed and expanded sections.

## 3. Mobile System Row

- [x] 3.1 Remove the mobile first-row persistent edit-shortcuts button.
- [x] 3.2 Add the browse workspace/local directory button to the mobile first-row system group when available.
- [x] 3.3 Preserve mobile first-row right clustering and order: browse workspace, expand/collapse, Composer, Attention, settings/more.
- [x] 3.4 Keep edit-shortcuts accessible from the settings/more menu.
- [x] 3.5 Keep second and third fixed shortcut rows driven by `config.pinned` order.
- [x] 3.6 Tighten mobile shortcut-row spacing so rows do not force full-width content or leave excessive right-side blank space.

## 4. Verification

- [x] 4.1 Update focused toolbar tests for restored shortcut baseline, custom fixed/expanded placement, and mobile system-row order.
- [x] 4.2 Run focused toolbar tests.
- [x] 4.3 Run frontend build.
- [x] 4.4 Run server syntax check and whitespace diff check.
- [x] 4.5 Verify 390px mobile expectations with static checks.

## 5. Deployment And OpenSpec

- [x] 5.1 Restart the `nexus` service after code changes.
- [x] 5.2 Verify the service is accessible after restart; if unreachable, rollback the deployed code immediately.
- [x] 5.3 Sync the main `mobile-command-controls` spec with this change.
- [x] 5.4 Archive the completed OpenSpec change.

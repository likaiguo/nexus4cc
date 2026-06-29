## 1. Mobile System Row Layout

- [x] 1.1 Change the mobile toolbar first row so the whole system action group is right-aligned.
- [x] 1.2 Keep system action order as edit shortcuts, expand/collapse, Composer draft, Attention, settings/more.
- [x] 1.3 Ensure Attention remains conditional without changing the relative order of the other buttons.
- [x] 1.4 Keep the second and third fixed shortcut rows unchanged.

## 2. Compatibility

- [x] 2.1 Keep PC toolbar behavior unchanged.
- [x] 2.2 Keep embedded sidebar toolbar behavior unchanged.
- [x] 2.3 Keep Composer draft idempotent open/focus behavior unchanged.
- [x] 2.4 Avoid adding new visible labels or i18n strings.

## 3. Verification And Deployment

- [x] 3.1 Update focused toolbar tests or static checks for the right-aligned system action group order.
- [x] 3.2 Run focused toolbar tests.
- [x] 3.3 Run frontend build.
- [x] 3.4 Verify 390px mobile width expectations with code/static or browser checks.
- [x] 3.5 Restart the `nexus` service after code changes.
- [x] 3.6 Verify the service is accessible after restart; if unreachable, rollback the deployed code immediately.

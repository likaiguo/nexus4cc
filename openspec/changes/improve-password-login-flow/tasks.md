## 1. Auth Configuration and API

- [x] 1.1 Update server `.env` loading so repo-local `.env` provides the authoritative auth values when present.
- [x] 1.2 Introduce runtime password-hash state used by login, default-status detection, and password reset.
- [x] 1.3 Add unauthenticated auth status API that reports default-password state without exposing custom passwords.
- [x] 1.4 Add authenticated password reset API that validates current password, hashes the new password, persists `.env`, and updates runtime state atomically.

## 2. Login Experience

- [x] 2.1 Fetch auth status on the unauthenticated login page.
- [x] 2.2 Prefill and describe `nexus123` only while the default password is active.
- [x] 2.3 Add an eye control to toggle password visibility without changing existing login behavior.

## 3. Settings Password Reset

- [x] 3.1 Add a security/password section to `GeneralSettings`.
- [x] 3.2 Wire current password, new password, confirmation, loading, success, and error states to the reset API.
- [x] 3.3 Add localized strings and any needed icon support.

## 4. Documentation and Verification

- [x] 4.1 Update docs/setup guidance to describe default-password display and Settings-based password change.
- [x] 4.2 Add focused regression coverage for auth status, login-page default behavior, and password reset behavior.
- [x] 4.3 Run OpenSpec validation, backend tests, frontend tests, frontend typecheck/build, and changed-file checks.
- [x] 4.4 Manually verify default-password login, custom-password login, and settings password reset through the browser.
- [x] 4.5 Restart the `nexus` service after deploying code changes and verify it is reachable.
- [x] 4.6 Roll back the deployed code immediately if the service is unreachable after restart. (Not needed: service stayed reachable after restart.)

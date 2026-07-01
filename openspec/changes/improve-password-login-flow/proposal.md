## Why

Nexus currently relies on a bcrypt password hash in environment configuration, but different launch paths can observe different values and make `npm start` disagree with the already running service. The login page also gives no help when the service is still on the documented default password, while changing the password requires manual hash generation and config editing.

## What Changes

- Use one authoritative runtime password hash for login checks and password changes.
- Keep `.env` and auth behavior consistent so the same configured password is used across launch paths.
- Expose unauthenticated auth metadata that tells the login page only whether the service is still using the default password.
- When the password is still the default `nexus123`, prefill it on the login page and allow the user to show or hide it with an eye control.
- When the user has set a custom password, stop displaying or prefilling any password on the login page.
- Add an authenticated settings flow for changing the login password without manually generating a bcrypt hash.
- Persist password changes to `.env` and update the running server state immediately.

## Capabilities

### New Capabilities
- `password-login-management`: Default password discovery, login-page password visibility, and authenticated password reset behavior for the single-user Nexus password.

### Modified Capabilities
- None

## Impact

- Backend auth/config handling in `server.js`.
- Login UI in `frontend/src/App.tsx`.
- General settings UI in `frontend/src/GeneralSettings.tsx`.
- Desktop collapsed sidebar settings entry in `frontend/src/Terminal.tsx`.
- Shared icons/localized strings for password visibility and password change copy.
- Documentation and setup guidance that currently instruct users to manually generate `ACC_PASSWORD_HASH`.

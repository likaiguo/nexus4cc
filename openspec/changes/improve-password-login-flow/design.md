## Context

Nexus is a single-user self-hosted app with one password-protected login and JWT sessions. The current server loads `.env` manually, but only fills keys that are not already present in `process.env`; this can let PM2 or shell state override `.env` and make launch paths disagree. The UI has a login form in `frontend/src/App.tsx` and a settings modal in `frontend/src/GeneralSettings.tsx`, but no password reset surface.

The documented default password is `nexus123`, represented by the default bcrypt hash in `.env.example`. The service should help first-time/default installations without exposing custom secrets.

## Goals / Non-Goals

**Goals:**
- Make password auth use one authoritative runtime password hash.
- Keep `.env`, `npm start`, `start.sh`, and service restart behavior consistent for auth credentials.
- Preserve non-auth launch overrides such as `PORT=... npm start`.
- Let unauthenticated clients know only whether the current password is the default.
- Prefill and reveal/hide `nexus123` only while the current hash still matches the default password.
- Let authenticated users set a custom password from Settings.
- Persist the new bcrypt hash to `.env` and update the running process immediately.

**Non-Goals:**
- Multi-user accounts, registration, roles, or password recovery.
- Displaying or returning custom passwords to the browser.
- Replacing bcrypt/JWT or changing JWT session lifetime.
- Encrypting `.env` or introducing a new secrets manager.

## Decisions

### `.env` auth keys are the local auth source of truth

When `.env` exists, server startup will parse it and let repo-local auth keys (`JWT_SECRET` and `ACC_PASSWORD_HASH`) override shell or process-manager values. Non-auth keys keep the existing behavior: `.env` fills missing values, while explicitly provided shell values such as `PORT=... npm start` can still win. Missing `.env` remains supported for deployment styles that inject all required environment variables externally.

Alternative considered: keep the current "environment wins over `.env`" behavior and only adjust docs. That would leave the core mismatch in place because PM2 or a shell can still carry an old `ACC_PASSWORD_HASH`.

### Keep password hash mutable in process

The server will derive a runtime password hash from `ACC_PASSWORD_HASH` and use that value for login checks and default-password status. Password reset will replace the runtime hash, update `process.env.ACC_PASSWORD_HASH`, and write the new hash to `.env`.

Alternative considered: require service restart after every password change. That is simpler internally but makes the Settings action feel broken and does not satisfy immediate reset behavior.

### Detect default status by comparing the current hash

The default state will be detected by `bcrypt.compare('nexus123', passwordHash)`. The unauthenticated status endpoint returns the default password only when that comparison succeeds; otherwise it returns no password value.

Alternative considered: store an extra `PASSWORD_CUSTOMIZED=true` flag. That can drift from the hash and creates a second source of truth.

### Password reset writes `.env` in place

The reset endpoint will update the `ACC_PASSWORD_HASH=` line if it exists, append it if missing, and fail with a clear error if `.env` cannot be read or written. It will not log password values.

Alternative considered: store the password hash in SQLite. That would introduce another persistence source for an app whose auth configuration is already documented through `.env`.

### Reuse existing settings modal patterns

`GeneralSettings` will add a compact Security/Password section using the existing modal, input, button, and status text styles. The desktop collapsed sidebar gear will open general settings so the password reset is reachable from the visible settings entry. The login page will keep the existing centered card layout and add a small default-password hint plus an eye button inside the password field.

Alternative considered: introduce a new password management page. That adds navigation surface for a single setting and is unnecessary for the current single-user scope.

## Risks / Trade-offs

- [Risk] Overriding external auth env with `.env` could surprise deployments that expect shell variables to win. -> Mitigation: only auth keys are overridden when repo-local `.env` exists; external-only deployments still work without `.env`.
- [Risk] Writing `.env` could fail because of file permissions. -> Mitigation: return a clear non-2xx error and keep the current runtime password hash unchanged.
- [Risk] A default-password endpoint could leak that a fresh Nexus instance is using `nexus123`. -> Mitigation: this is intentionally exposed only for the documented default state; custom passwords are never returned.
- [Risk] Updating `.env` might alter comments or ordering if implemented with a broad rewrite. -> Mitigation: perform a narrow line replacement and preserve the rest of the file.

## Migration Plan

1. Deploy the code and rebuild the frontend.
2. Restart the `nexus` service as required by repository deployment constraints.
3. Verify the service is reachable after restart.
4. Verify login status, default login behavior, custom password reset, and custom-password login.
5. If the service is unreachable after restart, roll back the deployed code to the previous version immediately.

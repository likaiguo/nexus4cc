## Why

Mobile browsers can keep an old Nexus tab and `nexus_token` for days, but the JWT expires after 30 days and can also become invalid after auth configuration changes. When that stale token is reused from a phone over the LAN IP, the frontend currently renders the authenticated terminal shell first and then lets backend calls or the WebSocket fail, leaving the user stuck instead of returning to login.

## What Changes

- Validate a saved auth token before showing the authenticated terminal UI.
- Treat API `401` responses and WebSocket unauthorized closes as an expired login session, not as ordinary backend load failures.
- Clear only the invalid auth token and return the user to the login page so they can authenticate again.
- Preserve existing project/channel URL and local workspace preferences so re-login can resume the previous context.
- Add regression coverage for expired-token startup, API 401 logout, and WebSocket unauthorized logout behavior.

## Capabilities

### New Capabilities
- `auth-session-recovery`: Browser-side recovery from expired or invalid single-user JWT sessions across mobile and desktop clients.

### Modified Capabilities
- None

## Impact

- Frontend auth bootstrap and token ownership in `frontend/src/App.tsx`.
- Terminal/WebSocket unauthorized handling in `frontend/src/Terminal.tsx`.
- Shared frontend API request handling where protected fetches can receive `401`.
- Backend auth surface may add or reuse a lightweight authenticated session check endpoint.
- Tests around login UI, terminal startup, protected API failures, and WebSocket unauthorized close handling.

## 1. Auth State Ownership

- [x] 1.1 Add an authenticated startup validation path in `frontend/src/App.tsx` for saved `nexus_token` values before rendering `Terminal`.
- [x] 1.2 Add an auth-expiry handler in `App.tsx` that removes only `nexus_token`, clears React token state, and returns to the login view without reloading the page.
- [x] 1.3 Show a clear connection/checking state when saved-token validation cannot reach the backend, without deleting the saved token.
- [x] 1.4 Pass the auth-expiry handler from `App.tsx` into `Terminal` and any auth-aware child surfaces that need to report unauthorized responses.

## 2. Protected API Unauthorized Handling

- [x] 2.1 Add or reuse a shared frontend response helper that converts protected API `401` responses into the auth-expiry callback.
- [x] 2.2 Replace `SessionManagerV2`'s local token-removal and page-reload behavior with the shared auth-expiry callback.
- [x] 2.3 Apply the shared `401` handling to high-impact terminal startup, project/channel, attention, settings, toolbar, workspace, archive, and file API calls that can leave the mobile UI stuck.
- [x] 2.4 Ensure fetch/network errors remain distinct from `401` responses and do not clear the saved token.

## 3. WebSocket Unauthorized Handling

- [x] 3.1 Update `Terminal` props and WebSocket close handling so close code `4001` calls the auth-expiry callback.
- [x] 3.2 Stop reconnect attempts after WebSocket `4001` while preserving existing reconnect behavior for non-auth disconnects.
- [x] 3.3 Ensure WebSocket cleanup does not leave stale reconnect timers or terminal-only auth error messages after the login view is shown.

## 4. Regression Coverage

- [x] 4.1 Add focused `frontend/authUi.test.ts` coverage for saved-token validation success, validation `401`, and validation network failure behavior.
- [x] 4.2 Add frontend test coverage for protected API `401` handling that clears only `nexus_token` and preserves non-auth browser state.
- [x] 4.3 Add frontend test coverage for WebSocket `4001` handling and non-auth WebSocket reconnect behavior.
- [x] 4.4 Run the affected frontend tests and the repository's relevant backend/auth tests.
- [x] 4.5 Run a production frontend build to verify the changed app compiles.

## 5. Deployment Verification

- [ ] 5.1 Restart the `nexus` service after deploying the code changes.
- [ ] 5.2 Verify the service is reachable after restart from localhost.
- [ ] 5.3 Verify a phone can open Nexus through the LAN IP, recover from an expired/invalid token by returning to login, and resume the previous project/channel after login.
- [ ] 5.4 Roll back the deployed code to the previous version immediately if the service becomes unreachable after restart.

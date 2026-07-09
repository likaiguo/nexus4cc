## Context

Nexus is a single-user self-hosted terminal UI protected by a password login and a JWT stored in browser `localStorage` as `nexus_token`. The server issues tokens with a 30 day expiry, protected HTTP routes return `401`, and the WebSocket closes with code `4001` when token verification fails.

The current frontend treats any stored token as enough to render `Terminal`. On a phone, a tab can sit idle for days and later reopen over the LAN IP with a stale token. The first protected HTTP calls and the WebSocket then fail after the authenticated UI is already mounted, and most call sites either ignore non-OK responses or write an error into the terminal. `SessionManagerV2` has a local `401` path that removes the token and reloads, but this is not a shared auth recovery path.

## Goals / Non-Goals

**Goals:**
- Verify a saved token before mounting the authenticated terminal view.
- Convert protected API `401` responses into a single frontend logout path.
- Convert WebSocket close code `4001` into the same logout path without retrying.
- Clear only the invalid auth token while preserving URL state and non-auth user preferences.
- Keep the mobile/IP access behavior consistent with desktop localhost behavior.

**Non-Goals:**
- Changing JWT lifetime, JWT format, bcrypt password behavior, or password reset behavior.
- Introducing multi-user accounts, refresh tokens, or server-side sessions.
- Clearing terminal project/channel state, toolbar preferences, drafts, or other non-auth local storage.
- Solving network reachability problems where the phone cannot reach the host at all.

## Decisions

### App owns token validation and logout

`App.tsx` will remain the owner of the auth token state. On startup, if `localStorage.nexus_token` exists, `App` will call an authenticated lightweight endpoint such as the existing `/api/config` before rendering `Terminal`. A valid response keeps the token; a `401` removes only `nexus_token` and shows the login page; network failures can show a connection error without deleting the token.

Alternative considered: keep rendering `Terminal` immediately and let each child component handle failures. That is the current shape and leaves many startup fetches and the WebSocket able to fail independently.

### Use a callback-based auth expiry path

`Terminal` and auth-aware child surfaces will receive an `onAuthExpired` callback from `App`. Shared response helpers can call it when a protected fetch returns `401`, and the WebSocket close handler will call it when the server closes with `4001`. This avoids hard page reloads and lets React return to the login view in the same tab.

Alternative considered: centralize by monkey-patching `window.fetch`. That would be broad, harder to test, and can accidentally affect unauthenticated endpoints such as `/api/auth/status` and `/api/auth/login`.

### Preserve navigation context on logout

The logout path will remove `nexus_token` only. It will not clear `nexus_session`, `nexus_window`, shareable project/channel URL parameters, toolbar settings, theme, draft, or workspace preferences. After a successful login, the existing `Terminal` startup and URL restore behavior can resolve the previous project/channel again.

Alternative considered: clear all local storage on auth expiry. That would be simpler but would make the recovery path destructive and worse on mobile, where the user is trying to resume the same work.

### Treat auth expiry differently from network failure

Startup token validation must distinguish an explicit `401` from fetch/network errors. A `401` means the token is invalid and can be cleared. A network failure means the backend or LAN route may be unavailable and should not force logout.

Alternative considered: clear the token on any startup failure. That can hide actual service/network issues and needlessly log the user out when the backend is temporarily unreachable.

## Risks / Trade-offs

- [Risk] Startup validation adds one authenticated request before the terminal appears. -> Mitigation: reuse a small existing endpoint and show a minimal checking/connecting state.
- [Risk] Some protected fetches may still miss the shared handler. -> Mitigation: cover high-impact startup and recurring paths first, then add regression tests/search checks for direct `401` handling.
- [Risk] A `401` from a direct file URL with `?token=` cannot call React logout code. -> Mitigation: keep the response correct server-side; the main app recovery path covers the stuck terminal scenario.
- [Risk] Network failures can still look like a blank load if the UI gives no feedback. -> Mitigation: startup validation should surface a connection failure message instead of mounting a partially broken terminal.

## Migration Plan

1. Implement frontend token validation and shared auth-expiry callback.
2. Add focused tests for invalid-token startup, protected API `401`, and WebSocket `4001`.
3. Build and run the frontend/backend test suites.
4. Deploy code changes and restart the `nexus` service as required.
5. Verify the service is reachable after restart from localhost and from a phone via the LAN IP.
6. If the service becomes unreachable after restart, roll back to the previous deployed code immediately.

## Open Questions

- None.

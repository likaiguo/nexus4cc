## 1. URL State Utilities

- [x] 1.1 Add typed helpers in `frontend/src/Terminal.tsx` or a small local module to parse `project` and `channel` from `window.location` using `URLSearchParams`
- [x] 1.2 Add a canonical URL builder that preserves unrelated query/hash state, sets `project` and `channel`, and strips sensitive keys such as `token`, `password`, and websocket credential aliases
- [x] 1.3 Add a `replaceState` synchronization helper that updates the address bar without creating a browser history entry for routine project/channel switches

## 2. Startup Restore And Fallback

- [x] 2.1 Capture the initial URL project/channel request before localStorage fallback can overwrite it
- [x] 2.2 Validate URL-provided project names against `/api/projects` or the loaded projects list before switching
- [x] 2.3 Validate URL-provided channel indexes against the selected project's window list before attaching
- [x] 2.4 Fall back to existing localStorage/default project and channel behavior when URL parameters are missing, malformed, or unavailable
- [x] 2.5 Normalize the browser URL to the resolved active project/channel after startup fallback completes

## 3. Navigation Synchronization

- [x] 3.1 Update `handleSwitchSession()` so project switches record the resolved project/channel in localStorage and synchronize the canonical URL
- [x] 3.2 Update `attachToWindow()` so successful channel attaches synchronize the canonical URL after app state accepts the new active channel
- [x] 3.3 Ensure new project creation and new channel creation paths reuse the same switch/attach flows and produce the expected URL
- [x] 3.4 Ensure tab, swipe, sidebar, modal SessionManager, and Attention Center jump paths all route through the same URL-synchronized switch/attach helpers
- [x] 3.5 Avoid duplicate or stale URL writes during async attach failures, deleted channel fallback, and project switch races

## 4. Share/Copy Experience

- [x] 4.1 Add or reuse a low-friction copy-current-location action that writes the canonical project/channel URL to the clipboard
- [x] 4.2 Add zh-CN and en i18n strings for the copy/share action, copied feedback, and accessibility labels if visible UI is added
- [x] 4.3 Verify copied URLs never include auth tokens, websocket tokens, passwords, or other credential-like query parameters

## 5. Verification

- [x] 5.1 Add focused tests for URL parse/build behavior, including Unicode project names, reserved characters, invalid channels, and credential stripping
- [x] 5.2 Manually verify opening `/?project=<name>&channel=<index>` in a second authenticated window lands on the requested project/channel
- [x] 5.3 Manually verify stale project/channel URLs fall back to a valid terminal and rewrite the URL to the resolved state
- [x] 5.4 Manually verify project switches, channel switches, Attention Center jumps, new project creation, and new channel creation keep the address bar current
- [x] 5.5 Run the existing frontend checks/builds used by the repository

## 6. Deployment

- [x] 6.1 Restart the `nexus` service after deploying code changes
- [x] 6.2 Verify the service is reachable after restart
- [x] 6.3 Roll back the deployed code immediately if the service is unreachable after restart

Note: rollback was not executed because the post-restart reachability checks passed.

## Context

The React client keeps the active project in `activeTmuxSession` / `activeTmuxSessionRef` and the active channel in `activeWindowIndex` / `activeWindowIndexRef`. Selection is persisted in localStorage (`nexus_session`, `nexus_window`) and switching flows through `handleSwitchSession()` and `attachToWindow()`. The browser URL currently stays at the app root, so copying the address after a project/channel switch does not identify the active terminal location.

The backend already exposes enough information to validate and attach targets: `/api/projects`, `/api/projects/:name/channels`, `/api/sessions?session=...`, and `/api/sessions/:id/attach?session=...`. Authentication is localStorage/header based for app APIs and the WebSocket token is only used by the internal `/ws` URL, so share links must not include credentials.

## Goals / Non-Goals

**Goals:**
- Represent the active project/channel in the browser URL with a stable, copyable format.
- Restore the requested project/channel when an authenticated user opens that URL in another browser window.
- Keep the URL synchronized from every project/channel navigation path, including project list clicks, channel list clicks, tab/swipe navigation, new project/channel creation, and Attention Center jumps.
- Fall back gracefully to remembered/default state when the URL target does not exist.
- Avoid leaking auth tokens or adding a backend persistence dependency.

**Non-Goals:**
- Public unauthenticated sharing. The copied URL only locates state for a user who can already authenticate to the same Nexus service.
- Deep linking to scrollback position, cursor state, composer drafts, file panels, modals, or task details.
- Browser history entries for every channel switch. The requirement is current-location copyability, not back-button traversal through channel history.
- Renaming tmux sessions/windows through URL state. Existing rename flows remain responsible for changing project/channel names.

## Decisions

### Use query parameters on the existing app URL

Use `project` and `channel` query parameters, for example:

```text
/?project=my-project&channel=2
```

Rationale: the app is already a root-path SPA/PWA with service worker handling, and query parameters work behind existing static serving and reverse proxy setups without adding route rewrites. `URLSearchParams` handles encoding for spaces, Unicode, and path-like project names. The implementation should preserve unrelated query parameters and hash fragments, but remove any credential-like parameter before writing shareable state.

Alternatives considered:
- Path routes such as `/projects/:project/channels/:channel`: cleaner visually, but requires SPA fallback and proxy/server routing changes.
- Hash routes such as `#/project/...`: avoids server routing, but is less canonical and can conflict with future in-app anchors.
- Storing a share id server-side: unnecessary for project/channel state and adds persistence/API surface.

### Make URL state canonical after successful navigation

`handleSwitchSession()` and `attachToWindow()` should update URL state only after accepting a new project/channel target in app state, and failed attach attempts must not advertise a target that is not active. Routine synchronization should use `history.replaceState()` so that rapid channel switches and swipe gestures keep the address bar current without filling the back stack.

Programmatic navigation paths should call the same switching functions, not write URL state independently. This keeps Attention Center jumps, SessionManager clicks, tab/swipe navigation, project creation, and channel creation consistent.

### One-time URL restore with validation and fallback

On authenticated client startup, parse the current URL once and treat it as higher priority than localStorage. If `project` is present, attempt to switch to that project. If `channel` is present, normalize it as a non-negative integer and attach it only when the target channel exists. If the project or channel is missing/unavailable, fall back to the existing localStorage/default behavior and then normalize the URL to the resolved active target.

Validation should use the existing project/window list endpoints. tmux remains the source of truth for project/channel existence, so stale shared URLs degrade to the nearest valid state instead of showing a broken terminal.

### Keep auth outside share URLs

The browser page URL must never contain the API token or WebSocket token. A copied current-location URL should be based on `window.location.origin`, the current pathname, and non-sensitive params plus `project`/`channel`. API calls continue to use the `Authorization` header and WebSocket creation continues to build its own internal `/ws?token=...` URL.

### Optional copy action uses the same URL builder

If a visible copy/share action is added, it should use the same canonical URL builder as automatic synchronization. The action should be low-friction, available on desktop and mobile, and provide i18n text for title/aria labels. Users can also copy the address bar directly because the URL is always current.

## Risks / Trade-offs

- Stale target in copied URL -> validate against current tmux projects/channels and fall back to the remembered/default active location, then rewrite URL to the resolved target.
- URL updates racing with async channel attach -> update only after the relevant state transition succeeds or is intentionally accepted, and centralize URL writing in the switch/attach flow.
- Project names contain special characters -> use `URLSearchParams` for encode/decode and avoid manual string concatenation.
- Existing query parameters get dropped -> build from the current `URL` object and only set/delete known project/channel/share-sensitive keys.
- Users expect browser Back to move through channel switches -> use `replaceState()` by default and document that the address is for current-location sharing, not navigation history.
- Unauthorized recipient opens a shared URL -> preserve normal login behavior; after login, the URL parameters remain and can be restored.

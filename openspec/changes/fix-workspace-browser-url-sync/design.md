## Context

The terminal already synchronizes active project/channel into the browser URL through `shareableLocation.ts`. The workspace browser is a lazy overlay opened from toolbar/sidebar actions; it resolves its initial directory from props, current session cwd, or workspace root, then navigates directories entirely through local React state.

## Goals / Non-Goals

**Goals:**
- Represent the open workspace browser and active directory using stable URL parameters.
- Preserve existing project/channel URL parameters while adding or removing workspace-browser state.
- Restore the workspace browser from URL state after authenticated startup.
- Avoid writing API tokens or direct file-view credentials into the main page URL.

**Non-Goals:**
- Change the `/workspace?path=...&token=...` direct file viewing endpoint.
- Add browser history entries for every directory step; directory browsing should update the current URL in place.
- Restrict or validate filesystem paths client-side beyond encoding and decoding.

## Decisions

- Use `panel=workspace` plus `workspacePath=<absolute path>` for the main app URL. This avoids overloading the `/workspace?path=...` static file endpoint and keeps directory state distinct from file-view links.
- Put URL parsing/building in `shareableLocation.ts` beside the existing project/channel helpers so sensitive query stripping stays centralized.
- Let `Terminal` own panel open/close restoration, while `WorkspaceBrowser` reports server-normalized path changes. This keeps routing state at the shell level and avoids duplicating panel state in the browser component.
- Use `history.replaceState` for browse navigation. Directory browsing is frequent, and the back button should not need to replay every directory click.

## Risks / Trade-offs

- A URL-provided path may fail to load because the directory no longer exists. The existing workspace browser error state will display that failure without breaking the terminal.
- `panel=workspace` is preserved by project/channel synchronization while the browser is open. Close handling must explicitly remove workspace panel parameters to avoid reopening stale overlays.
- The main page URL contains a local filesystem path. This is intentional for shareable browse context, but credential-like query parameters are still stripped.

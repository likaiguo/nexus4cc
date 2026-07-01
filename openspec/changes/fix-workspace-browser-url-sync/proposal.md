## Why

The workspace browser currently keeps its active directory only in component state, so the browser URL does not follow directory navigation and the current browse context is lost on refresh or copy. Users need the URL to reflect the directory they are viewing without exposing authentication credentials.

## What Changes

- Add URL state for the workspace browser panel and active directory.
- Update the current browser URL when the workspace browser opens and when directory navigation resolves to a server-normalized path.
- Restore the workspace browser to the URL-provided directory on authenticated startup.
- Clear workspace-browser URL state when the browser panel is closed while preserving project/channel URL state.
- Keep file view/download direct links separate from the main page URL and avoid writing tokens into the main page URL.

## Capabilities

### New Capabilities
- `workspace-browser-url`: URL synchronization and restoration for the workspace directory browser.

### Modified Capabilities

## Impact

- Affects the React terminal shell, workspace browser component, and URL helper utilities.
- Adds focused source-level regression coverage for workspace-browser URL behavior.
- No backend API or dependency changes.

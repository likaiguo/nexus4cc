## Why

The previous project-switch fix did not cover the default-collapsed desktop sidebar path. When the user first expands the sidebar, `SessionManagerV2` is lazy-loaded during a synchronous click update and React production throws minified error #426, leaving the page black.

## What Changes

- Make desktop sidebar expand/collapse updates safe when lazy components are first rendered.
- Wrap the inline sidebar `SessionManagerV2` render in a local `Suspense` boundary with a stable fallback.
- Use a transition for sidebar expand/collapse state updates triggered by click handlers.
- Add focused regression tests that assert the sidebar expand path is protected from synchronous lazy suspension.

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `project-channel-navigation`: Desktop sidebar expansion must not trigger a React Suspense black screen or require refresh recovery.

## Impact

- Affects `frontend/src/Terminal.tsx` desktop sidebar rendering.
- Updates focused project switch/navigation stability tests.
- Updates the `project-channel-navigation` specification.

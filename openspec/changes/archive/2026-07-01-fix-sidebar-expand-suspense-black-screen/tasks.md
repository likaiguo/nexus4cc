## 1. Sidebar Suspense Fix

- [x] 1.1 Wrap desktop sidebar expand/collapse state changes in a React transition.
- [x] 1.2 Add a local Suspense boundary around the inline sidebar `SessionManagerV2` render.
- [x] 1.3 Keep the fallback confined to the sidebar area so terminal content remains visible.

## 2. Regression Coverage

- [x] 2.1 Update focused navigation stability tests to assert transition-protected expand/collapse and inline Suspense coverage.
- [x] 2.2 Run focused tests, frontend build, syntax checks, OpenSpec validation, and diff checks.

## 3. Deployment and OpenSpec

- [x] 3.1 Restart the `nexus` service and verify it is reachable.
- [x] 3.2 Sync the updated `project-channel-navigation` requirement into main specs.
- [x] 3.3 Archive the completed OpenSpec change.

## 1. Project Switch Resolution

- [x] 1.1 Preserve `lastChannel` when desktop sidebar project switches call `handleSwitchSession`.
- [x] 1.2 Update `handleSwitchSession` to resolve against the target project's live windows before committing active project/channel state.
- [x] 1.3 Ensure the resolved project/channel is attached and synchronized to URL/localStorage/window state.

## 2. Regression Coverage

- [x] 2.1 Add focused source-level tests for sidebar `lastChannel` forwarding and safe switch resolution.
- [x] 2.2 Run relevant tests, frontend build, syntax checks, and diff checks.

## 3. Deployment and OpenSpec

- [x] 3.1 Restart the `nexus` service and verify it is reachable.
- [x] 3.2 Sync the new `project-channel-navigation` spec into main specs.
- [x] 3.3 Archive the completed OpenSpec change.

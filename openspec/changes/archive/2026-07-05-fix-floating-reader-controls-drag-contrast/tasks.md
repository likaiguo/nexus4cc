## 1. Implementation

- [x] 1.1 Replace the floating toolbar top-only state with a bounded two-axis position.
- [x] 1.2 Update pointer drag handling so the toolbar moves horizontally and vertically without triggering content scroll or accidental button clicks.
- [x] 1.3 Increase floating toolbar and button contrast while preserving existing Nexus visual tokens.

## 2. Tests And Specs

- [x] 2.1 Update source-level workspace browser tests for two-axis toolbar state, clamping, styles, and drag state.
- [x] 2.2 Sync the accepted workspace-code-editor requirement into the main spec.
- [x] 2.3 Validate the OpenSpec change and full OpenSpec tree.

## 3. Verification And Release

- [x] 3.1 Run focused frontend tests, type checks, syntax checks, and production build.
- [x] 3.2 Smoke test the app with an isolated server process.
- [x] 3.3 Restart the nexus service, verify it is reachable, archive the OpenSpec change, and commit the scoped changes.

## 4. Acceptance Follow-up

- [x] 4.1 Make floating toolbar button taps fire reliably without being stolen by drag pointer capture.
- [x] 4.2 Make top and bottom jump actions reliably move Markdown and CodeMirror scroll surfaces.
- [x] 4.3 Add tests for reliable jump behavior and rerun validation.

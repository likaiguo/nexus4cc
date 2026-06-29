## 1. Mobile Composer Layout

- [x] 1.1 Remove the always-visible mobile `直连 / 草稿` segmented control from `Terminal.tsx`.
- [x] 1.2 Render the mobile Composer panel only when Composer is active or the current channel has an unsent draft.
- [x] 1.3 Keep visible Composer editing controls for draft text, cursor position, send, and close/return-to-direct when the Composer panel is expanded.
- [x] 1.4 Ensure Direct Terminal with no draft leaves no Composer control row height reserved above the toolbar.

## 2. Toolbar And Settings Menu

- [x] 2.1 Add a compact mobile Composer entry action before the settings/more button.
- [x] 2.2 Add a compact mobile Attention entry with badge before the settings/more button when unresolved events exist.
- [x] 2.3 Move Composer low-frequency operations into the mobile settings/more menu: input mode, append Enter, history, and clear draft.
- [x] 2.4 Preserve user-configured pinned shortcuts before the settings/more button and keep existing shortcut ordering behavior.

## 3. State And Interaction

- [x] 3.1 Wire `Terminal.tsx` Composer callbacks into `Toolbar.tsx` without making Toolbar depend on terminal internals.
- [x] 3.2 Ensure opening Composer focuses the textarea and closing Composer restores Direct Terminal behavior.
- [x] 3.3 Ensure an existing unsent draft remains discoverable after channel reload or navigation.
- [x] 3.4 Ensure history selection, clear draft, append Enter, and send behavior still use existing persistence/API paths.

## 4. Copy And Responsive Polish

- [x] 4.1 Add or update zh-CN and en translations for compact Composer, close Composer, menu input mode, append Enter, history, clear draft, and Attention labels.
- [x] 4.2 Check the 390px mobile layout for no text overflow, no button overlap, and no unnecessary toolbar height growth.
- [x] 4.3 Keep desktop and embedded sidebar toolbar behavior unchanged.

## 5. Verification And Deployment

- [x] 5.1 Run focused tests for toolbar presets and any updated component tests if present.
- [x] 5.2 Run the frontend build or project build command.
- [x] 5.3 Restart the `nexus` service after code changes.
- [x] 5.4 Verify the service is accessible after restart; if unreachable, rollback the deployed code immediately.

## Context

Nexus already has two different kinds of history:

- Terminal output history comes from tmux scrollback via `/api/sessions/:id/scrollback` and is rendered by the history overlay in `Terminal.tsx`.
- Composer input history comes from SQLite `/api/input-history` and is currently exposed through mobile Composer controls.

Those concepts are both useful, but the current UI makes them uneven across devices. Mobile users can enter terminal history by a touch gesture and can use Composer/input history; desktop users mostly rely on xterm scrolling and have no clear terminal-history overlay entry or Composer/input-history recall. Clipboard handling is also overloaded: keyboard `Ctrl/Cmd+V` follows browser/xterm paste behavior, while the toolbar `^V` action attempts clipboard reads, image upload, and a paste sheet.

This change keeps tmux as the source of terminal output history and SQLite as the source of explicit Composer input history. It focuses on cross-device interaction semantics in the frontend.

## Goals / Non-Goals

**Goals:**

- Provide explicit terminal-history access on both PC and mobile.
- Make mobile history gesture behavior align with the mental model of moving toward older output, while keeping a visible fallback action.
- Distinguish terminal output history from Composer input history in labels and controls.
- Make Composer available on PC as well as mobile, including visible drafts, input-history recall, and multi-line editing.
- Standardize `Enter`, `Shift+Enter`, and `Ctrl/Cmd+Enter` behavior inside Composer.
- Make PC clipboard behavior predictable by separating terminal text paste from image/file upload and app paste sheets.
- Preserve existing persistence boundaries and APIs.

**Non-Goals:**

- Do not replace tmux scrollback or store full terminal output in SQLite.
- Do not change input history retention, privacy settings, or backend schema.
- Do not redesign the entire toolbar customization model.
- Do not implement custom text-selection handles for history output.
- Do not change tmux session/window identity or URL behavior.

## Decisions

### D1. Use one history overlay, many explicit entry points

The existing scrollback overlay remains the terminal-output-history surface. `Terminal.tsx` should expose an `openTerminalHistory` callback to toolbar/menu controls and reuse the same `fetchScrollback()` flow used by mobile gesture entry.

PC should have a visible toolbar or sidebar action for terminal history. Mobile should have a menu or compact action for terminal history in addition to gesture entry. Labels must say terminal history/output history rather than only "history" when ambiguity exists.

Alternative considered: rely on xterm's built-in scrollback on desktop. That does not solve long history readability, copy, or consistency with mobile history mode.

### D2. Keep input history inside Composer semantics

Input history remains tied to explicit Composer submissions. Opening input history should open/focus Composer and show recallable prompts/commands. This keeps privacy and data boundaries clear: terminal output history is tmux; submitted input history is SQLite.

On PC, Composer should use the same backend APIs and draft semantics already used on mobile. The UI can be placed as a bottom composer panel or desktop-friendly drawer, but it must be reachable without switching to a mobile layout.

Alternative considered: add a standalone "question history" modal detached from Composer. That duplicates recall behavior and risks making input history look like full terminal history.

### D3. Standardize Composer keyboard semantics across devices

Composer is an editing surface, so keyboard behavior should follow common chat/editor conventions:

- `Enter` sends the draft.
- `Shift+Enter` inserts a newline.
- `Ctrl+Enter` and `Cmd+Enter` send the draft.
- IME composition must not trigger sends.

The textarea's default newline insertion can be used for `Shift+Enter`; explicit handling should only prevent default for send shortcuts. Mobile users retain the send button because virtual keyboards vary.

Alternative considered: keep `Ctrl/Cmd+Enter` as the only send shortcut. That preserves current mobile implementation but does not match user expectation that Enter sends in a command composer.

### D4. Separate terminal control keys from app-level clipboard actions

Toolbar actions should not label an app-level paste/upload workflow as `^V`. A terminal `ctrl-v` shortcut, if present, should send the actual control byte sequence. App-level paste text and upload actions should use clipboard/upload iconography and labels.

PC keyboard `Ctrl/Cmd+V` should continue to paste text into the terminal/editor via browser/xterm paths. Pasting images or files into the page should not silently send data to the terminal; image/file upload should be explicit through upload controls or a clearly named paste/upload action.

Alternative considered: keep the current toolbar `^V` behavior and only adjust tooltip text. That still violates the terminal convention that `^V` is a control key and leaves image upload hidden behind a paste shortcut.

### D5. Mobile gesture becomes secondary, not the only path

The mobile history gesture should be treated as a convenience path. The implementation should correct or document the gesture direction so it matches "move toward older output" expectations, but users must also have a visible terminal-history action.

Alternative considered: remove the gesture and rely only on buttons. The gesture is already part of the mobile experience and can remain useful if no longer required for discoverability.

## Risks / Trade-offs

- [Risk] Desktop Composer may reduce terminal vertical space. -> Mitigation: keep it collapsible and do not force it open merely because an old draft exists; use a clear draft indicator.
- [Risk] Changing `Enter` semantics in Composer can surprise users used to `Ctrl/Cmd+Enter` send. -> Mitigation: keep `Ctrl/Cmd+Enter` as an alias and make `Shift+Enter` the explicit newline path.
- [Risk] Toolbar shortcut migrations can disturb user-customized layouts. -> Mitigation: preserve existing custom entries where possible and add new action definitions without destructive reset; clarify labels in presets/defaults.
- [Risk] Clipboard permissions differ across browsers. -> Mitigation: keyboard paste should rely on native browser/xterm behavior; explicit paste actions may fall back to a paste sheet when clipboard reads are unavailable.
- [Risk] Terminology can remain ambiguous in translations. -> Mitigation: add separate i18n keys for terminal history and input history and avoid generic "history" for mixed menus.

## Migration Plan

No backend data migration is required. Implementation should update frontend code, tests, and locale strings.

Deployment must follow the repository constraint: after deploying code changes, restart the `nexus` service and verify the service is accessible. If the service becomes unreachable after restart, rollback the deployed code to the previous version immediately.

## Open Questions

- Should desktop Composer persist as the user's last mode like mobile, or should desktop default to direct terminal unless explicitly opened?
- Should the terminal-history action be pinned by default on PC, mobile, or both, or only available through menus to avoid changing existing customized toolbars?

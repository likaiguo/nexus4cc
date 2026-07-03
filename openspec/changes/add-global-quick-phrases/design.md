## Context

Nexus already has several adjacent concepts:

- Toolbar shortcuts send terminal control sequences or trigger UI actions and are persisted per device profile.
- Composer input history stores explicit Composer submissions and is subject to history retention/privacy settings.
- Composer drafts are scoped to a project/channel and are editable before send.

Global quick phrases are different from all three. They are user-managed reusable text snippets, shared across projects/channels, and are sent directly to the currently active terminal without opening Composer.

The backend already initializes SQLite in `storage.js`, exposes authenticated REST APIs in `server.js`, and uses `sendToWs()` in the frontend to write data to the active terminal websocket. The new feature should fit those existing seams instead of introducing another persistence mechanism.

## Goals / Non-Goals

**Goals:**

- Store quick phrases globally in SQLite.
- Provide authenticated APIs for listing, creating, updating, deleting, reordering, and marking phrase usage.
- Show a quick phrase icon before the current workspace-browse icon on mobile.
- Provide a compact popup/list for quick sending and a management path for add/edit/delete/reorder.
- Send selected phrase text directly to the active terminal.
- Allow each phrase to control whether Enter is appended after the text.
- Keep quick phrases independent from Composer history and draft persistence.

**Non-Goals:**

- Do not scope phrases per project, channel, device, or user profile.
- Do not send phrases through Composer or require Composer to be open.
- Do not import Composer input history into quick phrases automatically.
- Do not add cloud sync or multi-user sharing.
- Do not replace toolbar custom shortcuts.

## Decisions

### D1. Use a dedicated `quick_phrases` SQLite table

Quick phrases SHALL be stored in a new table with stable ids, display title, text, `append_enter`, ordering position, usage count, timestamps, and soft limits enforced in the store layer.

Reason: `input_history` is retention-controlled history, not curated user data. Toolbar custom shortcuts are device-layout configuration and validate terminal sequences, not long reusable prompt text. A dedicated table avoids retention cleanup and layout migration side effects.

Alternative considered: reuse `input_history` with a pinned flag. That makes deletion, retention, and project/channel priority behavior harder to reason about and risks accidental cleanup of curated phrases.

### D2. Global scope only

Phrases SHALL be global across all projects and channels.

Reason: the user explicitly wants global sharing. A global list is also simpler to use from the mobile toolbar and desktop sidebar because the current terminal context only matters at send time.

Alternative considered: add optional project/channel scope now. That adds UI and API complexity without a confirmed need.

### D3. Click sends directly to terminal

Selecting a phrase SHALL call the existing terminal send path for the active websocket. If `append_enter` is true, the frontend sends phrase text followed by `\r`; otherwise it sends only the phrase text.

Reason: the requested behavior is "发送终端" rather than Composer fill. Keeping send in the frontend matches existing toolbar key behavior and avoids adding a server-side terminal write endpoint.

Alternative considered: route send through the backend API. That duplicates websocket terminal-write semantics and complicates active-session selection.

### D4. Default `append_enter` to true

New phrases SHALL default to appending Enter.

Reason: high-frequency terminal phrases are usually complete prompts or commands, and direct-send semantics should complete the action in one tap. Users can disable append Enter per phrase when they want text insertion only.

Alternative considered: default append Enter false to reduce accidental execution. That is safer but weaker for the requested quick-send workflow; the visible per-phrase control mitigates the risk.

### D5. Keep management in the quick phrase surface

The quick phrase popup SHALL include a fast send list and a management mode or inline controls for add/edit/delete/reorder. Reordering can use the same simple up/down or drag pattern used elsewhere; the persisted order remains authoritative.

Reason: users need to manage high-frequency phrases at the point of use. Sending should remain one-tap from the list, while edits are explicit and not triggered accidentally.

Alternative considered: put management only in settings. That keeps the popup simpler but makes frequent phrase maintenance harder.

### D6. Update mobile system action order

The quick phrase entry SHALL appear before browse workspace in the mobile first-row system action group. Desktop entry points should also be available near existing workspace actions for consistency.

Reason: the user requested placement before the existing browse directory icon. The current mobile-command-controls spec has a fixed order, so this change must explicitly update it.

Alternative considered: place quick phrases only in the more menu. That preserves the current first row but fails the requested fast access behavior.

## Risks / Trade-offs

- [Risk] One-tap direct send can execute unwanted commands. -> Mitigation: per-phrase `append_enter` toggle, clear labels, and edit mode separated from send clicks.
- [Risk] Long phrase text can break a compact mobile popup. -> Mitigation: clamp stored text length, preview with wrapping/truncation, and edit in textarea controls.
- [Risk] Adding another first-row mobile icon can crowd 390px layouts. -> Mitigation: keep icon-only affordance, preserve horizontal overflow behavior, and verify 390px layout.
- [Risk] SQLite schema addition could break startup if migration is not idempotent. -> Mitigation: use `CREATE TABLE IF NOT EXISTS` and preserve existing schema version pattern.
- [Risk] Sending phrases should not leak into input history. -> Mitigation: do not call `/api/input-history` and keep usage tracking content-free except phrase id/count/timestamps.

## Migration Plan

1. Add the `quick_phrases` table idempotently during normal SQLite initialization.
2. Deploy backend and frontend code together.
3. Restart the `nexus` service after code changes.
4. Verify the service is accessible after restart.
5. If the service becomes unreachable after restart, rollback the deployed code to the previous version immediately.

No existing user data needs migration because this is a new data set.

## Open Questions

- Should future iterations support project-specific phrase groups in addition to the global list?
- Should usage count eventually influence default ordering, or should manual order always remain the only visible order?

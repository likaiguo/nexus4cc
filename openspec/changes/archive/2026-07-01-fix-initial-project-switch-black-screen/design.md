## Context

`SessionManagerV2` correctly passes the backend `lastChannel` to its `onSwitchProject` callback. In desktop sidebar mode, `Terminal.tsx` currently wraps that callback as `(name) => handleSwitchSession(name)`, losing the channel argument. `handleSwitchSession` also clears `windows` and defaults to channel `0` before validating the target project's live channel list.

That combination can create an inconsistent first-entry state:

```text
sidebar project click
  -> backend returns lastChannel
  -> Terminal drops lastChannel
  -> handleSwitchSession targets channel 0
  -> windows cleared and WebSocket reconnects
  -> target project may not have channel 0
  -> terminal area remains black until refresh resolves the real channel
```

## Goals / Non-Goals

**Goals:**

- Keep project switching atomic from the user's perspective.
- Preserve backend `lastChannel` from both modal and sidebar project lists.
- Resolve the active channel from live target-project windows before committing final terminal state.
- Avoid changing tmux window indexes, reorder behavior, or backend APIs.

**Non-Goals:**

- Do not implement project/channel drag reordering in this change.
- Do not change WebSocket server fallback behavior.
- Do not redesign loading UI.

## Decisions

- Reuse the existing `resolveChannelIndex` helper for project switches. It already captures the intended fallback order: requested channel if present, then tmux active window, then first window, then `0`.
- Add an async project-switch helper in `Terminal.tsx` that fetches the target project windows, resolves a valid channel, attaches it, then applies location state. This mirrors the existing initial URL restore path and keeps state updates consistent.
- Preserve a lightweight optimistic state update only after a valid target channel is resolved. Avoid clearing windows before the target window list is known.
- Keep the existing `handleSwitchSession` name so callers do not need broad refactors, but make it schedule the safe async resolution internally.

## Risks / Trade-offs

- [Risk] Project switch may feel delayed while fetching target windows. -> Mitigation: the delay is the same backend round trip already needed for correctness; the previous terminal view can remain visible until the switch is resolved.
- [Risk] A project can be deleted between activation and window fetch. -> Mitigation: catch failures and fall back to existing `fetchWindows` behavior without committing an invalid channel.
- [Risk] Existing project reordering work also edits `SessionManagerV2`. -> Mitigation: keep this change scoped to `Terminal.tsx` and tests, preserving the current reordering worktree.

## Context

Project navigation is backed by tmux sessions and channel navigation is backed by tmux windows. The current backend lists those objects and reverses the result before returning it to `SessionManagerV2`. Several existing features identify channels by tmux window index, including shareable URLs, composer drafts, and attention state.

Reordering therefore needs to be a display preference layered over the live tmux source list. It must not rewrite tmux window indexes as a side effect of dragging rows.

## Goals / Non-Goals

**Goals:**
- Persist a custom project display order.
- Persist custom channel display order per project.
- Support press-and-drag vertical reordering in both sidebar and modal project/channel lists.
- Preserve existing project/channel activation and URL targeting behavior.
- Merge saved order with live tmux state so external tmux changes do not break the UI.

**Non-Goals:**
- Reordering tmux sessions or tmux windows at the tmux level.
- Changing channel identity from tmux window index to display position.
- Multi-user or per-browser ordering profiles.
- Cross-device synchronization beyond this app instance's existing SQLite persistence.

## Decisions

1. Store order in SQLite through `NexusStore`.

   The existing store already owns durable single-instance preferences. Adding order tables there keeps the behavior consistent with settings, toolbar layouts, drafts, and attention state.

   Alternative considered: browser localStorage. That would be simpler but would not carry across windows or devices hitting the same service, and the backend would still return unsorted data.

2. Treat ordering as display metadata.

   Backend list APIs will continue to derive the object set from tmux, then merge in saved order. Saved entries not present in the tmux list will be ignored or pruned. Live entries not present in saved order will be appended ahead of or behind ordered entries according to existing "newest first" behavior.

   Alternative considered: use `tmux move-window` or `swap-window` for channels. This would mutate window indexes and risk breaking URL, draft, and attention lookups.

3. Add focused reorder APIs.

   Use `PATCH /api/project-order` with an ordered list of project names and `PATCH /api/projects/:name/channel-order` with an ordered list of channel indexes. The existing list APIs remain the read path and return already-ordered arrays.

   Alternative considered: a generic settings endpoint. Focused APIs allow validation against current tmux state and avoid overloading unrelated settings behavior.

4. Frontend drag behavior will reorder rows optimistically and persist on drop.

   `SessionManagerV2` will maintain drag state for project/channel rows, update local list order as the pointer crosses rows, and call the appropriate API when the drag completes. If saving fails, the component will refetch the authoritative backend order.

5. Mobile long-press becomes reorder intent for list rows.

   The existing channel long-press menu conflicts with "press and drag up/down". Channel actions remain available through right-click/sidebar context handling and the modal more button. Project/channel row taps must only activate when no drag occurred.

## Risks / Trade-offs

- Long-press gesture conflict -> use drag threshold and suppress click activation after a drag; keep explicit menu affordances where available.
- Stale saved order after tmux sessions/windows are killed externally -> merge against live tmux state and prune/ignore unknown entries.
- Concurrent refresh during drag -> ignore refetch-driven row replacement while a drag is active, or reconcile by saving only live IDs on drop.
- Channel order keyed by window index can become stale if tmux reuses indexes -> validate against current channel list before saving and merge only present indexes.
- Deployment failure after service restart -> follow repository deployment constraint: restart `nexus`, verify accessibility, and rollback deployed code if unreachable.

## Migration Plan

1. Add SQLite tables for project order and channel order with idempotent schema creation.
2. Keep default behavior unchanged when no saved order exists.
3. Deploy code and restart the `nexus` service.
4. Verify the service is reachable and the list APIs still respond.
5. Roll back code immediately if the service becomes unreachable after restart.

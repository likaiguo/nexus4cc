## Context

`SessionManagerV2` is imported through `React.lazy`. Modal uses are already wrapped in `Suspense`, but the desktop sidebar inline render is not. When the sidebar defaults to collapsed, the first expand click synchronously mounts `SessionManagerV2`; if its chunk has not loaded yet, React suspends during a synchronous input event and throws production error #426.

## Goals / Non-Goals

**Goals:**

- Prevent React #426 when expanding the desktop sidebar from its default collapsed state.
- Keep terminal content visible while the sidebar manager chunk loads.
- Keep the sidebar expand/collapse interaction simple and localized.

**Non-Goals:**

- Do not remove lazy loading for all modal components.
- Do not redesign the sidebar.
- Do not change project/channel reorder behavior.

## Decisions

- Import `startTransition` and use it for desktop sidebar expand/collapse state updates. This tells React that the update can show loading UI if a lazy component suspends.
- Add a local `Suspense` boundary around the inline sidebar `SessionManagerV2`. The fallback stays within the sidebar pane, so the terminal root does not blank.
- Keep existing modal `Suspense` boundaries unchanged.
- Add source-level regression tests because the failure appears only in production minified React during lazy chunk timing.

## Risks / Trade-offs

- [Risk] Fallback briefly shows in the expanded sidebar. -> Mitigation: keep the fallback small and confined to the sidebar list area.
- [Risk] Future lazy inline sidebar components could repeat this issue. -> Mitigation: tests assert that the inline sidebar manager remains inside `Suspense` and expand/collapse uses `startTransition`.

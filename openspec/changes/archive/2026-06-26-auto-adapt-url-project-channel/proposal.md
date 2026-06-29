## Why

当前前端只通过本地状态与 localStorage 记住所选 project/channel,浏览器地址栏不会随切换变化。用户把当前页面复制到新窗口或分享给同一服务的其他已认证窗口时,对方无法直接定位到相同项目和频道,需要手动重新选择。

## What Changes

- Add a canonical project/channel URL state for the web client.
- Automatically update the browser URL when the active project or channel changes.
- On initial load, read project/channel from the URL and switch to the matching project/channel when it exists.
- Keep localStorage as fallback when the URL omits project/channel or points to an unavailable target.
- Provide a copyable/shareable current-location URL that opens the same project/channel in another authenticated window.
- Preserve authentication behavior: auth tokens remain in localStorage/header flow and are not added to share URLs.
- No breaking changes to existing project/channel APIs.

## Capabilities

### New Capabilities
- `shareable-project-channel-url`: Browser URLs can encode, restore, and continuously track the active project/channel for fast cross-window navigation.

### Modified Capabilities
- None.

## Impact

- Frontend state orchestration in `frontend/src/Terminal.tsx` for URL parsing, validation, history updates, and fallback behavior.
- Project/channel switch callbacks used by `SessionManagerV2`, `AttentionCenter`, tabs, and WebSocket attach flow.
- Optional UI/i18n changes if the current-location copy action is exposed as a button or menu item.
- No new backend persistence or API dependency is expected; existing `/api/projects`, `/api/projects/:name/channels`, and attach endpoints should remain sufficient.

# project-channel-navigation Specification

## Purpose

项目/频道导航 SHALL 在首次加载、侧边栏切换、URL 恢复和跨项目跳转时保持稳定,确保终端 WebSocket 始终指向有效的项目和 tmux channel。

## Requirements

### Requirement: Safe project switch target resolution

The web terminal SHALL resolve a valid active channel for the target project before committing project-switch state that drives the terminal WebSocket. The desktop sidebar SHALL also expand and collapse without allowing lazy-loaded navigation components to suspend the root UI during a synchronous click.

#### Scenario: Sidebar project switch preserves last channel
- **WHEN** the desktop sidebar project list switches to a project and the backend returns `lastChannel`
- **THEN** the terminal SHALL use that `lastChannel` as the preferred channel for the target project

#### Scenario: Missing preferred channel falls back safely
- **WHEN** the preferred channel does not exist in the target project's live channel list
- **THEN** the terminal SHALL fall back to the target project's active channel if present
- **AND** if no active channel exists, it SHALL fall back to the first live channel

#### Scenario: Project switch does not leave black terminal
- **WHEN** the user switches projects during first page entry or immediately collapses the sidebar after switching
- **THEN** the terminal SHALL keep a valid project/channel target for the WebSocket
- **AND** the terminal SHALL NOT remain in a blank black state that requires a browser refresh to recover

#### Scenario: URL and local state match resolved target
- **WHEN** a project switch completes
- **THEN** the browser URL, local storage, active project state, active channel state, and window list SHALL reflect the same resolved project/channel target

#### Scenario: Default-collapsed sidebar expands without Suspense black screen
- **WHEN** the desktop sidebar starts collapsed and the user clicks the expand button for the first time
- **THEN** the sidebar SHALL expand without throwing React Suspense error #426
- **AND** the terminal SHALL remain visible while any lazy sidebar navigation component loads

### Requirement: Restored projects participate in safe navigation

Project and channel navigation SHALL treat restored tmux sessions/windows as normal live targets after backend restore and reconciliation complete.

#### Scenario: Startup listing includes restored project
- **WHEN** the backend restores an active project from the tmux registry before project listing
- **THEN** `/api/projects` SHALL include that restored project in the returned project list
- **AND** existing ordering and safe fallback behavior SHALL apply to it

#### Scenario: Restored channel is valid attach target
- **WHEN** the backend restores an active channel from the tmux registry
- **THEN** `/api/projects/:name/channels` SHALL include that restored channel
- **AND** authenticated clients SHALL be able to attach to it through the existing channel attach flow

#### Scenario: Remembered location resolves after restore
- **WHEN** local storage or the browser URL points to a project/channel that was missing before startup restore
- **AND** the backend successfully restores that project/channel from the registry
- **THEN** the terminal SHALL resolve that restored project/channel as a valid target instead of falling back to an unrelated default

## MODIFIED Requirements

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

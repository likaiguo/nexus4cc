## ADDED Requirements

### Requirement: Safe project switch target resolution

The web terminal SHALL resolve a valid active channel for the target project before committing project-switch state that drives the terminal WebSocket.

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

## ADDED Requirements

### Requirement: Persistent project display order
The system SHALL allow users to persist a custom display order for projects without changing the underlying tmux sessions.

#### Scenario: Save reordered projects
- **WHEN** the user drags a project row above or below another project row and releases it
- **THEN** the system SHALL save the resulting project display order

#### Scenario: Load reordered projects
- **WHEN** the project list is loaded after a saved order exists
- **THEN** the system SHALL return projects in the saved display order

#### Scenario: Preserve new projects
- **WHEN** a project exists in tmux but is not present in the saved order
- **THEN** the system SHALL include that project in the returned list without requiring the user to reset the order

### Requirement: Persistent channel display order
The system SHALL allow users to persist a custom display order for channels within each project without changing tmux window indexes.

#### Scenario: Save reordered channels
- **WHEN** the user drags a channel row above or below another channel row and releases it
- **THEN** the system SHALL save the resulting channel display order for the current project

#### Scenario: Load reordered channels
- **WHEN** the channel list is loaded for a project after a saved order exists
- **THEN** the system SHALL return that project's channels in the saved display order

#### Scenario: Preserve channel identity
- **WHEN** a channel row is moved to a different display position
- **THEN** the channel's tmux window index SHALL remain the identifier used for switching, status, drafts, and URLs

### Requirement: Drag reorder interaction
The web client SHALL support press-and-drag vertical reordering for project rows and channel rows in navigation lists.

#### Scenario: Drag project row
- **WHEN** the user presses a project row, drags it vertically across another project row, and releases
- **THEN** the project list SHALL update to the new order and the active project SHALL remain selected

#### Scenario: Drag channel row
- **WHEN** the user presses a channel row, drags it vertically across another channel row, and releases
- **THEN** the channel list SHALL update to the new order and the active channel SHALL remain selected

#### Scenario: Tap still navigates
- **WHEN** the user taps a project or channel row without moving past the drag threshold
- **THEN** the existing project or channel activation behavior SHALL run

### Requirement: Live tmux reconciliation
The system SHALL reconcile saved order with the current tmux session/window list whenever projects or channels are listed.

#### Scenario: Saved item no longer exists
- **WHEN** the saved order contains a project or channel that no longer exists in tmux
- **THEN** the system SHALL omit that missing item from the returned list

#### Scenario: External tmux item appears
- **WHEN** tmux contains a project or channel that is absent from the saved order
- **THEN** the system SHALL include that item in the returned list using the default live-list position relative to other unsaved items

#### Scenario: Reorder save validates live items
- **WHEN** the client submits a reordered list containing stale or duplicate identifiers
- **THEN** the system SHALL save only a valid unique order for items that exist in the current tmux list

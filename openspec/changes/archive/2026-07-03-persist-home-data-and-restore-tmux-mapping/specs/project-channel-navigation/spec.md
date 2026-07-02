## ADDED Requirements

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

## ADDED Requirements

### Requirement: Archive captures terminal context before channel close
Nexus SHALL persist a durable archive for a tmux channel before closing that channel through Nexus.

#### Scenario: Closing a channel stores archive text
- **WHEN** an authenticated user closes a tmux channel through Nexus
- **THEN** Nexus SHALL capture the channel scrollback before killing the tmux window
- **AND** Nexus SHALL persist an archive containing project, channel index, window name, working directory, launcher, profile, timestamps, and captured text

#### Scenario: Archive capture failure does not block close
- **WHEN** an authenticated user closes a tmux channel and archive capture fails
- **THEN** Nexus SHALL still attempt to close the tmux window
- **AND** Nexus SHALL return or log archive failure details without claiming an archive was created

### Requirement: Manual archive snapshots
Nexus SHALL allow an authenticated user to create a durable archive snapshot for a live tmux channel without closing it.

#### Scenario: Snapshot live channel
- **WHEN** an authenticated user requests an archive snapshot for a live project/channel
- **THEN** Nexus SHALL capture current tmux scrollback and persist a snapshot archive
- **AND** the live tmux channel SHALL remain open

### Requirement: Archive list and detail APIs
Nexus SHALL expose authenticated APIs to list archive metadata and read archive details.

#### Scenario: List archives newest first
- **WHEN** an authenticated user requests session archives
- **THEN** Nexus SHALL return archive metadata ordered from newest to oldest
- **AND** the response SHALL include id, project, channel index, cwd, launcher, created time, closed time when present, and transcript size

#### Scenario: Read archive detail
- **WHEN** an authenticated user requests a specific archive by id
- **THEN** Nexus SHALL return the archive metadata and captured terminal text

#### Scenario: Missing archive returns not found
- **WHEN** an authenticated user requests an archive id that does not exist
- **THEN** Nexus SHALL return a not-found response

### Requirement: Archive restore creates a new channel
Nexus SHALL restore an archive by creating a new tmux channel in the archive working directory without deleting or mutating the archive.

#### Scenario: Restore archive as new channel
- **WHEN** an authenticated user restores an archive
- **THEN** Nexus SHALL create a new tmux window for the archive project
- **AND** Nexus SHALL record channel metadata linking the new channel to the archive id
- **AND** the archive SHALL remain available for later viewing

### Requirement: Agent-native resume is preferred when available
Nexus SHALL use known agent-native session ids to resume Codex, Claude, or cfuse archives.

#### Scenario: Restore Codex archive with native id
- **WHEN** an archive has launcher `codex` and a known agent session id
- **THEN** Nexus SHALL start the restored channel with `codex resume <session-id>` in the archived working directory

#### Scenario: Restore Claude archive with native id
- **WHEN** an archive has launcher `claude` and a known agent session id
- **THEN** Nexus SHALL start the restored channel with `claude --resume <session-id>` in the archived working directory

#### Scenario: Restore cfuse archive with native id
- **WHEN** an archive has launcher `cfuse` and a known agent session id
- **THEN** Nexus SHALL start the restored channel with `cfuse --resume <session-id>` in the archived working directory

#### Scenario: Restore unsupported archive without native id
- **WHEN** an archive has no usable agent-native session id
- **THEN** Nexus SHALL restore the channel with the archived launcher or interactive shell fallback
- **AND** Nexus SHALL keep the archive transcript readable for contextual continuation

### Requirement: Archive UI is available from the terminal command center
Nexus SHALL provide a compact UI surface for browsing, reading, and restoring session archives.

#### Scenario: Open archive panel
- **WHEN** a user opens the session archive UI
- **THEN** Nexus SHALL show archived sessions with project/channel metadata, launcher, timestamp, and restore action

#### Scenario: Read archive transcript
- **WHEN** a user selects an archive from the archive UI
- **THEN** Nexus SHALL show the captured terminal transcript as selectable text

#### Scenario: Restore archive from UI
- **WHEN** a user invokes restore for an archive from the archive UI
- **THEN** Nexus SHALL request archive restore and switch to or expose the restored tmux channel

### Requirement: Native agent histories remain available after restart or close
Nexus SHALL discover resumable local agent histories independently of live tmux process state and persist explicit links between native session ids and Nexus channels.

#### Scenario: List Codex/OMO history after service restart
- **WHEN** an authenticated user opens session history for a project after Nexus restarts
- **THEN** Nexus SHALL list resumable Codex/OMO threads whose recorded cwd matches the project cwd
- **AND** linked channel metadata SHALL identify the previously associated project and channel when known

#### Scenario: Reconciliation preserves a native session link
- **WHEN** Nexus reconciles a live tmux channel that already has an agent session id
- **THEN** Nexus SHALL retain that id and its durable channel link
- **AND** later restart recovery SHALL use that id in the launcher's native resume command

#### Scenario: Backfill a live channel link
- **WHEN** a live agent channel has no persisted native session id
- **THEN** Nexus SHALL match local history by launcher, cwd, and the live agent process start time when available
- **AND** Nexus SHALL persist the exact matched session id before relying on it for future restore

### Requirement: History supports one-click continue reply
Nexus SHALL allow a user to continue a resumable native history directly from the history list.

#### Scenario: Continue an active linked history
- **WHEN** a user chooses continue reply for a history whose linked channel is still live
- **THEN** Nexus SHALL return the existing project and channel without creating a duplicate agent process

#### Scenario: Continue a closed linked history
- **WHEN** a user chooses continue reply for a history with no live linked channel
- **THEN** Nexus SHALL create a new channel using the exact native session id
- **AND** Nexus SHALL switch to the channel and expose an immediately focusable reply composer

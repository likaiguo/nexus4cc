# tmux-mapping-restore Specification

## Purpose

Nexus SHALL persist enough project/channel mapping metadata to recreate tmux session/window structure after restart while keeping tmux as the live authority and avoiding full terminal-history storage.

## Requirements

### Requirement: Persistent tmux project and channel registry
Nexus SHALL persist a lightweight registry of tmux projects and channels sufficient to recreate their tmux structure after service or machine restart.

#### Scenario: Project creation records restore metadata
- **WHEN** an authenticated user creates a project through Nexus
- **THEN** Nexus SHALL persist the tmux session name, working directory, launcher type, profile when present, and active status

#### Scenario: Channel creation records restore metadata
- **WHEN** an authenticated user creates a channel through Nexus
- **THEN** Nexus SHALL persist the project name, tmux window index, window name, working directory, launcher type, profile when present, and active status

#### Scenario: Live tmux state is reconciled into registry
- **WHEN** Nexus lists live tmux projects or channels
- **THEN** it SHALL upsert missing live tmux sessions/windows into the registry with their current name, index, and working directory
- **AND** it SHALL preserve existing explicit launcher/profile metadata for records already known to Nexus

### Requirement: Launcher-aware tmux restore
Nexus SHALL restore missing tmux sessions and windows using the launcher metadata recorded for each project/channel rather than assuming all restored channels are Claude sessions.

#### Scenario: Claude channel restore
- **WHEN** an active registry channel has launcher `claude` and the tmux window is missing
- **THEN** Nexus SHALL recreate the window in the recorded working directory using the Claude launcher path and recorded profile when present

#### Scenario: Codex channel restore
- **WHEN** an active registry channel has launcher `codex` and the tmux window is missing
- **THEN** Nexus SHALL recreate the window in the recorded working directory using the Codex launcher path
- **AND** it SHALL fall back to an interactive shell if Codex cannot start

#### Scenario: Bash channel restore
- **WHEN** an active registry channel has launcher `bash` and the tmux window is missing
- **THEN** Nexus SHALL recreate the window in the recorded working directory using the configured interactive shell

#### Scenario: Unknown launcher restore
- **WHEN** an active registry channel has an unsupported launcher value
- **THEN** Nexus SHALL recreate the window in the recorded working directory using an interactive shell
- **AND** it SHALL preserve the unsupported launcher value in registry metadata for future compatibility

### Requirement: Startup restore is idempotent and bounded
Nexus SHALL attempt to restore active registry records on backend startup and before project listing, without duplicating live tmux sessions/windows.

#### Scenario: Missing session is recreated once
- **WHEN** an active registry project exists and no tmux session with that name exists
- **THEN** Nexus SHALL create one tmux session for that project
- **AND** repeated restore attempts SHALL NOT create duplicate sessions

#### Scenario: Missing channel is recreated once
- **WHEN** an active registry channel exists and its tmux project exists but the window is missing
- **THEN** Nexus SHALL create one tmux window for that channel
- **AND** repeated restore attempts SHALL NOT create duplicate windows for the same registry channel

#### Scenario: Closed records are skipped
- **WHEN** a project or channel was closed through Nexus and marked inactive in the registry
- **THEN** startup restore SHALL NOT recreate that project or channel

### Requirement: Restore does not persist full terminal history
Nexus SHALL NOT store full tmux scrollback, raw PTY bytes, or process memory in SQLite as part of tmux mapping restore.

#### Scenario: Restored channel starts fresh launcher process
- **WHEN** a channel is restored after the host rebooted
- **THEN** Nexus SHALL recreate the tmux window and launcher command
- **AND** it SHALL NOT claim to restore the killed process memory or full prior scrollback

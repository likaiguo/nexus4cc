## MODIFIED Requirements

### Requirement: Launcher-aware tmux restore
Nexus SHALL restore missing tmux sessions and windows using the launcher metadata recorded for each project/channel rather than assuming all restored channels are Claude sessions. When channel metadata links to an archive with agent-native resume metadata, Nexus SHALL prefer the archive resume command for supported launchers.

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

#### Scenario: cfuse channel restore
- **WHEN** an active registry channel has launcher `cfuse` and the tmux window is missing
- **THEN** Nexus SHALL recreate the window in the recorded working directory using the cfuse launcher path
- **AND** it SHALL fall back to an interactive shell if cfuse cannot start

#### Scenario: Archived agent channel restore
- **WHEN** an active registry channel has metadata linking it to an archive with launcher `codex`, `claude`, or `cfuse` and a known agent session id
- **THEN** Nexus SHALL recreate the window using the corresponding native resume command for that launcher
- **AND** it SHALL fall back to the recorded launcher behavior if native resume cannot start

#### Scenario: Unknown launcher restore
- **WHEN** an active registry channel has an unsupported launcher value
- **THEN** Nexus SHALL recreate the window in the recorded working directory using an interactive shell
- **AND** it SHALL preserve the unsupported launcher value in registry metadata for future compatibility

### Requirement: Restore does not persist process memory
Nexus tmux mapping restore SHALL NOT claim to restore killed process memory or raw PTY bytes. Durable transcript storage SHALL be provided only by the separate agent session archive capability.

#### Scenario: Restored channel starts launcher process
- **WHEN** a channel is restored after the host rebooted
- **THEN** Nexus SHALL recreate the tmux window and launcher command
- **AND** it SHALL NOT claim to restore the killed process memory
- **AND** prior transcript access SHALL come from a saved archive when one exists

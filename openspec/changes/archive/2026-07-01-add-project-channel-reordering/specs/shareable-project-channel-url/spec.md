## MODIFIED Requirements

### Requirement: Canonical project/channel URL

The web client SHALL represent the active project and channel in the browser URL using stable query parameters. The URL MUST include the current project name and tmux channel index after the authenticated terminal view has resolved an active target. Display reordering MUST NOT change the channel value written to or read from the URL.

#### Scenario: URL reflects active location after startup
- **WHEN** the terminal view finishes loading an active project and channel
- **THEN** the browser URL SHALL include `project` equal to the active project name and `channel` equal to the active channel index

#### Scenario: Project names are safely encoded
- **WHEN** the active project name contains spaces, Unicode, or URL-reserved characters
- **THEN** the browser URL SHALL encode and decode that project name without changing the selected project

#### Scenario: Reordered channel keeps canonical URL index
- **WHEN** the user changes a channel's display position through drag reordering
- **THEN** the browser URL SHALL continue to use that channel's tmux window index rather than its display position

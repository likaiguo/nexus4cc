## ADDED Requirements

### Requirement: Canonical project/channel URL

The web client SHALL represent the active project and channel in the browser URL using stable query parameters. The URL MUST include the current project name and channel index after the authenticated terminal view has resolved an active target.

#### Scenario: URL reflects active location after startup
- **WHEN** the terminal view finishes loading an active project and channel
- **THEN** the browser URL SHALL include `project` equal to the active project name and `channel` equal to the active channel index

#### Scenario: Project names are safely encoded
- **WHEN** the active project name contains spaces, Unicode, or URL-reserved characters
- **THEN** the browser URL SHALL encode and decode that project name without changing the selected project

### Requirement: Automatic URL synchronization on navigation

The web client SHALL update the current browser URL whenever the active project or channel changes through any in-app navigation path, including project list selection, channel list selection, tab or gesture channel switching, new project/channel creation, and attention-event jumps.

#### Scenario: Switching project updates URL
- **WHEN** the user switches from project A to project B
- **THEN** the browser URL SHALL update `project` to project B and `channel` to the resolved active channel for project B

#### Scenario: Switching channel updates URL
- **WHEN** the user switches from channel 1 to channel 2 within the same project
- **THEN** the browser URL SHALL update `channel` to `2` while preserving the active project value

#### Scenario: Attention jump updates URL
- **WHEN** the user opens an attention event and jumps to its project/channel
- **THEN** the browser URL SHALL update to that jumped project/channel after the jump is accepted

### Requirement: Shared URL restores location

The web client SHALL read project/channel URL parameters on authenticated startup and navigate to the requested project/channel when the target exists. URL state MUST take precedence over localStorage for the initial location.

#### Scenario: Open copied URL in another window
- **WHEN** an authenticated user opens a URL containing an existing `project` and `channel`
- **THEN** the terminal SHALL switch to that project and attach to that channel without requiring manual project/channel selection

#### Scenario: URL takes precedence over remembered state
- **WHEN** localStorage remembers project A/channel 0 and the opened URL specifies project B/channel 3
- **THEN** the terminal SHALL attempt to open project B/channel 3 first

### Requirement: Invalid URL targets fall back safely

The web client SHALL validate URL-provided project/channel targets against current tmux state. If the requested target is unavailable or malformed, the client MUST fall back to the existing remembered/default selection behavior and MUST normalize the URL to the resolved active project/channel.

#### Scenario: Missing project falls back
- **WHEN** the URL specifies a project that does not exist
- **THEN** the terminal SHALL load a valid remembered or default project and update the URL to that resolved project/channel

#### Scenario: Missing channel falls back
- **WHEN** the URL specifies an existing project with a channel index that does not exist
- **THEN** the terminal SHALL load a valid channel for that project and update the URL to that resolved project/channel

#### Scenario: Malformed channel falls back
- **WHEN** the URL specifies a non-numeric or negative `channel` value
- **THEN** the terminal SHALL ignore that channel value and resolve a valid channel through existing fallback behavior

### Requirement: Share URLs do not expose credentials

The web client SHALL keep authentication credentials out of the browser page URL and out of copied/shareable current-location URLs. API and WebSocket authentication MUST continue to use the existing authenticated request mechanisms.

#### Scenario: Copied URL omits token
- **WHEN** the user copies or shares the current project/channel URL
- **THEN** the copied URL SHALL NOT contain the API token, WebSocket token, password, or other credential parameter

#### Scenario: Shared URL preserves normal auth gate
- **WHEN** an unauthenticated browser opens a URL containing `project` and `channel`
- **THEN** the application SHALL require normal login before restoring the requested project/channel

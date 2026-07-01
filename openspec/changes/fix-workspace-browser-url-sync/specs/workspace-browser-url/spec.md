## ADDED Requirements

### Requirement: Workspace browser URL synchronization
The web client SHALL represent the open workspace browser and its active directory in the current browser URL using stable query parameters. Opening the workspace browser MUST create an in-app browser history entry, while directory navigation MUST update that entry in place. The URL MUST preserve active project/channel parameters and MUST NOT include authentication tokens.

#### Scenario: Opening workspace browser writes URL state
- **WHEN** the user opens the workspace browser from the terminal UI
- **THEN** the browser URL SHALL indicate that the workspace browser panel is open
- **AND** once the active directory resolves, the URL SHALL include that directory path

#### Scenario: Directory navigation updates URL
- **WHEN** the user navigates into a child directory, returns to a parent directory, or clicks a breadcrumb
- **THEN** the current browser URL SHALL update to the resolved active directory path without adding a new history entry

#### Scenario: Browser back closes workspace browser inside app
- **WHEN** the user opens the workspace browser and then presses the browser Back button
- **THEN** the workspace browser SHALL close within the terminal app
- **AND** the terminal app SHALL remain visible instead of navigating to a blank page

#### Scenario: Closing workspace browser clears URL state
- **WHEN** the user closes the workspace browser
- **THEN** the browser URL SHALL remove workspace-browser panel and path parameters
- **AND** the active project/channel URL parameters SHALL remain unchanged

### Requirement: Workspace browser URL restoration
The web client SHALL read workspace-browser URL parameters on authenticated startup and reopen the workspace browser at the requested directory.

#### Scenario: Refresh restores workspace browser directory
- **WHEN** an authenticated user refreshes a URL containing workspace-browser panel and path parameters
- **THEN** the workspace browser SHALL reopen
- **AND** it SHALL request the URL-provided directory as its initial path

#### Scenario: Shared workspace URL keeps normal auth gate
- **WHEN** an unauthenticated browser opens a URL containing workspace-browser panel and path parameters
- **THEN** the application SHALL require normal login before rendering the workspace browser

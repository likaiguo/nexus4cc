## ADDED Requirements

### Requirement: Saved token validation before authenticated UI
The system SHALL validate a saved browser auth token before rendering the authenticated terminal UI.

#### Scenario: Saved token is valid
- **WHEN** a browser opens Nexus with a saved `nexus_token` that the backend accepts
- **THEN** the system SHALL render the authenticated terminal UI using that token

#### Scenario: Saved token is expired or invalid
- **WHEN** a browser opens Nexus with a saved `nexus_token` and the validation request returns `401`
- **THEN** the system SHALL remove the saved `nexus_token` and render the login page without requiring a manual refresh

#### Scenario: Backend cannot be reached during validation
- **WHEN** a browser opens Nexus with a saved `nexus_token` and the validation request fails because the backend or network is unreachable
- **THEN** the system SHALL keep the saved token and show a connection failure state instead of clearing auth state

### Requirement: Protected API unauthorized recovery
The system SHALL treat `401` responses from protected application API calls as an expired login session.

#### Scenario: Protected API returns unauthorized
- **WHEN** an authenticated frontend view receives a `401` response from a protected `/api/*` request
- **THEN** the system SHALL remove only the saved `nexus_token` and render the login page without requiring a manual refresh

#### Scenario: Non-auth local state is preserved
- **WHEN** the system recovers from a protected API `401`
- **THEN** the system MUST preserve project/channel URL parameters and non-auth browser preferences such as selected project, channel, theme, toolbar configuration, and workspace state

### Requirement: WebSocket unauthorized recovery
The system SHALL treat WebSocket close code `4001` as an expired login session.

#### Scenario: Terminal WebSocket is rejected as unauthorized
- **WHEN** the terminal WebSocket closes with code `4001`
- **THEN** the system SHALL stop WebSocket reconnect attempts, remove only the saved `nexus_token`, and render the login page without requiring a manual refresh

#### Scenario: Other WebSocket disconnects remain reconnectable
- **WHEN** the terminal WebSocket closes for a non-auth reason
- **THEN** the system SHALL keep the saved auth token and continue using the existing reconnect behavior

### Requirement: Re-login resumes prior context
The system SHALL preserve enough browser context during auth-expiry recovery for re-login to resume the previous Nexus location.

#### Scenario: User logs in after auth expiry
- **WHEN** auth-expiry recovery returns the user to the login page and the user successfully logs in again
- **THEN** the system SHALL render the terminal using the current browser URL and preserved project/channel preferences

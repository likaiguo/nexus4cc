## ADDED Requirements

### Requirement: History overlay supports continuous upward exploration
The terminal history overlay SHALL remain responsive while users scroll toward older output. The overlay MUST allow the user to continue scrolling upward through fetched history content without becoming stuck, snapping back to the bottom, or returning to the live terminal unexpectedly.

#### Scenario: Scroll upward through long history
- **WHEN** the terminal history overlay contains more output than fits in the viewport
- **AND** the user scrolls upward repeatedly toward older output
- **THEN** the overlay SHALL continue moving through older history content
- **AND** the overlay SHALL NOT close or jump back to the terminal

#### Scenario: Momentum scroll remains responsive
- **WHEN** the user performs a touch or trackpad momentum scroll inside the history overlay
- **THEN** the overlay SHALL preserve native scrolling behavior
- **AND** subsequent scroll gestures SHALL continue to affect the history overlay

### Requirement: History overlay only returns at the live-output end intentionally
The terminal history overlay SHALL NOT close merely because initial layout, selection adjustment, minor scroll bounce, or programmatic positioning places the scroll container near the bottom. Returning to the live terminal from history mode SHALL require an intentional close action or an intentional scroll to the live-output end.

#### Scenario: Initial history positioning does not auto-close
- **WHEN** the history overlay opens and positions near the latest output
- **THEN** the overlay SHALL remain open long enough for the user to scroll older output
- **AND** it SHALL NOT immediately close due to its initial scroll position

#### Scenario: Selecting history text does not interrupt scrolling
- **WHEN** the user selects or adjusts selected text inside the history overlay
- **THEN** the overlay SHALL remain open
- **AND** scrolling older output SHALL remain possible after selection changes

#### Scenario: Explicit close still exits history
- **WHEN** the user clicks the history close action
- **THEN** the overlay SHALL close and the live terminal SHALL be visible

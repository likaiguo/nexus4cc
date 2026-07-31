## ADDED Requirements

### Requirement: Reorder gestures coexist with list scrolling
Project and channel navigation lists SHALL preserve normal scrolling even when drag-to-reorder is enabled. The system MUST distinguish tap/click activation, native scroll gestures, and deliberate reorder gestures so vertical list scrolling is not captured as a reorder attempt.

#### Scenario: Scroll project list with reorder enabled
- **WHEN** the project list contains more projects than fit in its scroll container
- **AND** the user drags or scrolls vertically through the list without starting a deliberate reorder action
- **THEN** the project list SHALL scroll normally
- **AND** project order SHALL NOT change

#### Scenario: Scroll channel list with reorder enabled
- **WHEN** the channel list contains more channels than fit in its scroll container
- **AND** the user drags or scrolls vertically through the list without starting a deliberate reorder action
- **THEN** the channel list SHALL scroll normally
- **AND** channel order SHALL NOT change

#### Scenario: Deliberate reorder still works
- **WHEN** the user starts a deliberate reorder gesture on a project or channel row and moves it past the reorder threshold
- **THEN** the corresponding list SHALL reorder the item
- **AND** the new order SHALL be saved through the existing persistence flow

### Requirement: Long project and channel lists expose final items
Project and channel navigation lists SHALL allow users to reach and activate the final visible item in both modal and sidebar layouts, regardless of saved ordering, item count, or active item position.

#### Scenario: Reach final project in sidebar
- **WHEN** the desktop sidebar project list contains enough projects to overflow
- **THEN** the user SHALL be able to scroll to the final project row
- **AND** tapping or clicking that final row SHALL switch to that project unless it is already active

#### Scenario: Reach final channel in sidebar
- **WHEN** the desktop sidebar channel list contains enough channels to overflow
- **THEN** the user SHALL be able to scroll to the final channel row
- **AND** tapping or clicking that final row SHALL switch to that channel unless it is already active

#### Scenario: Reach final items in modal manager
- **WHEN** the project/channel manager is open as a modal on a small viewport and either list overflows
- **THEN** the user SHALL be able to scroll each overflowing list to its final row
- **AND** the add-project and add-channel actions SHALL remain accessible without blocking list scrolling

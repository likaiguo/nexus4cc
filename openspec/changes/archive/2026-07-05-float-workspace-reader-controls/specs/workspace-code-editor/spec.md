## MODIFIED Requirements

### Requirement: Scrollable code surfaces
The workspace code preview/editor SHALL allow users to inspect wide and long text files without clipping content.

#### Scenario: Scroll long code on mobile
- **WHEN** a supported text file contains lines wider than the mobile viewport or content taller than the viewport
- **THEN** the code preview/editor surface SHALL allow horizontal and vertical scrolling
- **AND** visible UI controls SHALL remain outside the scrollable code content

#### Scenario: Preserve text selection in preview
- **WHEN** the user selects text inside a highlighted preview
- **THEN** the preview SHALL allow text selection and copying without entering edit mode
- **AND** selecting preview text SHALL NOT require an editable input surface

#### Scenario: Zoom with explicit controls
- **WHEN** the user opens a Markdown preview, code preview, or code editor
- **THEN** the overlay SHALL provide visible controls to decrease, reset, and increase the editor font size
- **AND** those controls SHALL be available in a floating toolbar on the left side of the editor overlay
- **AND** those controls SHALL keep font size within the supported range

#### Scenario: Zoom with pinch gesture
- **WHEN** the user performs a two-finger pinch gesture inside a Markdown preview, code preview, or code editor surface
- **THEN** the overlay SHALL adjust the editor font size within the supported range
- **AND** one-finger scrolling and horizontal code scrolling SHALL remain available

#### Scenario: Reposition floating controls
- **WHEN** the user drags the floating toolbar
- **THEN** the toolbar SHALL move vertically within the editor overlay
- **AND** dragging the toolbar SHALL NOT scroll or modify the file content

#### Scenario: Jump to file top and bottom
- **WHEN** the user activates the floating toolbar top or bottom navigation control
- **THEN** the active Markdown preview, code preview, or code editor scroll surface SHALL move to the beginning or end of the file content
- **AND** the editor mode, selected text behavior, and current font size SHALL remain unchanged

## MODIFIED Requirements

### Requirement: Workspace code editor support
The web client SHALL provide a syntax-highlighted in-app preview and editor for editable workspace text files using a stable community editor package.

#### Scenario: Open supported source file
- **WHEN** the user opens a supported text file from the workspace browser edit, view, double-click, or context-menu action
- **THEN** the file SHALL open in an in-app editor overlay in preview mode by default
- **AND** the preview SHALL display the file content with syntax highlighting for the detected language
- **AND** the preview SHALL use a non-editable editor DOM so mobile devices do not summon the software keyboard while reading

#### Scenario: Switch supported source file to edit mode
- **WHEN** the user switches a supported text file from preview mode to edit mode
- **THEN** the editor SHALL use an editable editor DOM
- **AND** text input and save controls SHALL be available only in edit mode

#### Scenario: Supported language set
- **WHEN** a workspace file has an extension or filename for SQL, Python, JavaScript, TypeScript, Markdown, JSON, HTML, CSS, shell script, environment/config text, or plain text
- **THEN** the workspace browser SHALL treat the file as editable text
- **AND** the preview/editor SHALL choose an appropriate language mode when one is available

#### Scenario: Unsupported file action
- **WHEN** a workspace file is not recognized as editable text
- **THEN** the workspace browser SHALL still allow direct view/download actions
- **AND** it SHALL NOT present the code editor as the primary edit action

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
- **AND** those controls SHALL keep font size within the supported range

#### Scenario: Zoom with pinch gesture
- **WHEN** the user performs a two-finger pinch gesture inside a Markdown preview, code preview, or code editor surface
- **THEN** the overlay SHALL adjust the editor font size within the supported range
- **AND** one-finger scrolling and horizontal code scrolling SHALL remain available

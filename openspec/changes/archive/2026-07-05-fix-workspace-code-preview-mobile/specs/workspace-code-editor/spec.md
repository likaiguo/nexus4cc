## MODIFIED Requirements

### Requirement: Workspace code editor support
The web client SHALL provide a syntax-highlighted in-app preview and editor for editable workspace text files using a stable community editor package.

#### Scenario: Open supported source file
- **WHEN** the user opens a supported text file from the workspace browser edit, view, double-click, or context-menu action
- **THEN** the file SHALL open in an in-app editor overlay in preview mode by default
- **AND** the preview SHALL display the file content with syntax highlighting for the detected language

#### Scenario: Supported language set
- **WHEN** a workspace file has an extension or filename for SQL, Python, JavaScript, TypeScript, Markdown, JSON, HTML, CSS, shell script, environment/config text, or plain text
- **THEN** the workspace browser SHALL treat the file as editable text
- **AND** the preview/editor SHALL choose an appropriate language mode when one is available

#### Scenario: Unsupported file action
- **WHEN** a workspace file is not recognized as editable text
- **THEN** the workspace browser SHALL still allow direct view/download actions
- **AND** it SHALL NOT present the code editor as the primary edit action

### Requirement: Markdown edit and preview
The web client SHALL support both sanitized Markdown rendering and Markdown source editing for Markdown workspace files.

#### Scenario: Open Markdown preview
- **WHEN** the user opens a Markdown file from the workspace browser edit, view, double-click, or context-menu action
- **THEN** the client SHALL open the file in sanitized Markdown preview mode by default

#### Scenario: Edit Markdown source
- **WHEN** the user switches a Markdown file from preview mode to edit mode
- **THEN** the editor SHALL use Markdown language support for the source text

#### Scenario: Preview Markdown safely
- **WHEN** the user switches a Markdown file to preview mode
- **THEN** the client SHALL render sanitized Markdown preview from the current editor content
- **AND** switching back to edit mode SHALL preserve unsaved editor content

### Requirement: Workspace browser continuity
The workspace code preview/editor SHALL operate inside the existing workspace browser experience without changing workspace navigation URL behavior.

#### Scenario: Open and close editor without changing browser directory
- **WHEN** the user opens and closes the code preview/editor from a workspace browser directory
- **THEN** the workspace browser SHALL remain on the same directory
- **AND** existing workspace browser URL state SHALL remain governed by the workspace browser behavior rather than by the editor overlay

#### Scenario: Preview code without direct download navigation
- **WHEN** the user activates the view action for a supported text/code file
- **THEN** the workspace browser SHALL open the in-app highlighted preview
- **AND** it SHALL NOT navigate the browser to the direct `/workspace` file endpoint for that file

### Requirement: Scrollable code surfaces
The workspace code preview/editor SHALL allow users to inspect wide and long text files without clipping content.

#### Scenario: Scroll long code on mobile
- **WHEN** a supported text file contains lines wider than the mobile viewport or content taller than the viewport
- **THEN** the code preview/editor surface SHALL allow horizontal and vertical scrolling
- **AND** visible UI controls SHALL remain outside the scrollable code content

#### Scenario: Preserve text selection in preview
- **WHEN** the user selects text inside a highlighted preview
- **THEN** the preview SHALL allow text selection and copying without entering edit mode

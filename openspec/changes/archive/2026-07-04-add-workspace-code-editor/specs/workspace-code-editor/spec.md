## ADDED Requirements

### Requirement: Workspace code editor support
The web client SHALL provide a syntax-highlighted code editor for editable workspace text files using a stable community editor package.

#### Scenario: Open supported source file
- **WHEN** the user opens a supported text file from the workspace browser edit action
- **THEN** the file SHALL open in an in-app editor overlay
- **AND** the editor SHALL display the file content with syntax highlighting for the detected language

#### Scenario: Supported language set
- **WHEN** a workspace file has an extension or filename for SQL, Python, JavaScript, TypeScript, Markdown, JSON, HTML, CSS, shell script, environment/config text, or plain text
- **THEN** the workspace browser SHALL treat the file as editable text
- **AND** the editor SHALL choose an appropriate language mode when one is available

#### Scenario: Unsupported file action
- **WHEN** a workspace file is not recognized as editable text
- **THEN** the workspace browser SHALL still allow direct view/download actions
- **AND** it SHALL NOT present the code editor as the primary edit action

### Requirement: Markdown edit and preview
The web client SHALL support both Markdown source editing and sanitized Markdown preview for Markdown workspace files.

#### Scenario: Edit Markdown source
- **WHEN** the user opens a Markdown file for editing
- **THEN** the editor SHALL use Markdown language support for the source text

#### Scenario: Preview Markdown safely
- **WHEN** the user switches a Markdown file to preview mode
- **THEN** the client SHALL render sanitized Markdown preview from the current editor content
- **AND** switching back to edit mode SHALL preserve unsaved editor content

### Requirement: Editable file safety
The backend SHALL explicitly validate whether a workspace file can be edited through the text editor API.

#### Scenario: Load editable text file
- **WHEN** the client requests an editable text file within the workspace filesystem
- **THEN** the backend SHALL return UTF-8 content plus file metadata including size and modification time

#### Scenario: Reject large editable file
- **WHEN** the client requests a file larger than the editable file size limit through the editor API
- **THEN** the backend SHALL reject the request with a non-2xx response
- **AND** the response SHALL explain that the file is too large to edit in the browser

#### Scenario: Reject binary editable file
- **WHEN** the client requests a file that appears to be binary through the editor API
- **THEN** the backend SHALL reject the request with a non-2xx response
- **AND** the response SHALL explain that binary files cannot be edited in the browser

### Requirement: Safe save behavior
The workspace editor SHALL prevent accidental overwrites when a file changes after it was opened.

#### Scenario: Save unchanged file version
- **WHEN** the user saves editor content and the file has not changed since it was opened
- **THEN** the backend SHALL persist the new UTF-8 content
- **AND** the client SHALL close or reset the editor according to the existing save flow

#### Scenario: Reject stale save
- **WHEN** the user saves editor content with stale file metadata
- **THEN** the backend SHALL reject the save with a conflict response
- **AND** the client SHALL keep the editor open and show a save error instead of silently overwriting the newer file

### Requirement: Workspace browser continuity
The workspace code editor SHALL operate inside the existing workspace browser experience without changing workspace navigation URL behavior.

#### Scenario: Open and close editor without changing browser directory
- **WHEN** the user opens and closes the code editor from a workspace browser directory
- **THEN** the workspace browser SHALL remain on the same directory
- **AND** existing workspace browser URL state SHALL remain governed by the workspace browser behavior rather than by the editor overlay

## ADDED Requirements

### Requirement: Composer draft opens to a visible editable surface
The system SHALL render a visible Composer draft input immediately when the user opens the command draft entry. The Composer panel MUST remain visible and editable even when the draft is empty, before any character is typed, and after repeated clicks on the draft entry.

#### Scenario: Open empty command draft
- **WHEN** the user opens the command draft entry for a project/channel with no saved draft
- **THEN** the Composer panel SHALL display a visible empty textarea
- **AND** the terminal area SHALL NOT turn into a blank black surface
- **AND** the textarea SHALL accept input without requiring a second toggle or page refresh

#### Scenario: Click draft entry while Composer is already open
- **WHEN** the Composer panel is visible and the user clicks the command draft entry again
- **THEN** the Composer panel SHALL remain visible
- **AND** focus SHALL move to the Composer textarea
- **AND** the textarea contents and cursor position SHALL be preserved

#### Scenario: Restore saved draft before typing
- **WHEN** the user opens Composer for a project/channel with a saved draft
- **THEN** the saved draft text SHALL be visible without requiring the user to type first
- **AND** the cursor SHALL be restored to the saved cursor position when available

### Requirement: Direct terminal cursor movement is visible
The Direct Terminal input path SHALL keep xterm focused and visibly update the command-line cursor when users move within an editable prompt in Codex sessions and ordinary shell sessions.

#### Scenario: Move cursor in Codex command line
- **WHEN** the user has typed text at a Codex command prompt and presses Left, Right, Home, End, or equivalent line-editing shortcuts
- **THEN** the terminal SHALL show the cursor moving within the command line
- **AND** the screen SHALL NOT require an additional printable character before the cursor position becomes visible

#### Scenario: Move cursor in ordinary shell command line
- **WHEN** the user has typed text at a normal shell prompt and presses Left, Right, Home, End, or equivalent line-editing shortcuts
- **THEN** the terminal SHALL show the cursor moving within the command line
- **AND** the visible command text SHALL stay synchronized with the shell's editing state

#### Scenario: Printable input still follows native xterm path
- **WHEN** the user types printable text or pastes text in Direct Terminal mode
- **THEN** xterm SHALL continue to process the input through the native terminal input path
- **AND** IME composition and text paste behavior SHALL remain functional

### Requirement: Input surface changes keep terminal layout stable
Switching between Direct Terminal and Composer SHALL not leave the terminal viewport in an invalid or unpainted layout. The system SHALL refit or repaint the terminal only as needed to keep the visible buffer and cursor consistent with the active input mode.

#### Scenario: Open and close Composer around terminal output
- **WHEN** the user opens Composer and then closes it without sending a command
- **THEN** the terminal buffer SHALL remain visible
- **AND** the Direct Terminal prompt SHALL remain ready for input

#### Scenario: Composer focus does not steal direct input after close
- **WHEN** the user closes Composer and then types in Direct Terminal mode
- **THEN** the input SHALL be sent to the active terminal channel
- **AND** the Composer textarea SHALL NOT retain focus

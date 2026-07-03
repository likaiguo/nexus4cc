## ADDED Requirements

### Requirement: Toolbar Ctrl V opens paste upload workflow

The built-in toolbar `ctrl-v` shortcut SHALL be an app-level paste/upload action, not a terminal literal-next control sequence. It SHALL keep the visible label `^V` and SHALL open or execute the paste/upload workflow for the active terminal context.

#### Scenario: Toolbar Ctrl V does not send literal-next
- **WHEN** a user triggers the built-in toolbar `ctrl-v` shortcut
- **THEN** the system SHALL NOT send `\x16` directly to the terminal
- **AND** the system SHALL treat the shortcut as a paste/upload action

#### Scenario: Toolbar Ctrl V opens fallback paste sheet
- **WHEN** a user triggers toolbar `ctrl-v` and no clipboard image is uploaded immediately
- **THEN** the system SHALL open the paste/upload sheet
- **AND** the sheet SHALL be scoped to the active terminal session and channel

#### Scenario: Toolbar Ctrl V uploads clipboard image
- **WHEN** a user triggers toolbar `ctrl-v` and the clipboard contains an image item that the browser exposes
- **THEN** the system SHALL upload the image through the existing terminal upload path
- **AND** the system SHALL NOT also open the paste sheet for that same action

### Requirement: Paste upload sheet supports text image and file workflows

The paste/upload sheet SHALL provide one unified surface for editable text paste, pasted image upload, and explicit file selection.

#### Scenario: Text paste can be edited before send
- **WHEN** the paste/upload sheet is open and text is pasted into its textarea
- **THEN** the text SHALL remain editable in the textarea
- **AND** the system SHALL send the textarea content to the terminal only after the user triggers Send

#### Scenario: Pasted image uploads from sheet
- **WHEN** the paste/upload sheet is open and the user pastes an image into the sheet textarea
- **THEN** the system SHALL upload that image through the existing upload path
- **AND** the system SHALL close the sheet after accepting the image

#### Scenario: File picker remains available in sheet
- **WHEN** the paste/upload sheet is open
- **THEN** the sheet SHALL expose an explicit file picker action
- **AND** selected files SHALL upload through the existing upload path

#### Scenario: Sheet copy describes paste upload
- **WHEN** the paste/upload sheet is rendered
- **THEN** the title and placeholder SHALL describe paste/upload behavior rather than text-only paste

### Requirement: Keyboard text paste remains native

Physical keyboard `Ctrl+V` or `Cmd+V` SHALL preserve native text paste behavior in terminal and Composer editing surfaces. Restoring toolbar `^V` SHALL NOT make keyboard text paste open the paste/upload sheet.

#### Scenario: Keyboard paste in terminal
- **WHEN** a PC user presses `Ctrl+V` or `Cmd+V` while the terminal has focus and the clipboard contains text
- **THEN** the browser/xterm paste path SHALL insert or send that text to the terminal
- **AND** the system SHALL NOT open the paste/upload sheet solely because of the keyboard shortcut

#### Scenario: Keyboard paste in Composer
- **WHEN** a PC user presses `Ctrl+V` or `Cmd+V` inside the Composer textarea and the clipboard contains text
- **THEN** the text SHALL be inserted into the Composer draft
- **AND** the system SHALL NOT directly send the text to the terminal

### Requirement: Terminal surface image paste uploads with input guards

Pasting an image onto the terminal surface outside text-entry controls SHALL upload that image through the existing upload path. The handler MUST ignore input, textarea, and contenteditable targets so normal text editing and Composer paste behavior are not intercepted.

#### Scenario: Image paste on terminal surface
- **WHEN** the user pastes an image while focus is on the terminal surface or page area outside text-entry controls
- **THEN** the system SHALL upload the image through the existing upload path

#### Scenario: Paste handler ignores text fields
- **WHEN** the user pastes inside an input, textarea, Composer editor, or contenteditable element
- **THEN** the global image paste handler SHALL NOT intercept the paste event

### Requirement: Default presets do not duplicate restored paste action

Factory toolbar defaults and presets SHALL keep `ctrl-v` in the fixed shortcut row and SHALL NOT add a duplicate text-only paste action by default. User custom toolbar entries MUST be preserved.

#### Scenario: Factory fixed row keeps Ctrl V
- **WHEN** a user loads the factory toolbar configuration
- **THEN** the fixed shortcut row SHALL include `ctrl-v` at its existing position
- **AND** that key SHALL use the restored paste/upload action

#### Scenario: Expanded presets avoid duplicate paste text
- **WHEN** a user applies a built-in toolbar preset
- **THEN** the preset SHALL NOT add a separate default `paste-text` entry that duplicates `ctrl-v`
- **AND** unrelated preset entries such as terminal history, copy, scroll bottom, and fit SHALL keep their intended order

#### Scenario: Custom toolbar entries survive restore
- **WHEN** a user has custom toolbar keys saved
- **THEN** restoring default `ctrl-v` semantics SHALL NOT delete or reset those custom keys

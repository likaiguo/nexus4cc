# Nexus Design System

## 1. Atmosphere & Identity

Nexus is a dense terminal command center. The signature is a dark, utilitarian workspace with compact controls, low-contrast panels, and clear blue focus accents that keep attention on terminal output rather than decoration.

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
|------|-------|-------|------|-------|
| Surface/primary | `--nexus-bg` | `#ffffff` | `#0f172a` | App background and terminal-adjacent panels |
| Surface/secondary | `--nexus-bg2` | `#f1f5f9` | `#1e293b` | Secondary controls and filled buttons |
| Surface/elevated | `--nexus-menu-bg` | `#ffffff` | `#1e293b` | Menus, Composer, modals, drawers |
| Surface/active | `--nexus-tab-active` | `#f1f5f9` | `#1e293b` | Active project/channel/window rows |
| Text/primary | `--nexus-text` | `#0f172a` | `#f1f5f9` | Primary UI text |
| Text/secondary | `--nexus-text2` | `#64748b` | `#94a3b8` | Captions, metadata, inactive icons |
| Text/muted | `--nexus-muted` | `#94a3b8` | `#475569` | Empty and disabled states |
| Border/default | `--nexus-border` | `#e2e8f0` | `#334155` | Dividers, outlines, input borders |
| Accent/primary | `--nexus-accent` | `#3b82f6` | `#3b82f6` | Focus, selected state, primary actions |
| Status/success | `--nexus-success` | `#22c55e` | `#22c55e` | Success feedback |
| Status/warning | `--nexus-warning` | `#f59e0b` | `#f59e0b` | Warnings |
| Status/error | `--nexus-error` | `#ef4444` | `#ef4444` | Errors and destructive actions |

### Rules

- Use Nexus CSS variables through Tailwind `nexus.*` color tokens where possible.
- Accent is reserved for focus, active selections, and primary command actions.
- Terminal output colors are owned by xterm themes; surrounding UI should not reinterpret terminal ANSI colors.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
|-------|------|--------|-------------|----------|-------|
| H3 | 20px | 600 | 1.35 | 0 | Dialog titles |
| Body | 16px | 400 | 1.5 | 0 | Mobile editable input and default readable text |
| Body/sm | 14px | 400-600 | 1.45 | 0 | Buttons, list rows, panel text |
| Caption | 12px | 500-600 | 1.35 | 0 | Labels, metadata, helper text |
| Micro | 11px | 400-600 | 1.3 | 0 | Dense status labels and timestamps |

### Font Stack

- Primary: system UI through Tailwind defaults.
- Mono: `Menlo`, `Monaco`, `"Cascadia Code"`, `"Fira Code"`, `monospace`.

### Rules

- Terminal, command draft, channel names, paths, and command history use the mono stack.
- Mobile editable text remains at least 16px to avoid unwanted browser zoom.

## 4. Spacing & Layout

### Base Unit

Spacing follows Tailwind's 4px unit.

| Token | Value | Usage |
|-------|-------|-------|
| `1` | 4px | Tight icon padding and dividers |
| `1.5` | 6px | Dense list vertical rhythm |
| `2` | 8px | Compact gaps and panel padding |
| `2.5` | 10px | Dense row padding |
| `3` | 12px | Standard input/control padding |
| `4` | 16px | Modal padding and list sections |
| `5` | 20px | Overlay padding |
| `6` | 24px | Dialog body padding |

### Grid

- The app is full-height with `100dvh` for viewport stability.
- Desktop uses a resizable sidebar plus terminal workspace.
- Mobile stacks terminal, Composer, session FAB, and toolbar with dynamic bottom inset.

### Rules

- Keep terminal and scroll containers `min-h-0` inside flex layouts.
- Fixed-format controls use stable width/height so state changes do not shift terminal layout.

## 5. Components

### Terminal Surface
- **Structure**: xterm container fills the remaining workspace.
- **States**: connecting overlay, scrolled-up button, active Direct Terminal input.
- **Accessibility**: preserve xterm focus and native paste/IME behavior. Screen-reader row mirroring is an explicit compatibility setting because it adds per-scroll DOM work; Terminal History remains the selectable reading surface when the compatibility mirror is off.
- **Motion**: no decorative animation; spinner only for connection state.

### Composer Panel
- **Structure**: header with title, cursor metadata, history/close/send actions, textarea, helper row, optional history list.
- **States**: empty draft, saved draft, focused, history open, disabled send.
- **Spacing**: compact 8-12px panel padding.
- **Accessibility**: textarea must be visible and focusable immediately when opened; actions are buttons with labels/titles.
- **Motion**: none required.

### Project/Channel Navigation List
- **Structure**: scrollable project and channel sections with active rows, status dots, optional menu actions, and add buttons.
- **States**: loading, empty, active, dragging, context menu open.
- **Accessibility**: row activation remains click/tap accessible; list scrolling must not be blocked by reorder affordances.
- **Motion**: reorder feedback is immediate state color only.

### Terminal History Overlay
- **Structure**: full-screen overlay with header, scrollable history body, selectable preformatted output, optional floating copy action.
- **States**: loading, content, selection, explicit close.
- **Rendering**: preserve captured terminal rows without browser rewrapping; mirror xterm font size, family, measured cell height, and letter spacing; render Unicode grapheme clusters with CJK/full-width glyphs on a two-column grid; allow horizontal overflow when a captured row is wider than the viewport.
- **Accessibility**: content remains selectable text; close action is always available.
- **Motion**: none required.

### Session History Panel
- **Structure**: full-screen compact overlay with a project-scoped history list, selected-session metadata, transcript or native prompt preview, snapshot action, primary continue-reply action, and an explicit project-channel link selector.
- **States**: loading, empty, native history, archived transcript, linked active channel, linked closed channel, target loading, linking, conflict confirmation, link success, restoring, and error.
- **Spacing**: reuse dense 8-12px panel and row spacing; list and detail remain independently scrollable.
- **Accessibility**: every history row is a button, linked status has a text alternative, the channel selector has a visible label, conflict/success feedback uses alert/status semantics, transcript remains selectable, and continue reply moves focus to the Composer after channel activation.
- **Motion**: none required.

### Workspace Navigator
- **Structure**: the workspace browser header exposes a compact code-change count; its expanded list pairs each changed file with direct preview and containing-directory actions. New-project selection starts with recent workspace paths and an equal-weight browse-other-directory entry before showing the directory tree.
- **States**: Git repository with changes, clean repository, non-Git directory, changes loading/error, recent paths, no recent paths, and directory browser open.
- **Spacing**: reuse dense 8-12px list rows and one-column mobile / two-column desktop quick-selection layouts.
- **Accessibility**: changed-file names and containing-directory controls are separate labelled buttons; recent paths remain readable in mono text and all icon-only actions have labels and titles.
- **Motion**: use only the existing 100-150ms color feedback; expanding navigation layers does not animate layout dimensions.

## 6. Motion & Interaction

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Micro | 100-150ms | ease-out | Button press and opacity changes |
| Standard | 150-200ms | ease-out | Drawer/menu entry where already present |

### Rules

- Motion serves state feedback only.
- Respect `prefers-reduced-motion`; existing status pulse disables itself under reduced motion.
- Do not animate terminal layout dimensions.

## 7. Depth & Surface

### Strategy

Mixed borders and tonal shifts. Panels use `--nexus-menu-bg`, active states use `--nexus-tab-active`, and separation relies on `--nexus-border`.

| Type | Value | Usage |
|------|-------|-------|
| Default border | `1px solid var(--nexus-border)` | Inputs, panels, modals, list separators |
| Active fill | `var(--nexus-tab-active)` | Active channel/project/window state |
| Elevated fill | `var(--nexus-menu-bg)` | Floating panels and Composer |

### Rules

- Use shadows sparingly for floating overlays only.
- Keep terminal-adjacent surfaces quiet so command output remains dominant.

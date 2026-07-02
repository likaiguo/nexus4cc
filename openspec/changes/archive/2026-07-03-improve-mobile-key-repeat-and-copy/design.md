## Context

The mobile toolbar currently funnels shortcut buttons through `Toolbar.handleKey()`. Each pointer down calls `handleKey()` once, so arrow keys and other navigation shortcuts do not behave like held physical keys. The same toolbar also exposes `copy-term`, which opens a readonly textarea in `Terminal.tsx`; on mobile browsers that textarea can trigger input-field behavior, autofill UI, and difficult selection handles.

History mode already renders tmux scrollback as selectable HTML, but it does not track text selection or provide an in-app copy action. The existing `docs/HISTORY_MODE_REDESIGN.md` recommends selection-aware copy controls, and this change implements that interaction without changing the backend scrollback API.

## Goals / Non-Goals

**Goals:**

- Make repeatable terminal shortcuts send repeated sequences while a user holds the button down.
- Limit repetition to safe navigation/editing keys where repetition matches terminal expectations.
- Make terminal copy output readable and selectable without relying on a textarea as the primary surface.
- Add a floating copy action for selected text in history mode.
- Keep existing mobile toolbar layout, history loading, and scroll-to-bottom-to-close behavior intact.

**Non-Goals:**

- Do not add a new backend copy or scrollback API.
- Do not change tmux history capture depth or ANSI parsing behavior.
- Do not redesign the toolbar layout or shortcut customization model.
- Do not attempt full custom text-selection handles; rely on browser-native selection.

## Decisions

### Repeat shortcuts with pointer lifecycle timers

Shortcut buttons will share a helper that sends once on `pointerdown`, then starts a repeat loop after a short initial delay. The loop stops on `pointerup`, `pointercancel`, `pointerleave`, lost capture, blur, or component unmount.

Repeat eligibility is explicit. Start with directional keys (`up`, `down`, `left`, `right`) and leave room for similarly safe navigation keys later. Control actions (`ctrl-c`, `enter`, `pasteClipboard`, `copyTerminal`, settings, upload) remain one-shot because repeating them can be destructive or surprising.

Alternative considered: rely on browser-generated repeat keyboard events. That does not apply to touch toolbar buttons and would not solve the mobile use case.

### Keep repeat reporting low-noise

The first send will continue to report shortcut usage. Repeated sends should not spam the usage endpoint. The repeat loop can call a lower-level execution path or pass an option to avoid reporting every tick.

Alternative considered: report every repeated send. That would distort shortcut recommendations and create unnecessary network traffic.

### Replace textarea copy sheet with selectable static text

The terminal copy sheet will render text in a selectable `pre`/block surface and expose explicit copy actions: copy selected text when a selection is inside the sheet, otherwise copy all. This avoids mobile input/autofill behavior caused by a readonly textarea while preserving long-press selection.

Alternative considered: keep the textarea and tune attributes. Textarea selection is still treated as form editing by mobile browsers, which is the source of the reported friction.

### Add selection-aware copy in history mode

History mode will listen to `selectionchange` while the overlay is open. If the current selection is contained inside the history content, a small floating copy button appears near the selection. Pressing it copies the selected text and keeps the user in history mode.

The history scroll handler should not close history while the user is actively selecting text. Closing still happens when no selection is active and the user scrolls back to the bottom.

Alternative considered: always show a global "copy all history" action. That does not solve the precise copy need and is cumbersome for long outputs.

## Risks / Trade-offs

- Repeating too quickly could overload a remote shell or skip too far through history -> use conservative delay/interval values and only repeat explicit keys.
- Pointer leave can happen during normal thumb movement -> stop repetition on leave for safety; users can press again.
- Browser selection APIs differ on mobile -> use native selection and containment checks, with a normal visible copy button as the reliable action.
- ANSI-rendered history uses nested spans -> copy text from `Selection.toString()` rather than DOM HTML to preserve plain-text output.

## Migration Plan

No data migration is required. Deploying the frontend change is sufficient.

Per deployment constraints, after deploying code changes the `nexus` service must be restarted and accessibility verified. If the service is unreachable after restart, rollback the deployed code immediately.

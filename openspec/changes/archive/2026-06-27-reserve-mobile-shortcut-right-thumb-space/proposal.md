## Why

Mobile shortcut rows currently use the full row width, which makes right-edge operation awkward on narrow phones. Reserving an intentional right-side touch area lets users operate the toolbar one-handed without losing the existing shortcut order.

## What Changes

- Reserve about 20% of the right side of each mobile shortcut row as a thumb operation area.
- Apply the same layout to fixed shortcut rows and expanded shortcut rows.
- Keep shortcut order, tap targets, and horizontal scrolling behavior stable when a row has more keys than can fit comfortably.

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `mobile-command-controls`: Mobile shortcut rows now intentionally reserve right-side thumb space instead of always filling the full available row width.

## Impact

- Affects `frontend/src/Toolbar.tsx` mobile shortcut row layout.
- Updates focused toolbar preset/layout tests.
- Updates the mobile command controls specification.

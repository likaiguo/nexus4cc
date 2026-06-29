## Context

The mobile toolbar was recently restored to a three-line layout: a right-aligned system action row plus fixed and expanded shortcut rows. The shortcut rows currently distribute keys across the full row width, which maximizes key width but makes the far-right edge harder to operate with one hand on phones.

## Goals / Non-Goals

**Goals:**

- Reserve about 20% of the right side of mobile shortcut rows as a thumb operation area.
- Apply the rule consistently to fixed shortcut rows and expanded shortcut rows.
- Preserve shortcut order, existing row chunking, minimum tap target size, and horizontal scrolling when a row has too many keys.

**Non-Goals:**

- Do not change default shortcut counts or ordering.
- Do not move system action buttons, settings, Composer, Attention, or workspace controls.
- Do not redesign desktop or embedded toolbar layouts.

## Decisions

- Use a shared shortcut row grid style for mobile rows. This keeps pinned and expanded rows aligned and prevents future changes from drifting between the two layouts.
- Set the grid to 80% row width while retaining a calculated minimum width based on key count. This creates the requested right-side space when keys fit, but still allows horizontal scroll rather than shrinking keys below their minimum touch target.
- Keep the existing `repeat(count, minmax(34px, 1fr))` columns. This preserves the current equal-width behavior inside the reachable 80% area.

## Risks / Trade-offs

- [Risk] Rows with many shortcuts can exceed 80% width and require horizontal scrolling. → Mitigation: keep the existing overflow container and a minimum per-key width so keys remain tappable.
- [Risk] Tests that expected full-width rows will fail. → Mitigation: update focused toolbar tests to assert the intentional 80% grid width and shared style usage.

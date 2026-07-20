# 10 — Responsive, Mobile, and Accessibility Contract

## Product stance

Umbra Lunaria is a responsive web app, not a separate native app. Most clan use happens beside a mobile game, so phone behavior is a core product requirement rather than a final polish pass.

## Layout rules

1. Design the 375–430px layout first, then expand to tablet and desktop.
2. Use a compact bottom navigation on mobile and sidebar navigation on larger screens.
3. Preserve the dashboard hierarchy: clan identity first, donation analytics primary, secondary panels stacked below.
4. Convert wide member tables to concise member cards below the medium breakpoint.
5. Let charts simplify labels, scroll, or switch density rather than compressing unreadable bars into a narrow viewport.
6. Use a full-screen sheet for member detail on mobile and a centered modal on desktop.
7. Keep current-war refresh and planner actions comfortably reachable one-handed.

## Touch and interaction

1. Every hover-only detail has a tap and keyboard equivalent.
2. Tap-to-add is required alongside drag-and-drop planning.
3. Buttons and row targets meet a practical 44px minimum touch target.
4. Dropdowns, score explanations, filters, and chart tooltips remain usable without a mouse.
5. Avoid horizontal page overflow; a controlled table/card transition is preferred to a shrinking desktop table.

## Accessibility

1. Use semantic headings, buttons, links, tables, and lists.
2. Make tabs, dialogs, sheets, and dropdowns keyboard operable with visible focus.
3. Trap focus in a modal/sheet and restore it to the triggering control on close.
4. Provide text equivalents for color-only states such as war preference, activity, and alert severity.
5. Maintain sufficient contrast for purple/lilac accents on the dark surface.
6. Respect reduced-motion settings for animated charts and panel transitions.

## Performance and resilience

1. Render server-side page data where possible and hydrate only interactive controls.
2. Load member progression grids and large charts only when their containing surface is opened or visible.
3. Optimize local unit icons and use responsive image sizes for API-provided badges.
4. Show cached capture time and resilient empty/error states when a data source is delayed.
5. A PWA manifest and offline shell are optional later enhancements, not a requirement for the initial responsive product.

## Verification

Test every major surface on a real iOS Safari device and Android Chrome device, not only browser emulation. Verify navigation, sheets, filters, chart controls, planner interactions, and current-war refresh with a one-handed touch flow.

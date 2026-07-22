---
date: 2026-07-22
title: Global Scrollbar Layout Shift Fix
---

# Context
We noticed a layout shift (the UI jumping horizontally) when navigating between pages with varying vertical lengths. For example, switching from a short dashboard tab to a long members list tab would cause the layout to abruptly resize because the browser scrollbar would dynamically appear and disappear.

# Solution
Instead of hiding the scrollbar track entirely (which breaks OS expectations on Windows) or forcing an empty track to always show using `overflow-y: scroll` (which looks ugly on short pages), we implemented the modern `scrollbar-gutter: stable` CSS property.

### Implementation
Updated `app/globals.css`:
```css
html {
  scrollbar-gutter: stable;
}
```

# Result
The browser now statically reserves the exact pixel width of the scrollbar gutter layout space on all pages regardless of their length. The UI stays perfectly fixed in place during tab switches and route transitions, eliminating layout jitter while preserving native scrollbar behavior.

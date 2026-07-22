---
date: 2026-07-22
title: Built Custom Accessible Toggle and Select Components
---

# Context
We needed UI components that flawlessly aligned with the custom dark space theme ("Umbra-Lunaria"). Native browser dropdowns (the `<select>` and `<option>` elements) had unavoidable OS-level styling defaults that clashed. Additionally, the native `<input type="checkbox">` lacked the modern toggle switch appearance the user wanted.

# Solution
Instead of installing a large headless library, we built fully custom lightweight UI primitives in `@/components/ui`:

### 1. The Toggle Component (`components/ui/toggle.tsx`)
We replaced the native checkbox for "Active only" with a custom `Toggle` switch.
- Uses `peer` tailwind classes to drive a custom pill-shaped switch layout based on the hidden input's checked state.
- Flips from `bg-umbra-ink/60` (off) to `bg-umbra-purple/80` (on).
- Includes fluid translation and color transitions.

### 2. The Custom Select Component (`components/ui/select.tsx`)
We replaced the global `select-input` styling with a full React dropdown component to take full control of the popup menu.
- Replaces `<select>` with a `<button>` that triggers a custom absolutely-positioned `<div z-50>`.
- The popup list uses custom padding, `bg-[#0f0c20]` for perfect contrast, and a smooth `shadow-2xl backdrop-blur-md`.
- Options feature a beautiful `bg-umbra-purple/20` highlight with bold text for the currently selected item, and a subtle white transparent hover for others.
- Implements `useRef` and `mousedown` event listeners to cleanly handle "click outside to close".

Both components have been integrated flawlessly into the Members page filter bar (`components/members/members-roster.tsx`).

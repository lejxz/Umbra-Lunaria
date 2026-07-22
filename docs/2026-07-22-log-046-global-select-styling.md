---
date: 2026-07-22
title: Global Select Styling Fix
---

# Context
The native HTML `<select>` dropdowns (used in the Members page filters) looked disjointed from the rest of the premium, dark-themed UI. The default browser chevron often clipped into borders, and the dropdown menu background defaulted to the OS's stark grey/white.

# Solution
Instead of pulling in a heavy headless UI component library (like Radix or Headless UI) for a simple select menu, we implemented a custom, global CSS solution using Tailwind's `@layer components`. 

By adding the `.select-input` utility class to `globals.css`:
1. We used `appearance-none` to strip the native OS dropdown chevron.
2. We replaced it with a custom inline SVG chevron that cleanly aligns with `umbra-lilac`, spaced appropriately using padding (`pr-8`) to prevent border clipping.
3. We styled the `<option>` child elements to default to `bg-[#090811]` so the pop-out menu respects the dark theme.

### Implementation Usage
Moving forward, any new dropdown element can immediately inherit this styling without custom CSS:

```tsx
<select className="select-input">
  <option value="1">Option 1</option>
</select>
```

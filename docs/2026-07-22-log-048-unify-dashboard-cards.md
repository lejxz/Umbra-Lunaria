---
date: 2026-07-22
title: Unify Dashboard Cards Layout and Styling
---

# Context
The three bottom dashboard cards ("Member Activity Score", "Attention Queue", and "Clan Log") had drifted slightly in their styling, leading to a disjointed visual layout when viewed side-by-side. The issues included inconsistent header capitalization, missing icon anchors, mismatched sub-badges, and differing scrollbar track spacing.

# Implementation
We systematically unified the three cards to use the exact same layout logic:

1. **Typography and Capitalization**: Standardized all headers to Title Case ("Attention Queue", "Clan Log", "Member Activity Score").
2. **Left-Side Anchors**: Introduced a uniform 24x24 icon block powered by `lucide-react` for the non-leaderboard lists to match the league badge avatar slot in the leaderboard. 
   - `Attention Queue`: Uses `Swords` (attacks remaining), `Clock` (inactive), and `ShieldOff` (opted out).
   - `Clan Log`: Uses `UserPlus` (join), `UserMinus` (leave), and `UserCheck` (rejoin).
3. **Right-Side Badges**: Converted the raw text `TH15` indicators in the Attention Queue to use the official `<Badge tone="brand">TH15</Badge>` component to match the visual weight of the `<Badge tone="danger">leave</Badge>` indicators in the Clan log.
4. **Sticky Sub-headers**: Elevated the plain text section headers in the Attention Queue (e.g. "Inactive") into proper `sticky top-0` backdrop-blurred dividers, giving them a premium iOS-like table view feel as users scroll.
5. **Scrollbar Padding**: Fixed the `pr-2` constraint across all three components so that the custom transparent scrollbar track naturally sits apart from the interactive hover highlighting.

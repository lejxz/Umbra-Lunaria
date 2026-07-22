# Fix Activity Heatmap & Favicon (2026-07-22)

## Favicon Fix
- Replaced the default Next.js browser globe icon by explicitly adding `app/icon.png` (using the high-quality Umbra Lunaria logo). Next.js automatically generates the correct meta tags and multi-resolution icons for all devices.

## Member Activity Heatmap Redesign & Bug Fixes
The Member Detail Sheet had several overlapping issues in the Activity Section:

### 1. UI Overlap & Layout Balance
- **Issue**: The previous 7x7 GitHub-style grid was small, hard to hover, and left the left column feeling completely empty compared to the heavily packed War Record column.
- **Fix**: Redesigned the heatmap into a **full-width barcode style chart**. The activity bars now use `flex-1` both horizontally and vertically, forcing the Activity section to span the full width and gracefully scale to exactly match the height of the War Record section.
- **Result**: Perfect bilateral symmetry in the pop-up sheet. 

### 2. The "51 Active Days" Data Bug
- **Issue**: The query logic in `lib/db/member-queries.ts` was erroneously mapping raw database `snapshots` directly into UI `buckets` on a 1:1 basis. Since the background tracker runs multiple times per day, a 30-day time window would yield 50+ snapshots, resulting in the UI rendering 50+ tiny bars and claiming "52 active days" (which is mathematically impossible in a 30-day month).
- **Fix**: Imported `generateBuckets` from the time utility library to cleanly chop the rolling 30-day window into exactly 30 daily (24-hour) buckets.
- **Fix**: The logic now correctly checks: *Did any snapshot within this specific 24-hour bucket contain activity?* If yes, the day is marked active.
- **Result**: The graph now renders exactly 30 thick, easily hoverable bars, and correctly calculates active days out of a true 30-day denominator.

### 3. Cleanup
- Removed the extraneous meta-text warning ("Estimated from observed changes — not online presence") at the bottom of the column to improve cleanliness and visual balance.

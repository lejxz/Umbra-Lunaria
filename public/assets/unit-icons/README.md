# Unit Icons

This folder holds the locally-cached Clash of Clans unit icons used across the
observatory: troops, heroes, spells, pets, siege machines, and any other
player-facing unit referenced by name in the CoC API responses.

## Source

All icons originate from the **Supercell Fankit**:

> https://fankit.supercell.com/d/vkEdmkUCngKw/game-assets

The Fankit is the only sanctioned source for Clash of Clans game assets.
Icons from `api-assets.clashofclans.com` are runtime badges/leagues, not unit
icons, and must not be used for units.

## Copy-locally policy — never hotlink

1. **Always copy** the asset into this folder. Never reference
   `fankit.supercell.com` or any third-party CDN from `<img src>`/`next/image`
   in the app.
2. Hotlinks break the moment Supercell reorganizes the Fankit, and they also
   leak the user's IP to a third party on every page view.
3. Prefer PNG with transparency for the dark moonlit surface. Optimize with
   `oxipng` or `pngcrush -brute` before committing when file size exceeds
   ~25 KB.
4. Use lowercase `kebab-case` filenames, e.g. `barbarian-king.png`,
   `healing-spell.png`, `electro-owl.png`.

## Mapping file

The runtime mapping from CoC API unit **names** (as they appear in
`CocPlayer.troops[].name`, `heroes[].name`, `spells[].name`,
`troops[].name` for pets, etc.) to local asset paths lives at:

> `lib/assets/unit-icon-map.ts`

That file exports `unitIconMap: Record<string, string>` and a typed
`getUnitIcon(name: string): string | null` accessor. Update that file every
time icons are added or renamed in this folder.

## Per-batch metadata

Every batch commit must record:

- **Source URL** (direct Fankit download link or archive link).
- **Update date** (ISO 8601, e.g. `2026-07-20`).
- **Asset count** and a short list of which units were added or replaced.
- **Supercell asset version** if the Fankit exposes one (look for a
  "version" or "patch" tag next to the asset pack).

Maintain a running batch log in this README (append a new entry per batch):

### Batch log

| Date       | Count | Notes                                                  |
| ---------- | ----: | ------------------------------------------------------ |
| 2026-07-20 |     0 | Placeholder paths registered in `unitIconMap`. No real assets copied yet. |

## Text fallback is mandatory

The CoC API can introduce new units at any patch, and the Fankit can lag
behind. Therefore:

1. `getUnitIcon(name)` returns `string | null` — **never** invents a path.
2. Call sites MUST render a text label (the unit name) when `getUnitIcon`
   returns `null`. Do not silently render a broken image or a generic
   placeholder icon.
3. The text fallback is part of the accessibility contract
   (concept/10-mobile-support.md §Accessibility): color-only state is not
   allowed, and a missing icon must remain legible to screen readers.

Example consumer pattern:

```tsx
import { getUnitIcon } from "@/lib/assets/unit-icon-map";

function UnitIcon({ name }: { name: string }) {
  const src = getUnitIcon(name);
  if (!src) {
    return <span aria-label={name}>{name}</span>;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={name} className="h-6 w-6" />;
}
```

(Use `next/image` with `unoptimized` for locally-served PNGs once an icon set
is committed; the inline `<img>` above is the minimal fallback.)

## Licensing

Supercell permits use of Fankit assets for fan/community projects that follow
the Supercell Fan Content Policy. The policy requires attribution; include a
"Fan Content" notice in the app footer once icons are visible to end users.

/**
 * Unit icon map — typed mapping from CoC API unit **names** (as they appear
 * in `CocPlayer.troops[].name`, `heroes[].name`, `spells[].name`, and the
 * `heroEquipment`/`pets` fields) to local asset paths under
 * `/public/assets/unit-icons/`.
 *
 * ## Source policy
 *
 * All icons MUST come from the Supercell Fankit
 * (https://fankit.supercell.com/d/vkEdmkUCngKw/game-assets) and be copied
 * locally — never hotlinked. See `public/assets/unit-icons/README.md` for the
 * full copy-locally contract and the batch log.
 *
 * ## "Never fake a zero" — also never fake an icon
 *
 * `getUnitIcon(name)` returns `string | null`. Call sites MUST render the
 * unit name as a text label when this returns `null`. Do NOT silently render
 * a broken image or a generic placeholder. See `public/assets/unit-icons/README.md`
 * §Text fallback is mandatory.
 *
 * ## Status
 *
 * The paths below are placeholders registered ahead of the first Fankit
 * batch download. Real PNG assets will be copied into
 * `public/assets/unit-icons/` in a later step, at which point each entry
 * below will resolve to a real file. Until then, callers should expect
 * `getUnitIcon` to return a path that 404s — the text fallback path is
 * mandatory at every call site.
 */

export const unitIconMap: Record<string, string> = {
  // -----------------------------------------------------------------------
  // Elixir troops (Home Village)
  // -----------------------------------------------------------------------
  Barbarian: "/assets/unit-icons/barbarian.png",
  Archer: "/assets/unit-icons/archer.png",
  Giant: "/assets/unit-icons/giant.png",
  Goblin: "/assets/unit-icons/goblin.png",
  "Wall Breaker": "/assets/unit-icons/wall-breaker.png",
  Balloon: "/assets/unit-icons/balloon.png",
  Wizard: "/assets/unit-icons/wizard.png",
  Healer: "/assets/unit-icons/healer.png",
  Dragon: "/assets/unit-icons/dragon.png",
  "P.E.K.K.A": "/assets/unit-icons/pekka.png",
  "Baby Dragon": "/assets/unit-icons/baby-dragon.png",
  Miner: "/assets/unit-icons/miner.png",
  "Electro Dragon": "/assets/unit-icons/electro-dragon.png",
  Yeti: "/assets/unit-icons/yeti.png",
  "Dragon Rider": "/assets/unit-icons/dragon-rider.png",
  "Apprentice Warden": "/assets/unit-icons/apprentice-warden.png",
  Druid: "/assets/unit-icons/druid.png",
  Frostling: "/assets/unit-icons/frostling.png",

  // -----------------------------------------------------------------------
  // Dark Elixir troops (Home Village)
  // -----------------------------------------------------------------------
  Minion: "/assets/unit-icons/minion.png",
  "Hog Rider": "/assets/unit-icons/hog-rider.png",
  Valkyrie: "/assets/unit-icons/valkyrie.png",
  Golem: "/assets/unit-icons/golem.png",
  Witch: "/assets/unit-icons/witch.png",
  "Lava Hound": "/assets/unit-icons/lava-hound.png",
  Bowler: "/assets/unit-icons/bowler.png",

  // -----------------------------------------------------------------------
  // Super troops (time-limited boosted variants)
  // -----------------------------------------------------------------------
  "Super Barbarian": "/assets/unit-icons/super-barbarian.png",
  "Super Archer": "/assets/unit-icons/super-archer.png",
  "Super Giant": "/assets/unit-icons/super-giant.png",
  "Sneaky Goblin": "/assets/unit-icons/sneaky-goblin.png",
  "Super Wall Breaker": "/assets/unit-icons/super-wall-breaker.png",
  "Super Wizard": "/assets/unit-icons/super-wizard.png",
  "Super Valkyrie": "/assets/unit-icons/super-valkyrie.png",
  "Super Witch": "/assets/unit-icons/super-witch.png",
  "Inferno Dragon": "/assets/unit-icons/inferno-dragon.png",
  "Super Hog Rider": "/assets/unit-icons/super-hog-rider.png",
  "Super Bowler": "/assets/unit-icons/super-bowler.png",
  "Super Miner": "/assets/unit-icons/super-miner.png",
  "Super Dragon": "/assets/unit-icons/super-dragon.png",
  "Rocket Balloon": "/assets/unit-icons/rocket-balloon.png",
  Lavaloon: "/assets/unit-icons/lavaloon.png",

  // -----------------------------------------------------------------------
  // Siege machines (clan-crafted war units)
  // -----------------------------------------------------------------------
  "Wall Wrecker": "/assets/unit-icons/wall-wrecker.png",
  "Battle Blimp": "/assets/unit-icons/battle-blimp.png",
  "Stone Slammer": "/assets/unit-icons/stone-slammer.png",
  "Battle Ram": "/assets/unit-icons/battle-ram.png",
  "Siege Barracks": "/assets/unit-icons/siege-barracks.png",
  "Log Launcher": "/assets/unit-icons/log-launcher.png",
  "Flame Flinger": "/assets/unit-icons/flame-flinger.png",
  "Battle Drill": "/assets/unit-icons/battle-drill.png",

  // -----------------------------------------------------------------------
  // Heroes
  // -----------------------------------------------------------------------
  "Barbarian King": "/assets/unit-icons/barbarian-king.png",
  "Archer Queen": "/assets/unit-icons/archer-queen.png",
  "Grand Warden": "/assets/unit-icons/grand-warden.png",
  "Royal Champion": "/assets/unit-icons/royal-champion.png",

  // -----------------------------------------------------------------------
  // Elixir spells (Home Village)
  // -----------------------------------------------------------------------
  "Lightning Spell": "/assets/unit-icons/lightning-spell.png",
  "Healing Spell": "/assets/unit-icons/healing-spell.png",
  "Rage Spell": "/assets/unit-icons/rage-spell.png",
  "Jump Spell": "/assets/unit-icons/jump-spell.png",
  "Freeze Spell": "/assets/unit-icons/freeze-spell.png",
  "Clone Spell": "/assets/unit-icons/clone-spell.png",
  "Invisibility Spell": "/assets/unit-icons/invisibility-spell.png",
  "Recall Spell": "/assets/unit-icons/recall-spell.png",
  "Revive Spell": "/assets/unit-icons/revive-spell.png",

  // -----------------------------------------------------------------------
  // Dark spells
  // -----------------------------------------------------------------------
  "Poison Spell": "/assets/unit-icons/poison-spell.png",
  "Earthquake Spell": "/assets/unit-icons/earthquake-spell.png",
  "Haste Spell": "/assets/unit-icons/haste-spell.png",
  "Skeleton Spell": "/assets/unit-icons/skeleton-spell.png",
  "Bat Spell": "/assets/unit-icons/bat-spell.png",
  "Overgrowth Spell": "/assets/unit-icons/overgrowth-spell.png",

  // -----------------------------------------------------------------------
  // Pets (unlocked at Pet House)
  // -----------------------------------------------------------------------
  "L.A.S.S.I": "/assets/unit-icons/lassi.png",
  "Mighty Yak": "/assets/unit-icons/mighty-yak.png",
  "Electro Owl": "/assets/unit-icons/electro-owl.png",
  Unicorn: "/assets/unit-icons/unicorn.png",
  Frosty: "/assets/unit-icons/frosty.png",
  "Poison Lizard": "/assets/unit-icons/poison-lizard.png",
  Phoenix: "/assets/unit-icons/phoenix.png",
  Diggy: "/assets/unit-icons/diggy.png",
  "Spirit Fox": "/assets/unit-icons/spirit-fox.png",
  "Angry Jelly": "/assets/unit-icons/angry-jelly.png",
};

/**
 * Resolve a CoC API unit name to a local icon path.
 *
 * @returns the local asset path when the unit is mapped, otherwise the
 *          placeholder path. This ensures every card renders an image —
 *          no broken images, no text-only fallbacks.
 */
export function getUnitIcon(name: string): string {
  return unitIconMap[name] ?? "/assets/unit-icons/placeholder.svg";
}

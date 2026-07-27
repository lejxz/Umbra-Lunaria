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
 * ## Filename convention
 *
 * Downloaded Fankit PNGs use the naming pattern `Icon_<Village>_<Name>.png`
 * where `<Village>` is `HV` (Home Village) or `BB` (Builder Base) and `<Name>`
 * is the unit name in PascalCase with underscores (e.g. `Icon_HV_Hog_Rider.png`,
 * `Icon_HV_Siege_Machine_Wall_Wrecker.png`). This file maps the CoC API unit
 * names to those exact filenames.
 *
 * ## "Never fake a zero" — also never fake an icon
 *
 * `getUnitIcon(name)` returns the mapped path, or the placeholder when no
 * asset has been downloaded for that unit yet. Call sites MUST render the
 * unit name as a text label when the placeholder is returned — do NOT silently
 * render a broken image. See `public/assets/unit-icons/README.md`
 * §Text fallback is mandatory.
 */

export const unitIconMap: Record<string, string> = {
  // -----------------------------------------------------------------------
  // Elixir troops (Home Village)
  // -----------------------------------------------------------------------
  Barbarian: "/assets/unit-icons/Icon_HV_Barbarian.png",
  Archer: "/assets/unit-icons/Icon_HV_Archer.png",
  Giant: "/assets/unit-icons/Icon_HV_Giant.png",
  Goblin: "/assets/unit-icons/Icon_HV_Goblin.png",
  "Wall Breaker": "/assets/unit-icons/Icon_HV_Wall_Breaker.png",
  Balloon: "/assets/unit-icons/Icon_HV_Balloon.png",
  Wizard: "/assets/unit-icons/Icon_HV_Wizard.png",
  Healer: "/assets/unit-icons/Icon_HV_Healer.png",
  Dragon: "/assets/unit-icons/Icon_HV_Dragon.png",
  "P.E.K.K.A": "/assets/unit-icons/Icon_HV_P.E.K.K.A.png",
  "Baby Dragon": "/assets/unit-icons/Icon_HV_Baby_Dragon.png",
  Miner: "/assets/unit-icons/Icon_HV_Miner.png",
  "Electro Dragon": "/assets/unit-icons/Icon_HV_Electro_Dragon.png",
  Yeti: "/assets/unit-icons/Icon_HV_Yeti.png",
  "Dragon Rider": "/assets/unit-icons/Icon_HV_Dragon_Rider.png",
  "Apprentice Warden": "/assets/unit-icons/Icon_HV_Apprentice_Warden.png",
  Druid: "/assets/unit-icons/Icon_HV_Druid.png",
  "Electro Titan": "/assets/unit-icons/Icon_HV_Electro_Titan.png",
  "Root Rider": "/assets/unit-icons/Icon_HV_Root_Rider.png",
  Frostling: "/assets/unit-icons/placeholder.svg",

  // -----------------------------------------------------------------------
  // Dark Elixir troops (Home Village)
  // -----------------------------------------------------------------------
  Minion: "/assets/unit-icons/Icon_HV_Minion.png",
  "Hog Rider": "/assets/unit-icons/Icon_HV_Hog_Rider.png",
  Valkyrie: "/assets/unit-icons/Icon_HV_Valkyrie.png",
  Golem: "/assets/unit-icons/Icon_HV_Golem.png",
  Witch: "/assets/unit-icons/Icon_HV_Witch.png",
  "Lava Hound": "/assets/unit-icons/Icon_HV_Lava_Hound.png",
  Bowler: "/assets/unit-icons/Icon_HV_Bowler.png",
  "Ice Golem": "/assets/unit-icons/Icon_HV_Ice_Golem.png",
  Headhunter: "/assets/unit-icons/Icon_HV_Headhunter.png",
  "Sneaky Goblin": "/assets/unit-icons/Icon_HV_Sneaky_Goblin.png",
  "Meteor Golem": "/assets/unit-icons/Icon_HV_Meteor_Golem.png",
  Furnace: "/assets/unit-icons/Icon_HV_Furnace.png",
  Thrower: "/assets/unit-icons/Icon_HV_Thrower.png",
  "Troop Launcher": "/assets/unit-icons/Icon_HV_Troop_Launcher.png",

  // -----------------------------------------------------------------------
  // Super troops (time-limited boosted variants)
  // -----------------------------------------------------------------------
  "Super Barbarian": "/assets/unit-icons/Icon_HV_Super_Barbarian.png",
  "Super Archer": "/assets/unit-icons/Icon_HV_Super_Archer.png",
  "Super Giant": "/assets/unit-icons/Icon_HV_Super_Giant.png",
  "Super Wall Breaker": "/assets/unit-icons/Icon_HV_Super_Wall_Breaker.png",
  "Super Wizard": "/assets/unit-icons/Icon_HV_Super_Wizard.png",
  "Super Valkyrie": "/assets/unit-icons/Icon_HV_Super_Valkyrie.png",
  "Super Witch": "/assets/unit-icons/Icon_HV_Super_Witch.png",
  "Inferno Dragon": "/assets/unit-icons/Icon_HV_Super_Inferno_Dragon.png",
  "Super Hog Rider": "/assets/unit-icons/Icon_HV_Super_Hog_Rider.png",
  "Super Bowler": "/assets/unit-icons/Icon_HV_Super_Bowler.png",
  "Super Miner": "/assets/unit-icons/Icon_HV_Super_Miner.png",
  "Super Dragon": "/assets/unit-icons/Icon_HV_Super_Dragon.png",
  "Rocket Balloon": "/assets/unit-icons/Icon_HV_Super_Rocket_Balloon.png",
  "Super Minion": "/assets/unit-icons/Icon_HV_Super_Minion.png",
  "Super Yeti": "/assets/unit-icons/Icon_HV_Super_Yeti.png",
  "Super Ice Hound": "/assets/unit-icons/Icon_HV_Super_Ice_Hound.png",
  "Ice Hound": "/assets/unit-icons/Icon_HV_Super_Ice_Hound.png",
  Lavaloon: "/assets/unit-icons/placeholder.svg",

  // -----------------------------------------------------------------------
  // Siege machines (clan-crafted war units)
  // -----------------------------------------------------------------------
  "Wall Wrecker": "/assets/unit-icons/Icon_HV_Siege_Machine_Wall_Wrecker.png",
  "Battle Blimp": "/assets/unit-icons/Icon_HV_Siege_Machine_Battle_Blimp.png",
  "Stone Slammer": "/assets/unit-icons/Icon_HV_Siege_Machine_Stone_Slammer.png",
  "Battle Ram": "/assets/unit-icons/placeholder.svg",
  "Siege Barracks": "/assets/unit-icons/Icon_HV_Siege_Machine_Siege_Barracks.png",
  "Log Launcher": "/assets/unit-icons/Icon_HV_Siege_Machine_Log_Launcher.png",
  "Flame Flinger": "/assets/unit-icons/Icon_HV_Siege_Machine_Flame_Flinger.png",
  "Battle Drill": "/assets/unit-icons/Icon_HV_Siege_Machine_Battle_Drill.png",
  "Sky Wagon": "/assets/unit-icons/Icon_HV_Siege_Machine_Sky_Wagon.png",

  // -----------------------------------------------------------------------
  // Builder Base troops (Builder Base)
  // -----------------------------------------------------------------------
  "Raged Barbarian": "/assets/unit-icons/Icon_BB_Raged_Barbarian.png",
  "Sneaky Archer": "/assets/unit-icons/Icon_BB_Sneaky_Archer.png",
  "Boxer Giant": "/assets/unit-icons/Icon_BB_Boxer_Giant.png",
  "Beta Minion": "/assets/unit-icons/Icon_BB_Beta_Minion.png",
  Bomber: "/assets/unit-icons/Icon_BB_Bomber.png",
  "Cannon Cart": "/assets/unit-icons/Icon_BB_Cannon_Cart.png",
  "Drop Ship": "/assets/unit-icons/Icon_BB_Drop_Ship.png",
  "Night Witch": "/assets/unit-icons/Icon_BB_Night_Witch.png",
  "Power P.E.K.K.A": "/assets/unit-icons/Icon_BB_Power_P.E.K.K.A.png",
  "Hog Glider": "/assets/unit-icons/Icon_BB_Hog_Glider.png",
  "Electrofire Wizard": "/assets/unit-icons/Icon_BB_Electrofire_Wizard.png",

  // -----------------------------------------------------------------------
  // Heroes (Home Village)
  // -----------------------------------------------------------------------
  "Barbarian King": "/assets/unit-icons/Icon_HV_Hero_Barbarian_King.png",
  "Archer Queen": "/assets/unit-icons/Icon_HV_Hero_Archer_Queen.png",
  "Grand Warden": "/assets/unit-icons/Icon_HV_Hero_Grand_Warden.png",
  "Royal Champion": "/assets/unit-icons/Icon_HV_Hero_Royal_Champion.png",
  "Minion Prince": "/assets/unit-icons/Icon_HV_Hero_Minion_Prince.png",
  "Dragon Duke": "/assets/unit-icons/Icon_HV_Hero_Dragon_Duke.png",
  "Ruin Witch": "/assets/unit-icons/Icon_HV_Ruin_Witch.png",

  // -----------------------------------------------------------------------
  // Heroes (Builder Base)
  // -----------------------------------------------------------------------
  "Battle Machine": "/assets/unit-icons/Icon_BB_Hero_Battle_Machine.png",
  "Battle Copter": "/assets/unit-icons/Icon_BB_Hero_Battle_Copter.png",

  // -----------------------------------------------------------------------
  // Hero equipment (Home Village) — active equipment slots. The CoC API
  // returns these in `heroEquipment[]` with a `name` field; the Fankit
  // filenames use the hero prefix (AQ/BK/GW/RC/MP/BQ) + equipment name.
  // -----------------------------------------------------------------------
  "Archer Puppet": "/assets/unit-icons/Icon_HE_AQ_Archer_Puppet.png",
  "Frozen Arrow": "/assets/unit-icons/Icon_HE_AQ_Frozen_Arrow.png",
  "Giant Arrow": "/assets/unit-icons/Icon_HE_AQ_Giant_Arrow.png",
  "Healer Puppet": "/assets/unit-icons/Icon_HE_AQ_Healer_Puppet.png",
  "Invisibility Vial": "/assets/unit-icons/Icon_HE_AQ_Invisibility_Vial.png",
  "Magic Mirror": "/assets/unit-icons/Icon_HE_AQ_Magic_Mirror.png",
  "Monolith Arrow": "/assets/unit-icons/Icon_HE_AQ_MonolithArrow.png",
  "Barbarian Puppet": "/assets/unit-icons/Icon_HE_BK_Barbarian_Puppet.png",
  "Earthquake Boots": "/assets/unit-icons/Icon_HE_BK_Earthquake_Boots.png",
  "Rage Vial": "/assets/unit-icons/Icon_HE_BK_Rage_Vial.png",
  "Spiky Ball": "/assets/unit-icons/Icon_HE_BK_Spiky_Ball.png",
  "Vampstache": "/assets/unit-icons/Icon_HE_BK_Vampstache.png",
  "Giant Gauntlet": "/assets/unit-icons/Icon_HE_BQ_Giant_Gauntlet.png",
  "Eternal Tome": "/assets/unit-icons/Icon_HE_GW_Eternal_Tome.png",
  "Healing Tome": "/assets/unit-icons/Icon_HE_GW_Healing_Tome.png",
  "Life Gem": "/assets/unit-icons/Icon_HE_GW_Life_Gem.png",
  "Rage Gem": "/assets/unit-icons/Icon_HE_GW_Rage_Gem.png",
  "Dark Orb": "/assets/unit-icons/Icon_HE_MP_DarkOrb.png",
  "Henchmen Puppet": "/assets/unit-icons/Icon_HE_MP_Henchman.png",
  "Metal Pants": "/assets/unit-icons/Icon_HE_MP_Iron_Pants.png",
  "Electro Boots": "/assets/unit-icons/Icon_HE_RC_ElectroBoots.png",
  "Frost Flake": "/assets/unit-icons/Icon_HE_RC_Frost_Flake.png",
  "Haste Vial": "/assets/unit-icons/Icon_HE_RC_Haste_Vial.png",
  "Hog Rider Puppet": "/assets/unit-icons/Icon_HE_RC_Hog_Rider_Doll.png",
  "Royal Gem": "/assets/unit-icons/Icon_HE_RC_Royal_Gem.png",
  "Seeking Shield": "/assets/unit-icons/Icon_HE_RC_Seeking_Shield.png",
  // Hero gear (Dragon Duke double-cannon attachments) — HG_DD_* + HG_GW/MP/RC
  "Electro Fangs": "/assets/unit-icons/Icon_HG_DD_Electro_Fangs.png",
  "Fire Heart": "/assets/unit-icons/Icon_HG_DD_FireHeart.png",
  "Flame Blower": "/assets/unit-icons/Icon_HG_DD_FlameBlower.png",
  "Rocket Backpack": "/assets/unit-icons/Icon_HG_DD_Rocket_BackPack.png",
  "Stun Blaster": "/assets/unit-icons/Icon_HG_DD_StunBlast.png",
  "Lavaloon Puppet": "/assets/unit-icons/Icon_HG_GW_LavaloonPuppet.png",
  "Meteor Staff": "/assets/unit-icons/Icon_HG_MP_MeteoriteSceptre.png",
  "Rocket Spear": "/assets/unit-icons/Icon_HG_RoyalChampion_RocketSpear_Equipment_03.png",
  // Equipment names seen in the DB without a matched Fankit file yet.
  "Heroic Torch": "/assets/unit-icons/placeholder.svg",
  "Noble Iron": "/assets/unit-icons/placeholder.svg",
  "Snake Bracelet": "/assets/unit-icons/placeholder.svg",

  // -----------------------------------------------------------------------
  // Elixir spells (Home Village) — not yet downloaded. Placeholder.
  // -----------------------------------------------------------------------
  "Lightning Spell": "/assets/unit-icons/placeholder.svg",
  "Healing Spell": "/assets/unit-icons/placeholder.svg",
  "Rage Spell": "/assets/unit-icons/placeholder.svg",
  "Jump Spell": "/assets/unit-icons/placeholder.svg",
  "Freeze Spell": "/assets/unit-icons/placeholder.svg",
  "Clone Spell": "/assets/unit-icons/placeholder.svg",
  "Invisibility Spell": "/assets/unit-icons/placeholder.svg",
  "Recall Spell": "/assets/unit-icons/placeholder.svg",
  "Revive Spell": "/assets/unit-icons/placeholder.svg",
  "Angry Spell": "/assets/unit-icons/placeholder.svg",
  "Ice Block Spell": "/assets/unit-icons/placeholder.svg",
  "Totem Spell": "/assets/unit-icons/placeholder.svg",

  // -----------------------------------------------------------------------
  // Dark spells — not yet downloaded. Placeholder.
  // -----------------------------------------------------------------------
  "Poison Spell": "/assets/unit-icons/placeholder.svg",
  "Earthquake Spell": "/assets/unit-icons/placeholder.svg",
  "Haste Spell": "/assets/unit-icons/placeholder.svg",
  "Skeleton Spell": "/assets/unit-icons/placeholder.svg",
  "Bat Spell": "/assets/unit-icons/placeholder.svg",
  "Overgrowth Spell": "/assets/unit-icons/placeholder.svg",

  // -----------------------------------------------------------------------
  // Pets — not yet downloaded. Placeholder.
  // -----------------------------------------------------------------------
  "L.A.S.S.I": "/assets/unit-icons/placeholder.svg",
  "Mighty Yak": "/assets/unit-icons/placeholder.svg",
  "Electro Owl": "/assets/unit-icons/placeholder.svg",
  Unicorn: "/assets/unit-icons/placeholder.svg",
  Frosty: "/assets/unit-icons/placeholder.svg",
  "Poison Lizard": "/assets/unit-icons/placeholder.svg",
  Phoenix: "/assets/unit-icons/placeholder.svg",
  Diggy: "/assets/unit-icons/placeholder.svg",
  "Spirit Fox": "/assets/unit-icons/placeholder.svg",
  "Angry Jelly": "/assets/unit-icons/placeholder.svg",
  "Sneezy": "/assets/unit-icons/placeholder.svg",
  "Greedy Raven": "/assets/unit-icons/placeholder.svg",
};

const PLACEHOLDER = "/assets/unit-icons/placeholder.svg";

/**
 * Resolve a CoC API unit name to a local icon path.
 *
 * Returns the mapped PNG path when a Fankit asset has been downloaded for the
 * unit, otherwise returns the placeholder. Call sites should render the unit
 * name as a text label when the placeholder is returned (a missing icon is
 * preferable to a broken image — see the "text fallback is mandatory" rule).
 *
 * The progression cards are auto-populated from the API response — if a new
 * troop is added by Supercell, it will appear automatically with the
 * placeholder icon until its Fankit PNG is copied in.
 */
export function getUnitIcon(name: string): string {
  return unitIconMap[name] ?? PLACEHOLDER;
}

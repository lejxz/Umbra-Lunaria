/**
 * Hero equipment → hero grouping.
 *
 * The CoC API returns hero equipment and hero gear in a flat `heroEquipment[]`
 * array with no hero discriminator. This map groups each equipment name to its
 * owning hero so the progression UI can render equipment under per-hero
 * sub-headings (Archer Queen, Barbarian King, etc.) instead of one flat list.
 *
 * Derived from the Fankit filename prefixes:
 *   AQ — Archer Queen, BK — Barbarian King, GW — Grand Warden,
 *   RC — Royal Champion, MP — Minion Prince,  DD — Dragon Duke,
 *   BQ — Giant Gauntlet is a BK equipment (Fankit uses BQ, treat as BK).
 */

export type HeroKey = "AQ" | "BK" | "GW" | "RC" | "MP" | "DD";

export const HERO_LABEL: Record<HeroKey, string> = {
  AQ: "Archer Queen",
  BK: "Barbarian King",
  GW: "Grand Warden",
  RC: "Royal Champion",
  MP: "Minion Prince",
  DD: "Dragon Duke",
};

const EQUIPMENT_HERO: Record<string, HeroKey> = {
  // Archer Queen
  "Archer Puppet": "AQ",
  "Frozen Arrow": "AQ",
  "Giant Arrow": "AQ",
  "Healer Puppet": "AQ",
  "Invisibility Vial": "AQ",
  "Magic Mirror": "AQ",
  "Monolith Arrow": "AQ",
  "Action Figure": "AQ",

  // Barbarian King (BQ Giant Gauntlet is also BK)
  "Barbarian Puppet": "BK",
  "Earthquake Boots": "BK",
  "Rage Vial": "BK",
  "Spiky Ball": "BK",
  Vampstache: "BK",
  "Snake Bracelet": "BK",
  "Giant Gauntlet": "BK",
  "Stick Fire Horse": "BK",

  // Grand Warden
  "Eternal Tome": "GW",
  "Healing Tome": "GW",
  "Life Gem": "GW",
  "Rage Gem": "GW",
  Fireball: "GW",
  "Lavaloon Puppet": "GW",
  "Heroic Torch": "GW",

  // Royal Champion
  "Electro Boots": "RC",
  "Frost Flake": "RC",
  "Haste Vial": "RC",
  "Hog Rider Puppet": "RC",
  "Royal Gem": "RC",
  "Seeking Shield": "RC",
  "Rocket Spear": "RC",

  // Minion Prince
  "Dark Orb": "MP",
  "Henchmen Puppet": "MP",
  "Metal Pants": "MP",
  "Noble Iron": "MP",
  "Dark Crown": "MP",
  "Meteor Staff": "MP",

  // Dragon Duke (gear attachments)
  "Electro Fangs": "DD",
  "Fire Heart": "DD",
  "Flame Blower": "DD",
  "Rocket Backpack": "DD",
  "Stun Blaster": "DD",
};

/**
 * Resolve the owning hero for an equipment name.
 * Returns `null` for unrecognized equipment (hero unknown).
 */
export function heroForEquipment(name: string): HeroKey | null {
  return EQUIPMENT_HERO[name] ?? null;
}

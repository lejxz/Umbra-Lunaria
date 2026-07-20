/**
 * Test fixtures built from the live API reference in
 * concept/13-live-api-reference.md. No secrets — these are public clan
 * response shapes used to test ingestion and query logic.
 *
 * See concept/12-Implemantation-plan-and-modularity.md Step 1.0.A.
 */
import type {
  CocClan,
  CocClanMember,
  CocPlayer,
  CocCurrentWar,
} from "@/lib/coc-client/client";

export const fixtureMembers: CocClanMember[] = [
  {
    tag: "#YPCC8QYU2",
    name: "Yeon",
    role: "leader",
    townHallLevel: 17,
    expLevel: 214,
    donations: 59,
    donationsReceived: 469,
    trophies: 0,
    builderBaseTrophies: 3199,
    clanRank: 1,
    previousClanRank: 1,
    league: {
      id: 29000022,
      name: "Legend League",
      iconUrls: {
        small:
          "https://api-assets.clashofclans.com/leagues/72/R2zmhyqQ0_lKcDR5EyghXCxgyC9mm_mVMIjAbmGoZtw.png",
      },
    },
    builderBaseLeague: { id: 44000025, name: "Iron League I" },
  },
  {
    tag: "#L8YYY8CGY",
    name: "KnieieGurow",
    role: "coLeader",
    townHallLevel: 16,
    expLevel: 109,
    donations: 0,
    donationsReceived: 0,
    trophies: 0,
    builderBaseTrophies: 1795,
    clanRank: 2,
    previousClanRank: 2,
  },
  {
    tag: "#QU80CGJV8",
    name: "Juskepz",
    role: "coLeader",
    townHallLevel: 14,
    expLevel: 165,
    donations: 32,
    donationsReceived: 0,
    trophies: 0,
    builderBaseTrophies: 2390,
    clanRank: 3,
    previousClanRank: 3,
  },
];

export const fixtureClan: CocClan = {
  tag: "#2JPCYP98L",
  name: "Umbra Lunaria",
  type: "open",
  description: "Moon's Shadow",
  clanLevel: 11,
  badgeUrls: {
    large:
      "https://api-assets.clashofclans.com/badges/512/FVnpcW6MK5U1nHVLlYtks5TrfPpKUnwR1gGi6mHH4TI.png",
    medium:
      "https://api-assets.clashofclans.com/badges/200/FVnpcW6MK5U1nHVLlYtks5TrfPpKUnwR1gGi6mHH4TI.png",
    small:
      "https://api-assets.clashofclans.com/badges/70/FVnpcW6MK5U1nHVLlYtks5TrfPpKUnwR1gGi6mHH4TI.png",
  },
  warWins: 22,
  warTies: 1,
  warLosses: 34,
  warWinStreak: 1,
  requiredTrophies: 0,
  requiredTownhallLevel: 1,
  requiredBuilderBaseTrophies: 0,
  location: { id: 32000006, name: "International", isCountry: false },
  isFamilyFriendly: false,
  isWarLogPublic: true,
  labels: [
    { id: 56000000, name: "Clan Wars" },
    { id: 56000001, name: "Clan War League" },
    { id: 56000014, name: "Competitive" },
  ],
  warFrequency: "always",
  memberList: fixtureMembers,
  members: 3,
  clanCapital: {
    capitalHallLevel: 8,
    districts: [
      { id: 70000000, name: "Capital Peak", districtHallLevel: 8 },
      { id: 70000001, name: "Barbarian Camp", districtHallLevel: 4 },
      { id: 70000002, name: "Wizard Valley", districtHallLevel: 4 },
      { id: 70000003, name: "Balloon Lagoon", districtHallLevel: 4 },
      { id: 70000004, name: "Builder's Workshop", districtHallLevel: 3 },
      { id: 70000005, name: "Dragon Cliffs", districtHallLevel: 3 },
      { id: 70000006, name: "Golem Quarry", districtHallLevel: 3 },
      { id: 70000007, name: "Skeleton Park", districtHallLevel: 2 },
    ],
  },
};

export const fixturePlayer: CocPlayer = {
  tag: "#YPCC8QYU2",
  name: "Yeon",
  townHallLevel: 17,
  role: "leader",
  warPreference: "in",
  warStars: 1889,
  attackWins: 0,
  defenseWins: 0,
  bestTrophies: 5558,
  builderHallLevel: 10,
  versusTrophies: 3199,
  bestVersusTrophies: 3316,
  expLevel: 214,
  troops: [
    { name: "Barbarian", level: 12, maxLevel: 13, village: "home" },
    { name: "Archer", level: 12, maxLevel: 14, village: "home" },
    { name: "Dragon", level: 12, maxLevel: 13, village: "home" },
  ],
  heroes: [
    { name: "Barbarian King", level: 87, maxLevel: 110, village: "home" },
    { name: "Archer Queen", level: 97, maxLevel: 110, village: "home" },
    { name: "Grand Warden", level: 58, maxLevel: 85, village: "home" },
  ],
  heroEquipment: [
    { name: "Giant Gauntlet", level: 20, maxLevel: 27 },
    { name: "Rocket Spear", level: 27, maxLevel: 27 },
    { name: "Spiky Ball", level: 27, maxLevel: 27 },
  ],
  spells: [
    { name: "Lightning Spell", level: 11, maxLevel: 13, village: "home" },
    { name: "Healing Spell", level: 8, maxLevel: 12, village: "home" },
    { name: "Rage Spell", level: 6, maxLevel: 7, village: "home" },
  ],
  achievements: [
    { name: "Gold Grab", stars: 3, value: 2000000000, target: 100000000 },
    { name: "War Hero", stars: 3, value: 1889, target: 1000 },
  ],
};

export const fixtureCurrentWar: CocCurrentWar = {
  state: "inWar",
  teamSize: 5,
  attacksPerMember: 2,
  startTime: "2026-07-20T10:00:00.000Z",
  endTime: "2026-07-21T10:00:00.000Z",
  clan: {
    tag: "#2JPCYP98L",
    name: "Umbra Lunaria",
    stars: 7,
    destructionPercentage: 65,
    attacks: 6,
    members: [
      {
        tag: "#YPCC8QYU2",
        name: "Yeon",
        townhallLevel: 17,
        mapPosition: 1,
        attacks: [
          {
            attackerTag: "#YPCC8QYU2",
            defenderTag: "#OPPONENT1",
            stars: 3,
            destructionPercentage: 100,
            order: 1,
          },
        ],
      },
      {
        tag: "#L8YYY8CGY",
        name: "KnieieGurow",
        townhallLevel: 16,
        mapPosition: 2,
        attacks: [],
      },
    ],
  },
  opponent: {
    tag: "#OPPONENTCLAN",
    name: "Opponent Clan",
    stars: 5,
    destructionPercentage: 40,
    attacks: 8,
    members: [
      {
        tag: "#OPPONENT1",
        name: "Opponent Leader",
        townhallLevel: 17,
        mapPosition: 1,
      },
    ],
  },
};

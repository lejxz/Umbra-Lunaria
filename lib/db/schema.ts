import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  primaryKey,
} from "drizzle-orm/pg-core";

// See concept/03-data-model-and-database.md for the full design rationale
// behind every table and column here. Column type conventions (tags are
// text, timestamps are timestamptz, etc.) are documented there and not
// re-explained per-column here.

export const clans = pgTable("clans", {
  clanTag: text("clan_tag").primaryKey(),
  name: text("name"),
  badgeUrl: text("badge_url"),
  clanLevel: integer("clan_level"),
  lastPolledAt: timestamp("last_polled_at", { withTimezone: true }),

  // Cached clan-level fields, refreshed on the daily batch — see
  // concept/03-data-model-and-database.md "clans" table.
  capitalHallLevel: integer("capital_hall_level"),
  warWins: integer("war_wins"),
  warTies: integer("war_ties"),
  warLosses: integer("war_losses"),
  warWinStreak: integer("war_win_streak"),
  requiredTrophies: integer("required_trophies"),
  requiredTownHallLevel: integer("required_town_hall_level"),
  requiredBuilderBaseTrophies: integer("required_builder_base_trophies"),
  location: text("location"),
  labels: jsonb("labels"),
  warFrequency: text("war_frequency"),
});

export const members = pgTable("members", {
  playerTag: text("player_tag").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(), // leader | coLeader | admin | member
  townHallLevel: integer("town_hall_level"),
  warPreference: text("war_preference"), // "in" | "out"

  // Lifetime totals, refreshed on the daily batch. See concept/06-members.md
  // "Career stats" — { warStars, attackWins, defenseWins, bestTrophies, achievements: {...} }
  careerStats: jsonb("career_stats"),

  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull(),
  leftAt: timestamp("left_at", { withTimezone: true }),
  purgeAt: timestamp("purge_at", { withTimezone: true }),
});

export const memberSnapshots = pgTable("member_snapshots", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  playerTag: text("player_tag")
    .notNull()
    .references(() => members.playerTag),
  capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
  donations: integer("donations").notNull(),
  donationsReceived: integer("donations_received").notNull(),
  trophies: integer("trophies").notNull(),
  versusTrophies: integer("versus_trophies"),
  activityFlag: boolean("activity_flag").notNull().default(false),
  // Login-activity graph derivation — see concept/04-activity-tracking-and-polling.md
  loginDayFlag: boolean("login_day_flag").notNull().default(false),
});

// Troop/hero/spell/pet levels — JSONB blob per member for Phase 1, per the
// tradeoff note in concept/03-data-model-and-database.md. Normalize into
// separate tables later only if cross-member unit queries are needed.
export const unitLevels = pgTable("unit_levels", {
  playerTag: text("player_tag")
    .primaryKey()
    .references(() => members.playerTag),
  capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
  troops: jsonb("troops"),
  heroes: jsonb("heroes"),
  heroEquipment: jsonb("hero_equipment"),
  spells: jsonb("spells"),
  pets: jsonb("pets"),
  builderBase: jsonb("builder_base"), // minimal — builderHallLevel, versus troops
});

export const wars = pgTable("wars", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  opponentTag: text("opponent_tag"),
  opponentName: text("opponent_name"),
  warType: text("war_type").notNull(), // "regular" | "cwl"
  state: text("state").notNull(), // "preparation" | "inWar" | "warEnded"
  teamSize: integer("team_size"),
  attacksPerMember: integer("attacks_per_member"),
  ownStars: integer("own_stars"),
  opponentStars: integer("opponent_stars"),
  result: text("result"), // "win" | "loss" | "tie" | null while ongoing
  startTime: timestamp("start_time", { withTimezone: true }),
  endTime: timestamp("end_time", { withTimezone: true }),
});

export const warAttacks = pgTable("war_attacks", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  warId: integer("war_id")
    .notNull()
    .references(() => wars.id),
  attackerTag: text("attacker_tag").notNull(),
  defenderTag: text("defender_tag").notNull(),
  stars: integer("stars").notNull(),
  destructionPercentage: integer("destruction_percentage").notNull(),
  attackOrder: integer("attack_order"),
  attackedAt: timestamp("attacked_at", { withTimezone: true }),
});

// Full roster per war, whether they attacked or not — this is what makes
// missed-attack tracking possible. See concept/03-data-model-and-database.md.
export const warParticipants = pgTable(
  "war_participants",
  {
    warId: integer("war_id")
      .notNull()
      .references(() => wars.id),
    playerTag: text("player_tag")
      .notNull()
      .references(() => members.playerTag),
    attacksAllowed: integer("attacks_allowed").notNull(),
    attacksUsed: integer("attacks_used").notNull().default(0),
    starsEarned: integer("stars_earned").notNull().default(0),
    missed: boolean("missed").notNull().default(true),
  },
  (table) => [primaryKey({ columns: [table.warId, table.playerTag] })],
);

export const capitalRaidSeasons = pgTable("capital_raid_seasons", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }),
  capitalTotalLoot: integer("capital_total_loot"),
  offensiveReward: integer("offensive_reward"),
  defensiveReward: integer("defensive_reward"),
});

export const capitalContributions = pgTable(
  "capital_contributions",
  {
    raidSeasonId: integer("raid_season_id")
      .notNull()
      .references(() => capitalRaidSeasons.id),
    playerTag: text("player_tag")
      .notNull()
      .references(() => members.playerTag),
    attacksUsed: integer("attacks_used").notNull().default(0),
    capitalResourcesLooted: integer("capital_resources_looted")
      .notNull()
      .default(0),
  },
  (table) => [
    primaryKey({ columns: [table.raidSeasonId, table.playerTag] }),
  ],
);

// District-level upgrade tracking — see concept/08-clan-capital.md. Polled
// daily and diffed; a level increase is a real, observed upgrade event.
export const capitalDistrictSnapshots = pgTable("capital_district_snapshots", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  districtName: text("district_name").notNull(),
  districtHallLevel: integer("district_hall_level").notNull(),
  capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
});

export const warRosters = pgTable("war_rosters", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title"),
  warSize: integer("war_size").notNull(),
  status: text("status").notNull().default("draft"), // "draft" | "finalized"
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const warRosterSlots = pgTable("war_roster_slots", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  rosterId: integer("roster_id")
    .notNull()
    .references(() => warRosters.id),
  playerTag: text("player_tag")
    .notNull()
    .references(() => members.playerTag),
  mapPosition: integer("map_position").notNull(),
});

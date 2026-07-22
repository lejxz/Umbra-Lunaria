import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// See concept/03-data-model-and-database.md for the full design rationale
// behind every table and column here. Column type conventions (tags are
// text, timestamps are timestamptz, etc.) are documented there and not
// re-explained per-column here.

// ---------------------------------------------------------------------------
// Clans — one row for the configured clan, caching all current clan facts.
// ---------------------------------------------------------------------------

export const clans = pgTable("clans", {
  clanTag: text("clan_tag").primaryKey(),
  name: text("name"),
  description: text("description"),
  type: text("type"), // open | inviteOnly | closed
  isFamilyFriendly: boolean("is_family_friendly"),
  badgeUrls: jsonb("badge_urls"), // { small, medium, large }
  clanLevel: integer("clan_level"),
  clanPoints: integer("clan_points"),
  clanBuilderBasePoints: integer("clan_builder_base_points"),
  clanCapitalPoints: integer("clan_capital_points"),
  memberCount: integer("member_count"),
  location: jsonb("location"), // { id, name, isCountry, countryCode? }
  chatLanguage: jsonb("chat_language"), // { id, name, languageCode }
  labels: jsonb("labels"), // [{ id, name, iconUrls }]
  warFrequency: text("war_frequency"),
  warLeague: jsonb("war_league"), // { id, name }
  capitalLeague: jsonb("capital_league"), // { id, name }
  requiredTrophies: integer("required_trophies"),
  requiredTownhallLevel: integer("required_town_hall_level"),
  requiredBuilderBaseTrophies: integer("required_builder_base_trophies"),

  // War facts
  warWins: integer("war_wins"),
  warTies: integer("war_ties"),
  warLosses: integer("war_losses"),
  warWinStreak: integer("war_win_streak"),
  isWarLogPublic: boolean("is_war_log_public"),

  // Capital facts
  capitalHallLevel: integer("capital_hall_level"),
  // Latest districts payload — diffed against capital_district_snapshots
  // to produce upgrade events. See concept/08-clan-capital.md.
  districtsPayload: jsonb("districts_payload"),

  // Freshness
  lastPolledAt: timestamp("last_polled_at", { withTimezone: true }),
  lastDailyBatchAt: timestamp("last_daily_batch_at", { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// Members — one row per currently retained player tag.
// ---------------------------------------------------------------------------

export const members = pgTable("members", {
  playerTag: text("player_tag").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(), // leader | coLeader | admin | member
  townHallLevel: integer("town_hall_level"),
  townHallWeaponLevel: integer("town_hall_weapon_level"),
  expLevel: integer("exp_level"),
  warPreference: text("war_preference"), // "in" | "out"

  // Home Village league / trophies (refreshed daily)
  trophies: integer("trophies"),
  bestTrophies: integer("best_trophies"),
  league: jsonb("league"), // { id, name, iconUrls }
  leagueTier: jsonb("league_tier"), // { id, name, iconUrls }
  clanRank: integer("clan_rank"),
  previousClanRank: integer("previous_clan_rank"),

  // Builder Base
  builderHallLevel: integer("builder_hall_level"),
  builderBaseTrophies: integer("builder_base_trophies"),
  bestBuilderBaseTrophies: integer("best_builder_base_trophies"),
  builderBaseLeague: jsonb("builder_base_league"), // { id, name }

  // Career totals (lifetime Supercell values — labeled separately from
  // Umbra Lunaria tracked data in the UI). See concept/06-members.md.
  warStars: integer("war_stars"),
  attackWins: integer("attack_wins"),
  defenseWins: integer("defense_wins"),
  clanCapitalContributions: integer("clan_capital_contributions"),
  careerStats: jsonb("career_stats"), // full achievements payload

  // Current-reset donations (from clan member list, refreshed each light poll)
  currentDonations: integer("current_donations"),
  currentDonationsReceived: integer("current_donations_received"),

  // Lifecycle observations. joined_at = "first observed by this tracker",
  // not the player's true historic clan-join date. See concept/03.
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull(),
  leftAt: timestamp("left_at", { withTimezone: true }),
  purgeAt: timestamp("purge_at", { withTimezone: true }),

  // Latest player-detail capture time
  lastDetailCaptureAt: timestamp("last_detail_capture_at", {
    withTimezone: true,
  }),
});

// ---------------------------------------------------------------------------
// member_snapshots — one row per observed member per light poll.
// ---------------------------------------------------------------------------

export const memberSnapshots = pgTable(
  "member_snapshots",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    playerTag: text("player_tag")
      .notNull()
      .references(() => members.playerTag),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
    donations: integer("donations").notNull(),
    donationsReceived: integer("donations_received").notNull(),
    trophies: integer("trophies").notNull(),
    builderBaseTrophies: integer("builder_base_trophies"),
    activityFlag: boolean("activity_flag").notNull().default(false),
    // Login-activity graph derivation — see concept/04-activity-tracking-and-polling.md
    loginDayFlag: boolean("login_day_flag").notNull().default(false),
  },
  (table) => [
    index("member_snapshots_player_tag_captured_at_idx").on(
      table.playerTag,
      table.capturedAt,
    ),
    index("member_snapshots_captured_at_idx").on(table.capturedAt),
  ],
);

// ---------------------------------------------------------------------------
// membership_events — immutable record of observed joins, departures, and
// rejoins. Survives profile purge so the clan log can still render
// "left on [date]; data removed" for departed members.
// See concept/03-data-model-and-database.md + concept/05-dashboard.md.
// ---------------------------------------------------------------------------

export const membershipEvents = pgTable(
  "membership_events",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    playerTag: text("player_tag").notNull(),
    // Display name at the time of the event — preserved even after the
    // member profile is purged, so the clan log remains readable.
    nameAtEvent: text("name_at_event").notNull(),
    eventType: text("event_type").notNull(), // "join" | "leave" | "rejoin"
    eventTime: timestamp("event_time", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("membership_events_player_tag_idx").on(table.playerTag),
    index("membership_events_event_time_idx").on(table.eventTime),
  ],
);

// ---------------------------------------------------------------------------
// unit_levels — latest complete player progression payload keyed by tag.
// ---------------------------------------------------------------------------

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
  builderBase: jsonb("builder_base"),
});

// ---------------------------------------------------------------------------
// Wars — one row per regular war or CWL war.
// ---------------------------------------------------------------------------

export const wars = pgTable(
  "wars",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    // Stable identity: for regular wars, opponent_tag + start_time identifies
    // a unique war across preparation → in-war → ended transitions. For CWL,
    // war_tag is the stable identity. See concept/03 + concept/12 Step 1.0.C.
    warTag: text("war_tag"), // CWL war tag (#...) — null for regular wars
    opponentTag: text("opponent_tag"),
    opponentName: text("opponent_name"),
    opponentBadgeUrls: jsonb("opponent_badge_urls"),
    opponentClanLevel: integer("opponent_clan_level"),
    warType: text("war_type").notNull(), // "regular" | "cwl"
    state: text("state").notNull(), // "preparation" | "inWar" | "warEnded"
    teamSize: integer("team_size"),
    attacksPerMember: integer("attacks_per_member"),
    ownStars: integer("own_stars"),
    opponentStars: integer("opponent_stars"),
    ownDestructionPercentage: integer("own_destruction_percentage"),
    opponentDestructionPercentage: integer("opponent_destruction_percentage"),
    ownAttacks: integer("own_attacks"),
    opponentAttacks: integer("opponent_attacks"),
    result: text("result"), // "win" | "loss" | "tie" | null while ongoing
    startTime: timestamp("start_time", { withTimezone: true }),
    endTime: timestamp("end_time", { withTimezone: true }),
    preparationStartTime: timestamp("preparation_start_time", {
      withTimezone: true,
    }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  },
  (table) => [
    // Unique identity prevents duplicate war rows on repeat polls.
    uniqueIndex("wars_war_tag_idx").on(table.warTag),
    index("wars_opponent_tag_start_time_idx").on(
      table.opponentTag,
      table.startTime,
    ),
    index("wars_state_idx").on(table.state),
    index("wars_end_time_idx").on(table.endTime),
  ],
);

// ---------------------------------------------------------------------------
// war_attacks — one row per attack.
// ---------------------------------------------------------------------------

export const warAttacks = pgTable(
  "war_attacks",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    warId: integer("war_id")
      .notNull()
      .references(() => wars.id),
    attackerTag: text("attacker_tag").notNull(),
    defenderTag: text("defender_tag").notNull(),
    stars: integer("stars").notNull(),
    destructionPercentage: integer("destruction_percentage").notNull(),
    attackOrder: integer("attack_order"),
    duration: integer("duration"),
    attackedAt: timestamp("attacked_at", { withTimezone: true }),
  },
  (table) => [
    // Idempotency: the same attack (same war, attacker, order) must not be
    // inserted twice. See concept/12 Step 1.0.C/D.
    uniqueIndex("war_attacks_war_attacker_order_idx").on(
      table.warId,
      table.attackerTag,
      table.attackOrder,
    ),
    index("war_attacks_war_id_idx").on(table.warId),
    index("war_attacks_attacker_tag_idx").on(table.attackerTag),
  ],
);

// ---------------------------------------------------------------------------
// war_participants — full roster per war, whether they attacked or not.
// ---------------------------------------------------------------------------

export const warParticipants = pgTable(
  "war_participants",
  {
    warId: integer("war_id")
      .notNull()
      .references(() => wars.id),
    playerTag: text("player_tag")
      .notNull()
      .references(() => members.playerTag),
    mapPosition: integer("map_position"),
    attacksAllowed: integer("attacks_allowed").notNull(),
    attacksUsed: integer("attacks_used").notNull().default(0),
    starsEarned: integer("stars_earned").notNull().default(0),
    missed: boolean("missed").notNull().default(true),
  },
  (table) => [
    primaryKey({ columns: [table.warId, table.playerTag] }),
    index("war_participants_player_tag_idx").on(table.playerTag),
  ],
);

// ---------------------------------------------------------------------------
// Capital entities
// ---------------------------------------------------------------------------

export const capitalDistrictSnapshots = pgTable(
  "capital_district_snapshots",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    districtName: text("district_name").notNull(),
    districtHallLevel: integer("district_hall_level").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("capital_district_snapshots_name_captured_at_idx").on(
      table.districtName,
      table.capturedAt,
    ),
  ],
);

export const capitalRaidSeasons = pgTable("capital_raid_seasons", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }),
  capitalTotalLoot: integer("capital_total_loot"),
  raidsCompleted: integer("raids_completed"),
  totalAttacks: integer("total_attacks"),
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
    attackLimit: integer("attack_limit"),
    bonusAttackLimit: integer("bonus_attack_limit"),
    capitalResourcesLooted: integer("capital_resources_looted")
      .notNull()
      .default(0),
    raidWeekendMedals: integer("raid_weekend_medals"),
  },
  (table) => [
    primaryKey({ columns: [table.raidSeasonId, table.playerTag] }),
  ],
);

// ---------------------------------------------------------------------------
// Planning entities
// ---------------------------------------------------------------------------

export const warRosters = pgTable("war_rosters", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title"),
  warSize: integer("war_size").notNull(),
  status: text("status").notNull().default("draft"), // "draft" | "finalized"
  // Snapshot of the auto-select config version at finalization time.
  configVersion: text("config_version"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  finalizedAt: timestamp("finalized_at", { withTimezone: true }),
});

export const warRosterSlots = pgTable(
  "war_roster_slots",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    rosterId: integer("roster_id")
      .notNull()
      .references(() => warRosters.id),
    playerTag: text("player_tag")
      .notNull()
      .references(() => members.playerTag),
    mapPosition: integer("map_position").notNull(),
  },
  (table) => [
    index("war_roster_slots_roster_id_idx").on(table.rosterId),
    uniqueIndex("war_roster_slots_roster_position_idx").on(
      table.rosterId,
      table.mapPosition,
    ),
  ],
);

// ---------------------------------------------------------------------------
// hall_of_fame_records — one row per award category. A new all-time high
// overwrites the existing row; no historical entries are kept here (the raw
// data in member_snapshots / war_attacks / capital_contributions is the
// source of truth). Populated by the daily batch via records-updater.ts.
// ---------------------------------------------------------------------------

export const hallOfFameRecords = pgTable("hall_of_fame_records", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  // "philanthropist" | "vanguard" | "dedicated" | "capitalist" | "unsleeping"
  awardKey: text("award_key").notNull().unique(),
  holderTag: text("holder_tag").notNull(),
  holderName: text("holder_name").notNull(), // preserved even after member purge
  recordValue: integer("record_value").notNull(), // raw int (donations, stars, days, gold, raw score)
  valueLabel: text("value_label").notNull(), // e.g. "9,616 troops", "15 three-stars"
  periodLabel: text("period_label"), // e.g. "Jul 2026", "Raid Jul 20"
  achievedAt: timestamp("achieved_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// runtime_settings — administrator-editable DB values. Phase 2 writes; the
// schema is ready now per concept/12 Step 1.0.C.
// ---------------------------------------------------------------------------

export const runtimeSettings = pgTable("runtime_settings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  validationVersion: integer("validation_version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedBy: text("updated_by"),
});

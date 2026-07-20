CREATE TABLE "capital_contributions" (
	"raid_season_id" integer NOT NULL,
	"player_tag" text NOT NULL,
	"attacks_used" integer DEFAULT 0 NOT NULL,
	"capital_resources_looted" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "capital_contributions_raid_season_id_player_tag_pk" PRIMARY KEY("raid_season_id","player_tag")
);
--> statement-breakpoint
CREATE TABLE "capital_district_snapshots" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "capital_district_snapshots_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"district_name" text NOT NULL,
	"district_hall_level" integer NOT NULL,
	"captured_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capital_raid_seasons" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "capital_raid_seasons_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone,
	"capital_total_loot" integer,
	"offensive_reward" integer,
	"defensive_reward" integer
);
--> statement-breakpoint
CREATE TABLE "clans" (
	"clan_tag" text PRIMARY KEY NOT NULL,
	"name" text,
	"badge_url" text,
	"clan_level" integer,
	"last_polled_at" timestamp with time zone,
	"capital_hall_level" integer,
	"war_wins" integer,
	"war_ties" integer,
	"war_losses" integer,
	"war_win_streak" integer,
	"required_trophies" integer,
	"required_town_hall_level" integer,
	"required_builder_base_trophies" integer,
	"location" text,
	"labels" jsonb,
	"war_frequency" text
);
--> statement-breakpoint
CREATE TABLE "member_snapshots" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "member_snapshots_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"player_tag" text NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"donations" integer NOT NULL,
	"donations_received" integer NOT NULL,
	"trophies" integer NOT NULL,
	"versus_trophies" integer,
	"activity_flag" boolean DEFAULT false NOT NULL,
	"login_day_flag" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"player_tag" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"town_hall_level" integer,
	"war_preference" text,
	"career_stats" jsonb,
	"joined_at" timestamp with time zone NOT NULL,
	"left_at" timestamp with time zone,
	"purge_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "unit_levels" (
	"player_tag" text PRIMARY KEY NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"troops" jsonb,
	"heroes" jsonb,
	"hero_equipment" jsonb,
	"spells" jsonb,
	"pets" jsonb,
	"builder_base" jsonb
);
--> statement-breakpoint
CREATE TABLE "war_attacks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "war_attacks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"war_id" integer NOT NULL,
	"attacker_tag" text NOT NULL,
	"defender_tag" text NOT NULL,
	"stars" integer NOT NULL,
	"destruction_percentage" integer NOT NULL,
	"attack_order" integer,
	"attacked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "war_participants" (
	"war_id" integer NOT NULL,
	"player_tag" text NOT NULL,
	"attacks_allowed" integer NOT NULL,
	"attacks_used" integer DEFAULT 0 NOT NULL,
	"stars_earned" integer DEFAULT 0 NOT NULL,
	"missed" boolean DEFAULT true NOT NULL,
	CONSTRAINT "war_participants_war_id_player_tag_pk" PRIMARY KEY("war_id","player_tag")
);
--> statement-breakpoint
CREATE TABLE "war_roster_slots" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "war_roster_slots_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"roster_id" integer NOT NULL,
	"player_tag" text NOT NULL,
	"map_position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "war_rosters" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "war_rosters_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"title" text,
	"war_size" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wars" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "wars_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"opponent_tag" text,
	"opponent_name" text,
	"war_type" text NOT NULL,
	"state" text NOT NULL,
	"team_size" integer,
	"attacks_per_member" integer,
	"own_stars" integer,
	"opponent_stars" integer,
	"result" text,
	"start_time" timestamp with time zone,
	"end_time" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "capital_contributions" ADD CONSTRAINT "capital_contributions_raid_season_id_capital_raid_seasons_id_fk" FOREIGN KEY ("raid_season_id") REFERENCES "public"."capital_raid_seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capital_contributions" ADD CONSTRAINT "capital_contributions_player_tag_members_player_tag_fk" FOREIGN KEY ("player_tag") REFERENCES "public"."members"("player_tag") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_snapshots" ADD CONSTRAINT "member_snapshots_player_tag_members_player_tag_fk" FOREIGN KEY ("player_tag") REFERENCES "public"."members"("player_tag") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_levels" ADD CONSTRAINT "unit_levels_player_tag_members_player_tag_fk" FOREIGN KEY ("player_tag") REFERENCES "public"."members"("player_tag") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "war_attacks" ADD CONSTRAINT "war_attacks_war_id_wars_id_fk" FOREIGN KEY ("war_id") REFERENCES "public"."wars"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "war_participants" ADD CONSTRAINT "war_participants_war_id_wars_id_fk" FOREIGN KEY ("war_id") REFERENCES "public"."wars"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "war_participants" ADD CONSTRAINT "war_participants_player_tag_members_player_tag_fk" FOREIGN KEY ("player_tag") REFERENCES "public"."members"("player_tag") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "war_roster_slots" ADD CONSTRAINT "war_roster_slots_roster_id_war_rosters_id_fk" FOREIGN KEY ("roster_id") REFERENCES "public"."war_rosters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "war_roster_slots" ADD CONSTRAINT "war_roster_slots_player_tag_members_player_tag_fk" FOREIGN KEY ("player_tag") REFERENCES "public"."members"("player_tag") ON DELETE no action ON UPDATE no action;
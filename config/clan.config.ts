export interface ClanConfig {
  clanTag: string;
  timezone: string;
  memberRetentionDays: number;
  pollIntervalMinutes: number;
  minWarsForConfidentRanking: number;
  features: {
    clanCapital: boolean;
    builderBaseSummary: boolean;
    warPlanningAutoSelect: boolean;
  };
}

export const clanConfig = {
  // The single clan this deployment tracks. Format: "#XXXXXXXX".
  // REPLACE THIS with your real clan tag before deploying — see
  // README.md "Getting a Clash of Clans API key" step 7 for how to find it.
  clanTag: "#2JPCYP98L",

  // IANA timezone used for "daily" boundaries in the activity graph and
  // donation-window buckets. Not necessarily UTC — pick whatever the
  // clan's leadership actually operates in.
  timezone: "Asia/Manila",

  // How long a departed member's data is retained before the daily purge
  // job deletes it. See concept/03-data-model-and-database.md.
  memberRetentionDays: 14,

  // Target poll cadence, in minutes. Informational only — the actual
  // schedule lives in the third-party cron-job service (see concept/04);
  // changing this value alone does not change anything at runtime.
  pollIntervalMinutes: 30,

  // Minimum observed wars before a member's auto-select ranking is shown
  // with full confidence rather than a "limited data" flag.
  // See concept/09-war-planning-and-auto-select.md.
  minWarsForConfidentRanking: 3,

  // Feature toggles — lets a clan turn off a section it doesn't use
  // without deleting code.
  features: {
    clanCapital: true,
    builderBaseSummary: true,
    warPlanningAutoSelect: true,
  },
} satisfies ClanConfig;

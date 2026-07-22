/**
 * Thin, typed wrapper around the Clash of Clans API via the RoyaleAPI proxy.
 * See concept/02-api-and-proxy-strategy.md for why this goes through a proxy
 * at all — server-side only, never called from the browser.
 */

const BASE_URL =
  process.env.COC_API_BASE_URL ?? "https://cocproxy.royaleapi.dev/v1";
const TOKEN = process.env.COC_API_TOKEN;

export class CocApiError extends Error {
  constructor(
    public status: number,
    public path: string,
    message: string,
  ) {
    super(`CoC API error ${status} on ${path}: ${message}`);
  }
}

/** Player/clan tags start with '#', which must be URL-encoded as %23. */
function encodeTag(tag: string): string {
  return encodeURIComponent(tag.startsWith("#") ? tag : `#${tag}`);
}

async function cocFetch<T>(path: string): Promise<T> {
  if (!TOKEN) {
    throw new Error(
      "COC_API_TOKEN is not set. See .env.example and README.md 'Getting a Clash of Clans API key'.",
    );
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    // No caching at this layer — callers (ingest route, refresh route)
    // decide their own freshness rules.
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new CocApiError(res.status, path, body);
  }

  return res.json() as Promise<T>;
}

// --- Response shapes are intentionally partial: only fields this project
// actually uses. Extend as new features need more fields, matching the
// "isolate the response shape" principle in concept/01-tech-stack.md /
// concept/12-Implemantation-plan-and-modularity.md. ---

export interface CocIconUrls {
  small?: string;
  medium?: string;
  large?: string;
  tiny?: string;
}

export interface CocLeague {
  id: number;
  name: string;
  iconUrls?: CocIconUrls;
}

export interface CocLeagueTier {
  id: number;
  name: string;
  iconUrls?: CocIconUrls;
}

export interface CocLabel {
  id: number;
  name: string;
  iconUrls?: CocIconUrls;
}

export interface CocLocation {
  id: number;
  name: string;
  isCountry: boolean;
  countryCode?: string;
}

export interface CocChatLanguage {
  id: number;
  name: string;
  languageCode: string;
}

export interface CocBuilderBaseLeague {
  id: number;
  name: string;
}

export interface CocClanMember {
  tag: string;
  name: string;
  role: string; // leader | coLeader | admin | member
  townHallLevel: number;
  expLevel?: number;
  league?: CocLeague;
  leagueTier?: CocLeagueTier;
  trophies: number;
  builderBaseTrophies?: number;
  builderBaseLeague?: CocBuilderBaseLeague;
  clanRank?: number;
  previousClanRank?: number;
  donations: number;
  donationsReceived: number;
}

export interface CocCapitalDistrict {
  id: number;
  name: string;
  districtHallLevel: number;
}

export interface CocClanCapital {
  capitalHallLevel: number;
  districts: CocCapitalDistrict[];
}

export interface CocClan {
  tag: string;
  name: string;
  type?: string; // open | inviteOnly | closed
  description?: string;
  location?: CocLocation;
  isFamilyFriendly?: boolean;
  badgeUrls?: CocIconUrls;
  clanLevel: number;
  clanPoints?: number;
  clanBuilderBasePoints?: number;
  clanCapitalPoints?: number;
  capitalLeague?: CocLeague;
  warLeague?: CocLeague;
  requiredTrophies?: number;
  requiredBuilderBaseTrophies?: number;
  requiredTownhallLevel?: number;
  warFrequency?: string;
  warWinStreak?: number;
  warWins?: number;
  warTies?: number;
  warLosses?: number;
  isWarLogPublic?: boolean;
  members?: number;
  memberList: CocClanMember[];
  labels?: CocLabel[];
  clanCapital?: CocClanCapital;
  chatLanguage?: CocChatLanguage;
}

export interface CocPlayerAchievement {
  name: string;
  stars?: number;
  value: number;
  target?: number;
  village?: "home" | "builderBase";
}

export interface CocUnitLevel {
  name: string;
  level: number;
  maxLevel?: number;
  village: "home" | "builderBase";
}

export interface CocPlayer {
  tag: string;
  name: string;
  townHallLevel: number;
  townHallWeaponLevel?: number;
  role?: string;
  warPreference?: "in" | "out";
  attackWins?: number;
  defenseWins?: number;
  warStars?: number;
  expLevel?: number;
  trophies?: number;
  bestTrophies?: number;
  donations?: number;
  donationsReceived?: number;
  clanCapitalContributions?: number;
  builderHallLevel?: number;
  builderBaseTrophies?: number;
  bestBuilderBaseTrophies?: number;
  versusTrophies?: number;
  bestVersusTrophies?: number;
  league?: CocLeague;
  leagueTier?: CocLeagueTier;
  builderBaseLeague?: CocBuilderBaseLeague;
  clan?: { tag: string; name: string; clanLevel?: number; badgeUrls?: CocIconUrls };
  troops: CocUnitLevel[];
  heroes: CocUnitLevel[];
  heroEquipment?: Array<{ name: string; level: number; maxLevel?: number }>;
  spells: CocUnitLevel[];
  achievements: CocPlayerAchievement[];
  labels?: CocLabel[];
}

export interface CocWarAttack {
  attackerTag: string;
  defenderTag: string;
  stars: number;
  destructionPercentage: number;
  order: number;
  duration?: number;
}

export interface CocWarMember {
  tag: string;
  name: string;
  townhallLevel: number;
  mapPosition: number;
  attacks?: CocWarAttack[];
  opponentAttacks?: CocWarAttack[];
}

export interface CocWarClan {
  tag: string;
  name: string;
  clanLevel?: number;
  badgeUrls?: CocIconUrls;
  attacks: number;
  stars: number;
  destructionPercentage: number;
  members: CocWarMember[];
}

export interface CocCurrentWar {
  state: "notInWar" | "preparation" | "inWar" | "warEnded";
  warStartTime?: string;
  teamSize?: number;
  attacksPerMember?: number;
  startTime?: string;
  endTime?: string;
  preparationStartTime?: string;
  clan?: CocWarClan;
  opponent?: CocWarClan;
}

export interface CocWarLogEntry {
  result?: "win" | "loss" | "tie";
  endTime: string;
  teamSize: number;
  attacksPerMember?: number;
  battleModifier?: string; // "none" | etc. — API field
  clan: {
    tag: string;
    name: string;
    badgeUrls?: CocIconUrls;
    clanLevel?: number;
    // Present on our clan; the API sometimes omits `attacks` on the opponent
    // object in war-log entries. Treat as optional everywhere for safety.
    attacks?: number;
    stars: number;
    destructionPercentage: number;
    expEarned?: number;
  };
  opponent: {
    tag: string;
    name: string;
    badgeUrls?: CocIconUrls;
    clanLevel?: number;
    attacks?: number;
    stars: number;
    destructionPercentage: number;
    expEarned?: number;
  };
}

export interface CocCwlClan {
  tag: string;
  name: string;
  clanLevel?: number;
  badgeUrls?: CocIconUrls;
}

export interface CocCwlRound {
  warTags: string[];
}

export interface CocCwlLeagueGroup {
  state: string;
  season: string;
  clans: CocCwlClan[];
  rounds: CocCwlRound[];
}

export interface CocCwlWar extends CocCurrentWar {
  warTag?: string;
}

export interface CocCapitalRaidSeasonMember {
  tag: string;
  name: string;
  attacks: number;
  attackLimit: number;
  bonusAttackLimit: number;
  capitalResourcesLooted: number;
  raidWeekendMedals?: number;
}

export interface CocCapitalRaidSeason {
  state: string;
  startTime: string;
  endTime: string;
  capitalTotalLoot: number;
  raidsCompleted?: number;
  totalAttacks?: number;
  offensiveReward?: number;
  defensiveReward?: number;
  members?: CocCapitalRaidSeasonMember[];
}

export const cocClient = {
  getClan: (clanTag: string) =>
    cocFetch<CocClan>(`/clans/${encodeTag(clanTag)}`),

  getMembers: (clanTag: string) =>
    cocFetch<{ items: CocClanMember[] }>(
      `/clans/${encodeTag(clanTag)}/members`,
    ),

  getPlayer: (playerTag: string) =>
    cocFetch<CocPlayer>(`/players/${encodeTag(playerTag)}`),

  getCurrentWar: (clanTag: string) =>
    cocFetch<CocCurrentWar>(`/clans/${encodeTag(clanTag)}/currentwar`),

  getWarLog: (clanTag: string) =>
    cocFetch<{ items: CocWarLogEntry[] }>(
      `/clans/${encodeTag(clanTag)}/warlog`,
    ),

  getCwlLeagueGroup: (clanTag: string) =>
    cocFetch<CocCwlLeagueGroup>(
      `/clans/${encodeTag(clanTag)}/currentwar/leaguegroup`,
    ),

  getCwlWar: (warTag: string) =>
    cocFetch<CocCwlWar>(`/clanwarleagues/wars/${encodeTag(warTag)}`),

  getCapitalRaidSeasons: (clanTag: string) =>
    cocFetch<{ items: CocCapitalRaidSeason[] }>(
      `/clans/${encodeTag(clanTag)}/capitalraidseasons`,
    ),
};

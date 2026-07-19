/**
 * Thin, typed wrapper around the Clash of Clans API via the RoyaleAPI proxy.
 * See concept/02-api-and-proxy-strategy.md for why this goes through a proxy
 * at all — server-side only, never called from the browser.
 */

const BASE_URL = process.env.COC_API_BASE_URL ?? "https://cocproxy.royaleapi.dev/v1";
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
// concept/12-roadmap-and-modularity.md. ---

export interface CocClanMember {
  tag: string;
  name: string;
  role: string;
  townHallLevel: number;
  donations: number;
  donationsReceived: number;
  trophies: number;
}

export interface CocClan {
  tag: string;
  name: string;
  clanLevel: number;
  badgeUrls?: { large?: string };
  warWins?: number;
  warTies?: number;
  warLosses?: number;
  warWinStreak?: number;
  requiredTrophies?: number;
  requiredTownhallLevel?: number;
  requiredBuilderBaseTrophies?: number;
  location?: { name: string };
  labels?: Array<{ name: string }>;
  warFrequency?: string;
  isWarLogPublic?: boolean;
  memberList: CocClanMember[];
  clanCapital?: {
    capitalHallLevel: number;
    districts: Array<{ name: string; districtHallLevel: number }>;
  };
}

export interface CocPlayer {
  tag: string;
  name: string;
  townHallLevel: number;
  role: string;
  warPreference?: "in" | "out";
  warStars: number;
  attackWins: number;
  defenseWins: number;
  bestTrophies: number;
  builderHallLevel?: number;
  versusTrophies?: number;
  bestVersusTrophies?: number;
  troops: Array<{ name: string; level: number; village: "home" | "builderBase" }>;
  heroes: Array<{ name: string; level: number; village: "home" | "builderBase" }>;
  heroEquipment?: Array<{ name: string; level: number }>;
  spells: Array<{ name: string; level: number }>;
  achievements: Array<{ name: string; value: number }>;
}

export interface CocCurrentWar {
  state: "notInWar" | "preparation" | "inWar" | "warEnded";
  teamSize?: number;
  attacksPerMember?: number;
  startTime?: string;
  endTime?: string;
  clan?: CocWarClan;
  opponent?: CocWarClan;
}

export interface CocWarClan {
  tag: string;
  name: string;
  stars: number;
  destructionPercentage: number;
  attacks: number;
  members: Array<{
    tag: string;
    name: string;
    townhallLevel: number;
    mapPosition: number;
    attacks?: Array<{
      attackerTag: string;
      defenderTag: string;
      stars: number;
      destructionPercentage: number;
      order: number;
    }>;
  }>;
}

export interface CocCapitalRaidSeason {
  state: string;
  startTime: string;
  endTime: string;
  capitalTotalLoot: number;
  members?: Array<{
    tag: string;
    name: string;
    attacks: number;
    capitalResourcesLooted: number;
  }>;
}

export const cocClient = {
  getClan: (clanTag: string) => cocFetch<CocClan>(`/clans/${encodeTag(clanTag)}`),

  getMembers: (clanTag: string) =>
    cocFetch<{ items: CocClanMember[] }>(`/clans/${encodeTag(clanTag)}/members`),

  getPlayer: (playerTag: string) =>
    cocFetch<CocPlayer>(`/players/${encodeTag(playerTag)}`),

  getCurrentWar: (clanTag: string) =>
    cocFetch<CocCurrentWar>(`/clans/${encodeTag(clanTag)}/currentwar`),

  getWarLog: (clanTag: string) =>
    cocFetch<{ items: unknown[] }>(`/clans/${encodeTag(clanTag)}/warlog`),

  getCapitalRaidSeasons: (clanTag: string) =>
    cocFetch<{ items: CocCapitalRaidSeason[] }>(
      `/clans/${encodeTag(clanTag)}/capitalraidseasons`,
    ),
};

import { clanConfig } from "@/config/clan.config";
import { getActivityTimeline, getClanInfo, getClanLog, getCurrentWar, getDonationTotals, getMembers } from "@/lib/db/queries";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { ActivityPanel, DonationPanel } from "@/components/dashboard-panels";
import { ClanLog } from "@/components/clan-log";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [clanRows, members, currentWar, clanLog, donation24, donation7, donation30, activity] = await Promise.all([
    getClanInfo(), getMembers(), getCurrentWar(), getClanLog(), getDonationTotals("24h"), getDonationTotals("7d"), getDonationTotals("30d"), getActivityTimeline("24h"),
  ]);
  const clan = clanRows[0];
  const war = currentWar[0];
  const recentLog = clanLog.flatMap((entry) => [entry.joinedAt ? { ...entry, type: "joined", date: entry.joinedAt } : null, entry.leftAt ? { ...entry, type: "left", date: entry.leftAt } : null]).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)).sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);
  const optOuts = members.filter((member) => member.warPreference === "out");
  const winTotal = (clan?.warWins ?? 0) + (clan?.warTies ?? 0) + (clan?.warLosses ?? 0);
  const winRate = winTotal ? `${Math.round(((clan?.warWins ?? 0) / winTotal) * 100)}%` : "—";
  return <div className="mx-auto max-w-7xl p-5 sm:p-8"><header className="mb-8 flex flex-wrap items-end justify-between gap-5"><div><p className="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-umbra-purple">Command center</p><h1 className="font-display text-3xl font-bold tracking-wide text-umbra-lilac sm:text-4xl">{clan?.name ?? "Umbra Lunaria"}</h1><p className="mt-2 text-sm text-umbra-muted">Dashboard · {clanConfig.clanTag}</p></div><div className="rounded-full border border-umbra-purple/20 bg-umbra-purple/10 px-4 py-2 font-mono text-xs text-umbra-lilac">{clan?.lastPolledAt ? `Polled ${clan.lastPolledAt.toLocaleString()}` : "Awaiting first poll"}</div></header>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Clan level" value={clan?.clanLevel ?? "—"} /><StatCard label="War wins" value={clan?.warWins ?? "—"} trend={winTotal ? `${winRate} all-time win rate` : undefined} /><StatCard label="Members" value={members.length} /><StatCard label="Capital hall" value={clan?.capitalHallLevel ?? "—"} /></section>
    <section className="mt-6 grid gap-5 xl:grid-cols-[1.5fr_1fr]"><DonationPanel data={{ "24h": donation24, "7d": donation7, "30d": donation30 }} /><ActivityPanel data={activity} /></section>
    <section className="mt-5 glass rounded-2xl p-6"><p className="font-mono text-[11px] uppercase tracking-wider text-umbra-purple">Clan profile</p><h2 className="mt-1 font-display text-xl text-umbra-lilac">About the clan</h2><div className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4"><div><p className="text-xs uppercase text-umbra-muted">Location</p><p className="mt-1 text-umbra-lilac">{clan?.location ?? "—"}</p></div><div><p className="text-xs uppercase text-umbra-muted">War frequency</p><p className="mt-1 text-umbra-lilac">{clan?.warFrequency ?? "—"}</p></div><div><p className="text-xs uppercase text-umbra-muted">Join trophies</p><p className="mt-1 text-umbra-lilac">{clan?.requiredTrophies ?? "—"}</p></div><div><p className="text-xs uppercase text-umbra-muted">Town Hall minimum</p><p className="mt-1 text-umbra-lilac">{clan?.requiredTownHallLevel ?? "—"}</p></div></div></section>
    <section className="mt-5 grid gap-5 lg:grid-cols-2">
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-umbra-purple">Attention queue</p>
            <h2 className="mt-1 font-display text-xl text-umbra-lilac">Needs attention</h2>
          </div>
          <Badge tone={optOuts.length ? "warning" : "success"}>{optOuts.length} opted out</Badge>
        </div>
        {optOuts.length ? <div className="mt-5 space-y-3">{optOuts.slice(0, 5).map((member) => <div className="flex justify-between rounded-xl bg-white/5 px-4 py-3 text-sm" key={member.playerTag}><span className="text-umbra-lilac">{member.name}</span><span className="text-umbra-muted">war preference out</span></div>)}</div> : <div className="mt-5"><EmptyState title="Nothing urgent" description="No members are currently marked as opted out of war." /></div>}
      </div>
      <ClanLog entries={recentLog.map((entry) => ({ ...entry, date: entry.date.toISOString() }))} />
    </section>
    <section className="mt-5 grid gap-5 lg:grid-cols-2">
      <a href="/war" className="glass rounded-2xl p-5 transition hover:border-umbra-purple/40">
        <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-mono text-[11px] uppercase tracking-wider text-umbra-purple">Navigation strip</p><h2 className="mt-1 font-display text-lg text-umbra-lilac">Current war</h2></div>{war ? <><Badge tone="success">{war.state}</Badge><span className="text-sm text-umbra-muted">vs {war.opponentName ?? "Unknown opponent"} · {war.ownStars ?? 0}–{war.opponentStars ?? 0} stars</span></> : <span className="text-sm text-umbra-muted">No active war recorded</span>}</div>
      </a>
      <a href="/capital" className="glass rounded-2xl p-5 transition hover:border-umbra-purple/40">
        <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="font-mono text-[11px] uppercase tracking-wider text-umbra-purple">Navigation strip</p><h2 className="mt-1 font-display text-lg text-umbra-lilac">Capital raid weekend</h2></div><Badge tone="muted">Overview</Badge><span className="text-sm text-umbra-muted">District snapshots available in Capital</span></div>
      </a>
    </section>
  </div>;
}

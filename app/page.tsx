import { clanConfig } from "@/config/clan.config";

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-semibold">Umbra Lunaria</h1>
      <p className="mt-2 text-neutral-400">
        Tracking clan {clanConfig.clanTag}. Dashboard widgets land in Phase 1
        — see concept/05-dashboard.md.
      </p>
    </main>
  );
}

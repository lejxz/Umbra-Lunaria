"use client";

import { useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs } from "@/components/ui/tabs";

type DonationData = {
  given: number;
  received: number;
  donors: { playerTag: string; given: number; received: number }[];
};

export function DonationPanel({
  data,
}: {
  data: Record<"24h" | "7d" | "30d", DonationData>;
}) {
  const [window, setWindow] = useState<"24h" | "7d" | "30d">("24h");
  const current = data[window];

  return (
    <section className="glass rounded-2xl p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-umbra-purple">Contribution pulse</p>
          <h2 className="mt-1 font-display text-xl text-umbra-lilac">Clan donations</h2>
        </div>
        <Tabs items={["24h", "7d", "30d"]} active={window} onChange={(value) => setWindow(value as typeof window)} />
      </div>
      {current.given === 0 && current.received === 0 ? (
        <EmptyState title="Waiting for donation history" description="Donation trends will appear after the next polling snapshots are captured." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-white/5 p-4"><p className="text-xs uppercase text-umbra-muted">Given</p><p className="mt-2 text-2xl font-bold text-white">{current.given.toLocaleString()}</p></div>
            <div className="rounded-xl bg-white/5 p-4"><p className="text-xs uppercase text-umbra-muted">Received</p><p className="mt-2 text-2xl font-bold text-white">{current.received.toLocaleString()}</p></div>
          </div>
          <div className="mt-5 space-y-3">
            {current.donors.map((donor, index) => <div className="flex items-center justify-between text-sm" key={donor.playerTag}><span className="text-umbra-muted">#{index + 1} {donor.playerTag}</span><span className="font-mono text-umbra-lilac">{donor.given.toLocaleString()}</span></div>)}
          </div>
        </>
      )}
    </section>
  );
}

export function ActivityPanel({ data }: { data: { label: string; active: number }[] }) {
  return (
    <section className="glass rounded-2xl p-6">
      <p className="font-mono text-[11px] uppercase tracking-wider text-umbra-purple">Roster signal</p>
      <h2 className="mt-1 font-display text-xl text-umbra-lilac">Activity timeline</h2>
      {data.length === 0 ? (
        <div className="mt-5"><EmptyState title="No activity history yet" description="The activity graph will fill as polling records member snapshots." /></div>
      ) : (
        <div className="mt-6 flex h-40 items-end gap-2 overflow-x-auto">
          {data.map((item) => <div className="flex min-w-8 flex-col items-center gap-2" key={item.label}><div className="w-full rounded-t bg-gradient-to-t from-umbra-indigo to-umbra-purple" style={{ height: `${Math.max(8, item.active * 18)}px` }} title={`${item.label}: ${item.active} active`} /><span className="rotate-[-55deg] whitespace-nowrap text-[9px] text-umbra-muted">{item.label}</span></div>)}
        </div>
      )}
    </section>
  );
}

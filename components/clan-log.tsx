"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";

type ClanLogEntry = { name: string; playerTag: string; type: string; date: string };

export function ClanLog({ entries }: { entries: ClanLogEntry[] }) {
  const [selected, setSelected] = useState<ClanLogEntry | null>(null);
  const retentionCutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  return <div className="glass rounded-2xl p-6"><p className="font-mono text-[11px] uppercase tracking-wider text-umbra-purple">Roster history</p><h2 className="mt-1 font-display text-xl text-umbra-lilac">Clan log</h2>{entries.length ? <div className="mt-5 space-y-4">{entries.map((entry) => <button className="flex w-full items-start justify-between gap-4 text-left text-sm" key={`${entry.playerTag}-${entry.type}-${entry.date}`} onClick={() => setSelected(entry)}><div><p className="text-umbra-lilac">{entry.name}</p><p className="text-xs text-umbra-muted">{entry.type === "joined" ? "Joined the clan" : "Left the clan"} · {new Date(entry.date).toLocaleDateString()}</p></div><Badge tone={entry.type === "joined" ? "success" : "muted"}>{entry.type}</Badge></button>)}</div> : <div className="mt-5"><p className="text-sm text-umbra-muted">No roster changes recorded yet.</p></div>}<Modal open={Boolean(selected)} onClose={() => setSelected(null)}>{selected && (new Date(selected.date).getTime() < retentionCutoff && selected.type === "left" ? <><p className="font-mono text-xs uppercase tracking-wider text-umbra-purple">Member record</p><h3 className="mt-2 font-display text-2xl text-umbra-lilac">Data removed</h3><p className="mt-3 text-sm leading-6 text-umbra-muted">{selected.name} left the clan on {new Date(selected.date).toLocaleDateString()}; data was removed after the 14-day retention period.</p></> : <><p className="font-mono text-xs uppercase tracking-wider text-umbra-purple">Member record</p><h3 className="mt-2 font-display text-2xl text-umbra-lilac">{selected.name}</h3><p className="mt-3 text-sm text-umbra-muted">Player tag: <span className="font-mono text-umbra-lilac">{selected.playerTag}</span></p><p className="mt-2 text-sm text-umbra-muted">This member detail surface will expand with activity, career, and war participation in Step 1.2.</p></>)}</Modal></div>;
}

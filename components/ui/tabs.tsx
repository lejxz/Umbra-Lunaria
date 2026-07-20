"use client";
import type { ReactNode } from "react";
export function Tabs({ items, active, onChange }: { items: string[]; active: string; onChange: (value: string) => void }) { return <div className="flex gap-1 rounded-xl bg-white/5 p-1">{items.map((item) => <button className={`focus-ring rounded-lg px-3 py-2 text-xs font-semibold ${item === active ? "bg-umbra-purple/20 text-umbra-purple" : "text-umbra-muted"}`} key={item} onClick={() => onChange(item)}>{item}</button>)}</div>; }

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { IconSync, IconLoader, IconAlert } from "@/components/ui/icons";

/**
 * War refresh control — POSTs /api/war/refresh, which fetches the current war
 * server-side behind a shared TTL (concept/07 §"Refresh behavior"). The
 * browser never calls Supercell directly. Shows loading, success, cached
 * (rate-limited), and error states, and triggers a client-side router refresh
 * on success so the new capture time + state render without a hard reload.
 */
export function WarRefreshButton({ ttlSeconds }: { ttlSeconds: number }) {
  const router = useRouter();
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "cached" | "error"
  >("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [retryIn, setRetryIn] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function handleRefresh() {
    if (status === "loading") return;
    setStatus("loading");
    setMessage(null);

    try {
      const res = await fetch("/api/war/refresh", { method: "POST" });
      const data = await res.json();

      if (data.cached) {
        setStatus("cached");
        const wait = data.ttlSeconds ?? ttlSeconds;
        setMessage("Refreshed recently");
        setRetryIn(wait);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setRetryIn((s) => {
            if (s <= 1) {
              if (timerRef.current) clearInterval(timerRef.current);
              setStatus("idle");
              setMessage(null);
              return 0;
            }
            return s - 1;
          });
        }, 1000);
        return;
      }

      if (data.ok) {
        setStatus("success");
        setMessage(
          data.state === "notInWar"
            ? "No active war — refreshed"
            : `Refreshed · ${data.warType ?? "regular"} war · ${data.state}`,
        );
        // Re-fetch server data so the new capture renders.
        router.refresh();
        setTimeout(() => {
          setStatus("idle");
          setMessage(null);
        }, 4000);
      } else {
        setStatus("error");
        setMessage(data.error || "Refresh failed");
      }
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Network error");
    }
  }

  const disabled = status === "loading" || status === "cached";
  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={handleRefresh}
        disabled={disabled}
        className="focus-ring inline-flex items-center gap-2 rounded-full border border-umbra-line bg-umbra-surface/70 px-4 py-2 font-mono text-label uppercase tracking-wider text-umbra-lilac transition hover:border-umbra-purple/50 hover:bg-umbra-surface disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Refresh current war"
      >
        {status === "loading" ? (
          <IconLoader className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <IconSync className="h-4 w-4" aria-hidden />
        )}
        {status === "loading" ? "Refreshing…" : "Refresh war"}
      </button>
      {message && (
        <p
          className={`flex items-center gap-1.5 text-2xs ${
            status === "error"
              ? "text-red-400"
              : status === "cached"
                ? "text-amber-400"
                : "text-emerald-400"
          }`}
          role={status === "error" ? "alert" : "status"}
        >
          {status === "error" && <IconAlert className="h-3 w-3" aria-hidden />}
          {message}
          {status === "cached" && retryIn > 0 ? ` — try again in ${retryIn}s` : ""}
        </p>
      )}
    </div>
  );
}

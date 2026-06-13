"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import WebsiteCard from "@/components/WebsiteCard";
import WaveBars from "@/components/WaveBars";
import { api, ApiError, type Website } from "@/lib/api";

export default function DashboardPage() {
  const [sites, setSites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.listWebsites();
      // newest first
      data.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
      setSites(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load agents.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll while any agent is still building.
  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const anyPending = sites.some((s) => s.status === "pending");
    if (timer.current) clearTimeout(timer.current);
    if (anyPending) {
      timer.current = setTimeout(load, 4000);
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [sites, load]);

  const building = sites.filter((s) => s.status === "pending").length;

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-14">
        {/* Header */}
        <div className="rise flex items-end justify-between">
          <div>
            <span className="mono-label text-cream-faint">Workspace</span>
            <h1 className="mt-2 font-display text-5xl md:text-6xl">
              Your agents
            </h1>
          </div>
          <div className="hidden text-right sm:block">
            <p className="font-display text-4xl text-signal">{sites.length}</p>
            <span className="mono-label text-cream-faint">
              {building > 0 ? `${building} building` : "total"}
            </span>
          </div>
        </div>

        {/* New-agent CTA → wizard */}
        <div className="rise mt-10" style={{ animationDelay: "80ms" }}>
          <Link
            href="/new"
            className="group flex items-center justify-between gap-4 rounded-2xl border border-line bg-panel/60 p-5 transition-all hover:-translate-y-0.5 hover:border-signal/40 hover:bg-panel"
          >
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-ink">
                <WaveBars bars={4} active={false} className="h-5 transition-opacity group-hover:opacity-100" />
              </span>
              <div>
                <h2 className="font-display text-2xl">Build a new agent</h2>
                <p className="font-mono text-xs text-cream-faint">
                  Link → persona → knowledge → prompt → tools → phone number
                </p>
              </div>
            </div>
            <span className="mono-label rounded-full border border-signal/50 bg-signal/10 px-5 py-2.5 text-signal transition-colors group-hover:bg-signal group-hover:text-ink">
              Start →
            </span>
          </Link>
        </div>

        {/* List */}
        <div className="mt-12 flex flex-col gap-3">
          {loading ? (
            <div className="flex items-center justify-center gap-3 rounded-2xl border border-line bg-panel/40 py-16 text-cream-faint">
              <WaveBars bars={5} className="h-5" />
              <span className="font-mono text-sm">Loading workspace…</span>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-coral/40 bg-coral/5 p-6 text-center">
              <p className="font-display text-2xl text-coral">
                Can&apos;t reach the backend
              </p>
              <p className="mt-1 font-mono text-xs text-cream-dim">{error}</p>
              <button
                onClick={load}
                className="mono-label mt-4 rounded-full border border-line px-4 py-2 text-cream-dim hover:text-cream"
              >
                Retry
              </button>
            </div>
          ) : sites.length === 0 ? (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-line bg-panel/20 py-20 text-center">
              <WaveBars bars={6} active={false} className="h-6 opacity-50" />
              <p className="font-display text-2xl">No agents yet</p>
              <p className="max-w-sm font-mono text-xs text-cream-faint">
                Paste a website URL above to mint your first voice agent.
              </p>
            </div>
          ) : (
            sites.map((s, i) => (
              <div
                key={s.id}
                className="rise"
                style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
              >
                <WebsiteCard
                  site={s}
                  onDeleted={(id) =>
                    setSites((prev) => prev.filter((x) => x.id !== id))
                  }
                />
              </div>
            ))
          )}
        </div>
      </main>
    </>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Nav from "@/components/Nav";
import WaveBars from "@/components/WaveBars";
import LeadCard from "@/components/LeadCard";
import { api, ApiError, type Analytics, type Lead } from "@/lib/api";

function fmtDuration(sec: number) {
  if (!sec) return "0s";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m ? `${m}m ${s}s` : `${s}s`;
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-line bg-panel/40 p-5">
      <span className="mono-label text-cream-faint">{label}</span>
      <p
        className={`mt-2 font-display text-4xl ${accent ? "text-signal" : "text-cream"}`}
      >
        {value}
      </p>
      {sub && <p className="mt-1 font-mono text-xs text-cream-faint">{sub}</p>}
    </div>
  );
}

function leadsToCsv(leads: Lead[]) {
  const cols = [
    "name", "email", "phone", "leadScore", "intent", "interestedIn",
    "sentiment", "website_name", "type", "callbackPlaced", "created_at",
  ];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = leads.map((l) =>
    cols.map((c) => esc((l as unknown as Record<string, unknown>)[c])).join(","),
  );
  return [cols.join(","), ...rows].join("\n");
}

export default function InsightsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    try {
      const [a, l] = await Promise.all([api.getAnalytics(), api.getLeads()]);
      setAnalytics(a);
      setLeads(l);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load insights.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Pull the latest post-call analysis from Bolna's executions API, then refresh.
  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      await api.syncCalls();
      await load();
    } catch {
      /* best-effort; the 6s poll still refreshes */
    } finally {
      setSyncing(false);
    }
  }, [load]);

  // Poll so the dashboard updates live as calls land during a demo.
  useEffect(() => {
    load();
    sync(); // backfill transcripts/leads from the executions API on open
    const tick = () => {
      timer.current = setTimeout(async () => {
        await load();
        tick();
      }, 6000);
    };
    tick();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [load, sync]);

  function exportCsv() {
    const blob = new Blob([leadsToCsv(leads)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "zukii-leads.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const t = analytics?.totals;
  const maxDay = Math.max(1, ...(analytics?.overTime.map((d) => d.count) ?? [1]));

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">
        <div className="flex items-end justify-between">
          <div>
            <span className="mono-label text-cream-faint">Conversation intelligence</span>
            <h1 className="mt-2 font-display text-5xl md:text-6xl">Insights</h1>
          </div>
          <div className="hidden items-center gap-4 sm:flex">
            <button
              onClick={sync}
              disabled={syncing}
              className="mono-label rounded-full border border-line px-4 py-2 text-cream-dim transition hover:border-signal hover:text-signal disabled:opacity-50"
            >
              {syncing ? "Syncing…" : "Sync calls"}
            </button>
            <span className="mono-label flex items-center gap-2 text-cream-faint">
              <WaveBars bars={4} className="h-3" /> live · updates every 6s
            </span>
          </div>
        </div>

        {loading ? (
          <div className="mt-14 flex items-center justify-center gap-3 rounded-2xl border border-line bg-panel/40 py-20 text-cream-faint">
            <WaveBars bars={5} className="h-5" />
            <span className="font-mono text-sm">Loading insights…</span>
          </div>
        ) : error ? (
          <div className="mt-14 rounded-2xl border border-coral/40 bg-coral/5 p-6 text-center">
            <p className="font-display text-2xl text-coral">Can&apos;t load insights</p>
            <p className="mt-1 font-mono text-xs text-cream-dim">{error}</p>
          </div>
        ) : (
          <>
            {/* Stat grid */}
            <div className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label="Total calls" value={t?.calls ?? 0} sub={`${t?.web ?? 0} web · ${t?.phone ?? 0} phone`} />
              <Stat label="Leads captured" value={t?.leads ?? 0} accent sub={`${t?.hotLeads ?? 0} hot`} />
              <Stat label="Auto-callbacks" value={t?.callbacks ?? 0} sub="hot leads called back" />
              <Stat label="Avg duration" value={fmtDuration(t?.avgDurationSec ?? 0)} sub={`$${t?.totalCost ?? 0} spent`} />
            </div>

            {/* Calls over time */}
            {analytics && analytics.overTime.length > 0 && (
              <div className="mt-3 rounded-2xl border border-line bg-panel/40 p-5">
                <span className="mono-label text-cream-faint">Calls over time</span>
                <div className="mt-5 flex h-28 items-end gap-2">
                  {analytics.overTime.map((d) => (
                    <div key={d.date} className="flex flex-1 flex-col items-center gap-2">
                      <div
                        className="w-full rounded-t bg-signal/70 transition-all"
                        style={{ height: `${(d.count / maxDay) * 100}%`, minHeight: 4 }}
                        title={`${d.date}: ${d.count}`}
                      />
                      <span className="mono-label text-[0.6rem] text-cream-faint">
                        {d.date.slice(5)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3 grid gap-3 lg:grid-cols-[1.4fr_1fr]">
              {/* Lead Inbox */}
              <div className="rounded-2xl border border-line bg-ink/40 p-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-2xl">Lead Inbox</h2>
                  <button
                    onClick={exportCsv}
                    disabled={!leads.length}
                    className="mono-label rounded-md border border-line px-3 py-1.5 text-cream-dim transition-colors hover:text-cream disabled:opacity-40"
                  >
                    Export CSV
                  </button>
                </div>
                <div className="mt-4 flex flex-col gap-3">
                  {leads.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-line py-12 text-center">
                      <p className="font-mono text-xs text-cream-faint">
                        No leads yet — talk to an agent and express interest to capture one.
                      </p>
                    </div>
                  ) : (
                    leads.map((l) => <LeadCard key={l.call_id} lead={l} />)
                  )}
                </div>
              </div>

              {/* Right rail: gaps + sentiment */}
              <div className="flex flex-col gap-3">
                <div className="rounded-2xl border border-line bg-panel/40 p-5">
                  <span className="mono-label text-cream-faint">
                    Knowledge gaps · what your site is missing
                  </span>
                  <div className="mt-4 flex flex-col gap-2">
                    {analytics && analytics.topGaps.length > 0 ? (
                      analytics.topGaps.map((g) => (
                        <div key={g.question} className="flex items-start justify-between gap-3">
                          <span className="text-sm text-cream-dim">{g.question}</span>
                          <span className="mono-label shrink-0 rounded-full border border-amber/40 px-2 py-0.5 text-amber">
                            {g.count}×
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="font-mono text-xs text-cream-faint">
                        No unanswered questions detected yet.
                      </p>
                    )}
                  </div>
                </div>

                {analytics && Object.keys(analytics.sentiment).length > 0 && (
                  <div className="rounded-2xl border border-line bg-panel/40 p-5">
                    <span className="mono-label text-cream-faint">Sentiment</span>
                    <div className="mt-4 flex flex-col gap-2">
                      {Object.entries(analytics.sentiment).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between">
                          <span className="text-sm capitalize text-cream-dim">{k}</span>
                          <span className="font-mono text-sm text-cream">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analytics && analytics.perAgent.length > 0 && (
                  <div className="rounded-2xl border border-line bg-panel/40 p-5">
                    <span className="mono-label text-cream-faint">Per agent</span>
                    <div className="mt-4 flex flex-col gap-2">
                      {analytics.perAgent.map((a) => (
                        <div key={a.name} className="flex items-center justify-between gap-3">
                          <span className="truncate text-sm text-cream-dim">{a.name}</span>
                          <span className="mono-label shrink-0 text-cream-faint">
                            {a.calls} calls · {a.leads} leads
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}

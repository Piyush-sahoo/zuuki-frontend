"use client";

import type { Lead } from "@/lib/api";

const SCORE: Record<string, { label: string; cls: string }> = {
  hot: { label: "HOT", cls: "border-coral/50 text-coral bg-coral/5" },
  warm: { label: "WARM", cls: "border-amber/50 text-amber bg-amber/5" },
  cold: { label: "COLD", cls: "border-line text-cream-faint" },
};

export default function LeadCard({ lead }: { lead: Lead }) {
  const score = SCORE[lead.leadScore ?? "cold"] ?? SCORE.cold;
  const who =
    lead.name || lead.email || lead.phone || lead.website_name || "Anonymous";

  return (
    <div className="rounded-2xl border border-line bg-panel/50 p-5 transition-colors hover:border-cream-faint/40">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-display text-xl">{who}</h3>
            <span className={`mono-label rounded-full border px-2 py-0.5 ${score.cls}`}>
              {score.label}
            </span>
            {lead.callbackPlaced && (
              <span className="mono-label rounded-full border border-signal/50 bg-signal/10 px-2 py-0.5 text-signal">
                ↳ called back
              </span>
            )}
          </div>
          <p className="mt-0.5 font-mono text-xs text-cream-faint">
            {lead.website_name ?? "—"} · {lead.type === "webCall" ? "web" : "phone"}
          </p>
        </div>
        <span className="mono-label shrink-0 text-cream-faint">
          {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : ""}
        </span>
      </div>

      {lead.intent && (
        <p className="mt-3 text-cream-dim">
          <span className="text-cream-faint">Wants:</span> {lead.intent}
        </p>
      )}
      {lead.summary && (
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-cream-faint">
          {lead.summary}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs text-cream-dim">
        {lead.email && <span>✉ {lead.email}</span>}
        {lead.phone && <span>☎ {lead.phone}</span>}
        {lead.sentiment && (
          <span className="text-cream-faint">sentiment: {lead.sentiment}</span>
        )}
      </div>
    </div>
  );
}

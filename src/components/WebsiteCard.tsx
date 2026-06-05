"use client";

import Link from "next/link";
import { useState } from "react";
import { api, type Website } from "@/lib/api";
import StatusBadge from "./StatusBadge";
import WaveBars from "./WaveBars";

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function WebsiteCard({
  site,
  onDeleted,
}: {
  site: Website;
  onDeleted: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [hovered, setHovered] = useState(false);
  const host = hostOf(site.url);
  const title = site.name && site.name !== site.url ? site.name : host;
  const live = site.status === "completed";

  async function remove(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (deleting) return;
    setDeleting(true);
    try {
      await api.deleteWebsite(site.id);
      onDeleted(site.id);
    } catch {
      setDeleting(false);
    }
  }

  const glyphColor =
    site.status === "failed"
      ? "var(--coral)"
      : live
        ? "var(--signal)"
        : "var(--amber)";

  const Inner = (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group relative flex items-center gap-5 overflow-hidden rounded-2xl border bg-panel/50 p-5 transition-all duration-300 ${
        live
          ? "border-line hover:-translate-y-0.5 hover:border-signal/40 hover:bg-panel hover:shadow-[0_8px_30px_-12px_rgba(214,255,63,0.18)]"
          : "border-line"
      } ${deleting ? "opacity-40" : ""}`}
    >
      {/* sweeping highlight on hover */}
      {live && (
        <span
          className="pointer-events-none absolute inset-y-0 -left-full w-1/2 bg-gradient-to-r from-transparent via-signal/[0.06] to-transparent transition-all duration-700 group-hover:left-full"
          aria-hidden
        />
      )}

      {/* glyph — wakes up on hover for completed agents */}
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-ink transition-colors duration-300 ${
          hovered && live ? "border-signal/40" : "border-line"
        }`}
      >
        <WaveBars
          bars={4}
          active={site.status === "pending" || (live && hovered)}
          speed={live && hovered ? 0.8 : 1.1}
          className="h-5"
          color={glyphColor}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <h3 className="truncate font-display text-xl">{title}</h3>
          <StatusBadge status={site.status} />
        </div>
        <p className="truncate font-mono text-xs text-cream-faint">{site.url}</p>
      </div>

      {live && (
        <span className="mono-label hidden shrink-0 text-cream-faint transition-colors group-hover:text-signal md:inline">
          Open →
        </span>
      )}

      <button
        onClick={remove}
        title="Delete agent"
        className="shrink-0 rounded-lg border border-line px-3 py-2 font-mono text-xs text-cream-faint transition-colors hover:border-coral/50 hover:text-coral"
      >
        {deleting ? "···" : "✕"}
      </button>
    </div>
  );

  return live ? (
    <Link href={`/agents/${site.id}`} className="block">
      {Inner}
    </Link>
  ) : (
    <div>{Inner}</div>
  );
}

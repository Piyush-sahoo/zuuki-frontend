"use client";

import { useState } from "react";
import { api, ApiError, type Website } from "@/lib/api";
import WaveBars from "./WaveBars";

export default function AddWebsiteForm({
  onCreated,
}: {
  onCreated: (w: Website) => void;
}) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    let normalized = url.trim();
    if (!normalized) return;
    if (!/^https?:\/\//i.test(normalized)) normalized = `https://${normalized}`;

    setBusy(true);
    try {
      const created = await api.addWebsite({
        url: normalized,
        name: name.trim() || undefined,
      });
      onCreated(created);
      setUrl("");
      setName("");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Something went wrong.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="relative overflow-hidden rounded-2xl border border-line bg-panel/60 p-2"
    >
      <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-stretch">
        <div className="grid gap-2 sm:grid-cols-[1.6fr_1fr]">
          <label className="flex flex-col rounded-xl bg-ink/60 px-4 py-3">
            <span className="mono-label text-cream-faint">Website URL</span>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="docs.yourcompany.com"
              autoComplete="off"
              spellCheck={false}
              className="bg-transparent pt-1 text-cream placeholder:text-cream-faint focus:outline-none"
            />
          </label>
          <label className="flex flex-col rounded-xl bg-ink/60 px-4 py-3">
            <span className="mono-label text-cream-faint">Name · optional</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Support Agent"
              autoComplete="off"
              className="bg-transparent pt-1 text-cream placeholder:text-cream-faint focus:outline-none"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="group flex items-center justify-center gap-2 rounded-xl bg-signal px-7 py-3 font-mono text-sm font-medium uppercase tracking-wider text-ink transition-all hover:bg-signal-deep disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? (
            <>
              <WaveBars bars={4} className="h-4" color="var(--ink)" />
              Crawling
            </>
          ) : (
            <>Build agent</>
          )}
        </button>
      </div>
      {error && (
        <p className="px-3 pb-1 pt-2 font-mono text-xs text-coral">{error}</p>
      )}
    </form>
  );
}

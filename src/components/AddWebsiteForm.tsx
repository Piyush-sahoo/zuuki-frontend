"use client";

import { useEffect, useState } from "react";
import { api, ApiError, type Website, type VoiceOptions } from "@/lib/api";
import WaveBars from "./WaveBars";

const LABEL = "mono-label text-cream-faint";
const FIELD =
  "rounded-xl bg-ink/60 px-4 py-2.5 text-cream placeholder:text-cream-faint focus:outline-none focus:ring-1 focus:ring-signal/40";

export default function AddWebsiteForm({
  onCreated,
}: {
  onCreated: (w: Website) => void;
}) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<VoiceOptions | null>(null);

  // persona config
  const [role, setRole] = useState("Support");
  const [tone, setTone] = useState("Warm");
  const [language, setLanguage] = useState("en");
  const [voice, setVoice] = useState("meera");
  const [instructions, setInstructions] = useState("");
  const [greeting, setGreeting] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getVoiceOptions().then(setOpts).catch(() => {});
  }, []);

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
        role,
        tone,
        language,
        voice,
        instructions: instructions.trim() || undefined,
        greeting: greeting.trim() || undefined,
      });
      onCreated(created);
      setUrl("");
      setName("");
      setInstructions("");
      setGreeting("");
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="overflow-hidden rounded-2xl border border-line bg-panel/60 p-2"
    >
      <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-stretch">
        <div className="grid gap-2 sm:grid-cols-[1.6fr_1fr]">
          <label className="flex flex-col rounded-xl bg-ink/60 px-4 py-3">
            <span className={LABEL}>Website URL</span>
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
            <span className={LABEL}>Name · optional</span>
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
              Building
            </>
          ) : (
            <>Build agent</>
          )}
        </button>
      </div>

      {/* Customize toggle */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mono-label mt-2 px-3 py-1 text-cream-faint transition-colors hover:text-cream"
      >
        {open ? "▾ Persona & voice" : "▸ Customize persona & voice"}
      </button>

      {open && (
        <div className="mt-2 grid gap-3 rounded-xl border border-line bg-ink/40 p-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className={LABEL}>Role</span>
            <select value={role} onChange={(e) => setRole(e.target.value)} className={FIELD}>
              {(opts?.roles ?? ["Support", "Sales", "Booking"]).map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={LABEL}>Tone</span>
            <select value={tone} onChange={(e) => setTone(e.target.value)} className={FIELD}>
              {(opts?.tones ?? ["Warm", "Professional", "Playful", "Concise"]).map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={LABEL}>Language</span>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className={FIELD}>
              {(opts?.languages ?? [{ code: "en", label: "English" }]).map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={LABEL}>Voice</span>
            <select value={voice} onChange={(e) => setVoice(e.target.value)} className={FIELD}>
              {(opts?.voices ?? [{ id: "meera", label: "Meera" }]).map((v) => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className={LABEL}>Greeting · optional</span>
            <input
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              placeholder="Hi! Thanks for calling Acme — how can I help?"
              className={FIELD}
            />
          </label>
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className={LABEL}>Custom instructions · optional</span>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Always offer a demo booking. Never quote prices. Escalate angry callers."
              rows={2}
              className={`${FIELD} resize-none`}
            />
          </label>
        </div>
      )}

      {error && <p className="px-3 pb-1 pt-2 font-mono text-xs text-coral">{error}</p>}
    </form>
  );
}

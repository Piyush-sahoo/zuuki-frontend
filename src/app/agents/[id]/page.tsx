"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Nav from "@/components/Nav";
import WaveBars from "@/components/WaveBars";
import StatusBadge from "@/components/StatusBadge";
import EmbedCodeBlock from "@/components/EmbedCodeBlock";
import VapiWidget from "@/components/VapiWidget";
import CallMeForm from "@/components/CallMeForm";
import VoiceChat from "@/components/VoiceChat";
import { api, ApiError, type Website } from "@/lib/api";

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default function AgentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [site, setSite] = useState<Website | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let t: ReturnType<typeof setTimeout>;
    async function load() {
      try {
        const data = await api.getWebsite(id);
        if (!active) return;
        setSite(data);
        setError(null);
        // keep polling while it builds
        if (data.status === "pending") t = setTimeout(load, 4000);
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof ApiError ? err.message : "Failed to load agent.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [id]);

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
        <Link
          href="/dashboard"
          className="mono-label text-cream-faint transition-colors hover:text-cream"
        >
          ← Dashboard
        </Link>

        {loading ? (
          <div className="mt-10 flex items-center justify-center gap-3 rounded-2xl border border-line bg-panel/40 py-20 text-cream-faint">
            <WaveBars bars={5} className="h-5" />
            <span className="font-mono text-sm">Loading agent…</span>
          </div>
        ) : error || !site ? (
          <div className="mt-10 rounded-2xl border border-coral/40 bg-coral/5 p-8 text-center">
            <p className="font-display text-3xl text-coral">Agent not found</p>
            <p className="mt-1 font-mono text-xs text-cream-dim">
              {error ?? "This agent may have been deleted."}
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="rise mt-8 flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-3 flex items-center gap-3">
                  <StatusBadge status={site.status} />
                  <span className="mono-label text-cream-faint">
                    {hostOf(site.url)}
                  </span>
                </div>
                <h1 className="font-display text-5xl md:text-6xl">
                  {site.name && site.name !== site.url
                    ? site.name
                    : hostOf(site.url)}
                </h1>
                <a
                  href={site.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block font-mono text-xs text-cream-faint underline-offset-4 hover:text-signal hover:underline"
                >
                  {site.url} ↗
                </a>
              </div>
            </div>

            {site.status === "pending" ? (
              <div className="rise mt-12 flex flex-col items-center gap-5 rounded-2xl border border-amber/30 bg-amber/5 py-20 text-center">
                <WaveBars bars={6} className="h-7" color="var(--amber)" />
                <p className="font-display text-3xl text-amber">
                  Building your agent…
                </p>
                <p className="max-w-sm font-mono text-xs text-cream-dim">
                  Crawling the site, assembling the knowledge base, and writing a
                  voice persona. This page updates automatically.
                </p>
              </div>
            ) : site.status === "failed" ? (
              <div className="rise mt-12 rounded-2xl border border-coral/40 bg-coral/5 p-10 text-center">
                <p className="font-display text-3xl text-coral">Build failed</p>
                <p className="mt-2 max-w-md mx-auto font-mono text-xs text-cream-dim">
                  The crawl or agent creation didn&apos;t complete. Delete this
                  one and try again — some sites block crawlers.
                </p>
              </div>
            ) : (
              <div className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
                {/* Live demo — phone (Bolna) + browser (Cartesia), or web widget (VAPI) */}
                <div className="rise flex min-w-0 flex-col gap-4" style={{ animationDelay: "60ms" }}>
                  {site.bolna_agent_id ? (
                    <>
                      <CallMeForm
                        websiteId={site.id}
                        inboundNumber={site.inbound_number}
                      />
                      <VoiceChat websiteId={site.id} />
                    </>
                  ) : site.vapi_agent_id ? (
                    <VapiWidget assistantId={site.vapi_agent_id} />
                  ) : null}
                </div>

                {/* Embed + meta */}
                <div
                  className="rise flex min-w-0 flex-col gap-6"
                  style={{ animationDelay: "120ms" }}
                >
                  {site.embed_code && !site.bolna_agent_id && (
                    <EmbedCodeBlock
                      code={site.embed_code}
                      agentName={site.name ?? hostOf(site.url)}
                    />
                  )}

                  <div className="rounded-2xl border border-line bg-panel/40 p-5">
                    <span className="mono-label text-cream-faint">
                      Agent details
                    </span>
                    <dl className="mt-4 flex flex-col gap-3 font-mono text-sm">
                      <div className="flex items-center justify-between gap-4">
                        <dt className="shrink-0 text-cream-faint">
                          {site.bolna_agent_id ? "Bolna ID" : "VAPI ID"}
                        </dt>
                        <dd className="min-w-0 truncate text-cream-dim">
                          {site.bolna_agent_id ?? site.vapi_agent_id}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-cream-faint">Created</dt>
                        <dd className="text-cream-dim">
                          {new Date(site.created_at).toLocaleString()}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <dt className="shrink-0 text-cream-faint">Tools</dt>
                        <dd className="text-cream-dim">Outbound call</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}

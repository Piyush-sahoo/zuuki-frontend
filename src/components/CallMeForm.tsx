"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import WaveBars from "./WaveBars";

type State = "idle" | "calling" | "ringing" | "error";

export default function CallMeForm({
  websiteId,
  inboundNumber,
}: {
  websiteId: string;
  inboundNumber?: string | null;
}) {
  const [number, setNumber] = useState("+91");
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = number.trim().replace(/\s/g, "");
    if (!/^\+\d{8,15}$/.test(n)) {
      setError("Enter a number in international format, e.g. +9198…");
      return;
    }
    setError(null);
    setState("calling");
    try {
      await api.callMe(websiteId, n);
      setState("ringing");
      setTimeout(() => setState("idle"), 12000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't place the call.");
      setState("error");
    }
  }

  const ringing = state === "ringing";
  const calling = state === "calling";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-panel/40 p-8">
      <div className="pointer-events-none absolute inset-0 grid-paper opacity-40" />
      <div className="relative flex flex-col items-center gap-6 text-center">
        <span className="mono-label text-cream-faint">Talk to this agent · by phone</span>

        <div className="flex h-16 items-center">
          {ringing ? (
            <WaveBars bars={7} className="h-10" />
          ) : (
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-full ${
                calling ? "bg-amber text-ink" : "bg-signal/15 text-signal"
              }`}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <path
                  d="M6.5 3h3l1.5 5-2 1.5a12 12 0 0 0 5 5l1.5-2 5 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4.5 5a2 2 0 0 1 2-2Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}
        </div>

        <div className="min-h-[2.5rem]">
          <p className="font-display text-2xl">
            {ringing ? "Calling you now…" : calling ? "Connecting…" : "Get a call from the agent"}
          </p>
          <p className="font-mono text-xs text-cream-faint">
            {error
              ? error
              : ringing
                ? "Your phone should ring in a few seconds — pick up and talk."
                : "Enter your number and the agent will ring you and answer live."}
          </p>
        </div>

        <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-2 sm:flex-row">
          <input
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="+91 98765 43210"
            inputMode="tel"
            className="flex-1 rounded-xl border border-line bg-ink/60 px-4 py-3 text-cream placeholder:text-cream-faint focus:border-signal/50 focus:outline-none"
          />
          <button
            type="submit"
            disabled={calling || ringing}
            className="rounded-xl bg-signal px-6 py-3 font-mono text-sm font-medium uppercase tracking-wider text-ink transition-colors hover:bg-signal-deep disabled:opacity-60"
          >
            {calling ? "…" : "Call me"}
          </button>
        </form>

        {inboundNumber && (
          <p className="font-mono text-xs text-cream-faint">
            …or call us directly at{" "}
            <span className="text-signal">{inboundNumber}</span>
          </p>
        )}
      </div>
    </div>
  );
}

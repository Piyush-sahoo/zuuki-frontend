"use client";

import { useEffect, useRef, useState } from "react";
import type Vapi from "@vapi-ai/web";

type CallState = "idle" | "connecting" | "active" | "error";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY ?? "";

/** Flatten a VAPI/Daily error into a short string for matching. */
function errorText(e: unknown): string {
  if (!e) return "";
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message;
  const o = e as Record<string, unknown>;
  const nested = (o.error ?? o.errorMsg ?? o.msg ?? o.message) as unknown;
  if (typeof nested === "string") return nested;
  if (nested && typeof nested === "object") {
    const n = nested as Record<string, unknown>;
    if (typeof n.message === "string") return n.message;
    if (typeof n.msg === "string") return n.msg;
  }
  if (typeof o.type === "string") return String(o.type);
  try {
    return JSON.stringify(e, Object.getOwnPropertyNames(e as object));
  } catch {
    return "";
  }
}

/** "ejection" / "meeting has ended" just mean the call ended — not a real failure. */
function isCallEnded(e: unknown): boolean {
  const t = errorText(e).toLowerCase();
  return (
    t.includes("ejection") ||
    t.includes("meeting has ended") ||
    t.includes("meeting ended") ||
    t.includes("call-end")
  );
}

/** Turn a raw error into a friendly, actionable message. */
function friendlyError(e: unknown): string {
  const t = errorText(e).toLowerCase();
  if (!t) return "Call failed. Check mic permission and try again.";
  if (t.includes("permission") || t.includes("notallowed") || t.includes("denied"))
    return "Microphone blocked. Allow mic access in your browser, then try again.";
  if (t.includes("did-not-receive-customer-audio"))
    return "I didn't hear anything — check your mic and speak after the greeting.";
  if (isCallEnded(e)) return "Call ended.";
  if (t.includes("daily") || t.includes("start-method"))
    return "Connection hiccup. Tap to try again.";
  return errorText(e);
}

// One shared Vapi instance for the whole app. The web SDK wraps a Daily call
// object, and creating several of them (e.g. React StrictMode's double-mount)
// makes them collide → "daily-call-join-error" / "Meeting has ended". A single
// instance reused across start/stop cycles is the supported pattern.
let sharedVapi: Vapi | null = null;
let vapiPromise: Promise<Vapi> | null = null;

function loadVapi(): Promise<Vapi> {
  if (!vapiPromise) {
    vapiPromise = import("@vapi-ai/web").then(({ default: VapiClass }) => {
      sharedVapi = sharedVapi ?? new VapiClass(PUBLIC_KEY);
      return sharedVapi;
    });
  }
  return vapiPromise;
}

// Daily logs benign end-of-call lifecycle lines ("Meeting ended due to ejection",
// "Meeting has ended") via console.error — and Next's dev overlay turns each one
// into a scary popup even though the call ended normally. Filter just those.
if (
  typeof window !== "undefined" &&
  !(window as unknown as { __zukiiPatched?: boolean }).__zukiiPatched
) {
  (window as unknown as { __zukiiPatched?: boolean }).__zukiiPatched = true;
  const orig = console.error.bind(console);
  const BENIGN = [
    "meeting ended due to ejection",
    "meeting has ended",
    "meeting ended in error: meeting has ended",
  ];
  console.error = (...args: unknown[]) => {
    const head = typeof args[0] === "string" ? args[0].toLowerCase() : "";
    if (BENIGN.some((b) => head.includes(b))) {
      console.debug("[zukii] call ended:", ...args);
      return;
    }
    orig(...args);
  };
}

// Start downloading/instantiating the heavy SDK (bundles Daily.co) as soon as
// this module is imported, so the Talk button is ready by the time it's clicked.
if (typeof window !== "undefined" && PUBLIC_KEY) {
  loadVapi().catch(() => {});
}

export default function VapiWidget({ assistantId }: { assistantId: string }) {
  const vapiRef = useRef<Vapi | null>(null);
  const busyRef = useRef(false); // guards against overlapping start/stop (double-clicks)
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<CallState>("idle");
  const [assistantSpeaking, setAssistantSpeaking] = useState(false);
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Attach this component's listeners to the shared instance; detach on unmount.
  useEffect(() => {
    if (!PUBLIC_KEY) {
      setState("error");
      setError("Missing NEXT_PUBLIC_VAPI_PUBLIC_KEY.");
      return;
    }
    let mounted = true;
    let vapi: Vapi | null = null;

    const onCallStart = () => setState("active");
    const onCallEnd = () => {
      setState("idle");
      setAssistantSpeaking(false);
      setVolume(0);
    };
    const onSpeechStart = () => setAssistantSpeaking(true);
    const onSpeechEnd = () => setAssistantSpeaking(false);
    const onVolume = (v: number) => setVolume(v);
    const onError = (e: unknown) => {
      const ended = isCallEnded(e);
      // Normal end-of-call → quiet debug log; only real failures hit console.error.
      if (ended) console.debug("[zukii] call ended:", errorText(e));
      else console.error("VAPI error →", errorText(e), e);
      setState("idle");
      setAssistantSpeaking(false);
      setVolume(0);
      setError(ended ? null : friendlyError(e));
    };

    (async () => {
      vapi = await loadVapi();
      if (!mounted) return;
      vapiRef.current = vapi;
      vapi.on("call-start", onCallStart);
      vapi.on("call-end", onCallEnd);
      vapi.on("speech-start", onSpeechStart);
      vapi.on("speech-end", onSpeechEnd);
      vapi.on("volume-level", onVolume);
      vapi.on("error", onError);
      setReady(true);
    })();

    return () => {
      mounted = false;
      if (!vapi) return;
      vapi.removeListener("call-start", onCallStart);
      vapi.removeListener("call-end", onCallEnd);
      vapi.removeListener("speech-start", onSpeechStart);
      vapi.removeListener("speech-end", onSpeechEnd);
      vapi.removeListener("volume-level", onVolume);
      vapi.removeListener("error", onError);
      // Leaving the page ends any active call (no-op if idle).
      vapi.stop();
    };
  }, []);

  async function toggle() {
    if (busyRef.current) return; // ignore rapid re-clicks → avoids duplicate Daily joins (ejection)
    busyRef.current = true;
    try {
      const vapi = vapiRef.current ?? (await loadVapi());
      vapiRef.current = vapi;

      if (state === "active" || state === "connecting") {
        await vapi.stop();
        setState("idle");
        return;
      }

      // Pre-grant the mic so audio flows from the first second. Without this the
      // call can join before the track is live → VAPI ends it with
      // "did-not-receive-customer-audio", which surfaces as a Daily ejection.
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop()); // release; the SDK opens its own
      } catch {
        setError("Microphone access is required. Allow it in your browser and try again.");
        setState("idle");
        return;
      }

      setError(null);
      setState("connecting");
      await vapi.start(assistantId);
    } catch (e) {
      console.error(e);
      setError(friendlyError(e));
      setState("idle");
    } finally {
      busyRef.current = false;
    }
  }

  const live = state === "active";
  const connecting = state === "connecting";

  // 24-bar live visualizer reacting to the call volume.
  const bars = 24;
  const baseHeights = [
    0.3, 0.55, 0.8, 0.45, 0.65, 0.95, 0.5, 0.75, 0.4, 0.85, 0.6, 0.35, 0.7,
    0.5, 0.9, 0.45, 0.6, 0.8, 0.4, 0.7, 0.55, 0.3, 0.65, 0.5,
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-panel/40 p-8">
      <div className="pointer-events-none absolute inset-0 grid-paper opacity-40" />

      <div className="relative flex flex-col items-center gap-7 text-center">
        <span className="mono-label text-cream-faint">Live voice demo</span>

        {/* Visualizer */}
        <div className="flex h-28 w-full max-w-md items-center justify-center gap-[5px]">
          {Array.from({ length: bars }).map((_, i) => {
            const reactive = live
              ? baseHeights[i % baseHeights.length] *
                (0.35 + Math.min(1, volume * 1.8) * (assistantSpeaking ? 1.1 : 0.5))
              : 0.12;
            return (
              <span
                key={i}
                className="w-[5px] rounded-full transition-[height,background-color] duration-100"
                style={{
                  height: `${Math.max(8, reactive * 100)}%`,
                  background: live
                    ? assistantSpeaking
                      ? "var(--signal)"
                      : "var(--cream-dim)"
                    : "var(--line)",
                }}
              />
            );
          })}
        </div>

        {/* Call button */}
        <button
          onClick={toggle}
          disabled={!ready && !live && !connecting}
          className={`relative flex h-20 w-20 items-center justify-center rounded-full transition-all disabled:cursor-wait ${
            live
              ? "bg-coral text-ink pulse-ring"
              : connecting
                ? "bg-amber text-ink"
                : ready
                  ? "bg-signal text-ink hover:scale-105"
                  : "bg-cream-faint/30 text-cream-faint"
          }`}
        >
          {live ? (
            <span className="h-5 w-5 rounded-[3px] bg-ink" />
          ) : connecting || !ready ? (
            <span className="h-7 w-7 rounded-full border-2 border-current border-t-transparent spin" />
          ) : (
            // mic glyph
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" />
              <path
                d="M5 11a7 7 0 0 0 14 0M12 18v4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>

        <div className="min-h-[2.5rem]">
          <p className="font-display text-2xl">
            {!ready
              ? "Preparing voice…"
              : live
                ? assistantSpeaking
                  ? "Speaking…"
                  : "Listening…"
                : connecting
                  ? "Connecting…"
                  : "Tap to talk"}
          </p>
          <p className="font-mono text-xs text-cream-faint">
            {error
              ? error
              : !ready
                ? "Loading the voice engine — one moment"
                : live
                  ? "Tap again to end the call · allow mic & speak"
                  : "Have a real conversation with this agent"}
          </p>
        </div>
      </div>
    </div>
  );
}

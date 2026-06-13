"use client";

import { useRef, useState } from "react";
import { voiceTurn } from "@/lib/api";
import WaveBars from "./WaveBars";

type State = "idle" | "recording" | "thinking" | "speaking";
type Msg = { role: "user" | "assistant"; content: string };

export default function VoiceChat({ websiteId }: { websiteId: string }) {
  const [state, setState] = useState<State>("idle");
  const [history, setHistory] = useState<Msg[]>([]);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        void sendTurn(new Blob(chunksRef.current, { type: "audio/webm" }));
      };
      recRef.current = rec;
      rec.start();
      setState("recording");
    } catch {
      setError("Microphone blocked — allow mic access and try again.");
    }
  }

  function stopRecording() {
    recRef.current?.stop();
    setState("thinking");
  }

  async function sendTurn(blob: Blob) {
    try {
      const hist = history.map((m) => ({ role: m.role, content: m.content }));
      const res = await voiceTurn(websiteId, blob, hist);
      const next: Msg[] = [...history];
      if (res.transcript) next.push({ role: "user", content: res.transcript });
      if (res.reply) next.push({ role: "assistant", content: res.reply });
      setHistory(next);

      if (res.audio) {
        const audio = new Audio(`data:audio/mp3;base64,${res.audio}`);
        audioRef.current = audio;
        setState("speaking");
        audio.onended = () => setState("idle");
        await audio.play().catch(() => setState("idle"));
      } else {
        setState("idle");
      }
    } catch {
      setError("Something went wrong on that turn.");
      setState("idle");
    }
  }

  function toggle() {
    if (state === "recording") stopRecording();
    else if (state === "idle") startRecording();
    // ignore taps while thinking/speaking
  }

  const recording = state === "recording";
  const busy = state === "thinking" || state === "speaking";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-panel/40 p-8">
      <div className="pointer-events-none absolute inset-0 grid-paper opacity-40" />
      <div className="relative flex flex-col items-center gap-6 text-center">
        <span className="mono-label text-cream-faint">Talk in your browser · Cartesia voice</span>

        <button
          onClick={toggle}
          disabled={busy}
          className={`relative flex h-20 w-20 items-center justify-center rounded-full transition-all ${
            recording
              ? "bg-coral text-ink pulse-ring"
              : busy
                ? "bg-amber text-ink"
                : "bg-signal text-ink hover:scale-105"
          }`}
        >
          {recording ? (
            <span className="h-5 w-5 rounded-[3px] bg-ink" />
          ) : busy ? (
            <WaveBars bars={5} className="h-6" color="var(--ink)" active={state === "speaking"} />
          ) : (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </button>

        <div className="min-h-[2.25rem]">
          <p className="font-display text-2xl">
            {recording ? "Listening… tap to send" : state === "thinking" ? "Thinking…" : state === "speaking" ? "Speaking…" : "Tap to talk"}
          </p>
          <p className="font-mono text-xs text-cream-faint">
            {error ?? "Tap, ask a question, tap again — the agent answers from the site."}
          </p>
        </div>

        {history.length > 0 && (
          <div className="max-h-52 w-full overflow-y-auto rounded-xl border border-line bg-ink/40 p-4 text-left">
            {history.map((m, i) => (
              <p key={i} className="mb-2 text-sm leading-relaxed">
                <span className={m.role === "user" ? "text-cream-faint" : "text-signal"}>
                  {m.role === "user" ? "You: " : "Agent: "}
                </span>
                <span className="text-cream-dim">{m.content}</span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

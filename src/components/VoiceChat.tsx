"use client";

import { useEffect, useRef, useState } from "react";
import { voiceTurn } from "@/lib/api";
import WaveBars from "./WaveBars";

type State = "off" | "listening" | "recording" | "thinking" | "speaking";
type Msg = { role: "user" | "assistant"; content: string };

// Energy-based VAD thresholds
const SPEECH_RMS = 0.025; // above this = speech
const SILENCE_MS = 1100; // silence after speech => end of turn
const MIN_SPEECH_MS = 350; // ignore blips

export default function VoiceChat({ websiteId }: { websiteId: string }) {
  const [state, setState] = useState<State>("off");
  const [history, setHistory] = useState<Msg[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);

  const stateRef = useRef<State>("off");
  const histRef = useRef<Msg[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const acRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number>(0);
  const speechStartRef = useRef<number>(0);
  const lastVoiceRef = useRef<number>(0);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  function setS(s: State) {
    stateRef.current = s;
    setState(s);
  }

  useEffect(() => {
    histRef.current = history;
  }, [history]);

  useEffect(() => () => stop(), []); // cleanup on unmount

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ac = new AudioContext();
      acRef.current = ac;
      const src = ac.createMediaStreamSource(stream);
      const analyser = ac.createAnalyser();
      analyser.fftSize = 1024;
      src.connect(analyser);
      analyserRef.current = analyser;
      setS("listening");
      loop();
    } catch {
      setError("Microphone blocked — allow mic access and try again.");
      setS("off");
    }
  }

  function stop() {
    cancelAnimationFrame(rafRef.current);
    try {
      recRef.current?.state === "recording" && recRef.current.stop();
    } catch {}
    streamRef.current?.getTracks().forEach((t) => t.stop());
    acRef.current?.close().catch(() => {});
    audioElRef.current?.pause();
    streamRef.current = null;
    acRef.current = null;
    analyserRef.current = null;
    recRef.current = null;
    setS("off");
  }

  function beginRecording() {
    const stream = streamRef.current;
    if (!stream) return;
    const rec = new MediaRecorder(stream);
    chunksRef.current = [];
    rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    rec.onstop = () => {
      const ms = performance.now() - speechStartRef.current;
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      if (ms < MIN_SPEECH_MS || blob.size < 1200) {
        if (stateRef.current !== "off") setS("listening");
        return;
      }
      void sendTurn(blob);
    };
    recRef.current = rec;
    rec.start();
    speechStartRef.current = performance.now();
    setS("recording");
  }

  function loop() {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const buf = new Uint8Array(analyser.fftSize);
    const tick = () => {
      const s = stateRef.current;
      if (s === "off") return;
      // Only listen for speech while idle-listening or actively recording.
      if (s === "listening" || s === "recording") {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);
        setLevel(rms);
        const now = performance.now();

        if (rms > SPEECH_RMS) {
          lastVoiceRef.current = now;
          if (s === "listening") beginRecording();
        } else if (s === "recording" && now - lastVoiceRef.current > SILENCE_MS) {
          try {
            recRef.current?.stop();
          } catch {}
          setS("thinking");
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  async function sendTurn(blob: Blob) {
    setS("thinking");
    try {
      const hist = histRef.current.map((m) => ({ role: m.role, content: m.content }));
      const res = await voiceTurn(websiteId, blob, hist);
      const next: Msg[] = [...histRef.current];
      if (res.transcript) next.push({ role: "user", content: res.transcript });
      if (res.reply) next.push({ role: "assistant", content: res.reply });
      setHistory(next);
      histRef.current = next;

      if (res.audio && stateRef.current !== "off") {
        const audio = new Audio(`data:audio/mp3;base64,${res.audio}`);
        audioElRef.current = audio;
        setS("speaking");
        audio.onended = () => {
          if (stateRef.current !== "off") setS("listening");
        };
        await audio.play().catch(() => setS("listening"));
      } else if (stateRef.current !== "off") {
        setS("listening");
      }
    } catch {
      setError("Something went wrong on that turn.");
      if (stateRef.current !== "off") setS("listening");
    }
  }

  const on = state !== "off";
  const speaking = state === "speaking";
  const recording = state === "recording";

  const statusText =
    state === "recording"
      ? "Listening…"
      : state === "thinking"
        ? "Thinking…"
        : state === "speaking"
          ? "Speaking…"
          : state === "listening"
            ? "Go ahead — I'm listening"
            : "Start a conversation";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-panel/40 p-8">
      <div className="pointer-events-none absolute inset-0 grid-paper opacity-40" />
      <div className="relative flex flex-col items-center gap-6 text-center">
        <span className="mono-label text-cream-faint">
          Talk in your browser · Cartesia voice · hands-free
        </span>

        <button
          onClick={on ? stop : start}
          className={`relative flex h-20 w-20 items-center justify-center rounded-full transition-all ${
            speaking
              ? "bg-signal text-ink"
              : recording
                ? "bg-coral text-ink"
                : on
                  ? "bg-amber/30 text-amber pulse-ring"
                  : "bg-signal text-ink hover:scale-105"
          }`}
          style={
            recording
              ? { transform: `scale(${1 + Math.min(0.25, level * 3)})` }
              : undefined
          }
        >
          {on ? (
            speaking || recording ? (
              <WaveBars bars={5} className="h-7" color="var(--ink)" active />
            ) : (
              <span className="h-5 w-5 rounded-[3px] bg-current" />
            )
          ) : (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </button>

        <div className="min-h-[2.25rem]">
          <p className="font-display text-2xl">{statusText}</p>
          <p className="font-mono text-xs text-cream-faint">
            {error ?? (on ? "Just talk — it sends automatically when you pause. Tap to end." : "Tap once, then just speak — no buttons.")}
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

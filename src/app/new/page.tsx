"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import WaveBars from "@/components/WaveBars";
import {
  api,
  ApiError,
  type VoiceOptions,
  type PhoneNumber,
  type Draft,
} from "@/lib/api";

const STEPS = ["Source", "Persona", "Knowledge", "Prompt", "Tools & number", "Build"];
const FIELD =
  "w-full rounded-xl border border-line bg-ink/60 px-4 py-2.5 text-cream placeholder:text-cream-faint focus:outline-none focus:ring-1 focus:ring-signal/40";
const LABEL = "mono-label text-cream-faint";

export default function NewAgentPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [opts, setOpts] = useState<VoiceOptions | null>(null);
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [error, setError] = useState<string | null>(null);

  // form
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("Support");
  const [tone, setTone] = useState("Warm");
  const [language, setLanguage] = useState("en");
  const [voice, setVoice] = useState("meera");

  // draft
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [prompt, setPrompt] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // tools + number
  const [transfer, setTransfer] = useState(false);
  const [booking, setBooking] = useState(false);
  const [transferNumber, setTransferNumber] = useState("+91");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [greeting, setGreeting] = useState("");
  const [building, setBuilding] = useState(false);

  useEffect(() => {
    api.getVoiceOptions().then(setOpts).catch(() => {});
    api.getPhoneNumbers().then(setNumbers).catch(() => {});
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function analyze() {
    let u = url.trim();
    if (!u) return setError("Enter a website URL.");
    if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
    setError(null);
    try {
      const { draft_id } = await api.createDraft({
        url: u, name: name.trim() || undefined, role, tone, language, voice,
      });
      setDraftId(draft_id);
      setStep(2);
      pollRef.current = setInterval(async () => {
        const d = await api.getDraft(draft_id);
        setDraft(d);
        if (d.status !== "crawling") {
          if (pollRef.current) clearInterval(pollRef.current);
          if (d.prompt) setPrompt(d.prompt);
        }
      }, 3000);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't start the build.");
    }
  }

  async function build() {
    if (!draftId) return;
    setBuilding(true);
    setError(null);
    const tools: string[] = [];
    if (transfer) tools.push("transfer");
    if (booking) tools.push("booking");
    try {
      const site = await api.buildAgent(draftId, {
        prompt, voice, language, greeting: greeting.trim() || undefined,
        tools, transfer_number: transfer ? transferNumber.trim() : undefined,
        phone_number_id: phoneNumberId || undefined,
        phone_number: numbers.find((n) => n.id === phoneNumberId)?.phone_number,
      });
      router.push(`/agents/${site.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Build failed.");
      setBuilding(false);
    }
  }

  const ready = draft?.status === "ready";
  const crawling = !draft || draft.status === "crawling";

  function Stepper() {
    return (
      <div className="mb-10 flex flex-wrap items-center gap-x-2 gap-y-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span
              className={`mono-label rounded-full border px-3 py-1 ${
                i === step
                  ? "border-signal/60 bg-signal/10 text-signal"
                  : i < step
                    ? "border-line text-cream-dim"
                    : "border-line text-cream-faint"
              }`}
            >
              {i + 1}. {s}
            </span>
            {i < STEPS.length - 1 && <span className="text-cream-faint">·</span>}
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <span className={LABEL}>New voice agent</span>
        <h1 className="mb-8 mt-2 font-display text-5xl">Build an agent</h1>
        <Stepper />

        <div className="rounded-2xl border border-line bg-panel/40 p-6">
          {/* Step 1 — Source */}
          {step === 0 && (
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1">
                <span className={LABEL}>Website URL</span>
                <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="docs.yourcompany.com" className={FIELD} />
              </label>
              <label className="flex flex-col gap-1">
                <span className={LABEL}>Name · optional</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Support" className={FIELD} />
              </label>
              <Footer onNext={() => (url.trim() ? setStep(1) : setError("Enter a URL."))} nextLabel="Next" />
            </div>
          )}

          {/* Step 2 — Persona (then analyze) */}
          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Role" value={role} set={setRole} options={opts?.roles ?? ["Support", "Sales", "Booking"]} />
              <Select label="Tone" value={tone} set={setTone} options={opts?.tones ?? ["Warm", "Professional", "Playful", "Concise"]} />
              <SelectKV label="Language" value={language} set={setLanguage} options={(opts?.languages ?? [{ code: "en", label: "English" }]).map((l) => ({ k: l.code, v: l.label }))} />
              <SelectKV label="Voice" value={voice} set={setVoice} options={(opts?.voices ?? [{ id: "meera", label: "Meera" }]).map((v) => ({ k: v.id, v: v.label }))} />
              <div className="sm:col-span-2">
                <Footer onBack={() => setStep(0)} onNext={analyze} nextLabel="Analyze site →" />
              </div>
            </div>
          )}

          {/* Step 3 — Knowledge */}
          {step === 2 && (
            <div className="flex flex-col items-center gap-5 py-6 text-center">
              {crawling ? (
                <>
                  <WaveBars bars={6} className="h-7" />
                  <p className="font-display text-2xl">Crawling your site…</p>
                  <div className="w-full max-w-md">
                    <div className="h-2 overflow-hidden rounded-full bg-line">
                      <div
                        className="h-full rounded-full bg-signal transition-all duration-500"
                        style={{ width: `${Math.min(100, ((draft?.crawl_done ?? 0) / (draft?.crawl_total || 10)) * 100)}%` }}
                      />
                    </div>
                    <p className="mt-3 font-mono text-xs text-cream-faint">
                      {(draft?.crawl_done ?? 0) > 0
                        ? `Crawled ${draft?.crawl_done} page${draft?.crawl_done === 1 ? "" : "s"} → indexing knowledge base`
                        : "Crawling the site…"}
                    </p>
                  </div>
                </>
              ) : draft?.status === "failed" ? (
                <p className="font-display text-2xl text-coral">Crawl failed — go back and try another URL.</p>
              ) : (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-signal/15 text-signal">✓</div>
                  <p className="font-display text-2xl">Knowledge base ready</p>
                  <p className="font-mono text-xs text-cream-faint">
                    {draft?.pages} pages indexed · rag {draft?.rag_id?.slice(0, 8)}
                  </p>
                  {draft?.knowledge_preview && (
                    <p className="max-h-24 overflow-hidden rounded-xl border border-line bg-ink/40 p-3 text-left text-xs text-cream-faint">
                      {draft.knowledge_preview}…
                    </p>
                  )}
                </>
              )}
              <Footer onBack={() => setStep(1)} onNext={() => setStep(3)} nextDisabled={!ready} nextLabel="Next" />
            </div>
          )}

          {/* Step 4 — Prompt */}
          {step === 3 && (
            <div className="flex flex-col gap-3">
              <span className={LABEL}>System prompt · edit freely</span>
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={14} className={`${FIELD} resize-y font-mono text-sm leading-relaxed`} />
              <Footer onBack={() => setStep(2)} onNext={() => setStep(4)} nextLabel="Next" />
            </div>
          )}

          {/* Step 5 — Tools & number */}
          {step === 4 && (
            <div className="flex flex-col gap-4">
              <span className={LABEL}>Tools</span>
              <Toggle on={transfer} set={setTransfer} title="Transfer to human" desc="Route the call to a person when asked or frustrated." />
              {transfer && (
                <input value={transferNumber} onChange={(e) => setTransferNumber(e.target.value)} placeholder="+91 transfer number" className={FIELD} />
              )}
              <Toggle on={booking} set={setBooking} title="Book appointment" desc="Collect the caller's preferred time → shows in the Lead Inbox." />

              <span className={`${LABEL} mt-2`}>Inbound phone number (Vobiz)</span>
              <select value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} className={FIELD}>
                <option value="">No inbound number</option>
                {numbers.map((n) => (
                  <option key={n.id} value={n.id}>{n.phone_number}</option>
                ))}
              </select>

              <label className="flex flex-col gap-1">
                <span className={LABEL}>Greeting · optional</span>
                <input value={greeting} onChange={(e) => setGreeting(e.target.value)} placeholder="Hi! Thanks for calling — how can I help?" className={FIELD} />
              </label>
              <Footer onBack={() => setStep(3)} onNext={() => setStep(5)} nextLabel="Review" />
            </div>
          )}

          {/* Step 6 — Build */}
          {step === 5 && (
            <div className="flex flex-col gap-3">
              <span className={LABEL}>Review</span>
              <dl className="grid grid-cols-2 gap-y-2 rounded-xl border border-line bg-ink/40 p-4 font-mono text-sm">
                <dt className="text-cream-faint">Site</dt><dd className="text-cream-dim">{draft?.name}</dd>
                <dt className="text-cream-faint">Persona</dt><dd className="text-cream-dim">{role} · {tone}</dd>
                <dt className="text-cream-faint">Voice / lang</dt><dd className="text-cream-dim">{voice} · {language}</dd>
                <dt className="text-cream-faint">Tools</dt><dd className="text-cream-dim">{[transfer && "Transfer", booking && "Booking"].filter(Boolean).join(", ") || "none"}</dd>
                <dt className="text-cream-faint">Inbound #</dt><dd className="text-cream-dim">{numbers.find((n) => n.id === phoneNumberId)?.phone_number ?? "none"}</dd>
              </dl>
              <button onClick={build} disabled={building} className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-signal px-7 py-3.5 font-mono text-sm font-medium uppercase tracking-wider text-ink transition-colors hover:bg-signal-deep disabled:opacity-60">
                {building ? (<><WaveBars bars={4} className="h-4" color="var(--ink)" /> Building agent…</>) : "Build agent →"}
              </button>
              <button onClick={() => setStep(4)} className="mono-label py-1 text-cream-faint hover:text-cream">← Back</button>
            </div>
          )}

          {error && <p className="mt-3 font-mono text-xs text-coral">{error}</p>}
        </div>
      </main>
    </>
  );
}

function Footer({ onBack, onNext, nextLabel, nextDisabled }: { onBack?: () => void; onNext: () => void; nextLabel: string; nextDisabled?: boolean }) {
  return (
    <div className="mt-2 flex items-center justify-between">
      {onBack ? (
        <button onClick={onBack} className="mono-label px-3 py-2 text-cream-faint hover:text-cream">← Back</button>
      ) : <span />}
      <button onClick={onNext} disabled={nextDisabled} className="rounded-xl bg-signal px-6 py-2.5 font-mono text-sm font-medium uppercase tracking-wider text-ink transition-colors hover:bg-signal-deep disabled:opacity-40">
        {nextLabel}
      </button>
    </div>
  );
}

function Select({ label, value, set, options }: { label: string; value: string; set: (v: string) => void; options: string[] }) {
  return (
    <label className="flex flex-col gap-1">
      <span className={LABEL}>{label}</span>
      <select value={value} onChange={(e) => set(e.target.value)} className={FIELD}>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}

function SelectKV({ label, value, set, options }: { label: string; value: string; set: (v: string) => void; options: { k: string; v: string }[] }) {
  return (
    <label className="flex flex-col gap-1">
      <span className={LABEL}>{label}</span>
      <select value={value} onChange={(e) => set(e.target.value)} className={FIELD}>
        {options.map((o) => <option key={o.k} value={o.k}>{o.v}</option>)}
      </select>
    </label>
  );
}

function Toggle({ on, set, title, desc }: { on: boolean; set: (v: boolean) => void; title: string; desc: string }) {
  return (
    <button type="button" onClick={() => set(!on)} className={`flex items-center justify-between rounded-xl border p-3 text-left transition-colors ${on ? "border-signal/50 bg-signal/5" : "border-line"}`}>
      <span>
        <span className="block text-cream">{title}</span>
        <span className="block font-mono text-xs text-cream-faint">{desc}</span>
      </span>
      <span className={`ml-3 flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors ${on ? "bg-signal" : "bg-line"}`}>
        <span className={`h-5 w-5 rounded-full bg-ink transition-transform ${on ? "translate-x-5" : ""}`} />
      </span>
    </button>
  );
}

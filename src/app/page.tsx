import Link from "next/link";
import Nav from "@/components/Nav";
import WaveBars from "@/components/WaveBars";

const STEPS = [
  {
    n: "01",
    t: "Crawl",
    d: "Drop a URL. Zukii reads up to 50 pages of your site with Firecrawl and distills the substance.",
  },
  {
    n: "02",
    t: "Train",
    d: "Your content becomes a knowledge base. Gemini writes a bespoke persona so the agent sounds like you.",
  },
  {
    n: "03",
    t: "Embed",
    d: "Copy one script tag. A voice agent that books calls and answers questions now lives on your site.",
  },
];

export default function Home() {
  return (
    <>
      <Nav />

      {/* Hero */}
      <section className="relative mx-auto w-full max-w-6xl px-6 pt-24 pb-20">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] grid-paper" />

        <div className="rise" style={{ animationDelay: "0ms" }}>
          <span className="mono-label inline-flex items-center gap-3 rounded-full border border-line bg-panel/60 px-4 py-1.5 text-cream-dim">
            <WaveBars bars={4} className="h-3" />
            Voice agents from any website
          </span>
        </div>

        <h1
          className="rise mt-8 font-display text-[clamp(3.2rem,11vw,8.5rem)] leading-[0.92] tracking-tight"
          style={{ animationDelay: "80ms" }}
        >
          Give your website
          <br />
          <span className="text-cream-dim">a voice that</span>{" "}
          <span className="italic text-signal">actually answers.</span>
        </h1>

        <div
          className="rise mt-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
          style={{ animationDelay: "160ms" }}
        >
          <p className="max-w-xl text-lg leading-relaxed text-cream-dim">
            Paste a link. Zukii crawls the site, trains a voice agent on every
            page, and hands you an embed. No prompts to write, no data to
            wrangle — just a site that talks back.
          </p>
          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-full bg-signal px-7 py-3.5 font-mono text-sm font-medium uppercase tracking-wider text-ink transition-colors hover:bg-signal-deep"
            >
              Build an agent →
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full border border-line px-7 py-3.5 font-mono text-sm uppercase tracking-wider text-cream-dim transition-colors hover:text-cream"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6">
        <div className="hairline" />
      </div>

      {/* How it works */}
      <section className="mx-auto w-full max-w-6xl px-6 py-24">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-4xl md:text-5xl">How it works</h2>
          <span className="mono-label text-cream-faint">3 steps · ~2 min</span>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="group flex flex-col gap-5 bg-ink p-8 transition-colors hover:bg-panel"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-signal">{s.n}</span>
                <WaveBars
                  bars={5}
                  active={false}
                  className="h-4 opacity-40 transition-opacity group-hover:opacity-100"
                />
              </div>
              <h3 className="font-display text-3xl">{s.t}</h3>
              <p className="leading-relaxed text-cream-dim">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-28">
        <div className="relative overflow-hidden rounded-3xl border border-signal/30 bg-gradient-to-br from-panel to-ink p-12 text-center md:p-20">
          <div className="pointer-events-none absolute inset-0 grid-paper opacity-30" />
          <div className="relative flex flex-col items-center gap-7">
            <WaveBars bars={7} className="h-8" />
            <h2 className="font-display text-4xl leading-tight md:text-6xl">
              One URL away from
              <br />
              <span className="italic text-signal">a talking website.</span>
            </h2>
            <Link
              href="/dashboard"
              className="rounded-full bg-signal px-8 py-4 font-mono text-sm font-medium uppercase tracking-wider text-ink transition-colors hover:bg-signal-deep"
            >
              Start building →
            </Link>
          </div>
        </div>
      </section>

      <footer className="mx-auto w-full max-w-6xl px-6 pb-12">
        <div className="hairline mb-6" />
        <div className="flex items-center justify-between">
          <span className="font-display text-xl">Zukii</span>
          <span className="mono-label text-cream-faint">
            Firecrawl · Gemini · VAPI
          </span>
        </div>
      </footer>
    </>
  );
}

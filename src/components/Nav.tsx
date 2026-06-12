import Link from "next/link";
import WaveBars from "./WaveBars";

export default function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-ink/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="group flex items-center gap-3">
          <span className="flex h-6 w-6 items-center justify-center">
            <WaveBars bars={4} className="h-4" />
          </span>
          <span className="font-display text-2xl leading-none tracking-tight">
            Zukii
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            href="/dashboard"
            className="mono-label rounded-full px-4 py-2 text-cream-dim transition-colors hover:text-cream"
          >
            Dashboard
          </Link>
          <Link
            href="/insights"
            className="mono-label rounded-full px-4 py-2 text-cream-dim transition-colors hover:text-cream"
          >
            Insights
          </Link>
          <Link
            href="/dashboard"
            className="mono-label rounded-full border border-signal/50 bg-signal/10 px-4 py-2 text-signal transition-colors hover:bg-signal hover:text-ink"
          >
            New agent →
          </Link>
        </nav>
      </div>
    </header>
  );
}

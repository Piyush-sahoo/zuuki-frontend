import type { WebsiteStatus } from "@/lib/api";

const MAP: Record<
  WebsiteStatus,
  { label: string; dot: string; text: string; border: string }
> = {
  pending: {
    label: "Building",
    dot: "var(--amber)",
    text: "text-amber",
    border: "border-amber/40",
  },
  completed: {
    label: "Live",
    dot: "var(--signal)",
    text: "text-signal",
    border: "border-signal/40",
  },
  failed: {
    label: "Failed",
    dot: "var(--coral)",
    text: "text-coral",
    border: "border-coral/40",
  },
};

export default function StatusBadge({ status }: { status: WebsiteStatus }) {
  const s = MAP[status] ?? MAP.pending;
  return (
    <span
      className={`mono-label inline-flex items-center gap-2 rounded-full border ${s.border} ${s.text} px-3 py-1`}
    >
      <span
        className="relative inline-flex h-1.5 w-1.5 rounded-full"
        style={{ background: s.dot }}
      >
        {status === "pending" && (
          <span
            className="absolute inset-0 rounded-full animate-ping"
            style={{ background: s.dot, opacity: 0.6 }}
          />
        )}
      </span>
      {s.label}
    </span>
  );
}

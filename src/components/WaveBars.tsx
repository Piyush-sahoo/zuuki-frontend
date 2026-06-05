"use client";

/**
 * Coordinated equalizer — the recurring "voice" motif.
 * Bars move as a single traveling wave (phase by index) with a centre-weighted
 * amplitude, so it reads as a deliberate waveform rather than random noise.
 * `active` drives motion; when false the bars settle into a calm static arc.
 */
export default function WaveBars({
  active = true,
  bars = 5,
  className = "",
  color = "var(--signal)",
  speed = 1.1,
}: {
  active?: boolean;
  bars?: number;
  className?: string;
  color?: string;
  speed?: number;
}) {
  const center = (bars - 1) / 2;
  return (
    <span
      className={`inline-flex items-center gap-[3px] ${className}`}
      aria-hidden
    >
      {Array.from({ length: bars }).map((_, i) => {
        // 0 at the edges → 1 in the middle
        const nearness = 1 - Math.abs(i - center) / (center || 1);
        const amp = 0.45 + nearness * 0.55; // peak height for this bar
        const rest = 0.3 + nearness * 0.45; // calm static height
        const delay = i * 0.09; // travelling-wave phase
        return (
          <span
            key={i}
            className="w-[3px] rounded-full transition-[transform,opacity] duration-300"
            style={{
              height: "100%",
              background: color,
              transformOrigin: "center",
              // CSS var consumed by the `wave` keyframe
              ["--amp" as string]: amp,
              animation: active
                ? `wave ${speed}s ease-in-out ${delay}s infinite`
                : "none",
              transform: active ? undefined : `scaleY(${rest})`,
              opacity: active ? 1 : 0.55,
            }}
          />
        );
      })}
    </span>
  );
}

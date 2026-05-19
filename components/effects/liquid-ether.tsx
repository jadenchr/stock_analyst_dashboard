"use client";

import { cn } from "@/lib/utils";

interface Props {
  /**
   * Opacity multiplier for the whole effect. Defaults to 0.18 — very
   * subtle, easy to scan content over the top.
   */
  intensity?: number;
  /** Position relative to the parent — `fixed` covers the viewport. */
  position?: "fixed" | "absolute";
  /** Extra Tailwind utilities; rarely needed. */
  className?: string;
}

/**
 * Liquid Ether — a CSS-only approximation of the reactbits.dev
 * `LiquidEther` WebGL effect. We use three large, soft, lavender-tinted
 * radial gradients that drift independently on slow keyframe orbits
 * with heavy blur. The result reads as a slowly-shifting plasma
 * without needing Three.js or a fragment shader, so it's mobile-safe.
 *
 * Honors `prefers-reduced-motion`: the gradients still render (so the
 * page doesn't look empty), but the orbital animation pauses.
 *
 * Color tokens come from `--primary` and `--bull` so the effect tracks
 * any future palette retune.
 */
export function LiquidEther({
  intensity = 0.18,
  position = "absolute",
  className,
}: Props) {
  return (
    <div
      className={cn(
        "pointer-events-none inset-0 overflow-hidden",
        position === "fixed" ? "fixed" : "absolute",
        className,
      )}
      aria-hidden
      style={{ opacity: intensity }}
    >
      <div className="liquid-ether-blob blob-a" />
      <div className="liquid-ether-blob blob-b" />
      <div className="liquid-ether-blob blob-c" />

      {/* Local styles scoped to the component */}
      <style>{`
        .liquid-ether-blob {
          position: absolute;
          width: 60vmax;
          height: 60vmax;
          border-radius: 50%;
          filter: blur(80px);
          will-change: transform;
          mix-blend-mode: screen;
        }
        .blob-a {
          background: radial-gradient(
            circle at 50% 50%,
            hsl(var(--primary) / 0.55) 0%,
            transparent 60%
          );
          top: -25vmax;
          left: -15vmax;
          animation: ether-drift-a 38s ease-in-out infinite alternate;
        }
        .blob-b {
          background: radial-gradient(
            circle at 50% 50%,
            hsl(280 70% 70% / 0.42) 0%,
            transparent 60%
          );
          top: -10vmax;
          right: -25vmax;
          animation: ether-drift-b 46s ease-in-out infinite alternate;
        }
        .blob-c {
          background: radial-gradient(
            circle at 50% 50%,
            hsl(258 65% 78% / 0.38) 0%,
            transparent 60%
          );
          bottom: -28vmax;
          left: 12vmax;
          animation: ether-drift-c 54s ease-in-out infinite alternate;
        }
        @keyframes ether-drift-a {
          0%   { transform: translate3d(0, 0, 0) scale(1); }
          50%  { transform: translate3d(12vmax, 6vmax, 0) scale(1.08); }
          100% { transform: translate3d(4vmax, 18vmax, 0) scale(0.96); }
        }
        @keyframes ether-drift-b {
          0%   { transform: translate3d(0, 0, 0) scale(1); }
          50%  { transform: translate3d(-10vmax, 8vmax, 0) scale(1.05); }
          100% { transform: translate3d(-18vmax, -4vmax, 0) scale(1.1); }
        }
        @keyframes ether-drift-c {
          0%   { transform: translate3d(0, 0, 0) scale(1); }
          50%  { transform: translate3d(8vmax, -12vmax, 0) scale(0.95); }
          100% { transform: translate3d(-6vmax, -8vmax, 0) scale(1.06); }
        }
        @media (prefers-reduced-motion: reduce) {
          .liquid-ether-blob {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

import { HUES, type Hue } from "@/lib/capsule-rules";

// Transparent glass tubes carrying glowing memory orbs (pure SVG, scales with the viewport).
const TUBES = [
  "M -80 150 C 180 40, 360 280, 600 200 S 1000 50, 1280 170",
  "M -80 400 C 220 480, 420 270, 650 330 S 1020 480, 1280 360",
  "M 180 -60 C 250 150, 520 170, 610 270 S 900 430, 1000 620",
];

interface Props {
  hues?: Hue[];
  className?: string;
}

export function TubeScene({ hues, className }: Props) {
  const palette = hues && hues.length ? hues : [...HUES];
  // Spread orbs over the tubes; each orb is one capsule.
  const orbs = Array.from({ length: Math.max(16, Math.min(palette.length, 24)) }, (_, i) => ({
    hue: palette[i % palette.length] as Hue,
    tube: i % TUBES.length,
    dur: 16 + (i % 4) * 3,
    offset: (i * 7.7) % 22,
    r: 10 + ((i * 7) % 3) * 2.5,
  }));

  return (
    <svg
      className={className}
      viewBox="0 0 1200 520"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        {HUES.map((h) => (
          <radialGradient key={h} id={`orb-${h}`} cx="38%" cy="32%" r="70%">
            <stop offset="0%" style={{ stopColor: "var(--shine)", stopOpacity: 0.95 }} />
            <stop offset="18%" style={{ stopColor: `var(--orb-${h})`, stopOpacity: 0.55 }} />
            <stop offset="75%" style={{ stopColor: `var(--orb-${h})`, stopOpacity: 0.35 }} />
            <stop offset="100%" style={{ stopColor: `var(--orb-${h})`, stopOpacity: 0.9 }} />
          </radialGradient>
        ))}
        <filter id="orb-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="6" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {TUBES.map((d, i) => (
          <path key={i} id={`tube-${i}`} d={d} />
        ))}
      </defs>

      {/* glass tubes */}
      {TUBES.map((d, i) => (
        <g key={i} fill="none" strokeLinecap="round">
          <path d={d} strokeWidth={40} style={{ stroke: "var(--glass-edge)", strokeOpacity: 0.8 }} />
          <path d={d} strokeWidth={37} style={{ stroke: "var(--night)", strokeOpacity: 0.4 }} />
          <path d={d} strokeWidth={22} style={{ stroke: "var(--glass)" }} />
          <path
            d={d}
            strokeWidth={2}
            strokeDasharray="60 340"
            style={{ stroke: "var(--shine)", strokeOpacity: 0.35, animation: `tube-flow ${9 + i * 2}s linear infinite` }}
          />
        </g>
      ))}

      {/* orbs travelling inside the tubes */}
      {orbs.map((o, i) => (
        <g key={i} filter="url(#orb-glow)">
          <animateMotion dur={`${o.dur}s`} begin={`-${o.offset}s`} repeatCount="indefinite">
            <mpath href={`#tube-${o.tube}`} />
          </animateMotion>
          <circle r={o.r} fill={`url(#orb-${o.hue})`} style={{ stroke: "var(--glass-edge)" }} strokeWidth={1} />
          <circle cx={-o.r * 0.35} cy={-o.r * 0.4} r={o.r * 0.18} style={{ fill: "var(--shine)" }} />
        </g>
      ))}
    </svg>
  );
}

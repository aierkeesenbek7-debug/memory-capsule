import { getCountdownParts } from "@/lib/capsule-rules";

export function Countdown({ openAt, now }: { openAt: string; now: Date }) {
  const p = getCountdownParts(openAt, now);
  const cells = [
    { label: "Days", value: p.days },
    { label: "Hours", value: p.hours },
    { label: "Minutes", value: p.minutes },
    { label: "Seconds", value: p.seconds },
  ];
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3" role="timer" aria-label="Time until opening">
      {cells.map((c) => (
        <div key={c.label} className="glass rounded-2xl px-2 py-3 text-center sm:px-4 sm:py-4">
          <div className="font-display text-3xl tabular-nums sm:text-5xl">
            {String(c.value).padStart(2, "0")}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:text-xs">
            {c.label}
          </div>
        </div>
      ))}
    </div>
  );
}

import { Link } from "@tanstack/react-router";
import { Lock, Sparkles, Users } from "lucide-react";
import { format } from "date-fns";
import { Orb } from "./Orb";
import { asHue, formatCountdownShort, isCapsuleOpen } from "@/lib/capsule-rules";
import type { Capsule } from "@/lib/capsules";

interface Props {
  capsule: Capsule;
  coverUrl?: string | undefined;
  now: Date;
  subtitle?: string | undefined;
  opened?: boolean;
}

export function CapsuleCard({ capsule, coverUrl, now, subtitle, opened }: Props) {
  const open = isCapsuleOpen(capsule.open_at, now);
  return (
    <Link
      to="/capsules/$id"
      params={{ id: capsule.id }}
      className="glass group flex flex-col items-center gap-4 rounded-3xl p-6 text-center transition-all hover:-translate-y-1 hover:bg-glass-strong"
    >
      <Orb
        hue={asHue(capsule.hue)}
        size={120}
        src={coverUrl}
        ready={open && !opened}
        className="transition-transform duration-500 group-hover:scale-105"
      >
        {!open ? <Lock className="size-6 text-foreground/90 drop-shadow" /> : null}
      </Orb>
      <div className="min-w-0 space-y-1">
        <h3 className="truncate font-display text-2xl leading-tight">{capsule.title}</h3>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
        <span
          className={
            open
              ? "inline-flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-primary"
              : "inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-muted-foreground"
          }
        >
          {open ? <Sparkles className="size-3" /> : <Lock className="size-3" />}
          {open ? (opened ? "Opened" : "Ready to open") : formatCountdownShort(capsule.open_at, now)}
        </span>
        {capsule.visibility === "shared" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-muted-foreground">
            <Users className="size-3" /> Shared
          </span>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        {format(new Date(capsule.open_at), "d MMM yyyy")}
      </p>
    </Link>
  );
}

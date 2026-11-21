import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Hue } from "@/lib/capsule-rules";

interface OrbProps {
  hue: Hue;
  size?: number;
  src?: string | undefined;
  ready?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export function Orb({ hue, size = 120, src, ready, className, style, children }: OrbProps) {
  return (
    <div
      className={cn("orb shrink-0", ready && "orb-ready", className)}
      data-hue={hue}
      style={{ width: size, height: size, ...style }}
    >
      {src ? <img src={src} alt="" loading="lazy" /> : null}
      {children ? (
        <div className="relative z-[3] flex h-full w-full items-center justify-center">{children}</div>
      ) : null}
    </div>
  );
}

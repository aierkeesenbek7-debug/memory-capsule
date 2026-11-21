import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import type { MediaItem } from "@/lib/capsules";
import { cn } from "@/lib/utils";

// Cinematic slideshow: photos slowly zoom (Ken Burns) and cross-fade; videos play through.
export function Cinema({ items, className }: { items: MediaItem[]; className?: string }) {
  const [index, setIndex] = useState(0);
  const current = items[index];
  const next = () => setIndex((i) => (items.length ? (i + 1) % items.length : 0));
  const prev = () => setIndex((i) => (items.length ? (i - 1 + items.length) % items.length : 0));

  useEffect(() => {
    if (!current || current.type !== "image" || items.length < 2) return;
    const t = setTimeout(next, 6000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, current?.id, items.length]);

  if (!current) {
    return (
      <div className={cn("glass flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-3xl text-muted-foreground", className)}>
        <ImageOff className="size-8" />
        <p className="text-sm">No photos or videos were sealed in this capsule.</p>
      </div>
    );
  }

  return (
    <div className={cn("relative aspect-video w-full overflow-hidden rounded-3xl bg-night shadow-glow", className)}>
      <div key={current.id} className="fade-slide absolute inset-0">
        {current.type === "image" ? (
          <img src={current.url} alt="" className="kenburns h-full w-full object-cover" />
        ) : (
          <video
            src={current.url}
            className="h-full w-full object-contain"
            controls
            autoPlay
            playsInline
            onEnded={items.length > 1 ? next : undefined}
          />
        )}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-night/80 to-transparent" />
      {items.length > 1 ? (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Previous"
            className="glass absolute left-3 top-1/2 -translate-y-1/2 rounded-full p-2"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next"
            className="glass absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2"
          >
            <ChevronRight className="size-5" />
          </button>
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-1.5">
            {items.map((m, i) => (
              <button
                key={m.id}
                type="button"
                aria-label={`Show item ${i + 1}`}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-6 bg-primary" : "w-1.5 bg-foreground/40",
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

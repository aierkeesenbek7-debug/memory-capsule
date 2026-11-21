import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Orb } from "./Orb";
import { CapsuleReveal } from "./CapsuleReveal";
import type { Hue } from "@/lib/capsule-rules";
import type { CapsuleContents, CommentWithAuthor, MediaItem } from "@/lib/capsules";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  hue: Hue;
  coverUrl?: string | undefined;
  contents: CapsuleContents | null | undefined;
  media: MediaItem[];
  comments: CommentWithAuthor[];
  onClose: () => void;
}

type Phase = "charge" | "burst" | "reveal";

export function OpeningExperience({ title, hue, coverUrl, contents, media, comments, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("charge");

  useEffect(() => {
    const a = setTimeout(() => setPhase("burst"), 1800);
    const b = setTimeout(() => setPhase("reveal"), 2700);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(a);
      clearTimeout(b);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-night/95 backdrop-blur-xl" role="dialog" aria-modal="true" aria-label={`Opening ${title}`}>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="glass fixed right-4 top-4 z-[60] rounded-full p-2"
      >
        <X className="size-5" />
      </button>

      {phase !== "reveal" ? (
        <div className="flex min-h-full items-center justify-center">
          <div className="relative flex items-center justify-center">
            <div className="light-rays absolute size-[140vmax] opacity-70" />
            {phase === "burst" ? <div className="flash absolute size-[80vmin] rounded-full" /> : null}
            <Orb
              hue={hue}
              size={220}
              src={coverUrl}
              className={cn(phase === "charge" ? "orb-charging" : "orb-burst")}
            />
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-5xl animate-rise px-4 pb-20 pt-16 sm:px-8">
          <p className="text-center text-xs uppercase tracking-[0.3em] text-primary">Capsule opened</p>
          <h2 className="mb-10 mt-2 text-center font-display text-4xl sm:text-6xl">{title}</h2>
          <CapsuleReveal contents={contents} media={media} comments={comments} />
        </div>
      )}
    </div>
  );
}

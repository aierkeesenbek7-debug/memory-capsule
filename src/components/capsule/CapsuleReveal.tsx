import { Music, Sparkles, Heart } from "lucide-react";
import { format } from "date-fns";
import { Cinema } from "./Cinema";
import { getMusicEmbed } from "@/lib/capsule-rules";
import type { CapsuleContents, CommentWithAuthor, MediaItem } from "@/lib/capsules";

interface Props {
  contents: CapsuleContents | null | undefined;
  media: MediaItem[];
  comments?: CommentWithAuthor[] | undefined;
}

export function CapsuleReveal({ contents, media, comments }: Props) {
  const embed = getMusicEmbed(contents?.music_url);
  return (
    <div className="space-y-8">
      <Cinema items={media} />

      {contents?.story ? (
        <section className="glass rounded-3xl p-6 sm:p-10">
          <p className="mb-4 text-xs uppercase tracking-[0.25em] text-primary">The story</p>
          <p className="whitespace-pre-wrap font-display text-xl leading-relaxed sm:text-2xl">
            {contents.story}
          </p>
        </section>
      ) : null}

      {contents?.music_url ? (
        <section className="glass space-y-4 rounded-3xl p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/15 p-2 text-primary">
              <Music className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Soundtrack</p>
              <a
                href={contents.music_url}
                target="_blank"
                rel="noreferrer"
                className="block truncate text-primary underline-offset-4 hover:underline"
              >
                {contents.music_url}
              </a>
            </div>
          </div>
          {embed ? (
            <iframe
              src={embed}
              title="Capsule soundtrack"
              className="h-40 w-full rounded-2xl sm:h-80"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
          ) : null}
        </section>
      ) : null}

      {comments && comments.length ? (
        <section className="space-y-4">
          <p className="text-xs uppercase tracking-[0.25em] text-primary">Messages from your people</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {comments.map((c) => (
              <div key={c.id} className="glass rounded-2xl p-5">
                <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                  {c.kind === "wish" ? <Sparkles className="size-3.5 text-primary" /> : <Heart className="size-3.5 text-accent" />}
                  <span className="font-medium text-foreground">{c.author?.display_name || "Someone"}</span>
                  <span>· {format(new Date(c.created_at), "d MMM yyyy")}</span>
                </div>
                <p className="whitespace-pre-wrap">{c.body}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Lock, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TubeScene } from "@/components/capsule/TubeScene";
import { CapsuleCard } from "@/components/capsule/CapsuleCard";
import { Orb } from "@/components/capsule/Orb";
import { useAuth } from "@/lib/auth";
import { useNow } from "@/hooks/use-now";
import { useCoverUrls } from "@/hooks/use-cover-urls";
import { useReadyCapsules } from "@/hooks/use-ready-capsules";
import { fetchMyCapsules, fetchMyOpens, fetchSharedCapsules } from "@/lib/capsules";
import { asHue } from "@/lib/capsule-rules";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TIME CAPSULE — Your memories. Your people. Your moments." },
      {
        name: "description",
        content: "Create digital memory capsules with photos, videos, stories and music that open on a date you choose.",
      },
      { property: "og:title", content: "TIME CAPSULE — Your memories. Your people. Your moments." },
      {
        property: "og:description",
        content: "Create digital memory capsules with photos, videos, stories and music that open on a date you choose.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  const mine = useQuery({
    queryKey: ["capsules", "mine", user?.id],
    queryFn: () => fetchMyCapsules(user!.id),
    enabled: !!user,
  });
  const shared = useQuery({
    queryKey: ["capsules", "shared", user?.id],
    queryFn: () => fetchSharedCapsules(user!.id),
    enabled: !!user,
  });
  const hues = [...(mine.data ?? []), ...(shared.data ?? [])].map((c) => asHue(c.hue));

  return (
    <main>
      <section className="relative -mt-[4.25rem] flex h-[88vh] min-h-[620px] max-h-[860px] items-center justify-center overflow-hidden px-4 pt-20">
        <TubeScene hues={hues} className="absolute inset-0 h-full w-full opacity-90" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--background)_0%,transparent_60%)] opacity-80" />
        <div className="relative z-10 mx-auto max-w-3xl animate-rise text-center">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.4em] text-muted-foreground">
            A home for the moments that matter
          </p>
          <h1 className="font-display text-6xl leading-[0.95] sm:text-8xl md:text-9xl">
            <span className="text-gradient">TIME</span> CAPSULE
          </h1>
          <p className="mx-auto mt-6 max-w-xl font-display text-2xl italic text-foreground/85 sm:text-3xl">
            Your memories. Your people. Your moments.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild variant="hero" size="xl">
              <Link to="/create">
                Create your capsule <ArrowRight />
              </Link>
            </Button>
            {!user && !loading ? (
              <Button asChild variant="glass" size="xl">
                <Link to="/auth">Sign in</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        {loading ? null : user ? (
          <SignedInCapsules
            userId={user.id}
            mine={mine.data}
            shared={shared.data}
            isLoading={mine.isLoading || shared.isLoading}
          />
        ) : (
          <HowItWorks />
        )}
      </section>
    </main>
  );
}

function SignedInCapsules({
  userId,
  mine,
  shared,
  isLoading,
}: {
  userId: string;
  mine: Awaited<ReturnType<typeof fetchMyCapsules>> | undefined;
  shared: Awaited<ReturnType<typeof fetchSharedCapsules>> | undefined;
  isLoading: boolean;
}) {
  const now = useNow(1000);
  const ready = useReadyCapsules(userId);
  const opens = useQuery({ queryKey: ["opens", userId], queryFn: () => fetchMyOpens(userId) });
  const opened = new Set((opens.data ?? []).map((o) => o.capsule_id));
  const covers = useCoverUrls([...(mine ?? []), ...(shared ?? [])].map((c) => c.cover_path));

  return (
    <div className="space-y-16">
      {ready.data && ready.data.length > 0 ? (
        <Link
          to="/capsules/$id"
          params={{ id: ready.data[0]!.id }}
          className="glass-strong flex items-center gap-4 rounded-3xl p-5 transition hover:-translate-y-0.5"
        >
          <Orb hue={asHue(ready.data[0]!.hue)} size={56} ready />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-xs uppercase tracking-[0.25em] text-primary">
              <Sparkles className="size-3.5" /> A capsule is ready
            </p>
            <p className="truncate font-display text-2xl">
              “{ready.data[0]!.title}” can be opened now
              {ready.data.length > 1 ? ` (+${ready.data.length - 1} more)` : ""}
            </p>
          </div>
          <ArrowRight className="size-5 shrink-0 text-primary" />
        </Link>
      ) : null}

      <div>
        <SectionTitle title="Your capsules" hint="Memories you've sealed" />
        {isLoading ? (
          <CardSkeletons />
        ) : mine && mine.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {mine.map((c) => (
              <CapsuleCard
                key={c.id}
                capsule={c}
                now={now}
                coverUrl={c.cover_path ? covers[c.cover_path] : undefined}
                opened={opened.has(c.id)}
              />
            ))}
          </div>
        ) : (
          <div className="glass flex flex-col items-center gap-4 rounded-3xl p-10 text-center">
            <Orb hue="rose" size={90} className="animate-float" />
            <p className="font-display text-3xl">Your first capsule is waiting</p>
            <p className="max-w-md text-muted-foreground">
              Gather a few photos, a story and a song — then choose the day it opens.
            </p>
            <Button asChild variant="hero" size="lg">
              <Link to="/create">Create your capsule</Link>
            </Button>
          </div>
        )}
      </div>

      {shared && shared.length > 0 ? (
        <div>
          <SectionTitle title="Shared with you" hint="Capsules your people invited you to" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shared.map((c) => (
              <CapsuleCard
                key={c.id}
                capsule={c}
                now={now}
                coverUrl={c.cover_path ? covers[c.cover_path] : undefined}
                subtitle={`From ${c.owner?.display_name || "a friend"}`}
                opened={opened.has(c.id)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SectionTitle({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-4xl sm:text-5xl">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

function CardSkeletons() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="glass h-72 animate-pulse rounded-3xl" />
      ))}
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { hue: "coral" as const, icon: Sparkles, title: "Gather", text: "Photos, videos, a personal story and the song of the moment." },
    { hue: "aqua" as const, icon: Users, title: "Invite", text: "Keep it personal, or let family and friends add wishes and memories." },
    { hue: "amber" as const, icon: Lock, title: "Seal", text: "Pick a future date. Until then, nobody — not even you — can peek." },
  ];
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {steps.map((s, i) => (
        <div key={s.title} className="glass flex flex-col items-center gap-4 rounded-3xl p-8 text-center" style={{ animationDelay: `${i * 120}ms` }}>
          <Orb hue={s.hue} size={84} className="animate-float" style={{ animationDelay: `${i * 0.8}s` }}>
            <s.icon className="size-6" />
          </Orb>
          <h3 className="font-display text-3xl">{s.title}</h3>
          <p className="text-muted-foreground">{s.text}</p>
        </div>
      ))}
    </div>
  );
}

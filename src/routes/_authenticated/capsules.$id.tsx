import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState, type FormEvent } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { CalendarHeart, Heart, Lock, Play, Sparkles, Trash2, Upload, Users, ShieldAlert, Unlock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Orb } from "@/components/capsule/Orb";
import { Countdown } from "@/components/capsule/Countdown";
import { CapsuleReveal } from "@/components/capsule/CapsuleReveal";
import { OpeningExperience } from "@/components/capsule/OpeningExperience";
import { useNow } from "@/hooks/use-now";
import { useCoverUrls } from "@/hooks/use-cover-urls";
import { MAX_FILE_BYTES, asHue, isCapsuleOpen, isEmail } from "@/lib/capsule-rules";
import {
  addMediaToCapsule,
  errorMessage,
  fetchCapsule,
  fetchComments,
  fetchContents,
  fetchMedia,
  fetchMyOpens,
  fetchParticipants,
  mediaTypeOf,
  type CapsuleWithOwner,
  type CommentWithAuthor,
  type Participant,
} from "@/lib/capsules";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/capsules/$id")({
  head: () => ({
    meta: [
      { title: "A memory capsule — TIME CAPSULE" },
      { name: "description", content: "A sealed memory capsule waiting for its opening day." },
      { property: "og:title", content: "A memory capsule — TIME CAPSULE" },
      { property: "og:description", content: "A sealed memory capsule waiting for its opening day." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CapsulePage,
});

function CapsulePage() {
  const { id } = Route.useParams();
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const now = useNow(1000);
  const [opening, setOpening] = useState(false);

  const capsuleQ = useQuery({ queryKey: ["capsule", id], queryFn: () => fetchCapsule(id) });
  const capsule = capsuleQ.data;
  const open = capsule ? isCapsuleOpen(capsule.open_at, now) : false;

  const opensQ = useQuery({ queryKey: ["opens", user.id], queryFn: () => fetchMyOpens(user.id) });
  const openedByMe = (opensQ.data ?? []).some((o) => o.capsule_id === id);

  // The database decides when contents unseal; null means still sealed server-side.
  const contentsQ = useQuery({
    queryKey: ["contents", id],
    queryFn: () => fetchContents(id),
    enabled: open,
    refetchInterval: (q) => (q.state.data === null ? 4000 : false),
  });
  const mediaQ = useQuery({ queryKey: ["media", id], queryFn: () => fetchMedia(id), enabled: open && !!contentsQ.data });
  const participantsQ = useQuery({ queryKey: ["participants", id], queryFn: () => fetchParticipants(id), enabled: !!capsule });
  const commentsQ = useQuery({ queryKey: ["comments", id], queryFn: () => fetchComments(id), enabled: !!capsule });
  const covers = useCoverUrls([capsule?.cover_path]);
  const coverUrl = capsule?.cover_path ? covers[capsule.cover_path] : undefined;

  const closeOpening = useCallback(() => setOpening(false), []);

  async function startOpening() {
    setOpening(true);
    const { error } = await supabase.from("capsule_opens").insert({ capsule_id: id, user_id: user.id });
    if (error && error.code !== "23505") toast.error(errorMessage(error));
    queryClient.invalidateQueries({ queryKey: ["opens"] });
    queryClient.invalidateQueries({ queryKey: ["ready"] });
  }

  if (capsuleQ.isLoading) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center">
        <Orb hue="aqua" size={100} className="animate-pulse" />
      </main>
    );
  }

  if (!capsule) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="glass max-w-md rounded-3xl p-10 text-center">
          <ShieldAlert className="mx-auto size-10 text-primary" />
          <h1 className="mt-4 font-display text-4xl">This capsule is private</h1>
          <p className="mt-2 text-muted-foreground">
            Only its owner and invited people can see it. If you were invited, sign in with the email address the invite was sent to.
          </p>
          <Button asChild variant="hero" className="mt-6">
            <Link to="/">Back home</Link>
          </Button>
        </div>
      </main>
    );
  }

  const isOwner = capsule.owner_id === user.id;
  const participants = participantsQ.data ?? [];
  const me = participants.find((p) => p.email === user.email?.toLowerCase());
  const canUpload = isOwner || (capsule.visibility === "shared" && !!me?.can_upload);
  const hue = asHue(capsule.hue);
  const serverSealed = open && contentsQ.data === null;
  const revealed = open && !!contentsQ.data;

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-8 sm:px-6">
      {/* Header */}
      <section className="relative flex flex-col items-center text-center">
        <Orb
          hue={hue}
          size={220}
          src={coverUrl}
          ready={open && !openedByMe}
          className={cn("animate-float-slow", !open && "grayscale-[25%]")}
        >
          {!open ? (
            <div className="glass rounded-full p-3">
              <Lock className="size-7" />
            </div>
          ) : null}
        </Orb>
        <p className="mt-8 text-xs uppercase tracking-[0.3em] text-muted-foreground">
          {isOwner ? "Your capsule" : `From ${capsule.owner?.display_name || "a friend"}`} · {capsule.visibility === "shared" ? "Shared" : "Personal"}
        </p>
        <h1 className="mt-2 font-display text-5xl leading-tight sm:text-7xl">{capsule.title}</h1>
        <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm text-muted-foreground">
          {capsule.event_date ? (
            <span className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1">
              <CalendarHeart className="size-4 text-accent" /> Event {format(new Date(capsule.event_date + "T00:00:00"), "d MMMM yyyy")}
            </span>
          ) : null}
          <span className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1">
            {open ? <Unlock className="size-4 text-primary" /> : <Lock className="size-4 text-primary" />}
            {open ? "Opened" : "Opens"} {format(new Date(capsule.open_at), "d MMMM yyyy, HH:mm")}
          </span>
        </div>
      </section>

      {/* State */}
      <section className="mx-auto mt-10 max-w-2xl">
        {!open ? (
          <div className="space-y-4 text-center">
            <Countdown openAt={capsule.open_at} now={now} />
            <p className="text-sm text-muted-foreground">
              Sealed. The photos, videos, story and music stay hidden until the opening date — for everyone.
            </p>
          </div>
        ) : serverSealed ? (
          <p className="glass rounded-2xl p-5 text-center text-muted-foreground">Unsealing… just a moment.</p>
        ) : revealed && !openedByMe ? (
          <div className="glass-strong flex flex-col items-center gap-4 rounded-3xl p-8 text-center">
            <Sparkles className="size-8 text-primary" />
            <h2 className="font-display text-4xl">The day has come</h2>
            <p className="text-muted-foreground">Your capsule is ready to be opened.</p>
            <Button variant="hero" size="xl" onClick={startOpening}>
              Open the capsule
            </Button>
          </div>
        ) : null}
      </section>

      {revealed && openedByMe ? (
        <section className="mt-12 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-4xl">Inside the capsule</h2>
            <Button variant="glass" onClick={() => setOpening(true)}>
              <Play /> Replay opening
            </Button>
          </div>
          <CapsuleReveal contents={contentsQ.data} media={mediaQ.data ?? []} />
        </section>
      ) : null}

      <div className="mt-14 grid gap-6 lg:grid-cols-[1fr_340px]">
        <Comments capsuleId={id} userId={user.id} isOwner={isOwner} comments={commentsQ.data ?? []} />
        <div className="space-y-6">
          <ParticipantsPanel capsule={capsule} isOwner={isOwner} participants={participants} />
          {canUpload ? <UploadPanel capsuleId={id} userId={user.id} open={revealed} /> : null}
        </div>
      </div>

      {opening && contentsQ.data ? (
        <OpeningExperience
          title={capsule.title}
          hue={hue}
          coverUrl={coverUrl}
          contents={contentsQ.data}
          media={mediaQ.data ?? []}
          comments={commentsQ.data ?? []}
          onClose={closeOpening}
        />
      ) : null}
    </main>
  );
}

function Comments({ capsuleId, userId, isOwner, comments }: { capsuleId: string; userId: string; isOwner: boolean; comments: CommentWithAuthor[] }) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<"comment" | "wish">("wish");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("capsule_comments").insert({ capsule_id: capsuleId, author_id: userId, body: body.trim(), kind });
    setBusy(false);
    if (error) return void toast.error(errorMessage(error));
    setBody("");
    queryClient.invalidateQueries({ queryKey: ["comments", capsuleId] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("capsule_comments").delete().eq("id", id);
    if (error) return void toast.error(errorMessage(error));
    queryClient.invalidateQueries({ queryKey: ["comments", capsuleId] });
  }

  return (
    <section className="glass space-y-5 rounded-3xl p-5 sm:p-7">
      <h2 className="font-display text-3xl">Comments & wishes</h2>
      <form onSubmit={submit} className="space-y-3">
        <div className="flex gap-2">
          {(["wish", "comment"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              className={cn("rounded-full px-3 py-1 text-xs transition", kind === k ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}
            >
              {k === "wish" ? "Wish" : "Comment"}
            </button>
          ))}
        </div>
        <Textarea value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} rows={3} placeholder={kind === "wish" ? "A wish for the day this opens…" : "Say something…"} className="rounded-xl" />
        <Button type="submit" variant="hero" disabled={busy || !body.trim()}>Post</Button>
      </form>
      <ul className="space-y-3">
        {comments.length === 0 ? <li className="text-sm text-muted-foreground">No messages yet. Be the first.</li> : null}
        {comments.map((c) => (
          <li key={c.id} className="rounded-2xl bg-secondary/50 p-4">
            <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
              {c.kind === "wish" ? <Sparkles className="size-3.5 text-primary" /> : <Heart className="size-3.5 text-accent" />}
              <span className="font-medium text-foreground">{c.author?.display_name || "Someone"}</span>
              <span>· {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
              {c.author_id === userId || isOwner ? (
                <button type="button" aria-label="Delete message" onClick={() => remove(c.id)} className="ml-auto opacity-60 hover:opacity-100">
                  <Trash2 className="size-3.5" />
                </button>
              ) : null}
            </div>
            <p className="whitespace-pre-wrap text-sm">{c.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ParticipantsPanel({ capsule, isOwner, participants }: { capsule: CapsuleWithOwner; isOwner: boolean; participants: Participant[] }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["participants", capsule.id] });
    queryClient.invalidateQueries({ queryKey: ["capsule", capsule.id] });
  };

  async function invite(e: FormEvent) {
    e.preventDefault();
    if (!isEmail(email)) return void toast.error("Enter a valid email address.");
    const { error } = await supabase.from("capsule_participants").insert({ capsule_id: capsule.id, email, can_upload: true });
    if (error) return void toast.error(error.code === "23505" ? "Already invited." : errorMessage(error));
    setEmail("");
    refresh();
  }
  async function toggle(p: Participant, v: boolean) {
    const { error } = await supabase.from("capsule_participants").update({ can_upload: v }).eq("id", p.id);
    if (error) toast.error(errorMessage(error));
    refresh();
  }
  async function remove(p: Participant) {
    const { error } = await supabase.from("capsule_participants").delete().eq("id", p.id);
    if (error) toast.error(errorMessage(error));
    refresh();
  }
  async function makeShared() {
    const { error } = await supabase.from("capsules").update({ visibility: "shared" }).eq("id", capsule.id);
    if (error) toast.error(errorMessage(error));
    refresh();
  }

  return (
    <section className="glass space-y-4 rounded-3xl p-5">
      <h2 className="flex items-center gap-2 font-display text-2xl">
        <Users className="size-5 text-accent" /> Participants
      </h2>
      <div className="flex items-center gap-3 rounded-xl bg-secondary/50 px-3 py-2 text-sm">
        <Orb hue={asHue(capsule.hue)} size={22} />
        <span className="truncate">{capsule.owner?.display_name || "Owner"}</span>
        <span className="ml-auto text-xs text-muted-foreground">Owner</span>
      </div>
      {capsule.visibility === "personal" ? (
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>A personal capsule — just for you.</p>
          {isOwner ? <Button variant="glass" size="sm" onClick={makeShared}>Make it shared</Button> : null}
        </div>
      ) : (
        <>
          {participants.length === 0 ? <p className="text-sm text-muted-foreground">Nobody invited yet.</p> : null}
          {participants.map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded-xl bg-secondary/50 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate">{p.email}</span>
              {isOwner ? (
                <>
                  <Switch checked={p.can_upload} onCheckedChange={(v) => toggle(p, v)} aria-label={`Allow ${p.email} to add media`} />
                  <button type="button" aria-label={`Remove ${p.email}`} onClick={() => remove(p)} className="opacity-60 hover:opacity-100">
                    <Trash2 className="size-4" />
                  </button>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">{p.can_upload ? "Can add media" : "Guest"}</span>
              )}
            </div>
          ))}
          {isOwner ? (
            <>
              <p className="text-xs text-muted-foreground">Switch on to let someone add their own photos and videos.</p>
              <form onSubmit={invite} className="flex gap-2">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="friend@example.com" className="rounded-xl" />
                <Button type="submit" variant="glass">Invite</Button>
              </form>
            </>
          ) : null}
        </>
      )}
    </section>
  );
}

function UploadPanel({ capsuleId, userId, open }: { capsuleId: string; userId: string; open: boolean }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  async function onFiles(list: FileList | null) {
    const files = Array.from(list ?? []).filter((f) => {
      if (!mediaTypeOf(f)) return void toast.error(`${f.name} isn't a photo or video.`), false;
      if (f.size > MAX_FILE_BYTES) return void toast.error(`${f.name} is larger than 50 MB.`), false;
      return true;
    });
    if (!files.length) return;
    setBusy(true);
    try {
      await addMediaToCapsule(capsuleId, userId, files);
      toast.success(open ? "Added to the capsule." : "Added and sealed until opening day.");
      queryClient.invalidateQueries({ queryKey: ["media", capsuleId] });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="glass space-y-3 rounded-3xl p-5">
      <h2 className="font-display text-2xl">Add your memories</h2>
      <p className="text-sm text-muted-foreground">
        {open ? "Add more photos and videos to this capsule." : "Photos and videos you add stay sealed until opening day."}
      </p>
      <label className={cn("glass flex cursor-pointer items-center justify-center gap-2 rounded-xl p-3 text-sm transition hover:bg-glass-strong", busy && "pointer-events-none opacity-60")}>
        <Upload className="size-4" /> {busy ? "Uploading…" : "Choose photos or videos"}
        <input type="file" accept="image/*,video/*" multiple className="sr-only" onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
      </label>
    </section>
  );
}

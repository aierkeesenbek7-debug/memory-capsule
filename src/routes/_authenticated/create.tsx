import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ImagePlus, Lock, Users, User, X, Film, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Orb } from "@/components/capsule/Orb";
import { HUES, MAX_FILE_BYTES, isEmail, validateCapsuleDraft, type Hue } from "@/lib/capsule-rules";
import { addMediaToCapsule, errorMessage, mediaTypeOf, uploadCapsuleFile } from "@/lib/capsules";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/create")({
  head: () => ({
    meta: [
      { title: "Create a capsule — TIME CAPSULE" },
      { name: "description", content: "Seal photos, videos, a story and a song in a memory capsule that opens on a future date." },
      { property: "og:title", content: "Create a capsule — TIME CAPSULE" },
      { property: "og:description", content: "Seal your memories until the day you choose." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CreateCapsule,
});

interface Invite {
  email: string;
  canUpload: boolean;
}

function CreateCapsule() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [story, setStory] = useState("");
  const [musicUrl, setMusicUrl] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [openAt, setOpenAt] = useState("");
  const [hue, setHue] = useState<Hue>("amber");
  const [visibility, setVisibility] = useState<"personal" | "shared">("personal");
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [cover, setCover] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<string | null>(null);

  const coverPreview = useMemo(() => (cover ? URL.createObjectURL(cover) : undefined), [cover]);
  const minOpen = format(new Date(Date.now() + 60_000), "yyyy-MM-dd'T'HH:mm");

  function addFiles(list: FileList | null) {
    if (!list) return;
    const accepted: File[] = [];
    for (const f of Array.from(list)) {
      if (!mediaTypeOf(f)) toast.error(`${f.name} isn't a photo or video.`);
      else if (f.size > MAX_FILE_BYTES) toast.error(`${f.name} is larger than 50 MB.`);
      else accepted.push(f);
    }
    setFiles((prev) => [...prev, ...accepted]);
  }

  function addInvite() {
    const email = inviteEmail.trim().toLowerCase();
    if (!isEmail(email)) return void toast.error("Enter a valid email address.");
    if (email === user.email?.toLowerCase()) return void toast.error("You're already the owner.");
    if (invites.some((i) => i.email === email)) return;
    setInvites((prev) => [...prev, { email, canUpload: true }]);
    setInviteEmail("");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const errors = validateCapsuleDraft({
      title,
      openAt,
      musicUrl,
      visibility,
      invites: invites.map((i) => i.email),
    });
    if (errors.length) return void toast.error(errors[0]);
    if (cover && cover.size > MAX_FILE_BYTES) return void toast.error("The cover image is larger than 50 MB.");

    try {
      setProgress("Sealing your capsule…");
      const { data: capsule, error } = await supabase
        .from("capsules")
        .insert({
          owner_id: user.id,
          title: title.trim(),
          event_date: eventDate || null,
          open_at: new Date(openAt).toISOString(),
          visibility,
          hue,
        })
        .select("id")
        .single();
      if (error) throw error;

      const { error: cErr } = await supabase.from("capsule_contents").insert({
        capsule_id: capsule.id,
        story: story.trim() || null,
        music_url: musicUrl.trim() || null,
      });
      if (cErr) throw cErr;

      if (cover) {
        setProgress("Uploading cover…");
        const path = await uploadCapsuleFile(capsule.id, "cover", cover);
        const { error: uErr } = await supabase.from("capsules").update({ cover_path: path }).eq("id", capsule.id);
        if (uErr) throw uErr;
      }

      if (files.length) {
        setProgress(`Uploading ${files.length} memor${files.length === 1 ? "y" : "ies"}…`);
        await addMediaToCapsule(capsule.id, user.id, files);
      }

      if (visibility === "shared" && invites.length) {
        setProgress("Inviting your people…");
        const { error: iErr } = await supabase.from("capsule_participants").insert(
          invites.map((i) => ({ capsule_id: capsule.id, email: i.email, can_upload: i.canUpload })),
        );
        if (iErr) throw iErr;
      }

      await queryClient.invalidateQueries({ queryKey: ["capsules"] });
      toast.success("Your capsule is sealed.");
      navigate({ to: "/capsules/$id", params: { id: capsule.id } });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setProgress(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-10 sm:px-6">
      <div className="mb-10 animate-rise text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-primary">New capsule</p>
        <h1 className="mt-2 font-display text-5xl sm:text-6xl">Seal a moment in glass</h1>
      </div>

      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Panel title="The memory">
            <div className="space-y-1.5">
              <Label htmlFor="title">Capsule title</Label>
              <Input id="title" required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Our summer by the lake" className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="story">Your story</Label>
              <Textarea id="story" rows={7} maxLength={20000} value={story} onChange={(e) => setStory(e.target.value)} placeholder="Dear future me…" className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="music">Music link</Label>
              <Input id="music" type="url" value={musicUrl} onChange={(e) => setMusicUrl(e.target.value)} placeholder="https://open.spotify.com/track/… or YouTube link" className="h-11 rounded-xl" />
            </div>
          </Panel>

          <Panel title="Photos & videos">
            <label className="glass flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-dashed p-8 text-center transition hover:bg-glass-strong">
              <Upload className="size-6 text-primary" />
              <span className="font-medium">Add photos and videos</span>
              <span className="text-xs text-muted-foreground">Up to 50 MB each</span>
              <input type="file" accept="image/*,video/*" multiple className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            </label>
            {files.length ? (
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="relative aspect-square overflow-hidden rounded-xl bg-secondary">
                    {mediaTypeOf(f) === "image" ? (
                      <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-xs text-muted-foreground">
                        <Film className="size-5" />
                        <span className="line-clamp-2 break-all">{f.name}</span>
                      </div>
                    )}
                    <button type="button" aria-label="Remove" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} className="glass absolute right-1 top-1 rounded-full p-1">
                      <X className="size-3" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </Panel>

          <Panel title="Who is it for?">
            <div className="grid grid-cols-2 gap-3">
              {([
                { v: "personal", icon: User, label: "Personal", text: "Just for you" },
                { v: "shared", icon: Users, label: "Shared", text: "Invite your people" },
              ] as const).map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setVisibility(o.v)}
                  aria-pressed={visibility === o.v}
                  className={cn(
                    "glass flex flex-col items-start gap-1 rounded-2xl p-4 text-left transition",
                    visibility === o.v ? "ring-2 ring-primary" : "opacity-70 hover:opacity-100",
                  )}
                >
                  <o.icon className="size-5 text-primary" />
                  <span className="font-medium">{o.label}</span>
                  <span className="text-xs text-muted-foreground">{o.text}</span>
                </button>
              ))}
            </div>
            {visibility === "shared" ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addInvite(); } }}
                    placeholder="friend@example.com"
                    className="h-11 rounded-xl"
                  />
                  <Button type="button" variant="glass" className="h-11" onClick={addInvite}>Invite</Button>
                </div>
                <p className="text-xs text-muted-foreground">Invited people sign in with this email to see the capsule.</p>
                {invites.map((i) => (
                  <div key={i.email} className="flex items-center justify-between gap-3 rounded-xl bg-secondary/60 px-3 py-2">
                    <span className="min-w-0 truncate text-sm">{i.email}</span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        Can add media
                        <Switch checked={i.canUpload} onCheckedChange={(v) => setInvites((p) => p.map((x) => (x.email === i.email ? { ...x, canUpload: v } : x)))} />
                      </label>
                      <button type="button" aria-label={`Remove ${i.email}`} onClick={() => setInvites((p) => p.filter((x) => x.email !== i.email))}>
                        <X className="size-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </Panel>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Panel title="Your orb">
            <div className="flex justify-center py-2">
              <Orb hue={hue} size={150} src={coverPreview} className="animate-float" />
            </div>
            <div className="flex justify-center gap-2">
              {HUES.map((h) => (
                <button key={h} type="button" aria-label={`${h} orb`} aria-pressed={hue === h} onClick={() => setHue(h)} className={cn("rounded-full p-0.5 transition", hue === h ? "ring-2 ring-foreground" : "opacity-70")}>
                  <Orb hue={h} size={28} />
                </button>
              ))}
            </div>
            <label className="glass flex cursor-pointer items-center justify-center gap-2 rounded-xl p-3 text-sm transition hover:bg-glass-strong">
              <ImagePlus className="size-4" /> {cover ? "Change cover image" : "Add cover image"}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => setCover(e.target.files?.[0] ?? null)} />
            </label>
          </Panel>

          <Panel title="Dates">
            <div className="space-y-1.5">
              <Label htmlFor="event">Event date</Label>
              <Input id="event" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="open">Opening date</Label>
              <Input id="open" type="datetime-local" required min={minOpen} value={openAt} onChange={(e) => setOpenAt(e.target.value)} className="h-11 rounded-xl" />
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="size-3" /> Can't be changed once sealed.
              </p>
            </div>
          </Panel>

          <Button type="submit" variant="hero" size="xl" className="w-full" disabled={!!progress}>
            {progress ?? "Seal the capsule"}
          </Button>
        </aside>
      </form>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="glass space-y-4 rounded-3xl p-5 sm:p-6">
      <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

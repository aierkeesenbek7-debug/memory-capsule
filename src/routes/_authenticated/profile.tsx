import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Orb } from "@/components/capsule/Orb";
import { CapsuleCard } from "@/components/capsule/CapsuleCard";
import { useNow } from "@/hooks/use-now";
import { useCoverUrls } from "@/hooks/use-cover-urls";
import { errorMessage, fetchMyCapsules, fetchMyOpens, fetchSharedCapsules, type Capsule } from "@/lib/capsules";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile & archive — TIME CAPSULE" },
      { name: "description", content: "Your created capsules, capsules shared with you, and your archive of opened memories." },
      { property: "og:title", content: "Your profile & archive — TIME CAPSULE" },
      { property: "og:description", content: "Your created, shared and opened memory capsules." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const now = useNow(1000);

  const profileQ = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const mine = useQuery({ queryKey: ["capsules", "mine", user.id], queryFn: () => fetchMyCapsules(user.id) });
  const shared = useQuery({ queryKey: ["capsules", "shared", user.id], queryFn: () => fetchSharedCapsules(user.id) });
  const opens = useQuery({ queryKey: ["opens", user.id], queryFn: () => fetchMyOpens(user.id) });

  const [name, setName] = useState("");
  useEffect(() => {
    if (profileQ.data) setName(profileQ.data.display_name);
  }, [profileQ.data]);

  const all: Capsule[] = [...(mine.data ?? []), ...(shared.data ?? [])];
  const openedIds = new Set((opens.data ?? []).map((o) => o.capsule_id));
  const archive = all
    .filter((c) => openedIds.has(c.id))
    .sort((a, b) => b.open_at.localeCompare(a.open_at));
  const covers = useCoverUrls(all.map((c) => c.cover_path));

  async function saveName(e: FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("profiles").update({ display_name: name.trim() }).eq("id", user.id);
    if (error) return void toast.error(errorMessage(error));
    toast.success("Name saved.");
    queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
  }

  const grid = (list: Capsule[], empty: string) =>
    list.length ? (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((c) => (
          <CapsuleCard key={c.id} capsule={c} now={now} coverUrl={c.cover_path ? covers[c.cover_path] : undefined} opened={openedIds.has(c.id)} />
        ))}
      </div>
    ) : (
      <p className="glass rounded-3xl p-10 text-center text-muted-foreground">{empty}</p>
    );

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6">
      <section className="glass-strong flex flex-col items-center gap-6 rounded-[2rem] p-6 sm:flex-row sm:p-8">
        <Orb hue="coral" size={96} className="animate-float">
          <span className="font-display text-4xl">{(profileQ.data?.display_name || user.email || "?").charAt(0).toUpperCase()}</span>
        </Orb>
        <div className="w-full min-w-0 flex-1 space-y-3 text-center sm:text-left">
          <form onSubmit={saveName} className="flex flex-col gap-2 sm:flex-row">
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} aria-label="Display name" className="h-11 rounded-xl text-base font-medium" />
            <Button type="submit" variant="glass" className="h-11">Save</Button>
          </form>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { n: mine.data?.length ?? 0, l: "Created" },
            { n: shared.data?.length ?? 0, l: "Shared" },
            { n: archive.length, l: "Opened" },
          ].map((s) => (
            <div key={s.l} className="glass rounded-2xl px-4 py-3">
              <div className="font-display text-3xl">{s.n}</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      <Tabs defaultValue="created" className="mt-10">
        <TabsList className="glass h-auto rounded-full p-1">
          <TabsTrigger value="created" className="rounded-full px-4 py-1.5">Created</TabsTrigger>
          <TabsTrigger value="shared" className="rounded-full px-4 py-1.5">Shared with me</TabsTrigger>
          <TabsTrigger value="archive" className="rounded-full px-4 py-1.5">Archive</TabsTrigger>
        </TabsList>
        <TabsContent value="created" className="mt-6">{grid(mine.data ?? [], "You haven't sealed a capsule yet.")}</TabsContent>
        <TabsContent value="shared" className="mt-6">{grid(shared.data ?? [], "Nobody has invited you to a capsule yet.")}</TabsContent>
        <TabsContent value="archive" className="mt-6">{grid(archive, "Capsules you open will be kept here.")}</TabsContent>
      </Tabs>
    </main>
  );
}

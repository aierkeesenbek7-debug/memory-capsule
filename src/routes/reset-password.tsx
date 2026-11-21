import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Orb } from "@/components/capsule/Orb";
import { errorMessage } from "@/lib/capsules";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — TIME CAPSULE" },
      { name: "description", content: "Set a new password for your TIME CAPSULE account." },
      { property: "og:title", content: "Choose a new password — TIME CAPSULE" },
      { property: "og:description", content: "Set a new password for your TIME CAPSULE account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) return void toast.error("Use at least 8 characters.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return void toast.error(errorMessage(error));
    toast.success("Password updated.");
    navigate({ to: "/" });
  }

  return (
    <main className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4">
      <form onSubmit={onSubmit} className="glass-strong w-full max-w-md space-y-5 rounded-[2rem] p-8">
        <div className="flex flex-col items-center text-center">
          <Orb hue="lime" size={64} />
          <h1 className="mt-4 font-display text-4xl">New password</h1>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pw">New password</Label>
          <Input id="pw" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 rounded-xl" />
        </div>
        <Button type="submit" variant="hero" size="xl" className="w-full" disabled={busy}>
          Save password
        </Button>
      </form>
    </main>
  );
}

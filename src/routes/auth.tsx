import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { LovableMark } from "@lovable.dev/cloud-auth-js/react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Orb } from "@/components/capsule/Orb";
import { errorMessage } from "@/lib/capsules";

type Mode = "signin" | "signup" | "forgot" | "check-email";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string } => {
    const r = s["redirect"];
    return typeof r === "string" && r.startsWith("/") && !r.startsWith("//") ? { redirect: r } : {};
  },
  head: () => ({
    meta: [
      { title: "Sign in — TIME CAPSULE" },
      { name: "description", content: "Sign in or create your TIME CAPSULE account to seal and open memory capsules." },
      { property: "og:title", content: "Sign in — TIME CAPSULE" },
      { property: "og:description", content: "Sign in or create your TIME CAPSULE account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function GoogleLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
    </svg>
  );
}

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const target = search.redirect ?? "/";

  useEffect(() => {
    if (!loading && user) navigate({ to: target, replace: true });
  }, [user, loading, navigate, target]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "signup") {
        if (password.length < 8) throw new Error("Use at least 8 characters for your password.");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + target,
            data: { display_name: name.trim() || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (!data.session) setMode("check-email");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Check your inbox for a reset link.");
        setMode("signin");
      }
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function social(provider: "google" | "lovable") {
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (result.error) toast.error(errorMessage(result.error));
  }

  return (
    <main className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-10">
      <div className="glass-strong w-full max-w-md animate-rise rounded-[2rem] p-7 sm:p-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <Orb hue="aqua" size={72} className="animate-float" />
          <h1 className="mt-5 font-display text-4xl">
            {mode === "signup" ? "Start your archive" : mode === "forgot" ? "Reset password" : mode === "check-email" ? "Check your email" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "check-email"
              ? `We sent a confirmation link to ${email}. Open it to finish creating your account.`
              : "Your memories. Your people. Your moments."}
          </p>
        </div>

        {mode === "check-email" ? (
          <div className="flex flex-col items-center gap-4">
            <Mail className="size-10 text-primary" />
            <Button variant="glass" onClick={() => setMode("signin")}>Back to sign in</Button>
          </div>
        ) : (
          <>
            <form onSubmit={onSubmit} className="space-y-4">
              {mode === "signup" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Your name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Aigerim" className="h-11 rounded-xl" />
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-xl" autoComplete="email" />
              </div>
              {mode !== "forgot" ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {mode === "signin" ? (
                      <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setMode("forgot")}>
                        Forgot password?
                      </button>
                    ) : null}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    required
                    minLength={mode === "signup" ? 8 : undefined}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-xl"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  />
                </div>
              ) : null}
              <Button type="submit" variant="hero" size="xl" className="w-full" disabled={busy}>
                {busy ? "One moment…" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
              </Button>
            </form>

            {mode !== "forgot" ? (
              <>
                <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
                </div>
                <div className="space-y-3">
                  <Button type="button" variant="glass" size="xl" className="w-full" onClick={() => social("google")}>
                    <GoogleLogo /> Continue with Google
                  </Button>
                  <Button type="button" variant="glass" size="xl" className="w-full" onClick={() => social("lovable")}>
                    <LovableMark /> Continue with Lovable
                  </Button>
                </div>
              </>
            ) : null}

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "signin" ? (
                <>New here? <button type="button" className="text-primary hover:underline" onClick={() => setMode("signup")}>Create an account</button></>
              ) : (
                <>Already have an account? <button type="button" className="text-primary hover:underline" onClick={() => setMode("signin")}>Sign in</button></>
              )}
            </p>
          </>
        )}
      </div>
    </main>
  );
}

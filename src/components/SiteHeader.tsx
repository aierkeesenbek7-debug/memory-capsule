import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, Plus, User, LogOut, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useReadyCapsules } from "@/hooks/use-ready-capsules";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Orb } from "@/components/capsule/Orb";
import { asHue } from "@/lib/capsule-rules";

export function SiteHeader() {
  const { user, loading } = useAuth();
  const ready = useReadyCapsules(user?.id);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const count = ready.data?.length ?? 0;

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-6">
      <div className="glass-strong mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full pl-4 pr-2">
        <Link to="/" className="flex items-center gap-2.5">
          <Orb hue="amber" size={26} />
          <span className="whitespace-nowrap text-xs font-semibold tracking-[0.2em] sm:text-sm sm:tracking-[0.28em]">TIME CAPSULE</span>
        </Link>

        <nav className="flex items-center gap-1">
          {loading ? null : user ? (
            <>
              <Button asChild variant="ghost" size="sm" className="rounded-full">
                <Link to="/create">
                  <Plus /> <span className="hidden sm:inline">Create</span>
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative rounded-full" aria-label={`Notifications (${count})`}>
                    <Bell />
                    {count > 0 ? (
                      <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {count}
                      </span>
                    ) : null}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {count === 0 ? (
                    <p className="px-2 py-3 text-sm text-muted-foreground">
                      No capsules waiting. We'll let you know when one is ready.
                    </p>
                  ) : (
                    ready.data?.map((c) => (
                      <DropdownMenuItem key={c.id} asChild>
                        <Link to="/capsules/$id" params={{ id: c.id }} className="flex items-center gap-3">
                          <Orb hue={asHue(c.hue)} size={28} ready />
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{c.title}</span>
                            <span className="flex items-center gap-1 text-xs text-primary">
                              <Sparkles className="size-3" /> Ready to open
                            </span>
                          </span>
                        </Link>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button asChild variant="ghost" size="icon" className="rounded-full" aria-label="Profile">
                <Link to="/profile">
                  <User />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" className="rounded-full" aria-label="Sign out" onClick={signOut}>
                <LogOut />
              </Button>
            </>
          ) : (
            <Button asChild variant="hero" size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}

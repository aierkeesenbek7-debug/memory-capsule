import { useQuery } from "@tanstack/react-query";
import { signedUrls } from "@/lib/capsules";

export function useCoverUrls(paths: (string | null | undefined)[]) {
  const clean = Array.from(new Set(paths.filter((p): p is string => !!p))).sort();
  const q = useQuery({
    queryKey: ["covers", clean.join("|")],
    queryFn: () => signedUrls(clean),
    enabled: clean.length > 0,
    staleTime: 45 * 60 * 1000,
  });
  return q.data ?? {};
}

import { useQuery } from "@tanstack/react-query";
import { fetchReadyToOpen } from "@/lib/capsules";

// In-app notifications: capsules whose opening date has arrived and that the user hasn't opened yet.
export function useReadyCapsules(userId: string | undefined) {
  return useQuery({
    queryKey: ["ready", userId],
    queryFn: () => fetchReadyToOpen(userId as string),
    enabled: !!userId,
    refetchInterval: 60_000,
  });
}

import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Capsule = Tables<"capsules">;
export type Participant = Tables<"capsule_participants">;
export type CapsuleContents = Tables<"capsule_contents">;
export const BUCKET = "capsule-media";

export interface CapsuleWithOwner extends Capsule {
  owner: { display_name: string } | null;
}
export interface CommentWithAuthor extends Tables<"capsule_comments"> {
  author: { display_name: string } | null;
}
export interface MediaItem {
  id: string;
  type: "image" | "video";
  url: string;
  uploader_id: string;
}

export async function fetchMyCapsules(userId: string): Promise<Capsule[]> {
  const { data, error } = await supabase
    .from("capsules")
    .select("*")
    .eq("owner_id", userId)
    .order("open_at", { ascending: true });
  if (error) throw error;
  return data;
}

// RLS only returns capsules the user owns or was invited to.
export async function fetchSharedCapsules(userId: string): Promise<CapsuleWithOwner[]> {
  const { data, error } = await supabase
    .from("capsules")
    .select("*, owner:profiles!capsules_owner_id_fkey(display_name)")
    .neq("owner_id", userId)
    .order("open_at", { ascending: true });
  if (error) throw error;
  return data as CapsuleWithOwner[];
}

export async function fetchCapsule(id: string): Promise<CapsuleWithOwner | null> {
  const { data, error } = await supabase
    .from("capsules")
    .select("*, owner:profiles!capsules_owner_id_fkey(display_name)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as CapsuleWithOwner | null;
}

export async function fetchParticipants(capsuleId: string): Promise<Participant[]> {
  const { data, error } = await supabase
    .from("capsule_participants")
    .select("*")
    .eq("capsule_id", capsuleId)
    .order("invited_at");
  if (error) throw error;
  return data;
}

export async function fetchComments(capsuleId: string): Promise<CommentWithAuthor[]> {
  const { data, error } = await supabase
    .from("capsule_comments")
    .select("*, author:profiles!capsule_comments_author_id_fkey(display_name)")
    .eq("capsule_id", capsuleId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as CommentWithAuthor[];
}

// Returns null while the database still considers the capsule sealed.
export async function fetchContents(capsuleId: string): Promise<CapsuleContents | null> {
  const { data, error } = await supabase
    .from("capsule_contents")
    .select("*")
    .eq("capsule_id", capsuleId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchMedia(capsuleId: string): Promise<MediaItem[]> {
  const { data, error } = await supabase
    .from("capsule_media")
    .select("*")
    .eq("capsule_id", capsuleId)
    .order("created_at");
  if (error) throw error;
  if (!data.length) return [];
  const urls = await signedUrls(data.map((m) => m.storage_path));
  return data
    .filter((m) => urls[m.storage_path])
    .map((m) => ({
      id: m.id,
      type: m.media_type as "image" | "video",
      url: urls[m.storage_path] as string,
      uploader_id: m.uploader_id,
    }));
}

export async function fetchMyOpens(userId: string) {
  const { data, error } = await supabase
    .from("capsule_opens")
    .select("capsule_id, opened_at")
    .eq("user_id", userId);
  if (error) throw error;
  return data;
}

export async function fetchReadyToOpen(userId: string) {
  const [{ data: ready, error }, opens] = await Promise.all([
    supabase
      .from("capsules")
      .select("id, title, hue, open_at, cover_path")
      .lte("open_at", new Date().toISOString())
      .order("open_at", { ascending: false }),
    fetchMyOpens(userId),
  ]);
  if (error) throw error;
  const opened = new Set(opens.map((o) => o.capsule_id));
  return ready.filter((c) => !opened.has(c.id));
}

export async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60);
  if (error) throw error;
  const out: Record<string, string> = {};
  for (const row of data) {
    if (row.path && row.signedUrl) out[row.path] = row.signedUrl;
  }
  return out;
}

export function mediaTypeOf(file: File): "image" | "video" | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return null;
}

export async function uploadCapsuleFile(
  capsuleId: string,
  folder: "cover" | "media",
  file: File,
): Promise<string> {
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${capsuleId}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return path;
}

export async function addMediaToCapsule(capsuleId: string, userId: string, files: File[]) {
  for (const file of files) {
    const type = mediaTypeOf(file);
    if (!type) continue;
    const path = await uploadCapsuleFile(capsuleId, "media", file);
    const { error } = await supabase
      .from("capsule_media")
      .insert({ capsule_id: capsuleId, uploader_id: userId, storage_path: path, media_type: type });
    if (error) throw error;
  }
}

export function errorMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return "Something went wrong. Please try again.";
}

import { supabase } from "../supabase";
export async function uploadClubImage(file: File): Promise<string> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)
    throw new Error("Choose a PNG, JPG or WebP image under 5 MB.");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in again.");
  const extension = file.type === "image/jpeg" ? "jpg" : file.type.split("/")[1];
  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from("club-media")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return supabase.storage.from("club-media").getPublicUrl(path).data.publicUrl;
}
export async function uploadPrivateDocument(file: File) {
  if (
    !["application/pdf", "image/jpeg", "image/png"].includes(file.type) ||
    file.size > 5 * 1024 * 1024
  )
    throw new Error("Choose a PDF, JPG or PNG under 5 MB.");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in again.");
  const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const { error } = await supabase.storage
    .from("private-applicant-files")
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return path;
}
export async function privateDocumentUrl(path: string) {
  const { data, error } = await supabase.storage
    .from("private-applicant-files")
    .createSignedUrl(path, 60);
  if (error) throw error;
  return data.signedUrl;
}

// Only delete managed media after every database reference has gone. External image URLs
// are never deleted, and shared images remain available to their other entries.
export async function removeUnusedClubImage(url: string | null | undefined) {
  if (!url) return;
  const prefix = supabase.storage.from("club-media").getPublicUrl("").data.publicUrl;
  if (!url.startsWith(prefix)) return;
  const path = decodeURIComponent(url.slice(prefix.length));
  if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(path)) return;
  const results = await Promise.all([
    supabase.from("achievements").select("id").eq("image_url", url).limit(1),
    supabase.from("projects").select("id").eq("image_url", url).limit(1),
    supabase.from("club_events").select("id").eq("image_url", url).limit(1),
    supabase.from("domains").select("id").eq("image_url", url).limit(1),
    supabase.from("club_team_entries").select("id").eq("image_url", url).limit(1),
    supabase.from("gallery_items").select("id").eq("image_url", url).limit(1),
    supabase.from("profiles").select("id").eq("profile_photo_url", url).limit(1),
  ]);
  for (const result of results) if (result.error) throw result.error;
  if (results.some((result) => result.data?.length)) return;
  const { error } = await supabase.storage.from("club-media").remove([path]);
  if (error) throw error;
}

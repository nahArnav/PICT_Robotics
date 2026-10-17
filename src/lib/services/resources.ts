import { supabase } from "../supabase";
import type { Database } from "../database";
import { removeUnusedClubImage } from "./storage";

export const resourceNames = [
  "achievements",
  "projects",
  "club_events",
  "announcements",
  "recruitment_cycles",
  "recruitment_questions",
  "recruitment_rounds",
  "recruitment_tasks",
  "domains",
  "club_team_entries",
  "gallery_items",
  "homepage_metrics",
] as const;
export type ResourceName = (typeof resourceNames)[number];
export type ResourceRecord = Record<string, unknown> & { id: string };
export async function listResource(table: ResourceName, page = 0) {
  const { data, error, count } = await supabase
    .from(table)
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id")
    .range(page * 25, page * 25 + 24);
  if (error) throw error;
  return {
    rows: (data ?? []) as unknown as ResourceRecord[],
    total: count ?? 0,
  };
}
export async function removeResource(table: ResourceName, id: string) {
  const oldImage = await resourceImage(table, id);
  const { error } = await supabase.from(table).delete().eq("id", id).select("id").single();
  if (error) throw error;
  try {
    await removeUnusedClubImage(oldImage);
  } catch {
    return "Entry deleted. Its old image could not be removed.";
  }
}
async function persistResource(table: ResourceName, values: Record<string, unknown>, id?: string) {
  switch (table) {
    case "club_team_entries": {
      const row = values as Database["public"]["Tables"]["club_team_entries"]["Insert"];
      const result = id
        ? await supabase.from("club_team_entries").update(row).eq("id", id).select("id").single()
        : await supabase.from("club_team_entries").insert(row).select("id").single();
      if (result.error) throw result.error;
      return;
    }
    case "gallery_items": {
      const row = values as Database["public"]["Tables"]["gallery_items"]["Insert"];
      const result = id
        ? await supabase.from("gallery_items").update(row).eq("id", id).select("id").single()
        : await supabase.from("gallery_items").insert(row).select("id").single();
      if (result.error) throw result.error;
      return;
    }
    case "homepage_metrics": {
      const row = values as Database["public"]["Tables"]["homepage_metrics"]["Insert"];
      const result = id
        ? await supabase.from("homepage_metrics").update(row).eq("id", id).select("id").single()
        : await supabase.from("homepage_metrics").insert(row).select("id").single();
      if (result.error) throw result.error;
      return;
    }
    case "achievements": {
      const row = values as Database["public"]["Tables"]["achievements"]["Insert"];
      const result = id
        ? await supabase.from("achievements").update(row).eq("id", id).select("id").single()
        : await supabase.from("achievements").insert(row).select("id").single();
      if (result.error) throw result.error;
      return;
    }
    case "projects": {
      const row = values as Database["public"]["Tables"]["projects"]["Insert"];
      const result = id
        ? await supabase.from("projects").update(row).eq("id", id).select("id").single()
        : await supabase.from("projects").insert(row).select("id").single();
      if (result.error) throw result.error;
      return;
    }
    case "club_events": {
      const row = values as Database["public"]["Tables"]["club_events"]["Insert"];
      const result = id
        ? await supabase.from("club_events").update(row).eq("id", id).select("id").single()
        : await supabase.from("club_events").insert(row).select("id").single();
      if (result.error) throw result.error;
      return;
    }
    case "announcements": {
      const row = values as Database["public"]["Tables"]["announcements"]["Insert"];
      const result = id
        ? await supabase.from("announcements").update(row).eq("id", id).select("id").single()
        : await supabase.from("announcements").insert(row).select("id").single();
      if (result.error) throw result.error;
      return;
    }
    case "recruitment_cycles": {
      const row = values as Database["public"]["Tables"]["recruitment_cycles"]["Insert"];
      const result = id
        ? await supabase.from("recruitment_cycles").update(row).eq("id", id).select("id").single()
        : await supabase.from("recruitment_cycles").insert(row).select("id").single();
      if (result.error) throw result.error;
      return;
    }
    case "recruitment_questions": {
      const row = values as Database["public"]["Tables"]["recruitment_questions"]["Insert"];
      const result = id
        ? await supabase
            .from("recruitment_questions")
            .update(row)
            .eq("id", id)
            .select("id")
            .single()
        : await supabase.from("recruitment_questions").insert(row).select("id").single();
      if (result.error) throw result.error;
      return;
    }
    case "recruitment_rounds": {
      const row = values as Database["public"]["Tables"]["recruitment_rounds"]["Insert"];
      const result = id
        ? await supabase.from("recruitment_rounds").update(row).eq("id", id).select("id").single()
        : await supabase.from("recruitment_rounds").insert(row).select("id").single();
      if (result.error) throw result.error;
      return;
    }
    case "recruitment_tasks": {
      const row = values as Database["public"]["Tables"]["recruitment_tasks"]["Insert"];
      const result = id
        ? await supabase.from("recruitment_tasks").update(row).eq("id", id).select("id").single()
        : await supabase.from("recruitment_tasks").insert(row).select("id").single();
      if (result.error) throw result.error;
      return;
    }
    case "domains": {
      const row = values as Database["public"]["Tables"]["domains"]["Insert"];
      const result = id
        ? await supabase.from("domains").update(row).eq("id", id).select("id").single()
        : await supabase.from("domains").insert(row).select("id").single();
      if (result.error) throw result.error;
      return;
    }
  }
}
export type Cycle = Database["public"]["Tables"]["recruitment_cycles"]["Row"];

async function resourceImage(table: ResourceName, id: string) {
  if (
    ![
      "achievements",
      "projects",
      "club_events",
      "domains",
      "club_team_entries",
      "gallery_items",
    ].includes(table)
  )
    return null;
  const { data, error } = await supabase.from(table).select("image_url").eq("id", id).single();
  if (error) throw error;
  return (data as unknown as { image_url: string | null }).image_url;
}
export async function saveResource(
  table: ResourceName,
  values: Record<string, unknown>,
  id?: string,
) {
  const oldImage = id ? await resourceImage(table, id) : null;
  await persistResource(table, values, id);
  if (oldImage && oldImage !== values.image_url)
    try {
      await removeUnusedClubImage(oldImage);
    } catch {
      return "Entry saved. Its old image could not be removed.";
    }
}

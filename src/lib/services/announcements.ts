import { supabase } from '../supabase';

export type Announcement = {
  id: string;
  title: string;
  content: string;
  type: string;
  published: boolean;
  published_at: string | null;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AnnouncementInput = {
  title: string;
  content: string;
  type?: string;
  published?: boolean;
  published_at?: string | null;
  expires_at?: string | null;
};

/** Fetch published, non-expired announcements for public/applicant view. */
export async function getPublishedAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('published', true)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Announcement[];
}

/** Fetch all announcements (admin). */
export async function getAllAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Announcement[];
}

/** Create an announcement. */
export async function createAnnouncement(input: AnnouncementInput): Promise<Announcement> {
  const row = {
    ...input,
    published_at: input.published ? input.published_at ?? new Date().toISOString() : null,
  };
  const { data, error } = await supabase
    .from('announcements')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data as Announcement;
}

/** Update an announcement. */
export async function updateAnnouncement(id: string, input: Partial<AnnouncementInput>): Promise<Announcement> {
  const { data, error } = await supabase
    .from('announcements')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Announcement;
}

/** Delete an announcement. */
export async function deleteAnnouncement(id: string): Promise<void> {
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  if (error) throw error;
}

import { supabase } from '../supabase';

export type Achievement = {
  id: string;
  title: string;
  description: string;
  year: number;
  category: string | null;
  image_url: string | null;
  external_url: string | null;
  featured: boolean;
  published: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type AchievementInput = Omit<Achievement, 'id' | 'created_at' | 'updated_at'>;

/** Fetch published achievements for public pages. */
export async function getPublishedAchievements(): Promise<Achievement[]> {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .eq('published', true)
    .order('year', { ascending: false })
    .order('display_order');
  if (error) throw error;
  return (data ?? []) as Achievement[];
}

/** Fetch all achievements (admin view — RLS limits to staff). */
export async function getAllAchievements(): Promise<Achievement[]> {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .order('year', { ascending: false })
    .order('display_order');
  if (error) throw error;
  return (data ?? []) as Achievement[];
}

/** Create a new achievement. */
export async function createAchievement(input: AchievementInput): Promise<Achievement> {
  const { data, error } = await supabase
    .from('achievements')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as Achievement;
}

/** Update an existing achievement. */
export async function updateAchievement(id: string, input: Partial<AchievementInput>): Promise<Achievement> {
  const { data, error } = await supabase
    .from('achievements')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Achievement;
}

/** Delete an achievement. */
export async function deleteAchievement(id: string): Promise<void> {
  const { error } = await supabase.from('achievements').delete().eq('id', id);
  if (error) throw error;
}

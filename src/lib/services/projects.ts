import { supabase } from '../supabase';

export type Project = {
  id: string;
  title: string;
  description: string;
  year: number;
  category: string | null;
  image_url: string | null;
  repository_url: string | null;
  demo_url: string | null;
  featured: boolean;
  published: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type ProjectInput = Omit<Project, 'id' | 'created_at' | 'updated_at'>;

/** Fetch published projects for public pages. */
export async function getPublishedProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('published', true)
    .order('year', { ascending: false })
    .order('display_order');
  if (error) throw error;
  return (data ?? []) as Project[];
}

/** Fetch all projects (admin — RLS limits to staff). */
export async function getAllProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('year', { ascending: false })
    .order('display_order');
  if (error) throw error;
  return (data ?? []) as Project[];
}

/** Create a new project. */
export async function createProject(input: ProjectInput): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as Project;
}

/** Update an existing project. */
export async function updateProject(id: string, input: Partial<ProjectInput>): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Project;
}

/** Delete a project. */
export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}

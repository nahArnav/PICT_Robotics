import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

const browser = globalThis as typeof globalThis & { __pictSupabaseClient?: ReturnType<typeof createClient> };

// Keep one auth client across Vite hot reloads and route chunks.
export const supabase = browser.__pictSupabaseClient ?? createClient(`https://${projectId}.supabase.co`, publicAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
browser.__pictSupabaseClient = supabase;

export const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-3b5b87c7`;

export type AppRole = 'applicant' | 'recruiter' | 'admin' | 'super_admin';

export async function getCurrentRole(): Promise<AppRole | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
  if (error) throw error;
  const rank: Record<AppRole, number> = { super_admin: 4, admin: 3, recruiter: 2, applicant: 1 };
  return (data ?? []).map((row) => row.role as AppRole).sort((a, b) => rank[b] - rank[a])[0] ?? null;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(`${serverUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(body.error || 'Request failed');
  }
  return response.json() as Promise<T>;
}

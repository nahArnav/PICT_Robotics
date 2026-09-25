import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getCurrentRole, supabase, type AppRole } from './supabase';

export type AuthState = {
  ready: boolean;
  session: Session | null;
  user: User | null;
  role: AppRole | null;
};

export const adminRoles: readonly AppRole[] = ['recruiter', 'admin', 'super_admin'];

export function isAdminRole(role: AppRole | null): boolean {
  return role !== null && adminRoles.includes(role);
}

export async function resolveAuthState(): Promise<Omit<AuthState, 'ready'>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { session: null, user: null, role: null };

  try {
    const role = await getCurrentRole();
    return { session, user: session.user, role };
  } catch {
    // Treat an unavailable or invalid role lookup as unauthorised. Pages must not flash protected UI.
    return { session, user: session.user, role: null };
  }
}

export function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>({ ready: false, session: null, user: null, role: null });

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const next = await resolveAuthState();
      if (active) setState({ ready: true, ...next });
    };
    void refresh();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      // Deferring prevents a role query from blocking Supabase's auth callback.
      window.setTimeout(() => { void refresh(); }, 0);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}

export function authErrorMessage(error: any, fallback: string): string {
  const message = error?.message || (error instanceof Error ? error.message : typeof error === 'string' ? error : '');
  const normalized = message.toLowerCase();
  if (normalized.includes('invalid login credentials')) return 'Incorrect email or password.';
  if (normalized.includes('email not confirmed')) return 'Verify your email address, then try again.';
  if (normalized.includes('already registered') || normalized.includes('already been registered')) return 'An account already exists for this email. Sign in instead.';
  if (normalized.includes('rate limit')) return 'Too many attempts. Please wait a few minutes and try again.';
  if (normalized.includes('relation') && normalized.includes('does not exist')) return `Database error: ${message}. Did you apply all migrations to your live Supabase project?`;
  return message || fallback;
}

export function useInactivityLogout(timeoutMs: number, onLogout: () => void) {
  useEffect(() => {
    let timeout: number;

    const reset = () => {
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => {
        onLogout();
      }, timeoutMs);
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    events.forEach((evt) => window.addEventListener(evt, reset));
    reset();

    return () => {
      window.clearTimeout(timeout);
      events.forEach((evt) => window.removeEventListener(evt, reset));
    };
  }, [timeoutMs, onLogout]);
}


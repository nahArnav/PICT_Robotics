/**
 * Lightweight client-side admin auth for the demo frontend.
 * In production this would be replaced by a real session/token from the backend,
 * but the surface (login / logout / isAuthed / current) stays the same.
 */
const KEY = 'pict-robotics-admin';

export type AdminUser = { name: string; email: string; role: string; initials: string };

// Demo credentials — surfaced on the login screen so reviewers can get in.
const ACCOUNTS: Record<string, { password: string; user: AdminUser }> = {
  'admin@pictrobotics.in': {
    password: 'robocon2026',
    user: { name: 'Neha Kulkarni', email: 'admin@pictrobotics.in', role: 'Recruitment Lead', initials: 'NK' },
  },
  'coordinator@pictrobotics.in': {
    password: 'buildbreak',
    user: { name: 'Aryan Deshpande', email: 'coordinator@pictrobotics.in', role: 'Coordinator', initials: 'AD' },
  },
};

export function login(email: string, password: string): { ok: true } | { ok: false; error: string } {
  const acct = ACCOUNTS[email.trim().toLowerCase()];
  if (!acct || acct.password !== password) return { ok: false, error: 'Invalid email or password.' };
  sessionStorage.setItem(KEY, JSON.stringify(acct.user));
  return { ok: true };
}

export function logout() {
  sessionStorage.removeItem(KEY);
}

export function currentAdmin(): AdminUser | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AdminUser) : null;
  } catch {
    return null;
  }
}

export function isAuthed() {
  return currentAdmin() !== null;
}

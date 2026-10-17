import { useEffect, useSyncExternalStore } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getCurrentRole, supabase, type AppRole } from "./supabase";

export type AuthState = {
  ready: boolean;
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  error?: string;
};
export const adminRoles: readonly AppRole[] = ["recruiter", "admin", "super_admin"];
export function isAdminRole(role: AppRole | null): boolean {
  return role !== null && adminRoles.includes(role);
}
let state: AuthState = { ready: false, session: null, user: null, role: null };
let generation = 0;
let started = false;
const listeners = new Set<() => void>();
function publish(next: AuthState) {
  state = next;
  listeners.forEach((listener) => listener());
}

export async function refreshAuth() {
  const current = ++generation;
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) throw error;
    const role = session ? await getCurrentRole() : null;
    if (current === generation)
      publish({ ready: true, session, user: session?.user ?? null, role });
  } catch (error) {
    if (current === generation)
      publish({
        ready: true,
        session: null,
        user: null,
        role: null,
        error: authErrorMessage(error, "Unable to check your session. Please try again."),
      });
  }
}
export async function resolveAuthState() {
  await refreshAuth();
  return state;
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!started) {
    started = true;
    supabase.auth.onAuthStateChange((event, session) => {
      ++generation;
      publish({
        ready: !session,
        session,
        user: session?.user ?? null,
        role: null,
      });
      if (session)
        setTimeout(() => {
          void refreshAuth();
        }, 0);
      if (event === "PASSWORD_RECOVERY") window.location.replace("/reset-password");
    });
    void refreshAuth();
    window.addEventListener("focus", () => {
      void refreshAuth();
    });
    window.setInterval(() => {
      if (state.session && document.visibilityState === "visible") void refreshAuth();
    }, 60000);
  }
  return () => {
    listeners.delete(listener);
  };
}
export function useAuthState() {
  return useSyncExternalStore(subscribe, () => state);
}

export function authErrorMessage(error: unknown, fallback: string): string {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : typeof error === "string"
        ? error
        : "";
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) return "Incorrect email or password.";
  if (normalized.includes("email not confirmed"))
    return "Verify your email address, then try again.";
  if (normalized.includes("already registered"))
    return "An account already exists for this email. Sign in instead.";
  if (normalized.includes("rate limit"))
    return "Too many attempts. Please wait a few minutes and try again.";
  if (normalized.includes("failed to fetch") || normalized.includes("network"))
    return "Unable to reach the server. Your changes have not been saved. Please retry.";
  if (
    normalized.includes("schema cache") ||
    normalized.includes("relation") ||
    normalized.includes("column") ||
    normalized.includes("function") ||
    normalized.includes("row-level security") ||
    normalized.includes("permission denied")
  )
    return fallback;
  return message || fallback;
}
export function useInactivityLogout(timeoutMs: number, onLogout: () => void) {
  useEffect(() => {
    let timeout: number;
    const reset = () => {
      clearTimeout(timeout);
      timeout = window.setTimeout(onLogout, timeoutMs);
    };
    const events = ["keydown", "mousedown", "touchstart"];
    events.forEach((event) => window.addEventListener(event, reset));
    reset();
    return () => {
      clearTimeout(timeout);
      events.forEach((event) => window.removeEventListener(event, reset));
    };
  }, [timeoutMs, onLogout]);
}

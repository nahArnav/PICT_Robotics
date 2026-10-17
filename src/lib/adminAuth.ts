// Legacy import surface backed exclusively by Supabase Auth and database roles.
import { getCurrentRole, supabase } from "./supabase";
import { isAdminRole, refreshAuth } from "./auth";
export type AdminUser = {
  name: string;
  email: string;
  role: string;
  initials: string;
};
export async function login(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error)
    return {
      ok: false as const,
      error: "Unable to sign in with these credentials.",
    };
  if (!isAdminRole(await getCurrentRole())) {
    await supabase.auth.signOut();
    return {
      ok: false as const,
      error: "This account is not authorised for administration.",
    };
  }
  await refreshAuth();
  return { ok: true as const };
}
export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
export async function currentAdmin(): Promise<AdminUser | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  const role = await getCurrentRole();
  if (!role || !isAdminRole(role)) return null;
  const name = String(user.user_metadata.full_name || user.email || "Admin");
  return {
    name,
    email: user.email ?? "",
    role,
    initials: name
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join(""),
  };
}
export async function isAuthed() {
  return Boolean(await currentAdmin());
}

import type { AppRole } from "./database";

// Navigation is only presentation. Database RLS/RPC checks remain authoritative.
export function roleHomePath(role: AppRole | null): "/admin" | "/dashboard" | null {
  if (role === "applicant") return "/dashboard";
  if (role === "admin" || role === "super_admin") return "/admin";
  return null;
}

export function invitationReturnPath(value: string | null): string | null {
  return value &&
    /^\/admin\/signup\?invite=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
    ? value
    : null;
}

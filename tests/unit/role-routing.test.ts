import { describe, expect, it } from "vitest";
import { invitationReturnPath, roleHomePath } from "../../src/lib/roleRouting";

describe("shared sign-in routing", () => {
  it("routes only recognized staff roles to the admin panel", () => {
    for (const role of ["admin", "super_admin", "recruiter"] as const)
      expect(roleHomePath(role)).toBe("/admin");
    expect(roleHomePath("applicant")).toBe("/dashboard");
    expect(roleHomePath(null)).toBeNull();
  });

  it("allows only the explicit invitation continuation, not arbitrary next URLs", () => {
    const path = "/admin/signup?invite=00000000-0000-4000-8000-000000000001";
    expect(invitationReturnPath(path)).toBe(path);
    for (const unsafe of [
      null,
      "/admin",
      "//evil.example",
      "https://evil.example",
      `${path}&next=evil`,
      "/admin/signup?invite=------------------------------------",
    ])
      expect(invitationReturnPath(unsafe)).toBeNull();
  });
});

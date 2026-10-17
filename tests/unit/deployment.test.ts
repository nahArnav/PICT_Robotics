import { describe, expect, it } from "vitest";
import {
  productionProjectRef,
  validateProductionEnv,
} from "../../scripts/validate-production-env.mjs";

const url = `https://${productionProjectRef}.supabase.co`;
const jwt = (payload: unknown) =>
  `header.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.signature`;
const anon = jwt({ role: "anon", ref: productionProjectRef });

describe("production browser configuration", () => {
  it("accepts the intended public anon key", () => {
    expect(validateProductionEnv({ VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: anon })).toEqual(
      [],
    );
  });
  it("accepts publishable keys without requiring a service credential", () => {
    expect(
      validateProductionEnv({
        VITE_SUPABASE_URL: url,
        VITE_SUPABASE_ANON_KEY: "sb_publishable_this_is_only_a_test_public_key",
      }),
    ).toEqual([]);
  });
  it("rejects localhost, missing configuration and a different project", () => {
    for (const value of [undefined, "http://127.0.0.1:55421", "https://wrong.supabase.co"]) {
      expect(
        validateProductionEnv({ VITE_SUPABASE_URL: value, VITE_SUPABASE_ANON_KEY: anon }).length,
      ).toBeGreaterThan(0);
    }
  });
  it("rejects elevated or mismatched keys without revealing them", () => {
    for (const value of [
      undefined,
      "sb_secret_never_expose_this_value",
      jwt({ role: "service_role", ref: productionProjectRef }),
      jwt({ role: "anon", ref: "wrong" }),
    ]) {
      const errors = validateProductionEnv({
        VITE_SUPABASE_URL: url,
        VITE_SUPABASE_ANON_KEY: value,
      });
      expect(errors.length).toBeGreaterThan(0);
      if (value) expect(errors.join("\n")).not.toContain(value);
    }
  });
  it("rejects other privileged VITE variables", () => {
    expect(
      validateProductionEnv({
        VITE_SUPABASE_URL: url,
        VITE_SUPABASE_ANON_KEY: anon,
        VITE_SUPABASE_SERVICE_ROLE_KEY: "secret",
      }),
    ).toEqual(expect.arrayContaining([expect.stringContaining("VITE_SUPABASE_SERVICE_ROLE_KEY")]));
  });
});

import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
// @ts-expect-error Node-only helper refuses every hosted endpoint.
import { localConfig } from "../local-config.mjs";

const config = localConfig();
const service = createClient(config.API_URL, config.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const tag = Date.now();
const password = `Role-${tag}-Test!`;
// Sign-in must accept a valid older credential even if signup now asks for eight characters.
const legacyPassword = "Old7!x";
const roles = ["applicant", "admin", "super_admin"] as const;
const users = new Map<string, { id: string; email: string }>();
function ok(result: { error: unknown }) {
  if (result.error) throw result.error;
}
async function signIn(page: Page, email: string, credential = password) {
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(credential);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

test.beforeAll(async () => {
  for (const role of [...roles, "missing"] as const) {
    const email = `routing-${role}-${tag}@example.com`;
    const result = await service.auth.admin.createUser({
      email,
      password: role === "admin" ? legacyPassword : password,
      email_confirm: true,
      // An attacker-controlled metadata role must never confer staff access.
      user_metadata: { full_name: `Routing ${role}`, role: "super_admin" },
    });
    ok(result);
    const id = result.data.user!.id;
    users.set(role, { id, email });
    if (role !== "applicant") {
      ok(await service.from("user_roles").delete().eq("user_id", id));
      if (role !== "missing") ok(await service.from("user_roles").insert({ user_id: id, role }));
    }
  }
});
test.afterAll(async () => {
  for (const user of users.values()) await service.auth.admin.deleteUser(user.id);
});

for (const role of roles) {
  test(`shared login routes ${role} using its preassigned database role`, async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page).toHaveURL(/\/signin$/);
    await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
    await signIn(page, users.get(role)!.email, role === "admin" ? legacyPassword : password);
    const home = role === "applicant" ? /\/dashboard$/ : /\/admin$/;
    await expect(page).toHaveURL(home);
    await page.reload();
    await expect(page).toHaveURL(home);
    await page.goto("/signin");
    await expect(page).toHaveURL(home);
    await page.goto(role === "applicant" ? "/admin/events" : "/dashboard/profile");
    await expect(page).toHaveURL(home);
    if (role === "admin") {
      await page.goto("/admin/events");
      await expect(page.getByLabel("Title", { exact: true })).toBeVisible();
      await page.goto("/admin/settings");
      await expect(page.getByText("You do not have permission to access this page.")).toBeVisible();
      const client = createClient(config.API_URL, config.ANON_KEY, {
        auth: { persistSession: false },
      });
      ok(
        await client.auth.signInWithPassword({
          email: users.get(role)!.email,
          password: legacyPassword,
        }),
      );
      expect(
        (
          await client.rpc("create_admin_invite", {
            p_email: "unauthorized@example.com",
            p_role: "admin",
          })
        ).error,
      ).toBeTruthy();
      expect(
        (
          await client.rpc("set_user_role", {
            p_user_id: users.get("applicant")!.id,
            p_role: "admin",
          })
        ).error,
      ).toBeTruthy();
      await client.auth.signOut();
    }
    if (role === "applicant") {
      const current = await service
        .from("user_roles")
        .select("role")
        .eq("user_id", users.get(role)!.id);
      ok(current);
      expect(current.data).toEqual([{ role: "applicant" }]);
      const denied = await page.evaluate(
        async ({ url, key }) => {
          const session = Object.entries(localStorage).find(([name]) =>
            name.endsWith("-auth-token"),
          )?.[1];
          const token = session ? JSON.parse(session).access_token : "";
          const response = await fetch(`${url}/rest/v1/rpc/dashboard_metrics`, {
            method: "POST",
            headers: {
              apikey: key,
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: "{}",
          });
          return response.status;
        },
        { url: config.API_URL, key: config.ANON_KEY },
      );
      expect(denied).toBeGreaterThanOrEqual(400);
    }
  });
}

test("an account without a trusted role fails closed instead of getting a dashboard", async ({
  page,
}) => {
  await page.goto("/signin");
  await signIn(page, users.get("missing")!.email);
  await expect(page.getByRole("alert")).toContainText("Your account is not ready yet");
  await expect(page).toHaveURL(/\/signin$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/signin$/);
});

test("a revoked staff role loses its dashboard on reload with the same session", async ({
  page,
}) => {
  const user = users.get("admin")!;
  await page.goto("/signin");
  await signIn(page, user.email, legacyPassword);
  await expect(page).toHaveURL(/\/admin$/);
  ok(await service.from("user_roles").delete().eq("user_id", user.id));
  ok(await service.from("user_roles").insert({ user_id: user.id, role: "applicant" }));
  await page.reload();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/admin/settings");
  await expect(page).toHaveURL(/\/dashboard$/);
});

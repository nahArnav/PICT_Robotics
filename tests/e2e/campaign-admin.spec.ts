import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
// @ts-expect-error Local-only test configuration has no declaration file.
import { localConfig } from "../local-config.mjs";

const config = localConfig();
const service = createClient(config.API_URL, config.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const tag = Date.now();
const adminEmail = `campaign-admin-${tag}@example.com`;
const applicantEmail = `campaign-applicant-${tag}@example.com`;
const password = `Campaign-${tag}-Test!`;
const users: string[] = [];
let cycleId = "";
function ok(result: { error: unknown }) {
  if (result.error) throw result.error;
}

test.beforeAll(async () => {
  for (const [index, email] of [adminEmail, applicantEmail].entries()) {
    const result = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: index === 0 ? "Campaign Admin" : "Campaign Applicant" },
    });
    ok(result);
    users.push(result.data.user!.id);
    if (index === 0) {
      ok(await service.from("user_roles").delete().eq("user_id", users[0]));
      ok(await service.from("user_roles").insert({ user_id: users[0], role: "admin" }));
    }
  }
});
test.afterAll(async () => {
  if (cycleId) {
    await service.from("applications").delete().eq("recruitment_cycle_id", cycleId);
    await service.from("recruitment_cycles").delete().eq("id", cycleId);
  }
  for (const user of users) await service.auth.admin.deleteUser(user);
});

test("regular admin creates, opens and closes recruitment while existing drafts remain safe", async ({
  page,
  browser,
}) => {
  await page.goto("/admin/login");
  await page.getByLabel("Email", { exact: true }).fill(adminEmail);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/recruitment");
  const name = `Admin-controlled recruitment ${tag}`;
  await page.getByLabel("Campaign name").fill(name);
  await page.getByLabel("Academic year").fill("2026-27");
  await page.getByLabel("Target batch").fill("FY/SY");
  await page.getByLabel("Description", { exact: true }).fill("A temporary local test campaign.");
  await page
    .getByLabel("Applications open", { exact: true })
    .fill(new Date(Date.now() - 3600000).toISOString().slice(0, 16));
  await page
    .getByLabel("Applications close", { exact: true })
    .fill(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
  await page.getByLabel("Maximum domain preferences (1–3)").fill("1");
  await page.getByRole("button", { name: "Create entry", exact: true }).click();
  await expect(page.getByText("Entry created.")).toBeVisible();
  const created = await service.from("recruitment_cycles").select("id").eq("name", name).single();
  ok(created);
  cycleId = created.data!.id;
  await page.goto(`/admin/form-builder?cycle=${cycleId}`);
  await page.getByRole("button", { name: "Use PICT starter", exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Publish form", exact: true }).click();
  await expect(
    page.getByText("Form published. New applicants will use this version."),
  ).toBeVisible();
  await page.goto("/admin/recruitment");
  const visitorContext = await browser.newContext();
  const visitor = await visitorContext.newPage();
  await visitor.goto("/recruitment");
  await expect(visitor.getByRole("heading", { name, exact: true })).not.toBeVisible();
  page.on("dialog", (dialog) => dialog.accept());
  const card = page.getByText(name, { exact: true }).locator("..");
  await card.getByRole("button", { name: "Open recruitment", exact: true }).click();
  await expect(page.getByText("Recruitment opened. Applicants can now continue.")).toBeVisible();
  await expect(
    page.getByLabel("Active campaign").getByRole("option", { name, exact: true }),
  ).toHaveCount(1);
  await visitor.reload();
  await expect(visitor.getByRole("heading", { name, exact: true })).toBeVisible();
  const applicantContext = await browser.newContext();
  const applicant = await applicantContext.newPage();
  await applicant.goto("/signin");
  await applicant.getByLabel("Email", { exact: true }).fill(applicantEmail);
  await applicant.getByLabel("Password", { exact: true }).fill(password);
  await applicant.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(applicant).toHaveURL(/\/dashboard$/);
  await applicant.goto(`/apply?cycle=${cycleId}`);
  await applicant.getByLabel("Phone", { exact: true }).fill("1234567890");
  await applicant.getByLabel("Branch", { exact: true }).selectOption("IT");
  await applicant.getByLabel("Class / division", { exact: true }).fill("FY-IT-A");
  await applicant.getByLabel("Year", { exact: true }).selectOption("FY");
  await expect(applicant.getByRole("button", { name: "Continue", exact: true })).toBeEnabled();
  await applicant.getByRole("button", { name: "Save Draft", exact: true }).click();
  await expect(applicant.getByText("Draft saved to your account.")).toBeVisible();
  await applicant.getByRole("button", { name: "Continue", exact: true }).click();
  await applicant.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(applicant.getByRole("group", { name: "Primary preference" })).toBeVisible();
  await expect(applicant.getByRole("group", { name: "Secondary preference" })).not.toBeVisible();
  await card.getByRole("button", { name: "Close recruitment", exact: true }).click();
  await expect(
    page.getByText("Recruitment closed. Existing applications are preserved."),
  ).toBeVisible();
  await applicant.reload();
  await expect(
    applicant.getByText(/Your login is working, but an administrator must open/),
  ).toBeVisible();
  await expect(applicant.getByRole("button", { name: "Continue", exact: true })).toBeDisabled();
  await expect(
    applicant.getByRole("link", { name: "Update my profile", exact: true }),
  ).toBeVisible();
  const draft = await service
    .from("applications")
    .select("status")
    .eq("recruitment_cycle_id", cycleId)
    .single();
  ok(draft);
  expect(draft.data!.status).toBe("draft");
  ok(
    await service
      .from("recruitment_cycles")
      .update({
        application_open: new Date(Date.now() - 86400000).toISOString(),
        application_close: new Date(Date.now() - 1000).toISOString(),
      })
      .eq("id", cycleId),
  );
  await page.reload();
  await page
    .getByText(name, { exact: true })
    .locator("..")
    .getByRole("button", { name: "Open recruitment", exact: true })
    .click();
  await expect(page.getByText(/Edit this campaign’s dates first/)).toBeVisible();
  await visitorContext.close();
  await applicantContext.close();
});

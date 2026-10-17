import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
// @ts-expect-error Node-only helper rejects every hosted endpoint.
import { localConfig } from "../local-config.mjs";
const config = localConfig();
const service = createClient(config.API_URL, config.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const tag = Date.now();
const password = `Notification-${tag}-Test!`;
const users: { id: string; email: string }[] = [];
const titles = {
  read: `Read applicant ${tag}`,
  unread: `Unread applicant ${tag}`,
  adminRead: `Read admin ${tag}`,
  adminUnread: `Unread admin ${tag}`,
};
function ok(result: { error: unknown }) {
  if (result.error) throw result.error;
}
async function login(page: Page, index: number) {
  await page.goto("/signin");
  await page.getByLabel("Email", { exact: true }).fill(users[index].email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(index === 0 ? /\/dashboard$/ : /\/admin$/);
}
test.beforeAll(async () => {
  for (const index of [0, 1]) {
    const email = `notification-${index}-${tag}@example.com`;
    const result = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `Notification ${index}` },
    });
    ok(result);
    const id = result.data.user!.id;
    users.push({ id, email });
    if (index === 1) {
      ok(await service.from("user_roles").delete().eq("user_id", id));
      ok(await service.from("user_roles").insert({ user_id: id, role: "admin" }));
    }
  }
  ok(
    await service.from("notifications").insert([
      { user_id: users[0].id, title: titles.read, message: "A read update", read: true },
      { user_id: users[0].id, title: titles.unread, message: "An unread update", read: false },
      { user_id: users[1].id, title: titles.adminRead, message: "Admin read update", read: true },
      {
        user_id: users[1].id,
        title: titles.adminUnread,
        message: "Admin unread update",
        read: false,
      },
    ]),
  );
});
test.afterAll(async () => {
  for (const user of users) await service.auth.admin.deleteUser(user.id);
});

test("applicant read-notification deletion supports cancel, retry and reload persistence", async ({
  page,
}) => {
  await login(page, 0);
  await page.goto("/dashboard/announcements");
  const readHeading = page.getByRole("heading", { name: titles.read, exact: true });
  const deleteRead = page.getByRole("button", {
    name: `Delete notification: ${titles.read}`,
    exact: true,
  });
  await expect(readHeading).toBeVisible();
  await expect(
    page.getByRole("button", { name: `Delete notification: ${titles.unread}`, exact: true }),
  ).toHaveCount(0);
  page.once("dialog", (dialog) => dialog.dismiss());
  await deleteRead.click();
  await expect(readHeading).toBeVisible();
  const notificationUrl = (url: URL) => url.pathname === "/rest/v1/notifications";
  await page.route(notificationUrl, (route) =>
    route.request().method() === "DELETE" ? route.abort("failed") : route.continue(),
  );
  page.once("dialog", (dialog) => dialog.accept());
  await deleteRead.click();
  await expect(page.getByRole("alert")).toContainText("Unable to reach the server");
  await expect(readHeading).toBeVisible();
  await page.unroute(notificationUrl);
  page.once("dialog", (dialog) => dialog.accept());
  await deleteRead.click();
  await expect(readHeading).toHaveCount(0);
  await page.reload();
  await expect(readHeading).toHaveCount(0);
  await page
    .getByRole("heading", { name: titles.unread, exact: true })
    .locator("..")
    .getByRole("button", { name: "Mark read", exact: true })
    .click();
  const nextDelete = page.getByRole("button", {
    name: `Delete notification: ${titles.unread}`,
    exact: true,
  });
  await expect(nextDelete).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await nextDelete.click();
  await expect(page.getByRole("heading", { name: titles.unread, exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Sign Out", exact: true }).click();
  await login(page, 0);
  await page.goto("/dashboard/announcements");
  await expect(readHeading).toHaveCount(0);
  await expect(page.getByRole("heading", { name: titles.unread, exact: true })).toHaveCount(0);
});

test("admin notification bell deletes read items but cannot delete another user's notification", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, 1);
  await page.getByRole("button", { name: "Notifications", exact: true }).click();
  const panel = page.getByRole("region", { name: "Notifications", exact: true });
  await expect(panel.getByText(titles.adminRead, { exact: true })).toBeVisible();
  const bounds = await panel.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await expect(
    panel.getByRole("button", { name: `Delete notification: ${titles.adminUnread}`, exact: true }),
  ).toHaveCount(0);
  page.once("dialog", (dialog) => dialog.accept());
  await panel
    .getByRole("button", { name: `Delete notification: ${titles.adminRead}`, exact: true })
    .click();
  await expect(panel.getByText(titles.adminRead, { exact: true })).toHaveCount(0);
  await panel.getByRole("button", { name: "Mark read", exact: true }).last().click();
  await expect(
    panel.getByRole("button", { name: `Delete notification: ${titles.adminUnread}`, exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Notifications", exact: true }).click();
  await expect(panel.getByText(titles.adminRead, { exact: true })).toHaveCount(0);
  const foreign = await service
    .from("notifications")
    .insert({ user_id: users[0].id, title: `Private ${tag}`, message: "Must stay", read: true })
    .select("id")
    .single();
  ok(foreign);
  const admin = createClient(config.API_URL, config.ANON_KEY, { auth: { persistSession: false } });
  ok(await admin.auth.signInWithPassword({ email: users[1].email, password }));
  const denied = await admin.from("notifications").delete().eq("id", foreign.data!.id).select("id");
  ok(denied);
  expect(denied.data).toEqual([]);
  const retained = await service
    .from("notifications")
    .select("id")
    .eq("id", foreign.data!.id)
    .single();
  ok(retained);
  expect(retained.data!.id).toBe(foreign.data!.id);
  await admin.auth.signOut();
});

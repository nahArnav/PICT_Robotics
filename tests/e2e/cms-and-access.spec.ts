import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
// @ts-expect-error Node-only local helper.
import { localConfig } from "../local-config.mjs";
const config = localConfig();
const service = createClient(config.API_URL, config.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const tag = Date.now().toString();
const email = `cms-${tag}@example.com`;
const password = `Cms-${tag}-Robot!`;
let userId = "";
const fixtureUsers: string[] = [];
function ok(result: { error: unknown }) {
  if (result.error) throw result.error;
}
async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
}
test.beforeAll(async () => {
  const user = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "CMS Admin" },
  });
  ok(user);
  userId = user.data.user!.id;
  ok(await service.from("user_roles").delete().eq("user_id", userId));
  ok(await service.from("user_roles").insert({ user_id: userId, role: "super_admin" }));
});
test.afterAll(async () => {
  await service.from("admin_invites").delete().eq("created_by", userId);
  for (const table of ["projects", "achievements", "club_events", "announcements", "gallery_items"])
    await service.from(table).delete().ilike("title", `%${tag}%`);
  for (const id of [userId, ...fixtureUsers]) {
    for (const bucket of ["club-media", "private-applicant-files"]) {
      const objects = await service.storage.from(bucket).list(id);
      if (objects.data?.length)
        await service.storage
          .from(bucket)
          .remove(objects.data.map((object) => `${id}/${object.name}`));
    }
  }
  for (const id of fixtureUsers) await service.auth.admin.deleteUser(id);
  await service.auth.admin.deleteUser(userId);
});

test("CMS create, publish, unpublish and delete persist to public pages", async ({
  page,
  browser,
}) => {
  await login(page);
  const publicContext = await browser.newContext();
  const visitor = await publicContext.newPage();
  await page.goto("/admin/content");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  const name = `CMS robot ${tag}`;
  await page.getByLabel("Title", { exact: true }).fill(name);
  await page
    .getByLabel("Description", { exact: true })
    .fill("A real database-backed CMS entry created by the browser test.");
  await page.getByLabel("Year", { exact: true }).fill("2026");
  await page.getByLabel("Category", { exact: true }).fill("Software");
  await page.getByLabel("Unique URL slug").fill(`cms-robot-${tag}`);
  await page.getByLabel("Published", { exact: true }).check();
  await page.getByLabel("Upload image", { exact: true }).setInputFiles({
    name: "pixel.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9YkAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(page.getByText("Image selected. It will be uploaded when you save.")).toBeVisible();
  await page.getByRole("button", { name: "Create entry", exact: true }).click();
  await expect(page.getByText("Entry created.")).toBeVisible();
  const storedProject = await service
    .from("projects")
    .select("image_url")
    .eq("slug", `cms-robot-${tag}`)
    .single();
  ok(storedProject);
  const imageUrl = storedProject.data!.image_url as string;
  expect(imageUrl).toContain("/storage/v1/object/public/club-media/");
  const imageFile = decodeURIComponent(imageUrl.split("/").at(-1)!);
  const sharedTitle = `Shared image ${tag}`;
  ok(
    await service
      .from("gallery_items")
      .insert({ title: sharedTitle, image_url: imageUrl, published: false }),
  );
  await visitor.goto("/projects");
  await expect(visitor.getByRole("heading", { name })).toBeVisible();
  await visitor.getByRole("heading", { name }).click();
  await expect(visitor).toHaveURL(new RegExp(`/projects/cms-robot-${tag}$`));
  await expect(
    visitor.getByText("A real database-backed CMS entry created by the browser test."),
  ).toBeVisible();
  await page
    .getByText(name, { exact: true })
    .locator("..")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await page.getByLabel("Published", { exact: true }).uncheck();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByText("Changes saved.")).toBeVisible();
  await visitor.reload();
  await expect(visitor.getByText("This project is unavailable or unpublished.")).toBeVisible();
  page.on("dialog", (dialog) => dialog.accept());
  await page
    .getByText(name, { exact: true })
    .locator("..")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page.getByText("Entry deleted.")).toBeVisible();
  const sharedImage = await service.storage.from("club-media").list(userId, { search: imageFile });
  ok(sharedImage);
  expect(sharedImage.data).toHaveLength(1);
  await page.getByRole("button", { name: "Gallery", exact: true }).click();
  await page
    .getByText(sharedTitle, { exact: true })
    .locator("..")
    .getByRole("button", { name: "Delete", exact: true })
    .click();
  await expect(page.getByText("Entry deleted.")).toBeVisible();
  await expect
    .poll(async () => {
      const result = await service.storage.from("club-media").list(userId, { search: imageFile });
      ok(result);
      return result.data?.length;
    })
    .toBe(0);
  await page.goto("/admin/events");
  await page.getByLabel("Title", { exact: true }).fill(`Workshop ${tag}`);
  await page
    .getByLabel("Summary (10–320 characters)", { exact: true })
    .fill("A workshop summary that is long enough.");
  await page.getByLabel("Description", { exact: true }).fill("Workshop instructions.");
  await page.getByLabel("Category", { exact: true }).fill("workshop");
  await page
    .getByLabel("Starts", { exact: true })
    .fill(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
  await page.getByLabel("Venue", { exact: true }).fill("Robotics Lab");
  await page.getByLabel("Status", { exact: true }).selectOption("published");
  await page.getByRole("button", { name: "Create entry", exact: true }).click();
  await expect(page.getByText("Entry created.")).toBeVisible();
  await visitor.goto("/events");
  await expect(visitor.getByRole("heading", { name: `Workshop ${tag}` })).toBeVisible();
  await page.goto("/admin/announcements");
  await page.getByLabel("Title", { exact: true }).fill(`Announcement ${tag}`);
  await page.getByLabel("Message", { exact: true }).fill("Published from the admin portal.");
  await page.getByLabel("Published", { exact: true }).check();
  await page.getByRole("button", { name: "Create entry", exact: true }).click();
  await expect(page.getByText("Entry created.")).toBeVisible();
  await visitor.goto("/");
  await expect(visitor.getByRole("heading", { name: `Announcement ${tag}` })).toBeVisible();
  await page.goto("/admin/content");
  await page.getByLabel("Title", { exact: true }).fill(`Achievement ${tag}`);
  await page.getByLabel("Description", { exact: true }).fill("A browser-tested achievement.");
  await page.getByLabel("Year", { exact: true }).fill("2026");
  await page.getByLabel("Published", { exact: true }).check();
  await page.getByRole("button", { name: "Create entry", exact: true }).click();
  await expect(page.getByText("Entry created.")).toBeVisible();
  await visitor.goto("/achievements");
  await expect(visitor.getByRole("heading", { name: `Achievement ${tag}` })).toBeVisible();
  await publicContext.close();
});

test("new and existing users accept invitation links through the UI", async ({ page, browser }) => {
  await login(page);
  await page.goto("/admin/settings");
  const invitedEmail = `invited-${tag}@example.com`;
  await page.getByLabel("Invited email").fill(invitedEmail);
  await page.getByLabel("Role", { exact: true }).selectOption("recruiter");
  await page.getByRole("button", { name: "Create invite" }).click();
  await expect(page.getByLabel("Invitation link")).toBeVisible();
  const link = await page.getByLabel("Invitation link").inputValue();
  const context = await browser.newContext();
  const invited = await context.newPage();
  await invited.goto(link);
  await invited.getByLabel("Full name").fill("Invited Recruiter");
  await invited.getByLabel("Password").fill(password);
  await invited.getByRole("button", { name: "Create authorised account" }).click();
  await expect(invited).toHaveURL(/\/admin$/);
  await invited.goto("/admin/settings");
  await expect(invited.getByText("You do not have permission to access this page.")).toBeVisible();
  const account = await service.from("profiles").select("id").eq("email", invitedEmail).single();
  ok(account);
  fixtureUsers.push(account.data!.id);
  await context.close();
  const existingEmail = `existing-${tag}@example.com`;
  const existing = await service.auth.admin.createUser({
    email: existingEmail,
    password,
    email_confirm: true,
  });
  ok(existing);
  fixtureUsers.push(existing.data.user!.id);
  await page.getByLabel("Invited email").fill(existingEmail);
  await page.getByRole("button", { name: "Create invite" }).click();
  const existingLink = await page.getByLabel("Invitation link").inputValue();
  const existingContext = await browser.newContext();
  const existingPage = await existingContext.newPage();
  await existingPage.goto(existingLink);
  await existingPage.getByRole("button", { name: "Existing account" }).click();
  await existingPage.getByLabel("Password").fill(password);
  await existingPage.getByRole("button", { name: "Sign in and accept" }).click();
  await expect(existingPage).toHaveURL(/\/admin$/);
  await existingContext.close();
});

test("password recovery email and private document storage work locally", async ({ page }) => {
  const accountEmail = `recovery-${tag}@example.com`;
  const account = await service.auth.admin.createUser({
    email: accountEmail,
    password,
    email_confirm: true,
  });
  ok(account);
  fixtureUsers.push(account.data.user!.id);
  await page.goto("/forgot-password");
  await page.getByLabel("Email address").fill(accountEmail);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(
    page.getByText(
      "If an account exists for that email, check your inbox for a password reset link.",
    ),
  ).toBeVisible();
  // The local email inbox is used; nothing is sent to an external address.
  let messageId = "";
  await expect
    .poll(async () => {
      const response = await fetch(`${config.MAILPIT_URL}/api/v1/messages`);
      const inbox = await response.json();
      const message = inbox.messages?.find((item: any) =>
        item.To?.some((to: any) => to.Address === accountEmail),
      );
      messageId = message?.ID ?? "";
      return messageId;
    })
    .not.toBe("");
  const message = await fetch(`${config.MAILPIT_URL}/api/v1/message/${messageId}`).then(
    (response) => response.json(),
  );
  const match = String(message.HTML || message.Text).match(
    /https?:[^\s"<>]+\/auth\/v1\/verify[^\s"<>]+/,
  );
  expect(match).toBeTruthy();
  await page.goto(match![0].replace(/&amp;/g, "&"));
  await expect(page).toHaveURL(/\/reset-password/);
  const nextPassword = `Changed-${password}`;
  await page.getByLabel("New password").fill(nextPassword);
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page).toHaveURL(/\/signin$/);
  await page.getByLabel("Email", { exact: true }).fill(accountEmail);
  await page.getByLabel("Password").fill(nextPassword);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/dashboard/profile");
  await page.locator("input[type=file]").setInputFiles({
    name: "test.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\nTest document"),
  });
  await expect(page.getByText("Document uploaded.")).toBeVisible();
  await page.reload();
  await expect(page.getByText(/test.pdf/)).toBeVisible();
  const uploaded = await service.storage
    .from("private-applicant-files")
    .list(account.data.user!.id);
  ok(uploaded);
  expect(uploaded.data).toHaveLength(1);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText(/test.pdf/)).not.toBeVisible();
  const removed = await service.storage.from("private-applicant-files").list(account.data.user!.id);
  ok(removed);
  expect(removed.data).toHaveLength(0);
});

test("mobile navigation, anonymous route protection and network retry work", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/signin$/);
  await login(page);
  await page.getByRole("link", { name: "Events", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/events$/);
  await expect(page.getByRole("heading", { name: "Events management", exact: true })).toBeVisible();
  const layout = await page.evaluate(() => ({
    viewport: window.innerWidth,
    content: document.documentElement.scrollWidth,
    overflowing: [...document.querySelectorAll("main *")]
      .filter((element) => element.getBoundingClientRect().right > window.innerWidth + 1)
      .slice(0, 10)
      .map((element) => ({
        tag: element.tagName,
        classes: element.className,
        right: element.getBoundingClientRect().right,
      })),
  }));
  expect(layout.content, JSON.stringify(layout)).toBeLessThanOrEqual(layout.viewport + 1);
  const failProjects = (url: URL) => url.pathname === "/rest/v1/projects";
  await page.route(failProjects, (route) => route.abort("failed"));
  await page.goto("/projects");
  await expect(
    page.getByText("Unable to reach the server. Your changes have not been saved. Please retry."),
  ).toBeVisible();
  await page.unroute(failProjects);
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("button", { name: "Retry", exact: true })).not.toBeVisible();
  await expect(page.getByRole("heading", { name: "Engineering we ship." })).toBeVisible();
});

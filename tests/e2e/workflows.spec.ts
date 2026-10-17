import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
// @ts-expect-error Node-only local test helper has no declaration file.
import { localConfig } from "../local-config.mjs";

const config = localConfig();
const service = createClient(config.API_URL, config.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const client = () =>
  createClient(config.API_URL, config.ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
const tag = Date.now().toString();
const password = `Test-${tag}-Robot!`;
const adminEmail = `admin-${tag}@example.com`;
const applicantEmail = `applicant-${tag}@example.com`;
let adminId = "";
let applicantId = "";
let cycleId = "";
let applicationId = "";
let taskId = "";
let domainId = "";
const failures: string[] = [];
test.describe.configure({ mode: "serial" });
function ok(result: { error: unknown }) {
  if (result.error) throw result.error;
}
async function login(page: Page, email: string, admin = false) {
  await page.goto(admin ? "/admin/login" : "/signin");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(admin ? /\/admin$/ : /\/dashboard$/);
}

test.beforeAll(async () => {
  const created = await service.auth.admin.createUser({
    email: adminEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: "E2E Admin" },
  });
  ok(created);
  adminId = created.data.user!.id;
  ok(await service.from("user_roles").delete().eq("user_id", adminId));
  ok(await service.from("user_roles").insert({ user_id: adminId, role: "super_admin" }));
  const cycle = await service
    .from("recruitment_cycles")
    .insert({
      name: `Browser cycle ${tag}`,
      academic_year: "2026-27",
      target_batch: "FY/SY",
      description: "Browser test cycle",
      application_open: new Date(Date.now() - 60000).toISOString(),
      application_close: new Date(Date.now() + 86400000).toISOString(),
      status: "open",
    })
    .select()
    .single();
  ok(cycle);
  cycleId = cycle.data.id;
  const domain = await service.from("domains").select("id").eq("name", "Software").single();
  ok(domain);
  domainId = domain.data!.id;
  ok(
    await service.from("recruitment_questions").insert([
      {
        recruitment_cycle_id: cycleId,
        question: "What did you build?",
        question_type: "long_text",
        required: true,
        active: true,
        display_order: 1,
        options: [],
      },
      {
        recruitment_cycle_id: cycleId,
        question: "Choose your tool",
        question_type: "single_choice",
        required: true,
        active: true,
        display_order: 2,
        options: ["ROS", "Arduino"],
      },
      {
        recruitment_cycle_id: cycleId,
        question: "Years of experience",
        question_type: "number",
        required: true,
        active: true,
        display_order: 3,
        options: [],
      },
    ]),
  );
  const task = await service
    .from("recruitment_tasks")
    .insert({
      recruitment_cycle_id: cycleId,
      title: `Robot task ${tag}`,
      instructions: "Build a simulation and share the repository and demo.",
      deadline: new Date(Date.now() + 86400000).toISOString(),
      active: true,
    })
    .select()
    .single();
  ok(task);
  taskId = task.data.id;
});
test.afterAll(async () => {
  // Exact fixture IDs only, and localConfig refuses every hosted endpoint.
  if (cycleId) {
    await service.from("task_submissions").delete().eq("task_id", taskId);
    await service.from("applications").delete().eq("recruitment_cycle_id", cycleId);
    await service.from("recruitment_tasks").delete().eq("id", taskId);
    await service.from("recruitment_cycles").delete().eq("id", cycleId);
  }
  if (adminId) {
    await service.from("admin_invites").delete().eq("created_by", adminId);
    await service.auth.admin.deleteUser(adminId);
  }
  if (applicantId) {
    const files = await service.storage.from("private-applicant-files").list(applicantId);
    if (files.data?.length)
      await service.storage
        .from("private-applicant-files")
        .remove(files.data.map((file) => `${applicantId}/${file.name}`));
    await service.auth.admin.deleteUser(applicantId);
  }
});
test("applicant and admin complete the real recruitment journey", async ({ page, browser }) => {
  page.on("pageerror", (error) => failures.push(error.message));
  await page.goto("/signup");
  await page.getByLabel("Full name").fill(`E2E Applicant ${tag}`);
  await page.getByLabel("Email", { exact: true }).fill(applicantEmail);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
  const user = await service.from("profiles").select("id").eq("email", applicantEmail).single();
  ok(user);
  applicantId = user.data!.id;
  await page.goto(`/apply?cycle=${cycleId}`);
  await page.getByLabel("Phone", { exact: false }).fill("9876543210");
  await page.getByLabel("Branch", { exact: false }).selectOption("IT");
  await page.getByLabel("Division", { exact: false }).selectOption("A");
  await page.getByLabel("Year", { exact: true }).selectOption("SY");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Skills", { exact: false }).fill("ROS, Python");
  await page.getByLabel("Programming languages").fill("Python, C++");
  await page.getByLabel("Projects you've built").fill("A robot simulator");
  await page.getByLabel("GitHub", { exact: true }).fill("https://github.com/example/robot");
  await page.getByRole("button", { name: "Save Draft" }).click();
  await expect(page.getByText("Draft saved to your account.")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel("Skills", { exact: false })).toHaveValue("ROS, Python");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("group", { name: "Primary preference" })
    .getByRole("button", { name: "Software", exact: true })
    .click();
  await page
    .getByRole("group", { name: "Secondary preference" })
    .getByRole("button", { name: "Electronics", exact: true })
    .click();
  await page
    .getByRole("group", { name: "Third preference" })
    .getByRole("button", { name: "Mechanical", exact: true })
    .click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByLabel("Why do you want to join Robotics Club?", { exact: false })
    .fill("I want to build robots with the club.");
  await page
    .getByLabel("What did you build?", { exact: false })
    .fill("I built a line-following simulator.");
  await page.getByLabel("Choose your tool", { exact: false }).selectOption("ROS");
  await page.getByLabel("Years of experience", { exact: false }).fill("0");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByText("Second Year (SY)", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Submit Application", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  const application = await service
    .from("applications")
    .select()
    .eq("applicant_id", applicantId)
    .eq("recruitment_cycle_id", cycleId)
    .single();
  ok(application);
  applicationId = application.data.id;
  expect(application.data.status).toBe("submitted");
  const preferences = await service
    .from("application_domain_preferences")
    .select("id")
    .eq("application_id", applicationId);
  ok(preferences);
  expect(preferences.data).toHaveLength(3);
  await page.goto("/dashboard/application");
  await expect(
    page.getByText("I built a line-following simulator.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("I built a line-following simulator.", { exact: true }),
  ).toBeVisible();
  await page.goto("/dashboard/task");
  await page.getByLabel("Repository URL", { exact: false }).fill("https://github.com/example/task");
  await page.getByLabel("Demo video URL", { exact: false }).fill("https://example.com/demo");
  await page.getByRole("button", { name: "Submit task", exact: true }).click();
  await expect(page.getByText("Task submission saved.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Repository URL", { exact: false })).toHaveValue(
    "https://github.com/example/task",
  );
  await page.goto("/dashboard/profile");
  await page.locator("input[type=file]").setInputFiles({
    name: "application-doc.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\nTest document"),
  });
  await expect(page.getByText("Document uploaded.")).toBeVisible();
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  adminPage.on("pageerror", (error) => failures.push(error.message));
  await login(adminPage, adminEmail, true);
  await adminPage.goto("/admin/applicants");
  await adminPage.getByPlaceholder("Search applicant...").fill(tag);
  await adminPage.getByRole("button", { name: new RegExp(`E2E Applicant ${tag}`) }).click();
  await expect(adminPage.getByRole("button", { name: /application-doc.pdf/ })).toBeVisible();
  await adminPage.getByLabel("Reviewer", { exact: true }).selectOption(adminId);
  await adminPage.getByRole("button", { name: "Assign reviewer", exact: true }).click();
  await expect(adminPage.getByText("Reviewer assigned.")).toBeVisible();
  adminPage.once("dialog", (dialog) => dialog.accept());
  await adminPage.getByRole("button", { name: "Remove reviewer", exact: true }).click();
  await expect(adminPage.getByText("Reviewer removed.")).toBeVisible();
  await expect(
    adminPage.getByRole("button", { name: "Remove reviewer", exact: true }),
  ).not.toBeVisible();
  await adminPage.getByRole("button", { name: "Move to next stage" }).click();
  await adminPage.getByRole("button", { name: new RegExp(`E2E Applicant ${tag}`) }).click();
  await adminPage.getByRole("button", { name: "Notes", exact: true }).click();
  await adminPage.getByPlaceholder("Add a private note...").fill("Test private note");
  await adminPage.getByRole("button", { name: "Save note", exact: true }).click();
  await expect(adminPage.getByText("Test private note", { exact: true })).toBeVisible();
  await adminPage.getByRole("button", { name: "Move to next stage" }).click();
  await adminPage.goto(`/admin/interviews?application=${applicationId}`);
  await adminPage.getByLabel("Interviewer", { exact: false }).selectOption(adminId);
  await adminPage
    .getByLabel("Date and time", { exact: false })
    .fill(new Date(Date.now() + 3600000).toISOString().slice(0, 16));
  await adminPage.getByLabel("Venue", { exact: true }).fill("Robotics Lab");
  await adminPage.getByRole("button", { name: "Save interview" }).click();
  await expect(
    adminPage.getByText("Interview saved. The applicant has been notified."),
  ).toBeVisible();
  await adminPage.goto("/admin/evaluations");
  await adminPage.getByLabel("Applicant", { exact: true }).selectOption(applicationId);
  await adminPage.getByLabel("Internal notes").fill("Great problem-solving");
  await adminPage.getByRole("button", { name: "Submit evaluation" }).click();
  await expect(adminPage.getByText("Evaluation saved.")).toBeVisible();
  await adminPage.goto("/admin/applicants");
  await adminPage.getByPlaceholder("Search applicant...").fill(tag);
  await adminPage.getByRole("button", { name: new RegExp(`E2E Applicant ${tag}`) }).click();
  await adminPage.getByRole("button", { name: "Move to next stage" }).click();
  await page.goto("/dashboard/interview");
  await expect(page.getByText("Robotics Lab", { exact: false })).toBeVisible();
  await page.goto("/dashboard/result");
  await expect(page.getByRole("heading", { name: "Welcome to PICT Robotics Club" })).toBeVisible();
  await page.goto("/dashboard/announcements");
  await expect(page.getByText("Application status updated").first()).toBeVisible();
  await page.getByRole("button", { name: "Mark all read" }).click();
  await expect(page.getByText("0 unread in recent notifications")).toBeVisible();
  await page.getByRole("button", { name: "Sign Out", exact: true }).click();
  await expect(page).toHaveURL(/\/signin$/);
  await login(page, applicantEmail);
  await expect(page.getByRole("heading", { name: /Welcome back/ })).toBeVisible();
  await adminContext.close();
  expect(failures).toEqual([]);
});

test("direct API requests cannot bypass user permissions", async () => {
  const applicant = client();
  ok(
    await applicant.auth.signInWithPassword({
      email: applicantEmail,
      password,
    }),
  );
  const roles = await applicant
    .from("user_roles")
    .insert({ user_id: applicantId, role: "super_admin" });
  expect(roles.error).toBeTruthy();
  expect(
    (
      await applicant.rpc("update_application_status", {
        p_application_id: applicationId,
        p_status: "selected",
      })
    ).error,
  ).toBeTruthy();
  expect((await applicant.from("application_notes").select("*")).data).toEqual([]);
  expect((await applicant.from("evaluations").select("*")).data).toEqual([]);
  expect((await applicant.from("interviews").select("notes")).data).toEqual([]);
  const admin = client();
  ok(await admin.auth.signInWithPassword({ email: adminEmail, password }));
  const invitation = await admin.rpc("create_admin_invite", {
    p_email: applicantEmail,
    p_role: "recruiter",
  });
  ok(invitation);
  const token = invitation.data[0].token;
  const other = await service.auth.admin.createUser({
    email: `other-${tag}@example.com`,
    password,
    email_confirm: true,
  });
  ok(other);
  const stranger = client();
  ok(
    await stranger.auth.signInWithPassword({
      email: `other-${tag}@example.com`,
      password,
    }),
  );
  expect((await stranger.rpc("accept_admin_invite", { p_token: token })).error).toBeTruthy();
  ok(
    await admin.rpc("revoke_admin_invite", {
      p_invite_id: invitation.data[0].id,
    }),
  );
  expect((await applicant.rpc("accept_admin_invite", { p_token: token })).error).toBeTruthy();
  await service.auth.admin.deleteUser(other.data.user!.id);
  await applicant.auth.signOut();
  await admin.auth.signOut();
  await stranger.auth.signOut();
});

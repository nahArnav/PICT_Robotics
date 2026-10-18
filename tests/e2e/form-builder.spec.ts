import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
// @ts-expect-error Local-only helper intentionally has no declaration file.
import { localConfig } from "../local-config.mjs";
import type { ApplicationFormSchema } from "../../src/lib/applicationForms";
const config = localConfig();
const service = createClient(config.API_URL, config.SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const tag = Date.now();
const password = `Builder-${tag}-Test!`;
const users: { id: string; email: string }[] = [];
let cycleId = "";
test.describe.configure({ mode: "serial" });
const ok = (result: { error: unknown }) => {
  if (result.error) throw result.error;
};
async function login(page: Page, index: number) {
  await page.goto("/signin");
  await page.getByLabel("Email", { exact: true }).fill(users[index].email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(index === 0 ? /\/admin$/ : /\/dashboard$/);
}
test.beforeAll(async () => {
  for (let index = 0; index < 3; index++) {
    const email = `builder-${tag}-${index}@example.com`;
    const created = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `Builder Person ${index}` },
    });
    ok(created);
    const id = created.data.user!.id;
    users.push({ id, email });
    if (index === 0) {
      ok(await service.from("user_roles").delete().eq("user_id", id));
      ok(await service.from("user_roles").insert({ user_id: id, role: "admin" }));
    }
  }
  const cycle = await service
    .from("recruitment_cycles")
    .insert({
      name: `SY Form Builder ${tag}`,
      academic_year: "test",
      target_batch: "SY",
      max_preferences: 1,
      application_open: new Date(Date.now() - 60000).toISOString(),
      application_close: new Date(Date.now() + 86400000).toISOString(),
      status: "open",
    })
    .select()
    .single();
  ok(cycle);
  cycleId = cycle.data.id;
});
test.afterAll(async () => {
  if (cycleId) {
    ok(await service.from("applications").delete().eq("recruitment_cycle_id", cycleId));
    ok(await service.from("recruitment_cycles").delete().eq("id", cycleId));
  }
  for (const user of users) {
    const files = await service.storage.from("private-applicant-files").list(user.id);
    if (files.data?.length)
      await service.storage
        .from("private-applicant-files")
        .remove(files.data.map((file) => `${user.id}/${file.name}`));
    await service.auth.admin.deleteUser(user.id);
  }
});

test("regular admin builds, previews and publishes a PICT form; saved applicants retain their original version", async ({
  page,
  browser,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page, 0);
  await page.goto(`/admin/form-builder?cycle=${cycleId}`);
  await expect(page.getByText("Not published", { exact: true })).toBeVisible();
  const context = await browser.newContext();
  const applicant = await context.newPage();
  await login(applicant, 1);
  await applicant.goto(`/apply?cycle=${cycleId}`);
  await expect(applicant.getByText(/An admin has not published an application form/)).toBeVisible();
  await page.getByRole("button", { name: "Use PICT starter", exact: true }).click();
  await page.getByRole("button", { name: "Preview form", exact: true }).click();
  const preview = page.getByTestId("application-form-preview");
  await expect(
    preview.getByRole("combobox", { name: "Branch", exact: true }).locator("option"),
  ).toHaveText(["Select an option", "CE", "IT", "ENTC", "AIDS", "ECE"]);
  await expect(preview.getByLabel("Class / division", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await expect(preview.getByLabel("Year", { exact: true }).locator("option")).toHaveText([
    "Select an option",
    "Second Year (SY)",
  ]);
  const zero = await service.from("applications").select("id").eq("recruitment_cycle_id", cycleId);
  ok(zero);
  expect(zero.data).toHaveLength(0);
  await page.getByRole("button", { name: "Edit form", exact: true }).click();
  await page.getByRole("button", { name: "Add section", exact: true }).click();
  await page.getByLabel("Section title", { exact: true }).fill("College details");
  await page
    .getByLabel("Section instructions", { exact: true })
    .fill("Details requested by the PICT admins.");
  const editor = page.getByTestId("field-editor");
  async function add(label: string, type: string, required = true) {
    await page.getByRole("button", { name: "Add field", exact: true }).click();
    await editor.getByLabel("Field label", { exact: true }).fill(label);
    await editor.getByLabel("Input type", { exact: true }).selectOption(type);
    await editor.getByLabel("Required answer", { exact: true }).setChecked(required);
  }
  await add("College PRN", "short_text");
  await add("Years of experience", "number");
  await add("Resume", "file");
  await add("Tools used", "multi_choice");
  for (const [index, option] of ["ROS", "PCB"].entries()) {
    await editor.getByRole("button", { name: "Add option", exact: true }).click();
    await editor.getByLabel(`Option ${index + 1}`, { exact: true }).fill(option);
  }
  await page.getByRole("button", { name: "Move section up: College details", exact: true }).click();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("link", { name: "Manage campaigns", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/form-builder/);
  await page.getByRole("button", { name: "Save builder draft", exact: true }).click();
  await expect(
    page.getByText("Builder draft saved. The published form has not changed."),
  ).toBeVisible();
  await expect(page.getByText(/Unsaved edits/)).toHaveCount(0);
  await applicant.reload();
  await expect(applicant.getByText(/An admin has not published/)).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Publish form", exact: true }).click();
  await expect(
    page.getByText("Form published. New applicants will use this version."),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText("Published · version 1", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Preview form", exact: true }).click();
  await page.screenshot({ path: info.outputPath("builder-desktop.png") });
  await page.getByRole("button", { name: "Edit form", exact: true }).click();
  const row = await service
    .from("recruitment_application_forms")
    .select("*")
    .eq("recruitment_cycle_id", cycleId)
    .single();
  ok(row);
  const original = row.data.published_schema as ApplicationFormSchema;
  expect(original.sections.map((section) => section.title)).toEqual([
    "Personal Details",
    "Technical Profile",
    "Domain Preference",
    "College details",
    "Questions",
  ]);
  await applicant.reload();
  await applicant.getByLabel("Phone", { exact: true }).fill("9876543210");
  await applicant.getByLabel("Branch", { exact: true }).selectOption("AIDS");
  await applicant.getByLabel("Class / division", { exact: true }).fill("SY-AIDS-2");
  await applicant.getByLabel("Year", { exact: true }).selectOption("SY");
  const rpc = (url: URL) => url.pathname.endsWith("/rpc/save_built_application_draft");
  await applicant.route(rpc, (route) => route.abort("failed"));
  await applicant.getByRole("button", { name: "Save Draft", exact: true }).click();
  await expect(applicant.getByRole("alert")).toBeVisible();
  await expect(applicant.getByLabel("Class / division", { exact: true })).toHaveValue("SY-AIDS-2");
  await applicant.unroute(rpc);
  await applicant.getByRole("button", { name: "Save Draft", exact: true }).click();
  await expect(applicant.getByText("Draft saved to your account.")).toBeVisible();
  // A second publication adds a requirement only for newly started applications.
  await page.getByRole("button", { name: "1. Personal Details", exact: true }).click();
  await add("New version question", "short_text");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Publish form", exact: true }).click();
  await expect(page.getByText("Published · version 2", { exact: true })).toBeVisible();
  await applicant.reload();
  await expect(applicant.getByText(/Your saved draft uses form version 1/)).toBeVisible();
  await expect(applicant.getByLabel("New version question", { exact: true })).toHaveCount(0);
  await expect(applicant.getByLabel("Class / division", { exact: true })).toHaveValue("SY-AIDS-2");
  for (const section of original.sections) {
    await expect(
      applicant.getByRole("heading", { name: section.title, exact: true }),
    ).toBeVisible();
    for (const field of section.fields) {
      if (field.type === "domains")
        await applicant
          .getByRole("group", { name: "Primary preference" })
          .getByRole("button", { name: field.options[0].label, exact: true })
          .click();
      if (field.label === "College PRN")
        await applicant.getByLabel(field.label, { exact: true }).fill("PICT-2026-0042");
      if (field.label === "Years of experience")
        await applicant.getByLabel(field.label, { exact: true }).fill("0");
      if (field.label === "Tools used")
        await applicant
          .getByRole("group", { name: field.label, exact: true })
          .getByRole("checkbox", { name: "ROS", exact: true })
          .check();
      if (field.label === "Resume") {
        await applicant.getByLabel("Resume", { exact: true }).setInputFiles({
          name: "builder-resume.pdf",
          mimeType: "application/pdf",
          buffer: Buffer.from("%PDF-1.4\nPrivate builder fixture"),
        });
        await expect(applicant.getByText("builder-resume.pdf", { exact: true })).toBeVisible();
      }
      if (field.binding === "application.motivation")
        await applicant
          .getByLabel(field.label, { exact: true })
          .fill("Build real robots with PICT.");
    }
    await applicant.getByRole("button", { name: "Continue", exact: true }).click();
  }
  await expect(applicant.getByText("PICT-2026-0042", { exact: true })).toBeVisible();
  await applicant.getByRole("button", { name: "Submit Application", exact: true }).click();
  await expect(applicant).toHaveURL(/\/dashboard$/);
  await applicant.goto("/dashboard/application");
  await expect(applicant.getByText("PICT-2026-0042", { exact: true })).toBeVisible();
  await applicant.reload();
  await expect(applicant.getByText("Build real robots with PICT.", { exact: true })).toBeVisible();
  await applicant.goto("/dashboard/profile");
  const attachmentRow = applicant.getByText(/builder-resume\.pdf$/).locator("..");
  applicant.once("dialog", (dialog) => dialog.accept());
  await attachmentRow.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(
    applicant.getByText("This file is attached to a submitted application and cannot be deleted.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(applicant.getByText(/builder-resume\.pdf$/)).toBeVisible();
  await page.goto("/admin/applicants");
  await page.getByPlaceholder("Search applicant...").fill(users[1].email);
  await page.getByRole("button", { name: /Builder Person 1/ }).click();
  await page.getByRole("button", { name: "Application", exact: true }).click();
  await expect(page.getByText("PICT-2026-0042", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "builder-resume.pdf", exact: true })).toBeVisible();
  // The latest form is visible to another applicant, never the private builder.
  const nextContext = await browser.newContext();
  const nextApplicant = await nextContext.newPage();
  await login(nextApplicant, 2);
  await nextApplicant.goto(`/apply?cycle=${cycleId}`);
  await expect(nextApplicant.getByLabel("New version question", { exact: true })).toBeVisible();
  await nextApplicant.goto("/admin/form-builder");
  await expect(nextApplicant).toHaveURL(/\/dashboard$/);
  await page.goto(`/admin/form-builder?cycle=${cycleId}`);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Preview form", exact: true }).click();
  const bounds = (await page.getByTestId("application-form-preview").boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: info.outputPath("builder-mobile.png"), fullPage: true });
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Unpublish", exact: true }).click();
  await expect(
    page.getByText("Form unpublished for new applicants. Saved applications are preserved."),
  ).toBeVisible();
  await nextApplicant.goto(`/apply?cycle=${cycleId}`);
  await expect(nextApplicant.getByText(/An admin has not published/)).toBeVisible();
  await context.close();
  await nextContext.close();
});

test("concurrent admin builder saves cannot silently overwrite each other", async () => {
  const staff = createClient(config.API_URL, config.ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  ok(await staff.auth.signInWithPassword({ email: users[0].email, password }));
  const current = await staff
    .from("recruitment_application_forms")
    .select("*")
    .eq("recruitment_cycle_id", cycleId)
    .single();
  ok(current);
  const schema = current.data.draft_schema as ApplicationFormSchema;
  const saves = await Promise.all([
    staff.rpc("save_application_form", {
      p_cycle_id: cycleId,
      p_schema: { ...schema, description: "Admin edit A" },
      p_expected_revision: current.data.draft_revision,
    }),
    staff.rpc("save_application_form", {
      p_cycle_id: cycleId,
      p_schema: { ...schema, description: "Admin edit B" },
      p_expected_revision: current.data.draft_revision,
    }),
  ]);
  expect(saves.filter((result) => !result.error)).toHaveLength(1);
  expect(saves.find((result) => result.error)?.error?.message).toContain("Another admin changed");
  await staff.auth.signOut();
});

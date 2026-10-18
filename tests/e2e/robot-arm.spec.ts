import { expect, test } from "@playwright/test";

test("robot arm completes pick and place while the pointer moves during delivery", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("heading", { name: "Engineering in motion." }).scrollIntoViewIfNeeded();
  await page.getByText("MANIPULO · 5-DOF", { exact: true }).scrollIntoViewIfNeeded();
  const arm = page.getByTestId("robot-arm");
  await expect(arm.locator("canvas")).toBeVisible();
  await arm.scrollIntoViewIfNeeded();
  for (const phase of ["grasp", "lift", "carry"]) {
    await expect(arm).toHaveAttribute("data-arm-phase", phase);
  }
  const bounds = (await arm.boundingBox())!;
  for (const [x, y] of [
    [0.05, 0.05],
    [0.95, 0.05],
    [0.95, 0.95],
    [0.05, 0.95],
  ]) {
    await page.mouse.move(bounds.x + bounds.width * x, bounds.y + bounds.height * y);
  }
  await expect(arm).toHaveAttribute("data-arm-phase", "place");
  await page
    .getByRole("heading", { name: "Engineering in motion." })
    .locator("../..")
    .screenshot({ path: info.outputPath("arm-desktop-place.png") });
  for (const phase of ["retreat", "reset", "grasp", "lift", "carry", "place"]) {
    await expect(arm).toHaveAttribute("data-arm-phase", phase);
  }
  expect(errors).toEqual([]);
});

test("robot arm has a framed, static reduced-motion pose on mobile", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("heading", { name: "Engineering in motion." }).scrollIntoViewIfNeeded();
  await page.getByText("MANIPULO · 5-DOF", { exact: true }).scrollIntoViewIfNeeded();
  const arm = page.getByTestId("robot-arm");
  await arm.scrollIntoViewIfNeeded();
  await expect(arm.locator("canvas")).toBeVisible();
  await expect(arm).toHaveAttribute("data-arm-phase", "grasp");
  const bounds = (await arm.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: info.outputPath("arm-mobile-reduced.png") });
  expect(errors).toEqual([]);
});

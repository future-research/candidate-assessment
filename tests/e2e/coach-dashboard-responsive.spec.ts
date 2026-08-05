import { expect, test } from "@playwright/test";

test("uses one persistent workflow state while moving between mobile and desktop", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Workout", exact: true }).click();
  await page.getByRole("button", { name: "Adjust", exact: true }).click();
  await page.getByRole("slider", { name: "Workout duration" }).fill("40");
  await page.getByRole("button", { name: "Apply adjustment" }).click();

  await page.setViewportSize({ width: 1440, height: 960 });
  await expect(page.getByTestId("desktop-dashboard")).toBeVisible();
  await expect(page.getByRole("region", { name: "Today and member context" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Active workflow" })).toContainText("40-min knee-safe strength");
  await expect(page.getByRole("complementary", { name: "Copilot and history details" })).toBeVisible();
  await expect(page.getByText("v2").first()).toBeVisible();

  await page.setViewportSize({ width: 430, height: 932 });
  await expect(page.getByTestId("desktop-dashboard")).not.toBeVisible();
  await expect(page.getByRole("heading", { name: "40-min knee-safe strength" })).toBeVisible();
});

test("remains usable without horizontal overflow at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto("/");
  const sizes = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(sizes.content).toBeLessThanOrEqual(sizes.viewport);
  await expect(page.getByRole("button", { name: "Open Jordan Rivera profile" })).toBeVisible();
  await page.getByRole("button", { name: "Workout", exact: true }).click();
  await expect(page.getByRole("button", { name: "Approve & record locally" })).toBeVisible();
});

test("returns focus to the stable trigger after mobile detail reflows to desktop", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Jordan Rivera profile" }).click();
  await expect(page.getByRole("region", { name: "Profile" })).toBeVisible();

  await page.setViewportSize({ width: 1440, height: 960 });
  const desktopTrigger = page.getByRole("button", { name: "Open Jordan Rivera profile" });
  await expect(desktopTrigger).toBeVisible();
  await page.getByRole("button", { name: "Go back" }).click();

  await expect(desktopTrigger).toBeFocused();
});

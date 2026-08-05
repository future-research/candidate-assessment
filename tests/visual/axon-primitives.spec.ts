import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("@visual copied AXON primitives remain recognizable", async ({ page }) => {
  await page.goto("/gallery");
  await expect(page.getByRole("heading", { name: "AXON primitives" })).toBeVisible();
  await expect(page).toHaveScreenshot("axon-primitives-430.png", { fullPage: true });
});

test("@a11y primitive gallery has no detectable accessibility violations", async ({ page }) => {
  await page.goto("/gallery");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

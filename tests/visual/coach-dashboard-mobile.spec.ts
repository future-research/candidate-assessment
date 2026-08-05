import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("@visual flagship coach dashboard at 430px", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("coach-dashboard")).toBeVisible();
  await expect(page).toHaveScreenshot("coach-dashboard-mobile-430.png", { fullPage: true });
});

test("@a11y flagship coach dashboard has no detectable accessibility violations", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

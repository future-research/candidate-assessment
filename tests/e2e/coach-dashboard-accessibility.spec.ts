import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("@a11y dialog supports Escape, visible focus, and focus return", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Workout", exact: true }).click();
  const adjust = page.getByRole("button", { name: "Adjust", exact: true });
  await adjust.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Adjust today’s workout" })).toBeVisible();
  await expect(page.getByRole("slider", { name: "Workout duration" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(adjust).toBeFocused();
  await expect(adjust).toHaveCSS("outline-style", "solid");
});

test("@a11y announces asynchronous status and gives charts text summaries", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Copilot", exact: true }).click();
  await expect(page.getByRole("img", { name: /Adherence chart.*100%.*50%/ })).toBeVisible();
  await page.getByRole("button", { name: "Sleep", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(/Retrieving sleep member context|Sleep member context ready/);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("@a11y removes authored motion when reduced motion is requested", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const duration = await page.getByTestId("coach-dashboard").evaluate((element) =>
    Number.parseFloat(getComputedStyle(element).animationDuration),
  );
  expect(duration).toBeLessThanOrEqual(0.001);
});

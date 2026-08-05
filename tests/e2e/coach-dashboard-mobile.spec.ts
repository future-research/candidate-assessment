import { expect, test } from "@playwright/test";

test("flagship coach flow preserves versions and publishes the exact current version", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("coach-dashboard")).toBeVisible();
  await expect(page.getByRole("button", { name: "Open Jordan Rivera profile" })).toBeVisible();

  await page.getByRole("button", { name: "Workout", exact: true }).click();
  await page.getByRole("button", { name: "Adjust", exact: true }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(page.getByText("v1 · Auto daily draft")).toBeVisible();
  await expect(page.getByText("v2 · Coach adjustment")).not.toBeVisible();

  await page.getByRole("button", { name: "Workout", exact: true }).click();
  await page.getByRole("button", { name: "Adjust", exact: true }).click();
  await page.getByRole("slider", { name: "Workout duration" }).fill("40");
  await page.getByRole("button", { name: "Apply adjustment" }).click();
  await page.getByRole("button", { name: "Override", exact: true }).click();
  await page.getByRole("textbox", { name: "Override reason" }).fill("Cleared by PT; light load only");
  await page.getByRole("button", { name: "Override — keep warning" }).click();
  await expect(page.getByText("Dumbbell Goblet Split Squat", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "Approve & record locally" }).click();
  await expect(page.getByRole("heading", { name: "Approve v3" })).toBeVisible();
  await page.getByRole("button", { name: "Approve & record v3 locally" }).click();
  await expect(page.getByText("Local publication recorded for exact v3 · no external delivery")).toBeVisible();
  await expect(page.getByRole("button", { name: "Adjust", exact: true })).not.toBeVisible();

  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(page.getByText("v3 · Safety override")).toBeVisible();
  await expect(page.getByText("Exact v3 recorded for the fixture demo")).toBeVisible();
});

test("profile, decision path, Copilot detail, and pin remain usable", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Jordan Rivera profile" }).click();
  await expect(page.getByRole("region", { name: "Profile" })).toBeVisible();
  await page.getByRole("button", { name: "What this changes today" }).click();
  await expect(page.getByRole("region", { name: "Decision Path" })).toBeVisible();
  await page.getByRole("button", { name: "Go back" }).click();
  await page.getByRole("button", { name: "Go back" }).click();

  await page.getByRole("button", { name: "Copilot", exact: true }).click();
  await page.getByRole("button", { name: "Sleep", exact: true }).click();
  await expect(page.getByText("Retrieving member context…")).toBeVisible();
  await page.getByRole("button", { name: "Recent vs trend vs stable" }).nth(1).click();
  await expect(page.getByRole("region", { name: "Insight" })).toBeVisible();
  await page.getByRole("button", { name: "Pin to Today" }).click();
  await page.getByRole("button", { name: "Go back" }).click();
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(page.getByText("PINNED · COPILOT")).toBeVisible();
  await expect(page.getByText("FREE TEXT DEFERRED · USE PROMPTS")).not.toBeVisible();
});

import { expect, test } from "@playwright/test";

test("home page renders the game title", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Maths Snake" })).toBeVisible();
});

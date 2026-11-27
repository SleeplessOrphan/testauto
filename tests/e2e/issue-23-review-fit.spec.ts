import { expect, test } from "@playwright/test";

test("game fits 1280x720 without page scroll", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/?seed=1");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Start Game", exact: true }).click();
  await expect(page.getByTestId("game")).toHaveAttribute("data-phase", "running", { timeout: 10_000 });
  const h = await page.evaluate(() => [document.documentElement.scrollHeight, innerHeight]);
  expect(h[0]).toBeLessThanOrEqual(h[1]);
});

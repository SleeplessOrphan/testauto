import { expect, test } from "@playwright/test";

/*
 * Each player's panel (.name-p1 / .name-p2) shows the current streak next to the score as text "Streak: N".
 * Longer streak flows are covered by unit tests in issue-17-streaks.test.ts.
 */
test("both players start with a visible streak of zero next to the score", async ({ page }) => {
  await page.goto("/?seed=1");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  const g1 = page.getByRole("group", { name: /^Player 1/i }).first();
  const g2 = page.getByRole("group", { name: /^Player 2/i }).first();
  await g1.getByLabel("Name").fill("Alice");
  await g2.getByLabel("Name").fill("Bob");
  await g1.getByLabel("Addition").check();
  await g2.getByLabel("Addition").check();
  await page.getByRole("button", { name: "Start Game", exact: true }).click();
  await expect(page.getByTestId("game")).toHaveAttribute("data-phase", "running", { timeout: 10_000 });
  for (const p of [1, 2]) {
    const panel = page.locator(`.name-p${p}`);
    await expect(panel).toContainText("Score: 0");
    await expect(panel).toContainText("Streak: 0");
  }
});

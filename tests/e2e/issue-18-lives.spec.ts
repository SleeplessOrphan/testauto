import { expect, test } from "@playwright/test";

/*
 * Each player's panel (.name-p1 / .name-p2) shows "Lives: N" and shows "Eliminated" once out.
 * With no key presses both snakes run into a wall, which costs each of them a life and shows
 * feedback containing "Crash" in their panel (.player-feedback). Elimination flows are covered by unit tests.
 */
test("lives start at three, a crash costs one with feedback and the snake respawns", async ({ page }) => {
  await page.goto("/?seed=1");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  const g1 = page.getByRole("group", { name: /^Player 1/i }).first();
  const g2 = page.getByRole("group", { name: /^Player 2/i }).first();
  await g1.getByLabel("Name").fill("Alice");
  await g2.getByLabel("Name").fill("Bob");
  await g1.getByLabel("Addition").check();
  await g2.getByLabel("Addition").check();
  await page.getByRole("button", { name: "Start Game", exact: true }).click();
  const game = page.getByTestId("game");
  await expect(game).toHaveAttribute("data-phase", "running", { timeout: 10_000 });
  for (const p of [1, 2]) {
    await expect(page.locator(`.name-p${p}`)).toContainText("Lives: 3");
    await expect(page.locator(`.name-p${p}`)).not.toContainText("Eliminated");
  }
  for (const p of [1, 2]) {
    await expect(page.locator(`.name-p${p} .player-feedback`)).toContainText(/Crash/i, { timeout: 20_000 });
  }
  for (const p of [1, 2]) {
    await expect(page.locator(`.name-p${p}`)).toContainText("Lives: 2");
  }
  await expect(game).toHaveAttribute("data-p1-length", "3");
  await expect(game).toHaveAttribute("data-p2-length", "3");
  await expect(game).toHaveAttribute("data-phase", "running");
  await expect(page.locator(".name-p1")).toContainText("Score: 0");
});

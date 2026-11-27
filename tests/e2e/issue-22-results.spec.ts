import { expect, test, type Page } from "@playwright/test";

/*
 * Contract assumed (see .pipeline/questions.md):
 * - A game that ends replaces the game screen with a results screen: a heading ("It's a draw" /
 *   "<name> wins!"), a table with column headers per player name and row headers per statistic,
 *   and buttons Play Again, Change Settings, Main Menu.
 * - `?timeScale=120` with a 1-minute Timed game ends a 0-0 game (draw) within seconds.
 */
const ROWS = [
  "Final score",
  "Correct answers",
  "Incorrect answers",
  "Total questions answered",
  "Percentage accuracy",
  "Longest correct answer streak",
  "Longest snake length",
  "Number of collisions",
];

async function playToDraw(page: Page, names?: [string, string]) {
  await page.goto("/?seed=1&timeScale=120");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  if (names) {
    await page.getByLabel("Name").nth(0).fill(names[0]);
    await page.getByLabel("Name").nth(1).fill(names[1]);
  }
  await page.getByRole("group", { name: "Duration", exact: true }).getByLabel(/^1 minute/).check();
  await page.getByRole("button", { name: "Start Game", exact: true }).click();
  await expect(page.getByRole("heading", { name: /draw/i })).toBeVisible({ timeout: 30_000 });
}

test("a drawn competitive game shows a draw heading and all statistics for both players", async ({ page }) => {
  await playToDraw(page, ["Asha", "Ben"]);
  const table = page.getByRole("table");
  await expect(table.getByRole("columnheader", { name: "Asha" })).toBeVisible();
  await expect(table.getByRole("columnheader", { name: "Ben" })).toBeVisible();
  for (const r of ROWS) await expect(table.getByRole("rowheader", { name: r, exact: true })).toBeVisible();
  await expect(page.getByText(/wins!/)).toHaveCount(0);
});

test("a player who answered nothing shows Not Available accuracy; zeros elsewhere", async ({ page }) => {
  await playToDraw(page);
  const row = (name: string) => page.getByRole("row", { name: new RegExp(name) });
  await expect(row("Percentage accuracy").getByRole("cell")).toHaveText(["Not Available", "Not Available"]);
  await expect(row("Final score").getByRole("cell")).toHaveText(["0", "0"]);
  await expect(row("Total questions answered").getByRole("cell")).toHaveText(["0", "0"]);
  await expect(row("Number of collisions").getByRole("cell")).toHaveText(["0", "0"]);
  await expect(row("Longest snake length").getByRole("cell")).toHaveText(["3", "3"]);
});

test("Main Menu returns to the main menu", async ({ page }) => {
  await playToDraw(page);
  await page.getByRole("button", { name: "Main Menu", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Maths Snake" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /draw/i })).toHaveCount(0);
});

test("Change Settings opens setup pre-filled with the previous settings", async ({ page }) => {
  await playToDraw(page, ["Asha", "Ben"]);
  await page.getByRole("button", { name: "Change Settings", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Game setup" })).toBeVisible();
  await expect(page.getByLabel("Name").nth(0)).toHaveValue("Asha");
  await expect(page.getByLabel("Name").nth(1)).toHaveValue("Ben");
  const duration = page.getByRole("group", { name: "Duration", exact: true });
  await expect(duration.getByLabel(/^1 minute/)).toBeChecked();
  await expect(duration.getByLabel(/^3 minutes/)).not.toBeChecked();
});

test("Play Again starts a new game with the same settings and can end again", async ({ page }) => {
  await playToDraw(page, ["Asha", "Ben"]);
  await page.getByRole("button", { name: "Play Again", exact: true }).click();
  const game = page.getByTestId("game");
  await expect(game).toHaveAttribute("data-phase", "countdown");
  await expect(page.getByTestId("timer")).toHaveText("01:00");
  await expect(page.getByText("Asha").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /draw/i })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /draw/i })).toBeVisible({ timeout: 30_000 });
});

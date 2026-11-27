import { expect, test, type Page } from "@playwright/test";

/*
 * Contract assumed (see .pipeline/questions.md):
 * - Setup has a group "Game mode" with radios Timed / Survival / Target Score / Practice (default Timed).
 * - Timed: group "Duration" with radios "1 minute", "3 minutes", "5 minutes" (default 3 minutes).
 * - Target Score: group "Target score" with radios 100 / 200 / 500 (default 200).
 * - Game screen: timer element data-testid="timer" showing mm:ss; target shown as text "Target: 200".
 * - Practice shows "Unlimited" in the player panels (.name-p1 / .name-p2).
 * - Test-only `?timeScale=N` makes the timer run N times faster.
 * - When the game ends, data-phase becomes "ended" and the page shows text "draw" or "wins".
 */
const setupPage = async (page: Page, query = "") => {
  await page.goto("/" + query);
  await page.getByRole("button", { name: "Play", exact: true }).click();
};
const modeGroup = (page: Page) => page.getByRole("group", { name: "Game mode", exact: true });
const startGame = async (page: Page) => {
  await page.getByRole("button", { name: "Start Game", exact: true }).click();
  await expect(page.getByTestId("game")).toHaveAttribute("data-phase", "running", { timeout: 10_000 });
};

test("Timed is the default mode with 3 minutes selected; target choices are hidden", async ({ page }) => {
  await setupPage(page);
  const mode = modeGroup(page);
  await expect(mode.getByLabel("Timed")).toBeChecked();
  for (const m of ["Survival", "Target Score", "Practice"]) await expect(mode.getByLabel(m)).not.toBeChecked();
  const duration = page.getByRole("group", { name: "Duration", exact: true });
  await expect(duration.getByLabel(/^1 minute/)).not.toBeChecked();
  await expect(duration.getByLabel(/^3 minutes/)).toBeChecked();
  await expect(duration.getByLabel(/^5 minutes/)).not.toBeChecked();
  await expect(page.getByRole("group", { name: "Target score", exact: true })).toHaveCount(0);
});

test("Target Score shows 100/200/500 (default 200) and hides duration", async ({ page }) => {
  await setupPage(page);
  await modeGroup(page).getByLabel("Target Score").check();
  const target = page.getByRole("group", { name: "Target score", exact: true });
  await expect(target.getByLabel("100")).not.toBeChecked();
  await expect(target.getByLabel("200")).toBeChecked();
  await expect(target.getByLabel("500")).not.toBeChecked();
  await expect(page.getByRole("group", { name: "Duration", exact: true })).toHaveCount(0);
});

for (const m of ["Survival", "Practice"]) {
  test(`${m} hides both duration and target choices`, async ({ page }) => {
    await setupPage(page);
    await modeGroup(page).getByLabel(m).check();
    await expect(page.getByRole("group", { name: "Duration", exact: true })).toHaveCount(0);
    await expect(page.getByRole("group", { name: "Target score", exact: true })).toHaveCount(0);
  });
}

test("Timed shows mm:ss timer that does not count during the 3-2-1 countdown, then counts down", async ({ page }) => {
  await setupPage(page, "?seed=1");
  await page.getByRole("button", { name: "Start Game", exact: true }).click();
  const game = page.getByTestId("game");
  const timer = page.getByTestId("timer");
  await expect(game).toHaveAttribute("data-phase", "countdown");
  await expect(timer).toHaveText(/^03:00$/);
  await expect(game).toHaveAttribute("data-phase", "running", { timeout: 10_000 });
  await expect(timer).toHaveText(/^0[0-2]:\d\d$/, { timeout: 5_000 });
  await expect(timer).not.toHaveText("03:00");
  await expect(page.getByText(/Target:/)).toHaveCount(0);
});

test("chosen duration is shown on the timer", async ({ page }) => {
  await setupPage(page);
  await page.getByRole("group", { name: "Duration", exact: true }).getByLabel(/^5 minutes/).check();
  await page.getByRole("button", { name: "Start Game", exact: true }).click();
  await expect(page.getByTestId("timer")).toHaveText("05:00");
});

test("Target Score shows the target and no timer", async ({ page }) => {
  await setupPage(page);
  await modeGroup(page).getByLabel("Target Score").check();
  await startGame(page);
  await expect(page.getByText("Target: 200")).toBeVisible();
  await expect(page.getByTestId("timer")).toHaveCount(0);
});

test("Target Score shows a non-default target", async ({ page }) => {
  await setupPage(page);
  await modeGroup(page).getByLabel("Target Score").check();
  await page.getByRole("group", { name: "Target score", exact: true }).getByLabel("500").check();
  await startGame(page);
  await expect(page.getByText("Target: 500")).toBeVisible();
});

test("Survival shows no timer and no target", async ({ page }) => {
  await setupPage(page);
  await modeGroup(page).getByLabel("Survival").check();
  await startGame(page);
  await expect(page.getByTestId("timer")).toHaveCount(0);
  await expect(page.getByText(/Target:/)).toHaveCount(0);
  await expect(page.locator(".name-p1")).toContainText("Lives: 3");
});

test("Practice shows no timer and unlimited lives", async ({ page }) => {
  await setupPage(page);
  await modeGroup(page).getByLabel("Practice").check();
  await startGame(page);
  await expect(page.getByTestId("timer")).toHaveCount(0);
  await expect(page.getByText(/Target:/)).toHaveCount(0);
  for (const p of [1, 2]) await expect(page.locator(`.name-p${p}`)).toContainText("Unlimited");
});

test("timed game stops at zero and shows a draw for a 0-0 game", async ({ page }) => {
  await setupPage(page, "?seed=1&timeScale=120");
  await page.getByRole("group", { name: "Duration", exact: true }).getByLabel(/^1 minute/).check();
  await page.getByRole("button", { name: "Start Game", exact: true }).click();
  const game = page.getByTestId("game");
  await expect(game).toHaveAttribute("data-phase", "ended", { timeout: 30_000 });
  await expect(page.getByText(/draw/i)).toBeVisible();
  const tick = await game.getAttribute("data-tick");
  await expect(game).toHaveAttribute("data-tick", tick ?? "");
});

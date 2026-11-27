import { expect, test, type Page } from "@playwright/test";

/*
 * Contract assumed (see .pipeline/questions.md):
 * - Escape during the running phase sets data-phase="paused" on [data-testid=game] and shows a dialog
 *   (role "dialog") named "Paused" with buttons Resume, Restart, Exit (and End Game in Practice only).
 * - Focus moves into the dialog. Restart/Exit show a confirmation with buttons "Confirm" and "Cancel".
 * - Resume closes the menu, shows the 3-2-1 countdown (data-phase="countdown"), then "running".
 * - Window blur or document visibilitychange (hidden) while running pauses the game.
 */
const start = async (page: Page, mode?: string, query = "?seed=1") => {
  await page.goto("/" + query);
  await page.getByRole("button", { name: "Play", exact: true }).click();
  if (mode) await page.getByRole("group", { name: "Game mode", exact: true }).getByLabel(mode).check();
  await page.getByRole("button", { name: "Start Game", exact: true }).click();
  await expect(page.getByTestId("game")).toHaveAttribute("data-phase", "running", { timeout: 10_000 });
};
const game = (page: Page) => page.getByTestId("game");
const pauseDialog = (page: Page) => page.getByRole("dialog", { name: "Paused" });
const pause = async (page: Page) => {
  await page.keyboard.press("Escape");
  await expect(game(page)).toHaveAttribute("data-phase", "paused");
};
/** Lets about a second of animation frames go by without a fixed wait. */
const frames = (page: Page, n = 90) =>
  page.evaluate(
    (count) =>
      new Promise<void>((resolve) => {
        let i = 0;
        const f = () => (++i >= count ? resolve() : requestAnimationFrame(f));
        requestAnimationFrame(f);
      }),
    n,
  );

test("Escape pauses, opens an accessible pause menu and moves focus into it", async ({ page }) => {
  await start(page);
  await expect(pauseDialog(page)).toHaveCount(0);
  await pause(page);
  const dialog = pauseDialog(page);
  await expect(dialog).toBeVisible();
  for (const b of ["Resume", "Restart", "Exit"]) await expect(dialog.getByRole("button", { name: b, exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "End Game" })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => !!document.activeElement?.closest("[role=dialog], dialog"))).toBe(true);
});

test("while paused snakes, tick counter and timer do not move; keys are ignored", async ({ page }) => {
  await start(page);
  await pause(page);
  const read = () =>
    game(page).evaluate((el) => ({
      tick: el.getAttribute("data-tick"),
      p1: el.getAttribute("data-p1-segments"),
      p2: el.getAttribute("data-p2-segments"),
      d1: el.getAttribute("data-p1-direction"),
      d2: el.getAttribute("data-p2-direction"),
      p1s: el.getAttribute("data-p1-score"),
      p2s: el.getAttribute("data-p2-score"),
    }));
  const before = await read();
  const timerBefore = await page.getByTestId("timer").textContent();
  await page.keyboard.press("w");
  await page.keyboard.press("ArrowDown");
  await frames(page);
  expect(await read()).toEqual(before);
  await expect(page.getByTestId("timer")).toHaveText(timerBefore!);
});

test("Resume shows a countdown and then gameplay continues", async ({ page }) => {
  await start(page);
  await pause(page);
  await pauseDialog(page).getByRole("button", { name: "Resume", exact: true }).click();
  await expect(pauseDialog(page)).toHaveCount(0);
  await expect(game(page)).toHaveAttribute("data-phase", "countdown");
  const tick = Number(await game(page).getAttribute("data-tick"));
  await expect(game(page)).toHaveAttribute("data-phase", "running", { timeout: 10_000 });
  await expect.poll(async () => Number(await game(page).getAttribute("data-tick")), { timeout: 5_000 }).toBeGreaterThan(tick);
});

test("pausing again after resume works (repeated Escape)", async ({ page }) => {
  await start(page);
  await pause(page);
  await pauseDialog(page).getByRole("button", { name: "Resume", exact: true }).click();
  await expect(game(page)).toHaveAttribute("data-phase", "running", { timeout: 10_000 });
  await pause(page);
  await expect(pauseDialog(page)).toBeVisible();
});

test("timer resumes counting after resume", async ({ page }) => {
  await start(page);
  await pause(page);
  await pauseDialog(page).getByRole("button", { name: "Resume", exact: true }).click();
  await expect(game(page)).toHaveAttribute("data-phase", "running", { timeout: 10_000 });
  const t = await page.getByTestId("timer").textContent();
  await expect(page.getByTestId("timer")).not.toHaveText(t!, { timeout: 5_000 });
});

test("window blur pauses a running game", async ({ page }) => {
  await start(page);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(game(page)).toHaveAttribute("data-phase", "paused");
  await expect(pauseDialog(page)).toBeVisible();
});

test("tab becoming hidden pauses a running game", async ({ page }) => {
  await start(page);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(game(page)).toHaveAttribute("data-phase", "paused");
  await expect(pauseDialog(page)).toBeVisible();
});

test("Restart asks for confirmation; cancel keeps the pause menu", async ({ page }) => {
  await start(page);
  await pause(page);
  await pauseDialog(page).getByRole("button", { name: "Restart", exact: true }).click();
  await expect(page.getByRole("button", { name: "Confirm", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("button", { name: "Confirm", exact: true })).toHaveCount(0);
  await expect(game(page)).toHaveAttribute("data-phase", "paused");
  await expect(pauseDialog(page).getByRole("button", { name: "Resume", exact: true })).toBeVisible();
});

test("confirmed Restart resets scores, tick and timer and keeps the same settings", async ({ page }) => {
  await page.goto("/?seed=1");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByLabel("Name").nth(0).fill("Asha");
  await page.getByLabel("Name").nth(1).fill("Ben");
  await page.getByRole("group", { name: "Duration", exact: true }).getByLabel(/^5 minutes/).check();
  await page.getByRole("button", { name: "Start Game", exact: true }).click();
  await expect(game(page)).toHaveAttribute("data-phase", "running", { timeout: 10_000 });
  await expect.poll(async () => Number(await game(page).getAttribute("data-tick"))).toBeGreaterThan(2);
  await pause(page);
  await pauseDialog(page).getByRole("button", { name: "Restart", exact: true }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(pauseDialog(page)).toHaveCount(0);
  await expect(game(page)).toHaveAttribute("data-phase", "countdown");
  await expect(game(page)).toHaveAttribute("data-tick", "0");
  await expect(game(page)).toHaveAttribute("data-p1-score", "0");
  await expect(game(page)).toHaveAttribute("data-p2-score", "0");
  await expect(page.getByTestId("timer")).toHaveText("05:00");
  await expect(page.getByText("Asha").first()).toBeVisible();
  await expect(page.getByText("Ben").first()).toBeVisible();
  await expect(game(page)).toHaveAttribute("data-phase", "running", { timeout: 10_000 });
});

test("Exit asks for confirmation; cancel stays, confirm returns to the main menu", async ({ page }) => {
  await start(page);
  await pause(page);
  await pauseDialog(page).getByRole("button", { name: "Exit", exact: true }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(game(page)).toHaveAttribute("data-phase", "paused");
  await pauseDialog(page).getByRole("button", { name: "Exit", exact: true }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Maths Snake", level: 1 })).toBeVisible();
  await expect(game(page)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
});

test("Practice pause menu has End Game, which shows results without a winner", async ({ page }) => {
  await start(page, "Practice");
  await pause(page);
  await pauseDialog(page).getByRole("button", { name: "End Game", exact: true }).click();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByText(/wins!/)).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Main Menu" })).toBeVisible();
});

test("non-Practice modes have no End Game button", async ({ page }) => {
  await start(page, "Survival");
  await pause(page);
  await expect(page.getByRole("button", { name: "End Game" })).toHaveCount(0);
});

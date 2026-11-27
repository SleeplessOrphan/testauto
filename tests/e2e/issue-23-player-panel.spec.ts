import { expect, test, type Page } from "@playwright/test";

/*
 * Contract assumed (see .pipeline/questions.md):
 * - Each player's panel is an element with role "group" whose accessible name contains the player's name
 *   (e.g. aria-label "Alice" or "Player 1: Alice"). It keeps the class .name-p1 / .name-p2.
 * - Inside the panel, visible labelled text: "Question", "Score: N", "Lives: N", "Streak: N", "Status: Playing"
 *   (or "Status: Eliminated"). Status is always shown, as text.
 * - Timed games show the remaining time (data-testid="timer").
 */
async function start(page: Page, mode?: string) {
  await page.goto("/?seed=1");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  const g1 = page.getByRole("group", { name: /^Player 1/i }).first();
  const g2 = page.getByRole("group", { name: /^Player 2/i }).first();
  await g1.getByLabel("Name").fill("Alice");
  await g2.getByLabel("Name").fill("Bob");
  await g1.getByLabel("Addition").check();
  await g2.getByLabel("Addition").check();
  if (mode) await page.getByRole("group", { name: "Game mode", exact: true }).getByLabel(mode).check();
  await page.getByRole("button", { name: "Start Game", exact: true }).click();
  await expect(page.getByTestId("game")).toHaveAttribute("data-phase", "running", { timeout: 10_000 });
}

test("each panel is a named group showing name, question, score, lives, streak and status", async ({ page }) => {
  await start(page);
  for (const [n, name] of [[1, "Alice"], [2, "Bob"]] as const) {
    const panel = page.getByRole("group", { name: new RegExp(name) });
    await expect(panel).toHaveCount(1);
    await expect(panel).toBeVisible();
    await expect(panel).toContainText(name);
    await expect(panel).toContainText(/Question/i);
    await expect(panel).toContainText("Score: 0");
    await expect(panel).toContainText("Lives: 3");
    await expect(panel).toContainText("Streak: 0");
    await expect(panel).toContainText("Status: Playing");
    await expect(panel).not.toContainText("Eliminated");
    await expect(page.locator(`.name-p${n}`)).toHaveCount(1);
    await expect(page.locator(`.name-p${n} .question-text`)).not.toHaveText("");
  }
});

test("a life lost updates the panel and the status stays text", async ({ page }) => {
  await start(page);
  const panel = page.getByRole("group", { name: /Alice/ });
  await expect(panel).toContainText("Lives: 2", { timeout: 20_000 });
  await expect(panel).toContainText("Status: Playing");
});

test("timed games display the remaining time", async ({ page }) => {
  await start(page);
  await expect(page.getByTestId("timer")).toHaveText(/^\d\d:\d\d$/);
});

test("survival games do not display a timer", async ({ page }) => {
  await start(page, "Survival");
  await expect(page.getByTestId("timer")).toHaveCount(0);
});

test("panels and timer do not overlap the canvas at 1280x720", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await start(page, "Timed");
  const canvas = await page.getByRole("img", { name: "Game board" }).boundingBox();
  expect(canvas).not.toBeNull();
  for (const name of ["Alice", "Bob"]) {
    const box = await page.getByRole("group", { name: new RegExp(name) }).boundingBox();
    expect(box).not.toBeNull();
    const overlaps =
      box!.x < canvas!.x + canvas!.width && box!.x + box!.width > canvas!.x &&
      box!.y < canvas!.y + canvas!.height && box!.y + box!.height > canvas!.y;
    expect(overlaps).toBe(false);
  }
  const timer = await page.getByTestId("timer").boundingBox();
  expect(timer).not.toBeNull();
  expect(timer!.y + timer!.height).toBeLessThanOrEqual(canvas!.y + 1);
});

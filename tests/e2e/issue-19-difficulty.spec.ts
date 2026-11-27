import { expect, test, type Locator, type Page } from "@playwright/test";

/*
 * Setup has one group "Gameplay difficulty" with radios Easy / Medium / Hard (default Easy).
 * The game element (data-testid="game") exposes data-tick-rate (cells per second) and
 * data-obstacles (JSON array of {x, y}).
 */
async function start(page: Page, level?: "Easy" | "Medium" | "Hard") {
  await page.goto("/?seed=3");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  if (level) {
    await page.getByRole("group", { name: "Gameplay difficulty", exact: true }).getByLabel(level).check();
  }
  await page.getByRole("button", { name: "Start Game", exact: true }).click();
  const game = page.getByTestId("game");
  await expect(game).toHaveAttribute("data-phase", "running", { timeout: 10_000 });
  return game;
}

type Cell = { x: number; y: number };
const obstacles = async (g: Locator) => JSON.parse((await g.getAttribute("data-obstacles")) ?? "null") as Cell[];

test("gameplay difficulty defaults to Easy", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  const group = page.getByRole("group", { name: "Gameplay difficulty", exact: true });
  await expect(group.getByLabel("Easy")).toBeChecked();
  await expect(group.getByLabel("Medium")).not.toBeChecked();
  await expect(group.getByLabel("Hard")).not.toBeChecked();
  await expect(page.getByRole("group", { name: "Gameplay difficulty", exact: true })).toHaveCount(1);
});

for (const [level, rate, count] of [
  ["Easy", "3", 0],
  ["Medium", "5", 4],
  ["Hard", "8", 8],
] as const) {
  test(`${level} gameplay: ${rate} cells per second and ${count} obstacles`, async ({ page }) => {
    const game = await start(page, level);
    await expect(game).toHaveAttribute("data-tick-rate", rate);
    const obs = await obstacles(game);
    expect(obs).toHaveLength(count);
    expect(new Set(obs.map((o) => o.x + "," + o.y)).size).toBe(count);
    const tiles = JSON.parse((await game.getAttribute("data-tiles")) ?? "[]") as Cell[];
    const taken = new Set(tiles.map((t) => t.x + "," + t.y));
    for (const key of ["p1", "p2"]) {
      for (const c of ((await game.getAttribute(`data-${key}-segments`)) ?? "").split(";")) taken.add(c);
    }
    for (const o of obs) expect(taken.has(o.x + "," + o.y)).toBe(false);
  });
}

test("default (untouched) setup plays as Easy with no obstacles", async ({ page }) => {
  const game = await start(page);
  await expect(game).toHaveAttribute("data-tick-rate", "3");
  expect(await obstacles(game)).toEqual([]);
});

test("obstacles stay fixed during play", async ({ page }) => {
  const game = await start(page, "Hard");
  const before = await obstacles(game);
  await expect(game).not.toHaveAttribute("data-tick", "0");
  expect(await obstacles(game)).toEqual(before);
});

test("changing gameplay difficulty leaves each player's maths difficulty unchanged", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  const g1 = page.getByRole("group", { name: /^Player 1/i }).first();
  const g2 = page.getByRole("group", { name: /^Player 2/i }).first();
  await g1.getByRole("group", { name: "Maths difficulty" }).getByLabel("Hard").check();
  await g2.getByRole("group", { name: "Maths difficulty" }).getByLabel("Easy").check();
  const gameplay = page.getByRole("group", { name: "Gameplay difficulty", exact: true });
  for (const level of ["Hard", "Medium", "Easy", "Hard"]) await gameplay.getByLabel(level).check();
  await expect(g1.getByRole("group", { name: "Maths difficulty" }).getByLabel("Hard")).toBeChecked();
  await expect(g2.getByRole("group", { name: "Maths difficulty" }).getByLabel("Easy")).toBeChecked();
  await expect(gameplay.getByLabel("Hard")).toBeChecked();
});

test("gameplay difficulty is keyboard operable", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  const gameplay = page.getByRole("group", { name: "Gameplay difficulty", exact: true });
  await gameplay.getByLabel("Easy").focus();
  await page.keyboard.press("ArrowDown");
  await expect(gameplay.getByLabel("Medium")).toBeChecked();
});

import { expect, test, type Page } from "@playwright/test";

/*
 * Testability hook assumed (see .pipeline/questions.md): on the element with data-testid="game",
 *   data-tiles  JSON array of { player: 1|2, x, y, value } for every tile on the board
 * plus the existing data-p1-segments / data-p2-segments.
 */

async function start(page: Page, opts: { p1Topic: string; p2Topic: string; p2Difficulty?: string }) {
  await page.goto("/?seed=1");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  const g1 = page.getByRole("group", { name: /^Player 1/i }).first();
  const g2 = page.getByRole("group", { name: /^Player 2/i }).first();
  await g1.getByLabel("Name").fill("Alice");
  await g2.getByLabel("Name").fill("Bob");
  await g1.getByLabel("Addition").uncheck();
  await g1.getByLabel(opts.p1Topic).check();
  await g2.getByLabel("Addition").uncheck();
  await g2.getByLabel(opts.p2Topic).check();
  if (opts.p2Difficulty) await g2.getByLabel(opts.p2Difficulty, { exact: true }).check();
  await page.getByRole("button", { name: "Start Game", exact: true }).click();
}

type Tile = { player: number; x: number; y: number; value: number };

async function tiles(page: Page): Promise<Tile[]> {
  const raw = await page.getByTestId("game").getAttribute("data-tiles");
  expect(raw, "data-tiles").not.toBeNull();
  return JSON.parse(raw!) as Tile[];
}

test("each player sees their own question above the canvas, from their own topics", async ({ page }) => {
  await start(page, { p1Topic: "Percentages", p2Topic: "Addition" });
  const canvas = (await page.locator("canvas").boundingBox())!;
  const q1 = page.getByText(/%/).first();
  const q2 = page.getByText(/\+/).first();
  await expect(q1).toBeVisible();
  await expect(q2).toBeVisible();
  for (const q of [q1, q2]) {
    const b = (await q.boundingBox())!;
    expect(b.y + b.height).toBeLessThanOrEqual(canvas.y + 1);
  }
  expect((await q1.boundingBox())!.x).toBeLessThan((await q2.boundingBox())!.x);
});

test("six tiles are placed: three per player, distinct cells, off the snakes", async ({ page }) => {
  await start(page, { p1Topic: "Multiplication", p2Topic: "Subtraction", p2Difficulty: "Hard" });
  await expect(page.getByTestId("game")).toHaveAttribute("data-tiles", /\S/);
  const all = await tiles(page);
  expect(all).toHaveLength(6);
  expect(all.filter((t) => t.player === 1)).toHaveLength(3);
  expect(all.filter((t) => t.player === 2)).toHaveLength(3);
  const cells = all.map((t) => `${t.x},${t.y}`);
  expect(new Set(cells).size).toBe(6);
  const game = page.getByTestId("game");
  const snake = [
    ...(await game.getAttribute("data-p1-segments"))!.split(";"),
    ...(await game.getAttribute("data-p2-segments"))!.split(";"),
  ];
  for (const c of cells) expect(snake).not.toContain(c);
  for (const t of all) {
    expect(Number.isFinite(t.value)).toBe(true);
    expect(t.x).toBeGreaterThanOrEqual(0);
    expect(t.x).toBeLessThan(40);
    expect(t.y).toBeGreaterThanOrEqual(0);
    expect(t.y).toBeLessThan(25);
  }
});

test("tiles are drawn on the canvas at their cells", async ({ page }) => {
  await start(page, { p1Topic: "Addition", p2Topic: "Addition" });
  await expect(page.getByTestId("game")).toHaveAttribute("data-tiles", /\S/);
  const all = await tiles(page);
  const drawn = await page.locator("canvas").evaluate((c, ts) => {
    const canvas = c as HTMLCanvasElement;
    const ctx = canvas.getContext("2d")!;
    const cw = canvas.width / 40;
    const ch = canvas.height / 25;
    const empty = Array.from(ctx.getImageData(Math.floor(20.5 * cw), Math.floor(0.5 * ch), 1, 1).data).join(",");
    return ts.map((t) => {
      const d = ctx.getImageData(Math.floor(t.x * cw), Math.floor(t.y * ch), Math.ceil(cw), Math.ceil(ch)).data;
      let diff = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] + "," + d[i + 1] + "," + d[i + 2] + "," + d[i + 3] !== empty) diff++;
      return diff;
    });
  }, all);
  for (const n of drawn) expect(n).toBeGreaterThan(10);
});

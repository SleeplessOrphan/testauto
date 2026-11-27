import { expect, test, type Locator, type Page } from "@playwright/test";

/*
 * Testability hook assumed by these tests (see .pipeline/questions.md):
 * an element with data-testid="game" carrying
 *   data-phase    "countdown" | "running"
 *   data-tick     integer tick count (0 until the countdown ends)
 *   data-p1-head / data-p2-head            "x,y"
 *   data-p1-length / data-p2-length        integer
 *   data-p1-direction / data-p2-direction  "up" | "down" | "left" | "right"
 *   data-p1-segments / data-p2-segments    "x,y;x,y;x,y" head first
 */

async function startGame(page: Page, p1 = "Alice", p2 = "Bob") {
  await page.goto("/?seed=1");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("group", { name: /^Player 1/i }).first().getByLabel("Name").fill(p1);
  await page.getByRole("group", { name: /^Player 2/i }).first().getByLabel("Name").fill(p2);
  await page.getByRole("button", { name: "Start Game", exact: true }).click();
}

const game = (page: Page): Locator => page.getByTestId("game");

async function attr(page: Page, name: string): Promise<string> {
  const v = await game(page).getAttribute(name);
  expect(v, `attribute ${name}`).not.toBeNull();
  return v!;
}

async function pos(page: Page, n: 1 | 2): Promise<{ x: number; y: number }> {
  const [x, y] = (await attr(page, `data-p${n}-head`)).split(",").map(Number);
  return { x, y };
}

const tick = async (page: Page) => Number(await attr(page, "data-tick"));

async function waitRunning(page: Page) {
  await expect(game(page)).toHaveAttribute("data-phase", "running", { timeout: 10_000 });
}

const live = (page: Page, text: string) =>
  page.locator('[aria-live="polite"]').filter({ hasText: new RegExp(`^\\s*${text}\\s*$`) });

test("a 3, 2, 1 countdown is announced politely and snakes do not move during it", async ({ page }) => {
  await startGame(page);
  await expect(game(page)).toHaveAttribute("data-phase", "countdown");
  await expect(live(page, "3")).toBeVisible();
  expect(await tick(page)).toBe(0);
  const before = await attr(page, "data-p1-segments");
  await expect(live(page, "2")).toBeVisible({ timeout: 3000 });
  await expect(live(page, "1")).toBeVisible({ timeout: 3000 });
  expect(await tick(page)).toBe(0);
  expect(await attr(page, "data-p1-segments")).toBe(before);
  await waitRunning(page);
  await expect.poll(() => tick(page)).toBeGreaterThan(0);
});

test("keys pressed during the countdown do not move the snakes", async ({ page }) => {
  await startGame(page);
  const before = await attr(page, "data-p1-segments");
  await page.keyboard.press("w");
  await page.keyboard.press("ArrowDown");
  expect(await tick(page)).toBe(0);
  expect(await attr(page, "data-p1-segments")).toBe(before);
  expect(await attr(page, "data-p1-direction")).toBe("right");
});

test("both player names are shown in HTML above the canvas", async ({ page }) => {
  await startGame(page, "Alice", "Bob");
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveCount(1);
  const cbox = (await canvas.boundingBox())!;
  for (const name of ["Alice", "Bob"]) {
    const el = page.getByText(name, { exact: false }).first();
    await expect(el).toBeVisible();
    const b = (await el.boundingBox())!;
    expect(b.y + b.height).toBeLessThanOrEqual(cbox.y + 1);
  }
});

test("two snakes of three segments start at separate positions, with distinct colours", async ({ page }) => {
  await startGame(page);
  await expect(game(page)).toHaveAttribute("data-p1-length", "3");
  await expect(game(page)).toHaveAttribute("data-p2-length", "3");
  const s1 = (await attr(page, "data-p1-segments")).split(";");
  const s2 = (await attr(page, "data-p2-segments")).split(";");
  expect(s1).toHaveLength(3);
  expect(s2).toHaveLength(3);
  expect(s1.filter((s) => s2.includes(s))).toHaveLength(0);

  const colours = await page.locator("canvas").evaluate(
    (c, segs) => {
      const canvas = c as HTMLCanvasElement;
      const ctx = canvas.getContext("2d")!;
      const cw = canvas.width / 40;
      const ch = canvas.height / 25;
      const at = (x: number, y: number) =>
        Array.from(ctx.getImageData(Math.floor((x + 0.5) * cw), Math.floor((y + 0.5) * ch), 1, 1).data).join(",");
      const xy = (s: string) => s.split(",").map(Number);
      const [a, b] = segs;
      return { p1: at(xy(a)[0], xy(a)[1]), p2: at(xy(b)[0], xy(b)[1]), empty: at(20, 2) };
    },
    [s1[2], s2[2]],
  );
  expect(colours.p1).not.toBe(colours.p2);
  expect(colours.p1).not.toBe(colours.empty);
  expect(colours.p2).not.toBe(colours.empty);
});

test("canvas keeps the 40:25 ratio and the whole grid is visible at several window sizes", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await startGame(page);
  const initial = [await attr(page, "data-p1-segments"), await attr(page, "data-p2-segments")];
  for (const size of [
    { width: 1280, height: 720 },
    { width: 1920, height: 1080 },
    { width: 1400, height: 600 },
    { width: 1024, height: 900 },
  ]) {
    await page.setViewportSize(size);
    const b = (await page.locator("canvas").boundingBox())!;
    expect(b.width / b.height).toBeCloseTo(40 / 25, 1);
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.y).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(size.width + 1);
    expect(b.y + b.height).toBeLessThanOrEqual(size.height + 1);
    // Resizing during the countdown must not alter the game state.
    if ((await attr(page, "data-phase")) === "countdown") {
      expect(await tick(page)).toBe(0);
      expect([await attr(page, "data-p1-segments"), await attr(page, "data-p2-segments")]).toEqual(initial);
    }
  }
  await waitRunning(page);
  await expect(game(page)).toHaveAttribute("data-p1-length", "3");
});

test("resizing while running does not reset or reposition the snakes", async ({ page }) => {
  await startGame(page);
  await waitRunning(page);
  await expect.poll(() => tick(page)).toBeGreaterThanOrEqual(2);
  const t0 = await tick(page);
  const x0 = (await pos(page, 1)).x;
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.setViewportSize({ width: 1280, height: 720 });
  expect(await tick(page)).toBeGreaterThanOrEqual(t0);
  expect((await pos(page, 1)).x).toBeGreaterThanOrEqual(x0);
});

test("snakes keep moving in their current directions without input", async ({ page }) => {
  await startGame(page);
  await waitRunning(page);
  await expect.poll(() => tick(page)).toBeGreaterThanOrEqual(1);
  const t0 = await tick(page);
  const a1 = await pos(page, 1);
  const a2 = await pos(page, 2);
  await expect.poll(() => tick(page)).toBeGreaterThanOrEqual(t0 + 3);
  const t1 = await tick(page);
  const b1 = await pos(page, 1);
  const b2 = await pos(page, 2);
  // Heads may be sampled a moment after the tick read, so allow one tick of slack.
  expect(b1.y).toBe(a1.y);
  expect(b2.y).toBe(a2.y);
  expect(b1.x - a1.x).toBeGreaterThanOrEqual(t1 - t0 - 1);
  expect(a2.x - b2.x).toBeGreaterThanOrEqual(t1 - t0 - 1);
  await expect(game(page)).toHaveAttribute("data-p1-direction", "right");
  await expect(game(page)).toHaveAttribute("data-p2-direction", "left");
  await expect(game(page)).toHaveAttribute("data-p1-length", "3");
});

test("tick rate is about 5 per second", async ({ page }) => {
  await startGame(page);
  await waitRunning(page);
  const start = Date.now();
  const t0 = await tick(page);
  // Sample after a fixed window so poll back-off delays do not skew the rate.
  await expect.poll(() => Date.now() - start, { timeout: 5000 }).toBeGreaterThanOrEqual(2000);
  const t1 = await tick(page);
  const elapsed = (Date.now() - start) / 1000;
  const rate = (t1 - t0) / elapsed;
  expect(rate).toBeGreaterThan(3);
  expect(rate).toBeLessThan(7);
});

test("W/A/S/D steer Player 1 and arrow keys steer Player 2", async ({ page }) => {
  await startGame(page);
  await waitRunning(page);
  const y1 = (await pos(page, 1)).y;
  const y2 = (await pos(page, 2)).y;
  await page.keyboard.press("w");
  await expect(game(page)).toHaveAttribute("data-p1-direction", "up");
  await page.keyboard.press("ArrowDown");
  await expect(game(page)).toHaveAttribute("data-p2-direction", "down");
  await expect.poll(async () => (await pos(page, 1)).y).toBeLessThan(y1);
  await expect.poll(async () => (await pos(page, 2)).y).toBeGreaterThan(y2);
  // Each player's keys affect only their own snake.
  expect(await attr(page, "data-p2-direction")).toBe("down");
  expect(await attr(page, "data-p1-direction")).toBe("up");
});

test("uppercase letters and a/d work too", async ({ page }) => {
  await startGame(page);
  await waitRunning(page);
  await page.keyboard.press("Shift+S");
  await expect(game(page)).toHaveAttribute("data-p1-direction", "down");
  await page.keyboard.press("a");
  await expect(game(page)).toHaveAttribute("data-p1-direction", "left");
});

test("both players pressing keys in the same cycle both respond independently", async ({ page }) => {
  await startGame(page);
  await waitRunning(page);
  await Promise.all([page.keyboard.press("s"), page.keyboard.press("ArrowUp")]);
  await expect(game(page)).toHaveAttribute("data-p1-direction", "down");
  await expect(game(page)).toHaveAttribute("data-p2-direction", "up");
});

test("a snake cannot reverse into itself", async ({ page }) => {
  await startGame(page);
  await waitRunning(page);
  await page.keyboard.press("a"); // P1 travels right: reversal ignored
  await expect.poll(() => tick(page)).toBeGreaterThanOrEqual(2);
  await expect(game(page)).toHaveAttribute("data-p1-direction", "right");
  await expect(game(page)).toHaveAttribute("data-p1-length", "3");
});

test("arrow keys do not scroll the page and are default-prevented", async ({ page }) => {
  await startGame(page);
  await waitRunning(page);
  await page.evaluate(() => {
    const w = window as unknown as { __prevented: Record<string, boolean> };
    w.__prevented = {};
    window.addEventListener("keydown", (e) => {
      w.__prevented[e.key] = e.defaultPrevented;
    });
  });
  for (const k of ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]) {
    await page.keyboard.press(k);
  }
  const prevented = await page.evaluate(
    () => (window as unknown as { __prevented: Record<string, boolean> }).__prevented,
  );
  expect(prevented).toEqual({ ArrowUp: true, ArrowDown: true, ArrowLeft: true, ArrowRight: true });
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test("a snake that hits the wall stops while the other keeps going", async ({ page }) => {
  test.setTimeout(45_000);
  await startGame(page);
  await waitRunning(page);
  await page.keyboard.press("w"); // P1 heads for the top wall
  await expect
    .poll(
      async () => {
        const a = await pos(page, 1);
        const t = await tick(page);
        await expect.poll(() => tick(page)).toBeGreaterThanOrEqual(t + 4);
        const b = await pos(page, 1);
        return a.x === b.x && a.y === b.y;
      },
      { timeout: 30_000 },
    )
    .toBe(true);
  const stopped = await pos(page, 1);
  expect(stopped.y).toBeGreaterThanOrEqual(0);
  expect(stopped.y).toBeLessThanOrEqual(24);
  expect(await attr(page, "data-p1-length")).toBe("3");
});

test("the same seed gives the same initial state", async ({ page }) => {
  await startGame(page);
  const a = [await attr(page, "data-p1-segments"), await attr(page, "data-p2-segments")];
  await page.reload();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Start Game", exact: true }).click();
  expect([await attr(page, "data-p1-segments"), await attr(page, "data-p2-segments")]).toEqual(a);
});

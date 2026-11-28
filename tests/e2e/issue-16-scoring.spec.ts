import { expect, test, type Locator, type Page } from "@playwright/test";

/*
 * Testability hooks assumed (see .pipeline/questions.md), on data-testid="game":
 *   data-p1-score / data-p2-score          numbers
 *   data-p1-correct / data-p1-incorrect    per-player counts (same for p2)
 * plus existing data-tiles, data-tick, data-p1-direction, data-p1-length, data-p1-segments.
 * Each player's score is also visible text "Score: N" in their panel (.name-p1 / .name-p2), and feedback
 * is shown in an aria-live="polite" region inside that panel.
 */

async function start(page: Page) {
  await page.goto("/?seed=1");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  const g1 = page.getByRole("group", { name: /^Player 1/i }).first();
  const g2 = page.getByRole("group", { name: /^Player 2/i }).first();
  await g1.getByLabel("Name").fill("Alice");
  await g2.getByLabel("Name").fill("Bob");
  await g1.getByLabel("Addition").check();
  await g2.getByLabel("Addition").check();
  // Practice gives unlimited lives: player 2 keeps crashing while parked, and in a timed game a slow
  // run could use up its three lives, which removes its tiles and breaks the "unchanged" checks.
  await page.getByRole("group", { name: "Game mode", exact: true }).getByLabel("Practice").check();
  await page.getByRole("button", { name: "Start Game", exact: true }).click();
  await expect(page.getByTestId("game")).toHaveAttribute("data-phase", "running", { timeout: 10_000 });
  // Park player 2 against the top wall so it stays out of the way.
  await page.keyboard.press("ArrowUp");
}

type Tile = { player: number; x: number; y: number; value: number };
type P = { x: number; y: number };

async function num(page: Page, attr: string) {
  return Number(await page.getByTestId("game").getAttribute(attr));
}
async function tilesOf(page: Page): Promise<Tile[]> {
  return JSON.parse((await page.getByTestId("game").getAttribute("data-tiles"))!) as Tile[];
}
const panel = (page: Page, player: 1 | 2): Locator => page.locator(`.name-p${player}`);
async function question(page: Page, player: 1 | 2): Promise<string> {
  return (await panel(page, player).locator(".question-text").innerText()).trim();
}
function answerOf(text: string): number {
  const m = /(\d+)\s*\+\s*(\d+)/.exec(text);
  expect(m, `addition question in "${text}"`).not.toBeNull();
  return Number(m![1]) + Number(m![2]);
}

const DIRS: Record<string, [number, number, string]> = {
  up: [0, -1, "w"],
  down: [0, 1, "s"],
  left: [-1, 0, "a"],
  right: [1, 0, "d"],
};
const OPP: Record<string, string> = { up: "down", down: "up", left: "right", right: "left" };

/** BFS over free cells, honouring "no reversal"; returns the first key to press. */
function nextKey(head: P, dir: string, target: P, blocked: Set<string>): string | null {
  const k = (p: P) => p.x + "," + p.y;
  const prev = new Map<string, { from: string; key: string }>();
  const seen = new Set([k(head)]);
  const q: P[] = [head];
  for (let i = 0; i < q.length; i++) {
    const c = q[i];
    if (c.x === target.x && c.y === target.y) {
      let cur = k(c);
      let step = prev.get(cur);
      while (step && step.from !== k(head)) {
        cur = step.from;
        step = prev.get(cur);
      }
      return step ? step.key : null;
    }
    for (const [name, [dx, dy, key]] of Object.entries(DIRS)) {
      if (i === 0 && name === OPP[dir]) continue;
      const n = { x: c.x + dx, y: c.y + dy };
      if (n.x < 0 || n.y < 0 || n.x >= 40 || n.y >= 25) continue;
      if (seen.has(k(n)) || (blocked.has(k(n)) && !(n.x === target.x && n.y === target.y))) continue;
      seen.add(k(n));
      prev.set(k(n), { from: k(c), key });
      q.push(n);
    }
  }
  return null;
}

/** Steers player 1's snake onto the given tile, one key per tick. */
async function steerTo(page: Page, target: Tile) {
  const game = page.getByTestId("game");
  for (let i = 0; i < 200; i++) {
    const tiles = await tilesOf(page);
    if (!tiles.some((t) => t.x === target.x && t.y === target.y && t.player === 1)) return;
    const segs = (await game.getAttribute("data-p1-segments"))!.split(";");
    const [hx, hy] = segs[0].split(",").map(Number);
    const dir = (await game.getAttribute("data-p1-direction"))!;
    const blocked = new Set<string>([
      ...segs,
      ...(await game.getAttribute("data-p2-segments"))!.split(";"),
      ...tiles.filter((t) => !(t.x === target.x && t.y === target.y)).map((t) => t.x + "," + t.y),
    ]);
    const key = nextKey({ x: hx, y: hy }, dir, target, blocked);
    if (key) await page.keyboard.press(key);
    const tick = await game.getAttribute("data-tick");
    await expect(game).not.toHaveAttribute("data-tick", tick!, { timeout: 5_000 });
  }
}

test("collecting the correct answer: +10, growth, tiles replaced, positive feedback, other player unchanged", async ({ page }) => {
  test.setTimeout(90_000);
  await start(page);
  const q1 = await question(page, 1);
  const q2 = await question(page, 2);
  const before = await tilesOf(page);
  const p2Tiles = before.filter((t) => t.player === 2);
  const lengthBefore = await num(page, "data-p1-length");
  expect(await num(page, "data-p1-score")).toBe(0);
  await expect(panel(page, 1)).toContainText("Score: 0");

  const target = before.find((t) => t.player === 1 && t.value === answerOf(q1));
  expect(target, "a tile holds the correct answer").toBeDefined();
  await steerTo(page, target!);

  await expect(page.getByTestId("game")).toHaveAttribute("data-p1-score", "10");
  await expect(panel(page, 1)).toContainText("Score: 10");
  await expect(panel(page, 1).locator('[aria-live="polite"]')).toContainText(/correct.*\+10/i);
  expect(await num(page, "data-p1-correct")).toBe(1);
  expect(await num(page, "data-p1-incorrect")).toBe(0);

  await expect(page.getByTestId("game")).toHaveAttribute("data-p1-length", String(lengthBefore + 1));

  // A new question and three new tiles appear for player 1 on the next cycle.
  await expect
    .poll(async () => (await tilesOf(page)).filter((t) => t.player === 1).length, { timeout: 5_000 })
    .toBe(3);
  const after = await tilesOf(page);
  expect(after.filter((t) => t.player === 1).map((t) => t.value)).toContain(answerOf(await question(page, 1)));

  // Player 2's question and tiles are unchanged.
  expect(await question(page, 2)).toBe(q2);
  expect(after.filter((t) => t.player === 2)).toEqual(p2Tiles);
  expect(await num(page, "data-p2-score")).toBe(0);
});

test("collecting an incorrect answer: score stays at 0, snake stays at 3, correct answer shown, new tiles", async ({ page }) => {
  test.setTimeout(90_000);
  await start(page);
  const q1 = await question(page, 1);
  const q2 = await question(page, 2);
  const before = await tilesOf(page);
  const p2Tiles = before.filter((t) => t.player === 2);
  const correct = answerOf(q1);
  const wrong = before.filter((t) => t.player === 1 && t.value !== correct);
  expect(wrong).toHaveLength(2);
  expect(await num(page, "data-p1-length")).toBe(3);

  await steerTo(page, wrong[0]);

  const feedback = panel(page, 1).locator('[aria-live="polite"]');
  await expect(feedback).toContainText(String(correct));
  await expect(page.getByTestId("game")).toHaveAttribute("data-p1-incorrect", "1");
  expect(await num(page, "data-p1-correct")).toBe(0);
  expect(await num(page, "data-p1-score")).toBe(0);
  await expect(panel(page, 1)).toContainText("Score: 0");
  expect(await num(page, "data-p1-length")).toBe(3);

  // Gameplay keeps running while the feedback shows.
  const tick = await num(page, "data-tick");
  await expect.poll(() => num(page, "data-tick")).toBeGreaterThan(tick);
  await expect(page.getByTestId("game")).toHaveAttribute("data-status", "playing");

  // A new question with three tiles appears; player 2 is untouched.
  await expect
    .poll(async () => (await tilesOf(page)).filter((t) => t.player === 1).length, { timeout: 5_000 })
    .toBe(3);
  const after = await tilesOf(page);
  expect(after.filter((t) => t.player === 1).map((t) => t.value)).toContain(answerOf(await question(page, 1)));
  expect(await question(page, 2)).toBe(q2);
  expect(after.filter((t) => t.player === 2)).toEqual(p2Tiles);

  // The temporary hint goes away after roughly two seconds.
  await expect(feedback).not.toContainText(String(correct), { timeout: 6_000 });
});

test("an incorrect answer after a correct one subtracts 5 and shrinks the snake by one", async ({ page }) => {
  test.setTimeout(120_000);
  await start(page);
  const before = await tilesOf(page);
  const firstAnswer = answerOf(await question(page, 1));
  const target = before.find((t) => t.player === 1 && t.value === firstAnswer);
  expect(target).toBeDefined();
  await steerTo(page, target!);
  await expect(page.getByTestId("game")).toHaveAttribute("data-p1-score", "10");
  await expect(page.getByTestId("game")).toHaveAttribute("data-p1-length", "4");
  await expect
    .poll(async () => (await tilesOf(page)).filter((t) => t.player === 1).length, { timeout: 5_000 })
    .toBe(3);

  const correct = answerOf(await question(page, 1));
  const wrong = (await tilesOf(page)).find((t) => t.player === 1 && t.value !== correct);
  expect(wrong).toBeDefined();
  await steerTo(page, wrong!);
  await expect(page.getByTestId("game")).toHaveAttribute("data-p1-score", "5");
  await expect(panel(page, 1)).toContainText("Score: 5");
  await expect(page.getByTestId("game")).toHaveAttribute("data-p1-length", "3");
  expect(await num(page, "data-p1-correct")).toBe(1);
  expect(await num(page, "data-p1-incorrect")).toBe(1);
});

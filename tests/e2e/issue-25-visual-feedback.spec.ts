import { expect, test, type Page } from "@playwright/test";

/*
 * Contract assumed (see .pipeline/questions.md):
 * - The game element (data-testid="game") carries data-reduced-motion="true" when the OS asks for reduced
 *   motion, otherwise "false".
 * - A player's panel carries data-feedback="correct" | "incorrect" | "collision" while feedback is shown
 *   (and no such value when idle), next to the existing text message ("Crash! ...").
 * - Colours are CSS custom properties declared on :root.
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
  await page.getByRole("button", { name: "Start Game", exact: true }).click();
  await expect(page.getByTestId("game")).toHaveAttribute("data-phase", "running", { timeout: 10_000 });
}

const luminance = (rgb: number[]) => {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const ratio = (a: number[], b: number[]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};
const parse = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number);

test("theme uses CSS variables on :root and a system font stack", async ({ page }) => {
  await page.goto("/");
  const vars = await page.evaluate(() => {
    const names: string[] = [];
    for (const sheet of Array.from(document.styleSheets)) {
      for (const rule of Array.from(sheet.cssRules)) {
        if (rule instanceof CSSStyleRule && /:root|html/.test(rule.selectorText)) {
          for (const n of Array.from(rule.style)) if (n.startsWith("--")) names.push(n);
        }
      }
    }
    return names;
  });
  expect(vars.length).toBeGreaterThanOrEqual(4);
  const font = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(font).toMatch(/system-ui|sans-serif|Arial|Helvetica|Segoe/i);
  const headingWeight = await page.evaluate(() => getComputedStyle(document.querySelector("h1")!).fontWeight);
  expect(Number(headingWeight)).toBeGreaterThanOrEqual(700);
});

test("no externally hosted fonts or assets are requested", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (r) => {
    const u = r.url();
    if (/^https?:/.test(u) && !u.startsWith("http://localhost") && !u.startsWith("http://127.0.0.1")) external.push(u);
  });
  await start(page);
  expect(external).toEqual([]);
});

test("menu text and button text meet WCAG AA contrast (4.5:1)", async ({ page }) => {
  await page.goto("/");
  const pairs = await page.evaluate(() => {
    const bgOf = (el: Element) => {
      let e: Element | null = el;
      while (e) {
        const c = getComputedStyle(e).backgroundColor;
        if (c && !/rgba\(.*, 0\)|transparent/.test(c)) return c;
        e = e.parentElement;
      }
      return "rgb(255, 255, 255)";
    };
    return Array.from(document.querySelectorAll("h1, h2, p, button, a")).map((el) => ({
      fg: getComputedStyle(el).color,
      bg: bgOf(el),
    }));
  });
  expect(pairs.length).toBeGreaterThan(0);
  for (const p of pairs) expect(ratio(parse(p.fg), parse(p.bg))).toBeGreaterThanOrEqual(4.5);
});

test("keyboard focus indicator is visible with at least 3:1 contrast", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const info = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    const s = getComputedStyle(el);
    return { width: parseFloat(s.outlineWidth), style: s.outlineStyle, colour: s.outlineColor, bg: getComputedStyle(document.body).backgroundColor };
  });
  expect(info.style).not.toBe("none");
  expect(info.width).toBeGreaterThanOrEqual(2);
  expect(ratio(parse(info.colour), parse(info.bg))).toBeGreaterThanOrEqual(3);
});

test("a crash shows text and a marker in the affected player's panel", async ({ page }) => {
  await start(page);
  const alice = page.getByRole("group", { name: /Alice/ });
  await expect(alice).toContainText(/Crash/, { timeout: 25_000 });
  await expect(alice).toHaveAttribute("data-feedback", "collision");
});

test("feedback never covers the playing area", async ({ page }) => {
  await start(page);
  const alice = page.getByRole("group", { name: /Alice/ });
  await expect(alice).toContainText(/Crash/, { timeout: 25_000 });
  const canvas = page.getByRole("img", { name: "Game board" });
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  for (const [fx, fy] of [[0.1, 0.1], [0.5, 0.5], [0.9, 0.9], [0.1, 0.9], [0.9, 0.1]] as const) {
    const onCanvas = await page.evaluate(
      ([x, y]) => document.elementFromPoint(x!, y!)?.tagName === "CANVAS",
      [box!.x + box!.width * fx, box!.y + box!.height * fy],
    );
    expect(onCanvas).toBe(true);
  }
  const panel = await alice.boundingBox();
  expect(panel!.y + panel!.height).toBeLessThanOrEqual(box!.y + 1);
});

test("reduced motion is marked and no animations run, but text feedback stays", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await start(page);
  await expect(page.getByTestId("game")).toHaveAttribute("data-reduced-motion", "true");
  const alice = page.getByRole("group", { name: /Alice/ });
  await expect(alice).toContainText(/Crash/, { timeout: 25_000 });
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
});

test("without reduced motion the game is not marked reduced", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await start(page);
  await expect(page.getByTestId("game")).toHaveAttribute("data-reduced-motion", "false");
});

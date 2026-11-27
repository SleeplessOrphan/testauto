import { expect, test, type Page } from "@playwright/test";

/*
 * Contract assumed (see .pipeline/questions.md):
 * - Settings screen has a checkbox labelled "Sound effects", checked by default.
 * - The game element (data-testid="game") carries data-sound-log: a JSON array of the sound names
 *   requested so far ("correct" | "incorrect" | "collision" | "streak"), and data-last-sound: the latest
 *   name (absent or empty before any). Sounds requested while disabled are not logged.
 * - The setting lives in app state: it survives Settings -> Back -> Play within one page load.
 */
async function setSound(page: Page, on: boolean) {
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const box = page.getByRole("checkbox", { name: "Sound effects" });
  if (on) await box.check();
  else await box.uncheck();
  await page.getByRole("button", { name: "Back", exact: true }).click();
}

async function start(page: Page) {
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

const log = async (page: Page): Promise<string[]> =>
  JSON.parse((await page.getByTestId("game").getAttribute("data-sound-log")) ?? "[]") as string[];

test("Sound effects toggle is on by default and can be switched off and on", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const box = page.getByRole("checkbox", { name: "Sound effects" });
  await expect(box).toBeChecked();
  await box.uncheck();
  await expect(box).not.toBeChecked();
  await box.check();
  await expect(box).toBeChecked();
});

test("toggle can be operated by keyboard", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const box = page.getByRole("checkbox", { name: "Sound effects" });
  await box.focus();
  await page.keyboard.press("Space");
  await expect(box).not.toBeChecked();
});

test("the setting is remembered when leaving and re-entering Settings", async ({ page }) => {
  await page.goto("/");
  await setSound(page, false);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Sound effects" })).not.toBeChecked();
});

test("with sound on, a collision requests the collision sound and the text feedback still shows", async ({ page }) => {
  await page.goto("/?seed=1");
  await start(page);
  const alice = page.getByRole("group", { name: /Alice/ });
  await expect(alice).toContainText(/Crash/, { timeout: 25_000 });
  await expect.poll(() => log(page)).toContain("collision");
  await expect(page.getByTestId("game")).toHaveAttribute("data-last-sound", /\S/);
});

test("with sound off, no sounds are requested but visual feedback remains", async ({ page }) => {
  await page.goto("/?seed=1");
  await setSound(page, false);
  await start(page);
  const alice = page.getByRole("group", { name: /Alice/ });
  await expect(alice).toContainText(/Crash/, { timeout: 25_000 });
  await expect(alice).toHaveAttribute("data-feedback", "collision");
  expect(await log(page)).toEqual([]);
});

test("re-enabling sound in settings takes effect on the next game", async ({ page }) => {
  await page.goto("/?seed=1");
  await setSound(page, false);
  await setSound(page, true);
  await start(page);
  await expect.poll(() => log(page), { timeout: 25_000 }).toContain("collision");
});

import { expect, test, type Page } from "@playwright/test";

/* Contract assumed: see .pipeline/questions.md. Storage key names are not assumed. */

const menu = (page: Page, name: string) => page.getByRole("button", { name, exact: true }).click();
const g = (page: Page, n: 1 | 2) => page.getByRole("group", { name: new RegExp(`^Player ${n}`, "i") }).first();

async function openSetup(page: Page) {
  await menu(page, "Play");
  await expect(page.getByRole("heading", { name: "Game setup" })).toBeVisible();
}

async function configure(page: Page) {
  await openSetup(page);
  await g(page, 1).getByLabel("Name").fill("Alice");
  await g(page, 2).getByLabel("Name").fill("Bob");
  await g(page, 1).getByLabel("Addition").uncheck();
  await g(page, 1).getByLabel("Division").check();
  await g(page, 1).getByLabel("Percentages").check();
  await g(page, 1).getByLabel("Hard").check();
  await g(page, 2).getByLabel("Square roots").check();
  await g(page, 2).getByLabel("Easy").check();
  await page.getByRole("group", { name: "Gameplay difficulty" }).getByLabel("Hard").check();
  await page.getByRole("group", { name: "Game mode" }).getByLabel("Target Score").check();
  await page.getByRole("group", { name: "Target score" }).getByLabel("500").check();
}

async function startAndWait(page: Page) {
  await page.getByRole("button", { name: "Start Game", exact: true }).click();
  await expect(page.getByTestId("game")).toBeVisible({ timeout: 10_000 });
}

async function expectConfigured(page: Page) {
  await expect(g(page, 1).getByLabel("Name")).toHaveValue("Alice");
  await expect(g(page, 2).getByLabel("Name")).toHaveValue("Bob");
  await expect(g(page, 1).getByLabel("Addition")).not.toBeChecked();
  await expect(g(page, 1).getByLabel("Division")).toBeChecked();
  await expect(g(page, 1).getByLabel("Percentages")).toBeChecked();
  await expect(g(page, 1).getByLabel("Hard")).toBeChecked();
  await expect(g(page, 2).getByLabel("Square roots")).toBeChecked();
  await expect(g(page, 2).getByLabel("Easy")).toBeChecked();
  await expect(page.getByRole("group", { name: "Gameplay difficulty" }).getByLabel("Hard")).toBeChecked();
  await expect(page.getByRole("group", { name: "Game mode" }).getByLabel("Target Score")).toBeChecked();
  await expect(page.getByRole("group", { name: "Target score" }).getByLabel("500")).toBeChecked();
}

async function expectDefaults(page: Page) {
  await expect(g(page, 1).getByLabel("Name")).toHaveValue("");
  await expect(g(page, 2).getByLabel("Name")).toHaveValue("");
  await expect(g(page, 1).getByLabel("Addition")).toBeChecked();
  await expect(g(page, 1).getByLabel("Division")).not.toBeChecked();
  await expect(g(page, 1).getByLabel("Medium")).toBeChecked();
  await expect(g(page, 2).getByLabel("Medium")).toBeChecked();
  await expect(page.getByRole("group", { name: "Gameplay difficulty" }).getByLabel("Easy")).toBeChecked();
  await expect(page.getByRole("group", { name: "Game mode" }).getByLabel("Timed")).toBeChecked();
  await expect(page.getByRole("group", { name: "Duration" }).getByLabel("3 minutes")).toBeChecked();
}

test("fresh browser shows default setup", async ({ page }) => {
  await page.goto("/");
  await openSetup(page);
  await expectDefaults(page);
});

test("setup choices are restored after reload", async ({ page }) => {
  await page.goto("/");
  await configure(page);
  await startAndWait(page);
  await page.reload();
  await openSetup(page);
  await expectConfigured(page);
});

test("timed duration is restored after reload", async ({ page }) => {
  await page.goto("/");
  await openSetup(page);
  await page.getByRole("group", { name: "Duration" }).getByLabel("5 minutes").check();
  await startAndWait(page);
  await page.reload();
  await openSetup(page);
  await expect(page.getByRole("group", { name: "Duration" }).getByLabel("5 minutes")).toBeChecked();
});

test("setup that is abandoned without Start Game is not saved", async ({ page }) => {
  await page.goto("/");
  await openSetup(page);
  await g(page, 1).getByLabel("Name").fill("Zed");
  await page.reload();
  await openSetup(page);
  await expect(g(page, 1).getByLabel("Name")).toHaveValue("");
});

test("sound setting is saved immediately and restored after reload", async ({ page }) => {
  await page.goto("/");
  await menu(page, "Settings");
  await page.getByRole("checkbox", { name: "Sound effects" }).uncheck();
  await page.reload();
  await menu(page, "Settings");
  await expect(page.getByRole("checkbox", { name: "Sound effects" })).not.toBeChecked();
  await page.getByRole("checkbox", { name: "Sound effects" }).check();
  await page.reload();
  await menu(page, "Settings");
  await expect(page.getByRole("checkbox", { name: "Sound effects" })).toBeChecked();
});

test("saving the sound setting keeps saved setup, and vice versa", async ({ page }) => {
  await page.goto("/");
  await menu(page, "Settings");
  await page.getByRole("checkbox", { name: "Sound effects" }).uncheck();
  await menu(page, "Back");
  await configure(page);
  await startAndWait(page);
  await page.reload();
  await menu(page, "Settings");
  await expect(page.getByRole("checkbox", { name: "Sound effects" })).not.toBeChecked();
  await menu(page, "Back");
  await openSetup(page);
  await expectConfigured(page);
});

test("Reset Settings restores defaults in the UI and removes stored data", async ({ page }) => {
  await page.goto("/");
  await configure(page);
  await startAndWait(page);
  await page.reload();
  await menu(page, "Settings");
  await page.getByRole("checkbox", { name: "Sound effects" }).uncheck();
  await menu(page, "Reset Settings");
  await expect(page.getByRole("checkbox", { name: "Sound effects" })).toBeChecked();
  await menu(page, "Back");
  await openSetup(page);
  await expectDefaults(page);
  // Nothing of the preferences remains stored.
  const stored = await page.evaluate(() => JSON.stringify(Object.entries(localStorage)));
  expect(stored).not.toContain("Alice");
  await page.reload();
  await openSetup(page);
  await expectDefaults(page);
  await page.reload();
  await menu(page, "Settings");
  await expect(page.getByRole("checkbox", { name: "Sound effects" })).toBeChecked();
});

test("Reset Settings is keyboard operable and works when nothing is saved", async ({ page }) => {
  await page.goto("/");
  await menu(page, "Settings");
  const reset = page.getByRole("button", { name: "Reset Settings", exact: true });
  await reset.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("checkbox", { name: "Sound effects" })).toBeChecked();
});

test("corrupt stored data falls back to defaults without crashing", async ({ page }) => {
  await page.goto("/");
  await configure(page);
  await startAndWait(page);
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) localStorage.setItem(k, "{not json");
  });
  await page.reload();
  await openSetup(page);
  await expectDefaults(page);
  await startAndWait(page);
});

test("valid JSON with invalid values falls back to defaults", async ({ page }) => {
  await page.goto("/");
  await configure(page);
  await startAndWait(page);
  await page.evaluate(() => {
    const bad = { version: 1, players: "nope", gameplay: "ludicrous", mode: { kind: "bogus" }, soundEnabled: "maybe", sound: 7 };
    for (const k of Object.keys(localStorage)) localStorage.setItem(k, JSON.stringify(bad));
  });
  await page.reload();
  await openSetup(page);
  await expectDefaults(page);
  await menu(page, "Back");
  await menu(page, "Settings");
  await expect(page.getByRole("checkbox", { name: "Sound effects" })).toBeChecked();
});

test("unknown JSON shapes (array, null, number, string) do not crash", async ({ page }) => {
  await page.goto("/");
  await configure(page);
  await startAndWait(page);
  for (const raw of ["[]", "null", "42", '"x"']) {
    await page.evaluate((r) => {
      for (const k of Object.keys(localStorage)) localStorage.setItem(k, r);
    }, raw);
    await page.reload();
    await openSetup(page);
    await expectDefaults(page);
  }
});

test("app stays playable when localStorage throws", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get: () => {
        throw new DOMException("denied", "SecurityError");
      },
    });
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await menu(page, "Settings");
  await page.getByRole("checkbox", { name: "Sound effects" }).uncheck();
  await menu(page, "Reset Settings");
  await menu(page, "Back");
  await openSetup(page);
  await expectDefaults(page);
  await g(page, 1).getByLabel("Name").fill("Alice");
  await startAndWait(page);
  expect(errors).toEqual([]);
});

test("app stays playable when writing to localStorage fails (quota exceeded)", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("full", "QuotaExceededError");
    };
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await menu(page, "Settings");
  await page.getByRole("checkbox", { name: "Sound effects" }).uncheck();
  await menu(page, "Back");
  await openSetup(page);
  await g(page, 1).getByLabel("Name").fill("Alice");
  await startAndWait(page);
  expect(errors).toEqual([]);
});

test("preferences are not sent to any external origin", async ({ page, baseURL }) => {
  const external: string[] = [];
  page.on("request", (r) => {
    const u = r.url();
    if (baseURL && !u.startsWith(baseURL) && !u.startsWith("data:") && !u.startsWith("blob:")) external.push(u);
  });
  await page.goto("/");
  await configure(page);
  await startAndWait(page);
  await page.reload();
  expect(external).toEqual([]);
});

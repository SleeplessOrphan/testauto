import { expect, test, type Locator, type Page } from "@playwright/test";

const topics = [
  "Addition",
  "Subtraction",
  "Multiplication",
  "Division",
  "Square numbers",
  "Square roots",
  "Percentages",
  "Mixed operations",
];

function player(page: Page, n: 1 | 2): Locator {
  // The outer fieldset of each player; its legend starts with "Player N".
  return page.getByRole("group", { name: new RegExp(`^Player ${n}`, "i") }).first();
}

async function openSetup(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Game setup" })).toBeVisible();
}

const start = (page: Page) => page.getByRole("button", { name: "Start Game", exact: true });

test("each player has a name field, three difficulties and eight topics with correct defaults", async ({ page }) => {
  await openSetup(page);
  for (const n of [1, 2] as const) {
    const p = player(page, n);
    await expect(p.getByLabel("Name")).toHaveValue("");
    for (const d of ["Easy", "Medium", "Hard"]) {
      await expect(p.getByRole("radio", { name: d, exact: true })).toBeVisible();
    }
    await expect(p.getByRole("radio", { name: "Medium", exact: true })).toBeChecked();
    for (const t of topics) {
      const box = p.getByRole("checkbox", { name: t, exact: true });
      await expect(box).toBeVisible();
      if (t === "Addition") await expect(box).toBeChecked();
      else await expect(box).not.toBeChecked();
    }
    await expect(p.getByRole("checkbox")).toHaveCount(8);
    await expect(p.getByRole("radio")).toHaveCount(3);
  }
  await expect(start(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "Back", exact: true })).toBeVisible();
});

test("difficulty and topics are independent per player", async ({ page }) => {
  await openSetup(page);
  await player(page, 1).getByRole("radio", { name: "Hard", exact: true }).check();
  await player(page, 2).getByRole("radio", { name: "Easy", exact: true }).check();
  await expect(player(page, 1).getByRole("radio", { name: "Hard", exact: true })).toBeChecked();
  await expect(player(page, 1).getByRole("radio", { name: "Easy", exact: true })).not.toBeChecked();
  await expect(player(page, 2).getByRole("radio", { name: "Easy", exact: true })).toBeChecked();
  await expect(player(page, 2).getByRole("radio", { name: "Hard", exact: true })).not.toBeChecked();

  await player(page, 1).getByRole("checkbox", { name: "Division", exact: true }).check();
  await player(page, 1).getByRole("checkbox", { name: "Addition", exact: true }).uncheck();
  await expect(player(page, 2).getByRole("checkbox", { name: "Division", exact: true })).not.toBeChecked();
  await expect(player(page, 2).getByRole("checkbox", { name: "Addition", exact: true })).toBeChecked();
});

test("multiple topics can be selected", async ({ page }) => {
  await openSetup(page);
  const p = player(page, 2);
  for (const t of topics) await p.getByRole("checkbox", { name: t, exact: true }).check();
  for (const t of topics) await expect(p.getByRole("checkbox", { name: t, exact: true })).toBeChecked();
});

test("blank names fall back to default names on the game screen", async ({ page }) => {
  await openSetup(page);
  await start(page).click();
  await expect(page.getByRole("heading", { name: "Game setup" })).toHaveCount(0);
  await expect(page.getByText("Player 1").first()).toBeVisible();
  await expect(page.getByText("Player 2").first()).toBeVisible();
});

test("whitespace-only name counts as blank", async ({ page }) => {
  await openSetup(page);
  await player(page, 1).getByLabel("Name").fill("   ");
  await player(page, 2).getByLabel("Name").fill("Bob");
  await start(page).click();
  await expect(page.getByText("Player 1").first()).toBeVisible();
  await expect(page.getByText("Bob").first()).toBeVisible();
  await expect(page.getByText("Player 2")).toHaveCount(0);
});

test("entered names are shown on the game screen", async ({ page }) => {
  await openSetup(page);
  await player(page, 1).getByLabel("Name").fill("Alice");
  await player(page, 2).getByLabel("Name").fill("Bob");
  await start(page).click();
  await expect(page.getByText("Alice").first()).toBeVisible();
  await expect(page.getByText("Bob").first()).toBeVisible();
});

test("very long names do not break starting the game", async ({ page }) => {
  await openSetup(page);
  const long = "Z".repeat(200);
  await player(page, 1).getByLabel("Name").fill(long);
  await start(page).click();
  await expect(page.getByRole("heading", { name: "Game setup" })).toHaveCount(0);
  await expect(page.getByText("ZZZZZZZZZZ").first()).toBeVisible();
});

test("no topics for Player 1 shows an associated validation message and does not start", async ({ page }) => {
  await openSetup(page);
  await player(page, 1).getByRole("checkbox", { name: "Addition", exact: true }).uncheck();
  await start(page).click();
  const msg = page.getByText(/Player 1 must select at least one topic/i);
  await expect(msg).toBeVisible();
  await expect(page.getByText(/Player 2 must select at least one topic/i)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Game setup" })).toBeVisible();

  // Message is associated with the topic controls (fieldset or its checkboxes).
  const described = await player(page, 1).evaluate((fs) => {
    const targets = [fs, ...Array.from(fs.querySelectorAll('input[type="checkbox"]'))];
    return targets.some((el) => {
      const ids = (el.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean);
      return ids.some((id) => /must select at least one topic/i.test(document.getElementById(id)?.textContent ?? ""));
    });
  });
  expect(described).toBe(true);
});

test("validation message is announced and clears once a topic is chosen", async ({ page }) => {
  await openSetup(page);
  await player(page, 2).getByRole("checkbox", { name: "Addition", exact: true }).uncheck();
  await start(page).click();
  await expect(page.getByRole("alert").filter({ hasText: /Player 2 must select at least one topic/i })).toBeVisible();
  await player(page, 2).getByRole("checkbox", { name: "Percentages", exact: true }).check();
  await start(page).click();
  await expect(page.getByText(/must select at least one topic/i)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Game setup" })).toHaveCount(0);
});

test("both players without topics get a message each", async ({ page }) => {
  await openSetup(page);
  await player(page, 1).getByRole("checkbox", { name: "Addition", exact: true }).uncheck();
  await player(page, 2).getByRole("checkbox", { name: "Addition", exact: true }).uncheck();
  await start(page).click();
  await expect(page.getByText(/Player 1 must select at least one topic/i)).toBeVisible();
  await expect(page.getByText(/Player 2 must select at least one topic/i)).toBeVisible();
});

test("Back returns to the main menu and setup is usable again afterwards", async ({ page }) => {
  await openSetup(page);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Maths Snake" })).toBeVisible();
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(player(page, 1).getByLabel("Name")).toHaveValue("");
});

test("setup can be completed with the keyboard alone", async ({ page }) => {
  await openSetup(page);
  const name = player(page, 1).getByLabel("Name");
  await name.focus();
  await page.keyboard.type("Kay");
  await start(page).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Kay").first()).toBeVisible();
});

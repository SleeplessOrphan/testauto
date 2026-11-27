import { expect, test, type Page } from "@playwright/test";

const menuButtons = ["Play", "Instructions", "Settings"];

function control(page: Page, name: string) {
  return page.getByRole("button", { name, exact: true }).or(page.getByRole("link", { name, exact: true }));
}

async function expectMainMenu(page: Page) {
  await expect(page.getByRole("heading", { level: 1, name: "Maths Snake" })).toBeVisible();
  for (const name of menuButtons) {
    await expect(control(page, name)).toBeVisible();
  }
}

test("main menu shows title, three options and no starter text", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Maths Snake");
  await expectMainMenu(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByText("testauto")).toHaveCount(0);
  await expect(page.getByTestId("status")).toHaveCount(0);
});

test("Play opens game setup, Back returns to the menu", async ({ page }) => {
  await page.goto("/");
  await control(page, "Play").click();
  await expect(page.getByRole("heading", { name: "Game setup" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Maths Snake" })).toHaveCount(0);
  await control(page, "Back").click();
  await expectMainMenu(page);
  await expect(page.getByRole("heading", { name: "Game setup" })).toHaveCount(0);
});

test("Settings opens placeholder, Back returns to the menu", async ({ page }) => {
  await page.goto("/");
  await control(page, "Settings").click();
  await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
  await control(page, "Back").click();
  await expectMainMenu(page);
});

test("Instructions shows rules and keyboard controls, Back returns to the menu", async ({ page }) => {
  await page.goto("/");
  await control(page, "Instructions").click();
  await expect(page.getByRole("heading", { name: "Instructions", exact: true })).toBeVisible();

  // Rules: own answer, scoring, lives, game modes.
  await expect(page.getByText(/answer/i).first()).toBeVisible();
  await expect(page.getByText(/scor/i).first()).toBeVisible();
  await expect(page.getByText(/li(fe|ves)/i).first()).toBeVisible();
  await expect(page.getByText(/mode/i).first()).toBeVisible();

  // Keyboard controls.
  await expect(page.getByText(/player 1/i).first()).toBeVisible();
  await expect(page.getByText(/player 2/i).first()).toBeVisible();
  await expect(page.getByText(/W, A, S, D|WASD/i).first()).toBeVisible();
  await expect(page.getByText(/arrow keys/i).first()).toBeVisible();
  await expect(page.getByText(/escape/i).first()).toBeVisible();
  await expect(page.getByText(/pause/i).first()).toBeVisible();

  await control(page, "Back").click();
  await expectMainMenu(page);
});

test("menu is keyboard accessible", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(control(page, "Instructions")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Instructions", exact: true })).toBeVisible();
  await control(page, "Back").focus();
  await page.keyboard.press("Enter");
  await expectMainMenu(page);
});

test("repeated navigation works", async ({ page }) => {
  await page.goto("/");
  for (let i = 0; i < 3; i++) {
    await control(page, "Settings").click();
    await control(page, "Back").click();
    await control(page, "Play").click();
    await control(page, "Back").click();
  }
  await expectMainMenu(page);
});

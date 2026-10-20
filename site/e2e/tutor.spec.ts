// The dev-only Tutor panel (#114) under the design system's type rules, which the built-site
// gate (design.spec.ts) never sees. Runs on the dev server with the stand-in `claude`
// (playwright.config.ts, project "tutor").
import { expect, test, type Page } from "@playwright/test";
import { PANEL_CLASS, TUTOR_PATH } from "../src/tutor/contract.ts";
import { LESSON_0, THEMES, useTheme } from "./site.ts";
import { typeViolations } from "./type-rules.ts";

const panel = (page: Page) => page.locator(`.${PANEL_CLASS}`);

/** Opens the panel; a click before the dev page hydrates (or reloads) does nothing, so it retries. */
async function open(page: Page) {
  await expect(async () => {
    await page.getByRole("button", { name: "Ask" }).click();
    await expect(panel(page)).toHaveAttribute("data-open", "true", { timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
}

async function ask(page: Page, question: string) {
  await panel(page).getByRole("textbox", { name: "Ask the Tutor" }).fill(question);
  await panel(page).getByRole("button", { name: "Send" }).click();
}

for (const theme of THEMES) {
  test(`the Tutor panel keeps the type rules, ${theme} theme`, async ({ page }) => {
    // The first dev-server load can reoptimise deps and reload; the panel waits for that.
    test.setTimeout(120_000);
    await useTheme(page, theme);
    await page.goto(LESSON_0);
    await open(page);

    // A question with digits, and the stand-in's reply with its meta line (model, effort, seconds).
    await ask(page, "Why does carbon make 4 bonds and not 2?");
    await expect(panel(page).locator(".tutor-meta")).toBeVisible();

    // A failure line carrying a number.
    await page.route(`**${TUTOR_PATH}`, (route) =>
      route.request().method() === "POST"
        ? route.fulfill({ contentType: "application/x-ndjson", body: `${JSON.stringify({ type: "error", message: "The Tutor stopped after 120 s." })}\n` })
        : route.fallback(),
    { times: 1 });
    await ask(page, "And 3?");
    await expect(panel(page).locator(".tutor-turn.error")).toContainText("The Tutor stopped after");

    // On to Step 2 (Step 1 is a prediction: any choice continues): a divider and the next Step's intro.
    await panel(page).getByRole("button", { name: "Close the Tutor" }).click();
    // By keyboard: Astro's dev toolbar sits over the player's foot and takes clicks there.
    for (const name of ["about 20%", "Check", "Continue"]) {
      await page.getByRole("button", { name, exact: true }).focus();
      await page.keyboard.press("Enter");
    }
    await open(page);
    await expect(panel(page).locator(".tutor-divider")).toHaveText("Step 2");

    expect(await typeViolations(page, `.${PANEL_CLASS}`)).toEqual([]);
  });
}

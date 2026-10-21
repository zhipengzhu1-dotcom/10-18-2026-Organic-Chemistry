// The dev-only Tutor panel (#114) under the design system's type rules, which the built-site
// gate (design.spec.ts) never sees. Runs on the dev server with the stand-in `claude`
// (playwright.config.ts, project "tutor").
import { expect, test, type Page } from "@playwright/test";
import { PANEL_CLASS, TUTOR_PATH } from "../src/tutor/contract.ts";
import { LESSON_0 } from "./site.ts";
import { typeViolations } from "./type-rules.ts";

const panel = (page: Page) => page.locator(`.${PANEL_CLASS}`);

/** Opens the panel; a click before the dev page hydrates (or reloads) does nothing, so it retries. Ask toggles, so it clicks only while closed. */
async function open(page: Page) {
  const askButton = page.getByRole("button", { name: "Ask" });
  await expect(async () => {
    if ((await askButton.getAttribute("aria-expanded")) !== "true") await askButton.click();
    await expect(panel(page)).toHaveAttribute("data-open", "true", { timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
}

async function ask(page: Page, question: string) {
  await panel(page).getByRole("textbox", { name: "Ask the Tutor" }).fill(question);
  await panel(page).getByRole("button", { name: "Send" }).click();
}

test("the Tutor panel keeps the type rules", async ({ page }) => {
  // The first dev-server load can reoptimise deps and reload; the panel waits for that.
  test.setTimeout(120_000);
  await page.goto(LESSON_0);
  await open(page);

  const thread = panel(page).getByRole("list", { name: "Conversation" });
  const meta = thread.getByText(/ effort · /);
  const failure = thread.getByRole("listitem").filter({ hasText: "! Tutor problem" });

  // A question with digits, and the stand-in's reply with its meta line (model, effort, seconds).
  await ask(page, "Why does carbon make 4 bonds and not 2?");
  await expect(meta).toBeVisible();

  // A failure line carrying a number, in the route's own timeout wording (route.ts).
  const timedOut = "The Tutor took too long (over 120 s) and was stopped. Try again.";
  await page.route(
    `**${TUTOR_PATH}`,
    (route) =>
      route.request().method() === "POST"
        ? route.fulfill({ contentType: "application/x-ndjson", body: `${JSON.stringify({ type: "error", message: timedOut })}\n` })
        : route.fallback(),
    { times: 1 },
  );
  await ask(page, "And 3?");
  await expect(failure).toContainText(timedOut);

  // On to Step 2 (Step 1 is a prediction: any choice continues): a divider and the next Step's intro.
  await panel(page).getByRole("button", { name: "Close the Tutor" }).click();
  // By keyboard: Astro's dev toolbar sits over the player's foot and takes clicks there.
  for (const name of ["about 20%", "Check", "Continue"]) {
    await page.getByRole("button", { name, exact: true }).focus();
    await page.keyboard.press("Enter");
  }
  await open(page);
  await expect(thread.getByRole("listitem").filter({ hasText: /^Step 2$/ })).toBeVisible();
  // The whole thread is still there for the check.
  await expect(meta).toHaveCount(1);
  await expect(failure).toHaveCount(1);

  expect(await typeViolations(page, `.${PANEL_CLASS}`)).toEqual([]);
  await panel(page).screenshot({ path: test.info().outputPath("tutor-panel.png") });
});

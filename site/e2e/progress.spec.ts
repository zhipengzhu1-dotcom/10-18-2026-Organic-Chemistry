// Progress kept in the browser: resume, back and locks, the Lesson-end screen,
// Lesson row states, the Streak in the header, the Hub, and export/import.
import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { buildContent, contentRoot } from "@astratron/content";

/** Core Lessons in Unit 1 (the On-ramp doesn't count). */
const UNIT_1_CORE = buildContent(contentRoot).model!.subjects[0].courses[0].units[0].lessons.filter((l) => !l.onRamp).length;

const UNIT = "/organic/orgo-1/structure-bonding";
const LESSON = `${UNIT}/sample-carbons-four-bonds`;
const NEXT_LESSON = `${UNIT}/sample-numbers-and-order`;

const choose = (page: Page, name: string) =>
  page.getByRole("group", { name: "Choices" }).getByRole("button", { name, exact: true }).click();
const check = (page: Page) => page.getByRole("button", { name: "Check" }).click();
const next = (page: Page) => page.getByRole("button", { name: "Continue" }).click();
const at = (page: Page, n: number, of = 10) => expect(page.getByText(`Step ${n} of ${of}`)).toBeVisible();

/** Plays the sample Lesson from Step 1 to Step 3. */
async function playToStep3(page: Page) {
  await page.goto(LESSON);
  await at(page, 1);
  await choose(page, "2");
  await check(page);
  await next(page);
  await next(page);
  await at(page, 3);
}

/** From Step 3, answers everything right and reaches the Wrap. */
async function finishFromStep3(page: Page) {
  for (const [step, pick] of [[3, "4"], [6, "4"], [8, "2"], [9, "CH₅"]] as const) {
    while (!(await page.getByText(`Step ${step} of 10`).isVisible())) await next(page);
    await choose(page, pick);
    await check(page);
    await expect(page.getByRole("status")).toContainText("✓ Correct.");
  }
  await next(page);
  await at(page, 10);
}

test("leaving mid-Lesson and coming back resumes at the same Step", async ({ page }) => {
  await playToStep3(page);
  await choose(page, "3");
  await check(page);
  await expect(page.getByRole("status")).toContainText("✗ Not quite.");

  await page.goto(UNIT);
  await page.goto(LESSON);
  await at(page, 3);
  await expect(page.getByRole("status")).toContainText("✗ Not quite. Count again from the formula.");
});

test("back is allowed, answered Steps stay locked, and there's no skipping ahead", async ({ page }) => {
  await playToStep3(page);
  await page.getByRole("button", { name: "Previous Step" }).click();
  await at(page, 2);
  await page.getByRole("button", { name: "Previous Step" }).click();
  await at(page, 1);
  await expect(page.getByRole("status")).toContainText("→ Answer: Four.");
  for (const button of await page.getByRole("group", { name: "Choices" }).getByRole("button").all()) {
    await expect(button).toBeDisabled();
  }
  await next(page);
  await next(page);
  await at(page, 3);
  await expect(page.getByRole("button", { name: "Continue" })).toHaveCount(0);
});

test("finishing a Lesson shows the key idea, a Streak tick, Next Lesson and Back to Unit", async ({ page }) => {
  await playToStep3(page);
  await finishFromStep3(page);

  await expect(page.getByRole("heading", { name: "Key idea" })).toBeVisible();
  await expect(page.getByText("A neutral carbon makes four bonds, and a double bond counts as two of them.")).toBeVisible();
  await expect(page.getByText("✓ Streak: 1 day")).toBeVisible();
  await expect(page.getByText(/donat/i)).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Next Lesson" })).toHaveAttribute("href", NEXT_LESSON);

  await page.getByRole("link", { name: "Back to Unit" }).click();
  await expect(page).toHaveURL(UNIT);
  await expect(page.getByText(`1 of ${UNIT_1_CORE} Lessons`)).toBeVisible();
  const row = (title: string) => page.getByRole("listitem").filter({ hasText: title });
  await expect(row("Sample: Carbon's Four Bonds")).toContainText("Done");
  await expect(row("Sample: Numbers and Order")).toContainText("Not started");
  await expect(page.getByRole("img", { name: "Streak: 1 day" })).toContainText("1");

  await page.goto(NEXT_LESSON);
  await choose(page, "C≡C (three pairs)");
  await check(page);
  await page.goto(UNIT);
  await expect(row("Sample: Numbers and Order")).toContainText("In progress");
  await expect(page.getByText(`1 of ${UNIT_1_CORE} Lessons`)).toBeVisible();
});

test("a first-time visitor gets no Hub; a returning one gets the Continue card, Streak and map", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeHidden();
  await expect(page.getByRole("region", { name: "Organic Chemistry I", exact: true })).toBeVisible();

  await playToStep3(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  const card = page.getByRole("region", { name: "Continue" });
  await expect(card).toContainText("Sample: Carbon's Four Bonds");
  await expect(card).toContainText("Step 3 of 10");
  await expect(page.getByRole("img", { name: "Streak: 0 days" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Organic Chemistry I", exact: true })).toBeVisible();

  await card.getByRole("link", { name: "Resume" }).click();
  await at(page, 3);
});

test("progress exports to a file and imports in another browser", async ({ page, browser }) => {
  await playToStep3(page);
  await page.goto("/");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export progress" }).click();
  const file = await (await download).path();
  expect(JSON.parse(await readFile(file, "utf8"))).toMatchObject({ version: 1, last: "u1-sample" });

  const other = await browser.newPage();
  await other.goto("/");
  await expect(other.getByRole("heading", { name: "Welcome back" })).toBeHidden();
  await other.getByLabel("Import progress").setInputFiles(file);
  await expect(other.getByRole("heading", { name: "Welcome back" })).toBeVisible();
  await expect(other.getByRole("region", { name: "Continue" })).toContainText("Step 3 of 10");
  await other.close();
});

test("importing a file that isn't progress says so and changes nothing", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Import progress").setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
  await expect(page.getByRole("alert")).toHaveText("That file isn't an AstraTron progress file.");
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeHidden();
});

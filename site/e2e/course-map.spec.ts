import { expect, test } from "@playwright/test";
import { buildContent, contentRoot } from "@astratron/content";

const UNIT_1 = "/organic/orgo-1/structure-bonding";
const LESSON = `${UNIT_1}/sample-carbons-four-bonds`;

for (const path of ["/", "/organic"]) {
  test(`${path} shows the Course map: each Course a strip of Unit tiles, only Unit 1 enterable`, async ({ page }) => {
    await page.goto(path);
    const orgo1 = page.getByRole("region", { name: "Organic Chemistry I", exact: true });
    const orgo2 = page.getByRole("region", { name: "Organic Chemistry II", exact: true });
    await expect(orgo1.getByRole("listitem")).toHaveCount(10);
    await expect(orgo2.getByRole("listitem")).toHaveCount(8);

    await expect(orgo2.getByRole("listitem").first()).toContainText("11");
    await expect(orgo2.getByRole("listitem").first()).toContainText("Spectroscopy");
    await expect(orgo1.getByRole("listitem").nth(1)).toContainText("Acids & Bases");
    await expect(orgo1.getByRole("listitem").nth(1)).toContainText("Coming soon");
    // Coming-soon Units show their title but can't be entered.
    await expect(orgo1.getByRole("link")).toHaveCount(1);
    await expect(orgo2.getByRole("link")).toHaveCount(0);

    await orgo1.getByRole("link", { name: /Structure & Bonding/ }).click();
    await expect(page).toHaveURL(UNIT_1);
  });
}

test("Unit 1 is a Level select page whose Lesson rows open their Lessons", async ({ page }) => {
  await page.goto(UNIT_1);
  await expect(page).toHaveTitle("Structure & Bonding · AstraTron");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Structure & Bonding");
  const row = page.getByRole("listitem").filter({ hasText: "Sample: Carbon's Four Bonds" });
  await expect(row).toContainText("10 Steps");
  await expect(row).toContainText("Multiple choice");
  await expect(row.getByRole("img", { name: "Hook 1 Step, Build 6 Steps, Check 2 Steps, Wrap 1 Step" })).toBeAttached();
  await expect(page.getByRole("listitem").last()).toContainText("Practice Set");

  await row.getByRole("link", { name: "Sample: Carbon's Four Bonds" }).click();
  await expect(page).toHaveURL(LESSON);
  await expect(page.getByText("Step 1 of 10")).toBeVisible();
});

test("a Step link opens that Step, and the address follows the Step on screen", async ({ page }) => {
  await page.goto(`${LESSON}#s06`);
  await expect(page.getByText("Step 6 of 10")).toBeVisible();
  await page.getByRole("group", { name: "Choices" }).getByRole("button", { name: "4", exact: true }).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByRole("status")).toContainText("✓ Correct.");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Step 7 of 10")).toBeVisible();
  await expect(page).toHaveURL(`${LESSON}#s07`);
});

test("a Unit that is coming soon has no page", async ({ request }) => {
  const response = await request.get("/organic/orgo-1/acids-bases");
  expect(response.status()).toBe(404);
});

test("no built Lesson page carries an answer, a Hint, a Correct line or a reveal", async ({ request }) => {
  const { model } = buildContent(contentRoot);
  const lessons = model!.subjects.flatMap((s) => s.courses.flatMap((c) => c.units.flatMap((u) => u.lessons)));
  expect(lessons.length).toBeGreaterThan(0);
  const leaks: string[] = [];
  for (const lesson of lessons) {
    const html = decode(await (await request.get(lesson.url)).text());
    expect(html, `${lesson.url} should be its Lesson page`).toContain(lesson.title);
    for (const step of lesson.steps) {
      if (step.type === "explain") continue;
      const secrets = [step.correct, step.reveal, ...(step.hints ?? []).map((h) => h.text)].filter(Boolean) as string[];
      for (const secret of secrets) if (html.includes(plain(secret))) leaks.push(`${lesson.url}#${step.id}: "${secret}"`);
    }
    const keys = html.match(/"(answer|hints|reveal|correct)"/g);
    if (keys) leaks.push(`${lesson.url}: answer-key fields ${[...new Set(keys)].join(", ")}`);
  }
  expect(leaks).toEqual([]);
});

/** Undo HTML escaping (as in attribute-serialised island props) so a leak can't hide behind entities. */
function decode(html: string): string {
  return html
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** The secret's longest run of text between Markdown marks, which survives rendering unchanged. */
function plain(markdown: string): string {
  return markdown.split(/[*_`]+/).reduce((a, b) => (b.trim().length > a.length ? b.trim() : a), "");
}

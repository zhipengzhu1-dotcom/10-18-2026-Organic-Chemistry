// The site shell (#77): Donate, footer, privacy page, search and share basics, no analytics.
import { expect, test } from "@playwright/test";
import { buildContent, contentRoot, type Step } from "@astratron/content";
import { allPages, lessonPaths } from "./site.ts";
import { KOFI_URL, SITE_ADDRESS } from "../src/lib/site.ts";

const UNIT_1 = "/organic/orgo-1/structure-bonding";
const DONATE_LINE =
  "AstraTron is free, with no ads and no sign-up. If it helped you, you can chip in on Ko-fi. AstraTron isn't a registered charity, so donations aren't tax-deductible.";

const { model } = buildContent(contentRoot);
const units = model!.subjects.flatMap((s) => s.courses.flatMap((c) => c.units.filter((u) => u.status === "available")));
const lessons = units.flatMap((u) => u.lessons.map((lesson) => ({ lesson, unit: u })));

const squash = (s: string) => s.replace(/\s+/g, " ").trim();
/** The longest run of a Markdown text between marks, which survives rendering unchanged. */
const plain = (markdown: string) =>
  // List markers ("1. ", "- ") become list items, not text (Lesson 7's Explain lists).
  squash(markdown.replace(/^\s*(?:\d+\.|-)\s+/gm, " "))
    .split(/[*_`{}[\]()<>\\]+/)
    .reduce((a, b) => (b.trim().length > a.length ? b.trim() : a), "");

test("the top bar has Donate, linking to Ko-fi", async ({ page }) => {
  for (const path of ["/", "/organic", UNIT_1]) {
    await page.goto(path);
    const donate = page.getByRole("banner").getByRole("link", { name: "Donate" });
    await expect(donate).toHaveAttribute("href", KOFI_URL);
    const box = await donate.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(48);
  }
});

test("the footer carries the Donate line, the motto, licences, credits, privacy and Suggest a Problem", async ({ page }) => {
  await page.goto(UNIT_1);
  const footer = page.getByRole("contentinfo");
  await expect(footer).toContainText(DONATE_LINE);
  await expect(footer.getByRole("link", { name: "chip in on Ko-fi" })).toHaveAttribute("href", KOFI_URL);
  await expect(footer).toContainText("Move electrons. Move the world.");
  await expect(footer).toContainText("MIT");
  await expect(footer).toContainText("CC BY-NC-SA 4.0");
  await expect(footer).toContainText("its own licence");
  await expect(footer.getByRole("link", { name: "MIT OpenCourseWare 5.12" })).toBeVisible();
  await expect(footer.getByRole("link", { name: "LibreTexts" })).toBeVisible();
  await expect(footer.getByRole("link", { name: "Suggest a Problem" })).toBeVisible();
  await footer.getByRole("link", { name: "Privacy" }).click();
  await expect(page).toHaveURL("/privacy");
});

test("the about page says what AstraTron is, who it's for and where its numbers come from (spec §Pages)", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "About" }).click();
  await expect(page).toHaveURL("/about");
  await expect(page).toHaveTitle("About · AstraTron");
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { level: 1 })).toHaveText("About AstraTron");
  await expect(main).toContainText("no accounts");
  await expect(main).toContainText("Source note");
  await expect(main).toContainText("not a registered charity");
  await expect(main.getByRole("link", { name: "Start Unit 1" })).toHaveAttribute("href", UNIT_1);
});

test("the coming-soon page lists every Unit still to come, by Course, with a way back in", async ({ page }) => {
  const soon = model!.subjects[0].courses.map((c) => ({ course: c.title, units: c.units.filter((u) => u.status === "coming-soon") }));
  await page.goto("/organic");
  await page.getByRole("link", { name: /What's coming/ }).click();
  await expect(page).toHaveURL("/coming-soon");
  await expect(page).toHaveTitle("Coming soon · AstraTron");
  for (const { course, units: planned } of soon) {
    const section = page.getByRole("region", { name: course, exact: true });
    await expect(section.getByRole("listitem")).toHaveCount(planned.length);
    for (const unit of planned) await expect(section).toContainText(unit.title.replace(/[*_`]/g, ""));
  }
  await expect(page.getByRole("main").getByRole("link", { name: "Start Unit 1" })).toHaveAttribute("href", UNIT_1);
  await expect(page.getByRole("main").getByRole("link", { name: "Course map" })).toHaveAttribute("href", "/organic");
});

test("every page has the AstraTron icon as its favicon and touch icon", async ({ page, request }) => {
  for (const path of ["/", UNIT_1, lessons[0]!.lesson.url]) {
    await page.goto(path);
    for (const rel of ["icon", "apple-touch-icon"]) {
      const href = await page.locator(`link[rel="${rel}"]`).getAttribute("href");
      expect(href, `${path} ${rel}`).toBeTruthy();
      const response = await request.get(href!);
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toContain("image/png");
    }
  }
});

test("Lesson pages have no footer and no Donate", async ({ page }) => {
  await page.goto(lessons[0]!.lesson.url);
  await expect(page.getByRole("contentinfo")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Donate" })).toHaveCount(0);
});

test("the privacy page names Cloudflare, lists what the form stores and the retention limits", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page).toHaveTitle("Privacy · AstraTron");
  const main = page.getByRole("main");
  await expect(main).toContainText("Cloudflare");
  await expect(main).toContainText("Turnstile");
  for (const field of ["Problem text", "answer and reasoning", "molecule", "display name", "reply email", "consent"])
    await expect(main).toContainText(new RegExp(field, "i"));
  await expect(main).toContainText(/no IP address/i);
  await expect(main).toContainText(/90 days/);
  await expect(main).toContainText(/30 days/);
  await expect(main).toContainText(/no analytics/i);
});

test.describe("without scripts", () => {
  test.use({ javaScriptEnabled: false });

  test("each Lesson page carries its Steps' prompts, choices and Wrap as HTML, with no answers, Hints or reveals", async ({ page }) => {
    expect(lessons.length).toBeGreaterThan(0);
    for (const { lesson } of lessons) {
      await page.goto(lesson.url);
      const text = squash(await page.locator("#lesson-text").innerText());
      // Text a Step shows anyway (an Explain's worked example may repeat a later reveal) is no leak.
      const shownEverywhere = lesson.steps
        .flatMap(shownText)
        .map((t) => squash(t.replace(/<[^>]+>/g, " ").replace(/[*_`]/g, "")))
        .join(" ");
      for (const step of lesson.steps) {
        for (const shown of shownText(step)) expect(text, `${lesson.url}#${step.id}`).toContain(plain(shown));
        if (step.type === "explain") continue;
        const secrets = (
          step.type === "manipulate-goal"
            ? step.stages.flatMap((s) => [s.correct, s.blocked, s.idle])
            : [step.correct, step.reveal, ...(step.hints ?? []).map((h) => h.text)]
        ).filter(Boolean) as string[];
        for (const secret of secrets.map(plain).filter((s) => !shownEverywhere.includes(s)))
          expect(text, `${lesson.url}#${step.id} leaks`).not.toContain(secret);
      }
      expect(text).toContain(plain(lesson.keyIdea));
    }
  });
});

test("titles read <Lesson> · <Unit> · AstraTron, with the goal as description", async ({ page }) => {
  for (const { lesson, unit } of lessons) {
    await page.goto(lesson.url);
    await expect(page).toHaveTitle(`${lesson.title} · ${unit.title} · AstraTron`);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", lesson.goal);
  }
});

test("every page is noindex, with a canonical URL on the site address and a share image", async ({ page }) => {
  const paths = await allPages(page);
  expect(paths).toContain("/privacy");
  for (const path of paths) {
    await page.goto(path);
    await expect(page.locator('meta[name="robots"]'), path).toHaveAttribute("content", /noindex/);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(canonical, path).toBe(path === "/" ? `${SITE_ADDRESS}/` : `${SITE_ADDRESS}${path.replace(/\/$/, "")}`);
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", canonical!);
    const unit1 = path.startsWith(UNIT_1);
    const image = `${SITE_ADDRESS}/share/${unit1 ? "unit-1" : "site"}.webp`;
    await expect(page.locator('meta[property="og:image"]'), path).toHaveAttribute("content", image);
    await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute("content", image);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute("content", /.+/);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", await page.title());
  }
});

test("the sitemap lists every page on the site address, and robots.txt points to it", async ({ page, request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  const locs = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  const paths = (await allPages(page)).filter((p) => p !== "/submit");
  for (const path of paths) expect(locs).toContain(path === "/" ? `${SITE_ADDRESS}/` : `${SITE_ADDRESS}${path}`);
  for (const { lesson } of lessons) expect(locs).toContain(`${SITE_ADDRESS}${lesson.url}`);
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain(`Sitemap: ${SITE_ADDRESS}/sitemap.xml`);
});

test("no page loads analytics or anything from another site (Turnstile on the form aside)", async ({ page }) => {
  const outside: string[] = [];
  page.on("request", (r) => {
    const url = new URL(r.url());
    if (url.hostname !== "localhost" && !(url.hostname === "challenges.cloudflare.com" && page.url().includes("/submit"))) outside.push(r.url());
  });
  // Turnstile isn't needed to load pages; keep the test offline.
  await page.route("https://challenges.cloudflare.com/**", (route) => route.fulfill({ body: "" }));
  const paths = [...lessonPaths(await allPages(page)).slice(0, 2), "/", "/organic", UNIT_1, "/privacy", "/submit"];
  for (const path of paths) await page.goto(path);
  expect(outside).toEqual([]);
});

/** What a Student sees of a Step before answering: its text or prompt and its choices; Wrap Steps included. */
function shownText(step: Step): string[] {
  switch (step.type) {
    case "explain":
      return [step.text];
    case "multiple-choice":
      return [step.prompt, ...step.options.map((o) => o.text)];
    case "rank":
      return [step.prompt, ...step.items.map((i) => i.text)];
    case "rotate-and-identify":
      return [step.prompt, ...step.options.map((o) => o.text)];
    default:
      return [step.prompt];
  }
}


// The Submitted Problem / Mistake report form (#75) in a browser. Offline: the Turnstile widget
// script is replaced by a stub that adds Cloudflare's test token, and POST /api/submit (a Pages
// Function, not served by `astro preview`) is answered by the test. The endpoint itself is tested
// against local D1 in site/src/submissions/submit.test.ts.
import { expect, test, type Page } from "@playwright/test";

const UNIT_1 = "/organic/orgo-1/structure-bonding";
const LESSON = `${UNIT_1}/why-carbon`;

const TURNSTILE_STUB = `
  for (const box of document.querySelectorAll(".cf-turnstile")) {
    const input = document.createElement("input");
    input.type = "hidden"; input.name = "cf-turnstile-response"; input.value = "XXXX.DUMMY.TOKEN.XXXX";
    box.append(input);
  }`;

/** Stubs Turnstile and answers the endpoint with `reply`; returns the posted bodies. */
async function offline(page: Page, reply: (body: URLSearchParams) => object = () => ({ ok: true })) {
  const posted: URLSearchParams[] = [];
  await page.route("https://challenges.cloudflare.com/**", (route) =>
    route.fulfill({ contentType: "text/javascript", body: TURNSTILE_STUB }),
  );
  await page.route("**/api/submit", async (route) => {
    const body = new URLSearchParams(route.request().postData() ?? "");
    posted.push(body);
    const answer = reply(body);
    await route.fulfill({ status: "errors" in answer ? 400 : 200, json: answer });
  });
  return posted;
}

test("Suggest a Problem is on the Unit page and the footer, never in a Lesson", async ({ page }) => {
  await page.goto(UNIT_1);
  await expect(page.getByRole("main").getByRole("link", { name: "Suggest a Problem" })).toHaveAttribute(
    "href",
    "/submit?kind=problem&unit=u1",
  );
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Suggest a Problem" })).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Suggest a Problem" })).toBeVisible();

  await page.goto(LESSON);
  await expect(page.getByText("Step 1 of 9")).toBeVisible();
  await expect(page.getByRole("link", { name: "Suggest a Problem" })).toHaveCount(0);
});

test("Report a mistake on a Step and on a Problem opens the form pre-filled with its id", async ({ page }) => {
  await offline(page);
  await page.goto(`${LESSON}#s02`);
  await expect(page.getByRole("link", { name: "Report a mistake" })).toHaveAttribute(
    "href",
    "/submit?kind=mistake&unit=u1&target=u1-l00%23s02",
  );
  // A Check Step is a Problem: the report names the Problem.
  await page.goto(`${LESSON}#s07`);
  await expect(page.getByRole("link", { name: "Report a mistake" })).toHaveAttribute(
    "href",
    "/submit?kind=mistake&unit=u1&target=u1-onramp-why-share",
  );
  await page.getByRole("link", { name: "Report a mistake" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Report a mistake");
  await expect(page.getByRole("radio", { name: "Report a mistake" })).toBeChecked();
  await expect(page.getByLabel("Unit", { exact: true })).toHaveValue("u1");
  await expect(page.getByLabel("Which Step or Problem")).toHaveValue("u1-onramp-why-share");
});

test("the form is text-only, with every field, the licence consent and the personal-info note", async ({ page }) => {
  await offline(page);
  await page.goto("/submit?kind=problem&unit=u1");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Suggest a Problem");
  await expect(page.getByLabel("Which Step or Problem")).toBeHidden();
  await expect(page.getByLabel("Problem text")).toHaveAttribute("maxlength", "2000");
  for (const label of ["Your answer and reasoning", "Molecule (optional)", "Display name (optional)", "Reply email (optional)"])
    await expect(page.getByLabel(label)).toBeVisible();
  await expect(page.getByLabel(/CC BY-NC-SA 4\.0/)).not.toBeChecked();
  await expect(page.getByText("Don't include personal info")).toBeVisible();
  await expect(page.locator("input[type=file]")).toHaveCount(0);
});

test("field errors show beside their fields", async ({ page }) => {
  const posted = await offline(page);
  await page.goto("/submit?kind=problem&unit=u1");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByLabel("Problem text")).toHaveAccessibleDescription("Write the Problem.");
  await expect(page.getByLabel(/CC BY-NC-SA/)).toHaveAccessibleDescription(/Tick the box/);
  expect(posted).toHaveLength(0);

  // Errors the endpoint finds (here, Turnstile) show too.
  await page.unroute("**/api/submit");
  await offline(page, () => ({ ok: false, errors: { turnstile: "We couldn't check you're not a bot. Reload the page and try again." } }));
  await page.getByLabel("Problem text").fill("Which carbon in propene is sp3?");
  await page.getByLabel("Your answer and reasoning").fill("C3: four sigma bonds.");
  await page.getByLabel(/CC BY-NC-SA/).check();
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("alert")).toContainText("We couldn't check you're not a bot.");
});

test("a sent Problem with no email gets the credit confirmation", async ({ page }) => {
  const posted = await offline(page);
  await page.goto("/submit?kind=problem&unit=u1");
  await page.getByLabel("Problem text").fill("Which carbon in propene is sp3?");
  await page.getByLabel("Your answer and reasoning").fill("C3: four sigma bonds.");
  await page.getByLabel("Display name (optional)").fill("Ana");
  await page.getByLabel(/CC BY-NC-SA/).check();
  await page.getByRole("button", { name: "Send" }).click();

  const done = page.getByRole("status");
  await expect(done).toContainText("A chemist checks every submission first, and that can take weeks.");
  await expect(done).toContainText("You won't hear back, but accepted Problems show your credit");
  expect(Object.fromEntries(posted[0])).toMatchObject({
    kind: "problem",
    unit: "u1",
    problem_text: "Which carbon in propene is sp3?",
    display_name: "Ana",
    consent: "on",
    "cf-turnstile-response": "XXXX.DUMMY.TOKEN.XXXX",
  });
});

test("a sent Mistake report with an email promises one reply, then deletion", async ({ page }) => {
  await offline(page);
  await page.goto("/submit?kind=mistake&unit=u1&target=u1-l00%23s02");
  await page.getByLabel("What's wrong").fill("The reveal names the wrong carbon.");
  await page.getByLabel("Your answer and reasoning").fill("It should be C2.");
  await page.getByLabel("Reply email (optional)").fill("ana@example.org");
  await page.getByLabel(/CC BY-NC-SA/).check();
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByRole("status")).toContainText("We'll reply at most once, then delete your address.");
});

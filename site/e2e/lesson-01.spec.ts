// Lesson 1, Bonds, Polarity & Formal Charge (#79), played start to Wrap from
// the keyboard on a phone and on a laptop: every Step answered (some wrong
// first, to see a Hint), every Scene and aside opened.
import { expect, test, type Page } from "@playwright/test";

const LESSON = "/organic/orgo-1/structure-bonding/bonds-polarity-formal-charge";

/** Focus a control and press a key: the Student never touches the mouse. */
async function press(page: Page, target: ReturnType<Page["getByRole"]>, key = "Enter") {
  await target.focus();
  await page.keyboard.press(key);
}

for (const [device, viewport] of [
  ["phone", { width: 390, height: 844 }],
  ["laptop", { width: 1280, height: 800 }],
] as const) {
  test.describe(`on a ${device}`, () => {
    test.use({ viewport });

    test("a Student plays Lesson 1 to the Wrap with the keyboard only", async ({ page }) => {
      test.setTimeout(90_000);
      await page.goto(LESSON);
      const status = page.getByRole("status");
      const at = (n: number) => expect(page.getByText(`Step ${n} of 14`)).toBeVisible();
      const check = () => press(page, page.getByRole("button", { name: "Check" }));
      const next = () => press(page, page.getByRole("button", { name: "Continue" }));
      const choice = (name: string | RegExp) =>
        page.getByRole("group", { name: "Choices" }).getByRole("button", { name, exact: typeof name === "string" });
      const target = (name: string) =>
        page.getByRole("group", { name: "Tappable atoms and bonds" }).getByRole("button", { name, exact: true });
      const card = (name: string) => page.getByRole("list", { name: "Order" }).getByRole("button", { name, exact: true });
      const answer = page.getByRole("textbox", { name: "Answer" });

      // s01 Hook: the rod held away; any prediction reveals, and the stream bends.
      await at(1);
      await expect(page.getByRole("img", { name: /A charged rod is held away from them/ })).toBeVisible();
      await press(page, choice("only the hexane bends"));
      await check();
      await expect(status).toContainText("Only the water bends.");
      await expect(page.getByRole("img", { name: /The water stream curves toward the rod/ })).toBeVisible();
      await next();

      // s02: the strip reads every cited value.
      await at(2);
      await expect(page.getByRole("img", { name: /hydrogen 2\.20, boron 2\.04, carbon 2\.55/ })).toBeVisible();
      await next();

      // s03: values one tap away; tap the δ− atom of each outlined bond.
      await at(3);
      await press(page, page.getByRole("button", { name: "Show values" }));
      const dialog = page.getByRole("dialog", { name: "Show values" });
      await expect(dialog.getByRole("img", { name: /fluorine 3\.98/ })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await press(page, target("Hydrogen fluoride: the H of the outlined H–F bond."));
      await check();
      await expect(status).toContainText("Hydrogen is a weak puller.");
      for (const name of [
        "Hydrogen fluoride: the F of the outlined H–F bond.",
        "Water: the O of the outlined O–H bond.",
        "Chloromethane: the Cl of the outlined C–Cl bond.",
        "Methanol: the O of the outlined C–O bond.",
      ])
        await press(page, target(name));
      await check();
      await expect(status).toContainText("✓ Correct. F, O, Cl, O");
      await next();

      // s04: rank by keyboard; the bond-dipoles Scene follows.
      await at(4);
      await press(page, card("C–H"), "ArrowUp");
      await press(page, card("C–H"), "ArrowUp");
      await press(page, card("N–H"), "ArrowUp");
      await press(page, card("N–H"), "ArrowUp");
      await check();
      await expect(status).toContainText("✓ Correct. C–H is nearly even");
      await expect(page.getByRole("img", { name: /C–H, difference 0\.35, nearly nonpolar/ })).toBeVisible();
      await next();

      // s05: the usual patterns, drawn.
      await at(5);
      await expect(page.getByRole("img", { name: /^Example: acetonitrile/ })).toBeVisible();
      await next();

      // s06: dots and sticks.
      await at(6);
      await expect(page.getByRole("img", { name: /^Hydronium\. Oxygen: 6 valence electrons/ })).toBeVisible();
      await next();

      // s07: the ± key flips the sign; −1 gets the sign Hint, +1 is right.
      await at(7);
      await answer.fill("1");
      await press(page, page.getByRole("button", { name: "Change sign" }));
      await expect(answer).toHaveValue("−1");
      await check();
      await expect(status).toContainText("Check the sign");
      await press(page, page.getByRole("button", { name: "Change sign" }));
      await check();
      await expect(status).toContainText("✓ Correct. 5 − 0 − 4 = +1.");
      await expect(page.getByRole("img", { name: /^Nitrogen: 5 valence electrons, no lone pairs, 4 bonds/ })).toBeVisible();
      await next();

      // s08 (signature): glycine's hidden charges.
      await at(8);
      await press(page, target("Nitrogen: single bonds to C, H, H and H."));
      await press(page, target("Oxygen: single bond to C; 3 lone pairs."));
      await check();
      await expect(status).toContainText("✓ Correct. N has 4 bonds (+1)");
      await next();

      // s09: the structures that can't exist.
      await at(9);
      await press(page, choice(/^CH₅/));
      await check();
      await expect(status).toContainText("Work out carbon's formal charge");
      await press(page, choice(/^CH₅/));
      await press(page, choice(/^CH₂²⁻/));
      await check();
      await expect(status).toContainText("✓ Correct. Two rules");
      await next();

      // s10: boron's empty slot.
      await at(10);
      await expect(page.getByRole("img", { name: /^Boron trifluoride\./ })).toBeVisible();
      await next();

      // s11–s13: the Check Problems.
      await at(11);
      await press(page, card("C–H"), "ArrowUp");
      await press(page, card("C–Cl"), "ArrowUp");
      await press(page, card("C–Cl"), "ArrowUp");
      await check();
      await expect(status).toContainText("✓ Correct. Rank by the difference");
      await expect(page.getByRole("img", { name: /C–Cl, 0\.61, δ− on chlorine/ })).toBeVisible();
      await next();

      await at(12);
      await expect(page.getByRole("img", { name: /^An oxygen with one single bond and one double bond/ })).toBeVisible();
      await answer.fill("0");
      await check();
      await expect(status).toContainText("the double bond counts as 2");
      await answer.fill("+1");
      await check();
      await expect(status).toContainText("✓ Correct. 6 − 2 − 3 = +1.");
      await next();

      await at(13);
      await press(page, choice("Nitrogen with three single bonds and one double bond."));
      await check();
      await expect(status).toContainText("✓ Correct. Five bonds put 10 electrons");
      await next();

      // s14 Wrap: the Bonding patterns card, then the Lesson-end screen.
      await at(14);
      await press(page, page.getByRole("button", { name: "Bonding patterns card" }));
      const card14 = page.getByRole("dialog", { name: "Bonding patterns card" });
      await expect(card14.getByRole("columnheader")).toHaveText(["+1", "0", "−1"]);
      await expect(card14.getByRole("img", { name: "Nitrogen with four bonds, charge +1." })).toBeVisible();
      await press(page, card14.getByRole("button", { name: "Close" }));
      await expect(card14).toBeHidden();
      await expect(page.getByRole("link", { name: "Back to Unit" })).toBeVisible();
      await expect(page.getByText("Key idea")).toBeVisible();
    });
  });
}

test("Lesson 1's answers are not in the page's HTML", async ({ request }) => {
  const html = await (await request.get(LESSON)).text();
  for (const secret of ["F, O, Cl, O: each time", "Check the sign", "bond-dipoles", "Five bonds put 10 electrons"])
    expect(html).not.toContain(secret);
});

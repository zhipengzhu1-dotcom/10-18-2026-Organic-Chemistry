// Lesson 8, Molecular Orbitals: Why Electrons Flow (#86), the Unit 1 capstone, played start to Wrap
// from the keyboard on a phone and on a laptop: each graded Step answered wrong first (its Hint),
// then right; the orbital cards' A/B pair (toggle on a phone, side by side on a laptop), the mo-filler
// stepper, the frontier ladders and the HOMO → LUMO push. Energies come from our cited B3LYP data.
import { expect, test, type Locator, type Page } from "@playwright/test";

const LESSON = "/organic/orgo-1/structure-bonding/molecular-orbitals";

async function press(page: Page, target: Locator, key = "Enter") {
  await target.focus();
  await page.keyboard.press(key);
}

for (const [device, viewport] of [
  ["phone", { width: 390, height: 844 }],
  ["laptop", { width: 1280, height: 800 }],
] as const) {
  test.describe(`on a ${device}`, () => {
    test.use({ viewport });

    test("a Student plays Lesson 8 to the Wrap with the keyboard only", async ({ page }) => {
      test.setTimeout(150_000);
      await page.goto(LESSON);
      const status = page.getByRole("status");
      const at = (n: number) => expect(page.getByText(`Step ${n} of 15`)).toBeVisible();
      const check = () => press(page, page.getByRole("button", { name: "Check" }));
      const next = () => press(page, page.getByRole("button", { name: "Continue" }));
      const choice = (name: string) => page.getByRole("group", { name: "Choices" }).getByRole("button", { name, exact: true });
      const pick = async (name: string) => {
        await press(page, choice(name));
        await check();
      };
      const live = page.locator("figure.molecule [aria-live]");
      const push = async (from: string, to: string) => {
        await press(page, page.getByRole("button", { name: from, exact: true }));
        await press(page, page.getByRole("button", { name: `Push to ${to}`, exact: true }));
      };
      /** The A | B pair: a toggle on a phone, both cards side by side on a laptop. */
      const showPair = async (letter: "A" | "B") => {
        const toggle = page.getByRole("group", { name: "Orbital" });
        if (device === "phone") {
          await expect(page.getByRole("application")).toHaveCount(1);
          await press(page, toggle.getByRole("button", { name: letter }));
          await expect(page.getByRole("application", { name: new RegExp(`computed orbital ${letter}$`) })).toBeVisible();
        } else {
          await expect(toggle).toBeHidden();
          await expect(page.getByRole("application", { name: /computed orbital A$/ })).toBeVisible();
          await expect(page.getByRole("application", { name: /computed orbital B$/ })).toBeVisible();
        }
      };

      // s01 Hook: BF₃ beside NH₃; any prediction plays the snap.
      await at(1);
      await expect(page.getByRole("img", { name: /Boron trifluoride, flat, each fluorine with three lone pairs/ })).toBeVisible();
      await pick("Nothing: neither has a charge, so nothing pulls");
      await expect(status).toContainText("They snap together into one molecule, H₃N–BF₃");
      await expect(page.getByRole("img", { name: /becomes a nitrogen–boron bond/ })).toBeVisible();
      await next();

      // s02: σ and σ* from two 1s orbitals.
      await at(2);
      await expect(page.getByRole("img", { name: /Two hydrogen 1s orbitals\. Added with the same sign/ })).toBeVisible();
      await next();

      // s03: H₂'s computed σ and σ*, named only A and B; measuring is off.
      await at(3);
      await showPair("B");
      await expect(page.locator("[data-orbitals]").first()).toHaveAttribute("data-orbitals", /loading|drawn/);
      await press(page, page.getByRole("button", { name: "Describe" }).last());
      await expect(live.last()).toContainText("Midway between the nuclei the orbital is zero");
      await pick("A");
      await expect(status).toContainText("A is one lobe wrapping both nuclei");
      await pick("B");
      await expect(status).toContainText("✓ Correct. B changes sign halfway between the nuclei");
      await next();

      // s04 (signature): fill σ and σ* with the − / + stepper until the bond is gone.
      await at(4);
      const filler = page.getByRole("group", { name: "Electrons" });
      await press(page, filler.getByRole("button", { name: /Add one/ }));
      await expect(page.getByRole("img", { name: /^2 electrons\. Bonding 2, antibonding 0\. Bond order 1\. This is H₂\./ })).toBeVisible();
      await check();
      await expect(status).toContainText("That's H₂: a full pair in σ, bond order 1");
      await filler.getByRole("button", { name: /Add one/ }).focus();
      await page.keyboard.press("+");
      await page.keyboard.press("+");
      await expect(page.getByRole("img", { name: /^4 electrons\. Bonding 2, antibonding 2\. Bond order 0\. This is He₂\./ })).toBeVisible();
      await check();
      await expect(status).toContainText("✓ Correct. Four electrons: two in σ, two in σ*");
      await next();

      // s05: π and π*.
      await at(5);
      await expect(page.getByRole("img", { name: /Pi holds ethylene's last pair: it is the HOMO/ })).toBeVisible();
      await next();

      // s06: ethylene's computed HOMO, face-on.
      await at(6);
      await expect(page.getByRole("application", { name: /computed π \(HOMO\)/ })).toBeVisible();
      await pick("In one sausage along the C–C axis, between the nuclei");
      await expect(status).toContainText("Turn the molecule edge-on");
      await pick("In two lobes above and below the flat molecule, over the C=C");
      await expect(status).toContainText("✓ Correct. + above, − below");
      await next();

      // s07: whose HOMO is higher; the ladders on the reveal, read from the computed energies.
      await at(7);
      await pick("Ethane's (a σ bond)");
      await expect(status).toContainText("Every bond in ethane is σ");
      await pick("Ethylene's (its π)");
      await expect(status).toContainText("✓ Correct. Weaker overlap, less stabilised: ethylene's π electrons sit higher (−7.6 eV vs −9.4 eV, computed)");
      await expect(page.getByRole("img", { name: /^Two energy ladders, computed\. Ethane: HOMO −9\.4, LUMO 1\.1 electron-volts, gap 10\.5\./ })).toBeVisible();
      await next();

      // s08: the arrow is the flow.
      await at(8);
      await expect(page.getByRole("img", { name: /Caption: HOMO to LUMO equals the curved arrow/ })).toBeVisible();
      await next();

      // s09: NH₃'s HOMO over BF₃'s LUMO, in one frame.
      await at(9);
      await expect(page.getByRole("application", { name: /computed NH₃ lone pair \(HOMO\) and BF₃ empty p on boron \(LUMO\)/ })).toBeVisible();
      await pick("Edge-on, in BF₃'s plane, between two fluorines");
      await expect(status).toContainText("Turn BF₃ edge-on");
      await pick("N first, its lobe pointing at boron, from above or below BF₃'s flat plane");
      await expect(status).toContainText("✓ Correct. NH₃'s HOMO is its lone pair");
      await next();

      // s10: which flow; the ladders read both gaps.
      await at(10);
      await expect(page.getByRole("img", { name: /From ammonia's HOMO up to boron trifluoride's LUMO: 7\.7\./ })).toBeVisible();
      await pick("Neither: both molecules are neutral, so no electrons flow");
      await expect(status).toContainText("Neutral molecules react all the time");
      await pick("NH₃'s HOMO → BF₃'s LUMO (7.7 eV apart)");
      await expect(status).toContainText("✓ Correct. The smaller gap wins");
      await next();

      // s11: push N's lone pair (marked HOMO) into boron's empty p (marked LUMO).
      await at(11);
      await expect(page.locator(".arrows-structure .orbital-mark").first()).toHaveText("HOMO");
      await expect(page.locator(".arrows-structure .empty-p")).toHaveCount(2);
      await push("lone pair on N1", "B2");
      await expect(status).toContainText("✓ Correct. N's lone pair, NH₃'s HOMO, now fills boron's empty p orbital");
      await next();

      // s12–s14: the Check Problems.
      await at(12);
      const order = page.getByRole("list", { name: "Order" });
      await press(page, order.getByRole("button", { name: "H₂ (2 e⁻)", exact: true }), "ArrowUp");
      await check();
      await expect(status).toContainText("He₂: two in σ, two in σ*");
      await press(page, order.getByRole("button", { name: "He₂⁺ (3 e⁻)", exact: true }), "ArrowUp");
      await check();
      await expect(status).toContainText("✓ Correct. Bond orders 1, ½, 0");
      await expect(page.getByRole("img", { name: /^H₂: two bonding, none antibonding, bond order 1/ })).toBeVisible();
      await next();

      await at(13);
      await showPair("A");
      await pick("B: its sign never flips between the carbons, so it's ready to take electrons");
      await expect(status).toContainText("No sign flip between the carbons means bonding");
      await pick("A: its sign flips between the two carbons, an extra node, so it's antibonding and empty");
      await expect(status).toContainText("✓ Correct. A is π*");
      await next();

      await at(14);
      await push("lone pair on O2", "B4");
      await expect(status).toContainText("✓ Correct. The ether's HOMO is an oxygen lone pair");
      await next();

      // s15 Wrap and the Lesson-end screen: the capstone leads to the Unit's Practice Set.
      await at(15);
      await expect(page.getByText("Key idea")).toBeVisible();
      await expect(page.getByRole("link", { name: "Unit 1 Practice Set" })).toHaveAttribute("href", "/organic/orgo-1/structure-bonding/practice");
      await expect(page.getByRole("link", { name: "Back to Unit" })).toBeVisible();
    });
  });
}

test("Lesson 8's answers, and which orbital is A or B, are not in the page's HTML", async ({ request }) => {
  const html = await (await request.get(LESSON)).text();
  for (const secret of ["B changes sign halfway", "sigma-star", "Four electrons: two in σ", "The smaller gap wins", "ether-bf3-adduct"])
    expect(html).not.toContain(secret);
});

test("an A/B orbital mesh loads by its hash", async ({ request }) => {
  const res = await request.get(LESSON);
  const mesh = /\/orbitals\/m\/[0-9a-f]{16}\.glb/.exec(await res.text())![0];
  const glb = await request.get(mesh);
  expect(glb.status()).toBe(200);
  expect((await glb.body()).subarray(0, 4).toString()).toBe("glTF");
});

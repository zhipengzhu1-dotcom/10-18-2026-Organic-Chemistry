# Your hand check of v1

This is the last part of finishing v1: you play Unit 1 yourself, mostly on your phone, and answer some questions only you can answer. Everything else (the automatic checks, the screen-reader pass) is done; see `definition-of-done.md`.

Write down anything that looks wrong, reads badly or is wrong chemistry, with the Lesson and the Step number ("Lesson 3, Step 6 of 15"). Send the list to Claude, or add it as a comment on issue #88. You don't need to fix anything yourself.

## Opening the site on your phone

1. Ask Claude: **"Start the site for my phone review."** It builds the site and starts it on your computer (the command is `pnpm review`), then gives you an address like `http://192.168.1.20:4321`.
2. Your phone must be on the same Wi-Fi as the computer. Type that address into your phone's browser.
3. When you're done, tell Claude to stop the site.

Your progress is saved on the phone itself. If you want to start a Lesson over, the ✕ takes you out, and a Lesson you finished can be played again from the Unit page.

## The checklist

### A. Play every Lesson once, on your phone

Play each one from Step 1 to the end screen. Answer some Steps wrong on purpose, to see the Hints and the answers.

- [ ] Lesson 0: Why Carbon?
- [ ] Lesson 1: Bonds, Polarity & Formal Charge
- [ ] Lesson 2: Drawing Molecules
- [ ] Lesson 3: Molecules in 3D
- [ ] Lesson 4: Hybridization & Orbitals
- [ ] Lesson 5: Functional Groups
- [ ] Lesson 6: Resonance: Pushing Electrons
- [ ] Lesson 7: Resonance: Which Contributor Wins
- [ ] Lesson 8: Molecular Orbitals: Why Electrons Flow
- [ ] The Unit 1 Practice Set (the last row on the Unit page): play one set of 10, look at the summary, then press Retry missed.

On each one, look for: text cut off or too small, a button you can't reach without scrolling, a picture that doesn't match the words, anything that moves too much or plays sound (nothing should make sound).

### B. Play one Lesson with the keyboard only (on a computer)

Pick any Lesson (Lesson 1 is a good one). Don't touch the mouse or trackpad.

- **Tab** moves to the next thing you can press; **Shift+Tab** goes back.
- **Enter** or **Space** presses the highlighted button or picks a choice.
- On a Rank Step, Tab to a card and use the **up and down arrow keys** to move it.
- On a 3D molecule, Tab to it, then the **arrow keys** turn it, **[** and **]** move between atoms, **Enter** picks one.
- On a Draw-arrows Step, Tab to a lone pair or bond, press **Enter**, Tab to where it goes, press **Enter**.

- [ ] I finished one Lesson with the keyboard only. Which one: ________

You should always see where you are (a bright outline), and never get stuck.

### C. Play one Lesson with reduced motion (on your phone)

Either turn on your phone's setting (iPhone: Settings → Accessibility → Motion → Reduce Motion; Android: Settings → Accessibility → Remove animations), or use the site's own "Reduce motion" switch on the home page (scroll down to it).

- [ ] I finished one Lesson with reduced motion on. Which one: ________

Every animation should now open paused on a still picture with a Play button, and nothing should slide or bounce.

### D. Read every Source note for chemistry sense

Source notes are the "ⓘ Where these numbers come from" and "ⓘ Sources" lines under a Step. Tap one to open it. Read each for sense: is the number right, is the source right, is it measured or computed as it says?

These Steps show a Source note as soon as they open (some others add one with the answer, after you press Check; read those too):

- [ ] Lesson 0: Steps 2, 3, 4, 6, 7, 8
- [ ] Lesson 1: Steps 1, 2, 3, 5, 6, 8, 9, 12, 13
- [ ] Lesson 2: Steps 1 to 14
- [ ] Lesson 3: Steps 2, 3, 5, 6, 7, 8, 9, 10, 12, 13, 15
- [ ] Lesson 4: Steps 2, 4 to 15
- [ ] Lesson 5: Steps 1 to 13
- [ ] Lesson 6: Steps 2 to 7, 10 to 15
- [ ] Lesson 7: Steps 3, 5, 9, 12, 14, 15
- [ ] Lesson 8: Steps 2, 3, 4, 5, 6, 9, 12, 13
- [ ] The Practice Problems (the Practice Set draws 10 of them at random; ask Claude for the links that show all of them in order).

### E. Optional: two minutes with VoiceOver

The agent could not run a real screen reader on this computer, so it read the page the way screen readers do instead (the written result is `docs/qa/screen-reader-unit-1.md`). If you'd like to hear it once: on iPhone, Settings → Accessibility → VoiceOver → on. Swipe right to move, double-tap to press. Open Lesson 1 and play two Steps. Turn VoiceOver off the same way (or triple-click the side button if you set that shortcut).

- [ ] Optional: I listened to two Steps with VoiceOver.

## Questions for you

The agents built these the way they thought best, but each needs your call. Answer yes / no / change it, in any order.

**The whole Unit**

1. Every Lesson's Check Problems are marked "approved" so they play, though the specs left some as drafts. Are you happy for all of them to be live?
2. A Practice Problem counts as "missed" if it isn't right by the second try. Is that the rule you want?
3. When the Practice Set picks its 10 Problems, it first makes sure every Lesson is covered, then avoids Problems from your last set, then prefers Problems that aren't also Lesson Checks. Is that the right order?
4. After the Practice Set, "Next Unit" goes to the Course map while Unit 2 is coming soon. OK?
5. The Streak: you get 2 freezes (a missed day doesn't break the Streak while you have one), and you win one back after 7 Streak days. Lesson Check Problems count toward the 3 Problems a day. OK?
6. There is a hidden address option that plays chosen Problems in order (`…/practice?problems=…`). It exists for testing. Keep it on the public site, or remove it?
7. The reply text after someone sends a Problem or Mistake report (for example "A chemist checks every submission first, and that can take weeks."). Is the wording right?
8. The footer credit line was written by an agent. Is it what you want it to say?
9. On Manipulate Steps (where you move a slider), the Scene keeps repeating while you work. The plan says nothing in a Lesson should loop. Should it play once, with Replay to see it again?
10. The plan said "Explore in 3D" would use one 3D library (3Dmol.js); the agents used the same 3D viewer as the Step cards instead, so there is only one. Keep it that way (and the spec gets updated)?
11. In Draw-arrows Steps, the warning flags on an atom ("C has 10 e⁻") use a dashed pink style; the spec said orange. Which do you want?

**Lesson 0: Why Carbon?**

12. On a phone, Step 6's question text hides once feedback shows. OK?
13. The "5th H" message in the build-by-sharing Step can't be reached in normal play. Keep or remove it?
14. Step 6's answer describes the estradiol/testosterone differences in words instead of a picture. OK?
15. There's an extra Scene on Step 2 (the outer-electron counts), and the electron-affinity numbers were corrected from the published paper. OK?

**Lesson 1: Bonds, Polarity & Formal Charge**

16. The "stream bends" Scene is a drawn animation that waits on a still of the rod held away, instead of the Manim video the spec described. Several reveals the spec drew as pictures are words instead (bond labels, charge marks, card stamps). OK?
17. The "tap an element to enlarge" on the electronegativity strip wasn't built (Scenes take no taps). OK without it?

**Lesson 2: Drawing Molecules**

18. Three Scenes (H-fill, ethanol three ways, lone-pair fill) are drawn animations, not Manim videos. Your earlier note says watch-only Scenes should be silent Manim renders. Keep them, or convert them?
19. Some Source notes show H totals before you answer. If a Step asks for that H count, the note gives the answer away. Please look at this while reading Lesson 2's notes.

**Lesson 3: Molecules in 3D**

20. Two Scenes are flat drawings with a slider, not live 3D; the live 3D dipoles moved to the Step 11 card. OK?
21. Several reveals the spec described as the viewer moving are written as text (Steps 3, 4, 6, 7, 12, 13). OK?
22. Step 9's ethanol wedge-and-dash reveal wasn't built. Needed?
23. On a phone the Explore in 3D button is hidden on Steps that already show a 3D card. OK?
24. Ethanol's 3D shape: the only CCCBDB reference (Coussan 1998) is paywalled, so it's labelled "computed". If you know those values are measured, the label should change. Measured or computed?

**Lesson 4: Hybridization & Orbitals**

25. The model Scenes (hybrid sets, methane unmixed vs real, π twist, orbital sum) are flat drawings, not turnable 3D; the spec's 3D hybrid models weren't built; the hybrid-mixing video shows sp³ only; the ketene Check has no σ/π toggle. OK for v1?
26. Two automatic sanity checks on the computed orbitals were loosened (the NH₃ lobe centre, and how much of BF₃'s HOMO sits on boron). Please glance at those orbitals in Lessons 4 and 8.

**Lesson 5: Functional Groups**

27. The act name "Reading Molecules" is a placeholder. What should it be?
28. Tapping the empty middle of a ring hits nothing; you have to tap the ring's edge. OK?

**Lesson 6: Resonance: Pushing Electrons**

29. The acetate-hybrid Scene got a stage control the spec didn't have; the pair cards drop the ↔ (it would give the answer away); Step 5 was merged into one paragraph to fit a phone; the Wrap's Scene is hidden on phones. OK?

**Lesson 7: Resonance: Which Contributor Wins**

30. The Wrap's still is hidden on phones; the spec's two-orientation acetamide calculation was run once (it is the true minimum); the dimmed strip above Step 11 isn't drawn; the push replay's screen-reader text is generated, not the spec's sentence. OK?

**Lesson 8: Molecular Orbitals: Why Electrons Flow**

31. "Orbitals from overlap" is split into two videos (H₂, then ethylene); the NH₃ + BF₃ pair is placed 4.0 Å apart for clarity, labelled as not computed; several spec pictures are written into the reveal text; on a phone a Hint hides the question and the card hides once answered. OK?

**Practice Problems**

32. Met-enkephalin is drawn in the computer's layout (flipped), not the exam-style zigzag, and scrolls sideways on a phone. OK?
33. The AlCl₃ Problem doesn't draw the "Al: 6 e⁻" label; the δ− and iminium reveals were shortened; picture reveals are text. OK?
34. Chloroform's stored shape had unequal C–Cl bonds and was evened out. This changed the "largest difference from B3LYP" sentence in 13 Source notes from 0.039 to 0.02 Å. Please check one of those notes reads right.

## Things the agent already knows are rough

No need to report these; they're on the list for the fix pass.

- Pressing Continue doesn't tell a screen reader that a new Step has started.
- On a laptop window about 720 pixels tall, the 3D card in Lesson 3 Step 3 is squeezed very small, and its start view hides one H behind the carbon; a taller window or a phone is fine.
- On a laptop window about 720 pixels tall, after a wrong answer in Lesson 4 Step 8, the feedback box covers the twist slider, so the mouse can't reach it (the keyboard still can).
- In Explore in 3D for ketene (Lesson 4 Step 14), the description says "CH2" instead of "CH₂".
- Ethylene's LUMO shows as "−0.0 eV" in Lesson 8.

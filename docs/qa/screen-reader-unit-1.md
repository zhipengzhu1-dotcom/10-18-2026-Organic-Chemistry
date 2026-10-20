# Screen-reader pass: Unit 1

Ticket #88 (definition of done for v1). Date: 20 October 2026.

## How it was done

**Method: the browser's accessibility tree, through Playwright. Not a live screen reader.**

A live VoiceOver run was not possible here. VoiceOver can only be driven by a script when "Allow VoiceOver to be controlled with AppleScript" is switched on in VoiceOver Utility, and on this Mac it is off. VoiceOver also can't run headless: it would take over the owner's screen and speak out loud. Changing that system setting is the owner's call, so the agent didn't.

Instead, the agent played all nine Unit 1 Lessons from Step 1 to the Wrap in Chromium and recorded, on every Step:

- the page as a screen reader's reading order meets it (the ARIA tree: every heading, paragraph, picture description, button, slider and link, with the name a screen reader says), and
- what the live region announced after each Check (the feedback a screen reader hears).

That is the same information VoiceOver, NVDA and TalkBack read. A live screen reader can still differ in how it pauses, pronounces symbols and moves focus, so a short check with VoiceOver on the owner's phone is on the phone checklist (`docs/owner/phone-checklist.md`).

- Full transcript: [`screen-reader-unit-1.transcript.md`](screen-reader-unit-1.transcript.md) (127 Step screens, 135 announcements).
- Regenerate it: `pnpm sr:transcript` (needs the site built; it runs `site/e2e/screen-reader.spec.ts`).
- The same spec runs in CI without writing the file. It fails if any button, picture, slider, text box, link, 3D view or dialog has no name, or if any Check announces nothing.

## What passed

- Every picture, Scene and structure drawing has a spoken description; every 3D view is a named application ("Methane, ball and stick", "Ethylene, ball and stick, with the computed C=C π bond orbital").
- Every button, choice card, tap target, Rank card, slider and text box has a name. Tap targets say what they are ("Nitrogen: single bonds to C, H, H and H.").
- Every Check is announced: ✓ Correct with the Correct line, ✗ Not quite with the Hint, → Answer with the reveal.
- Each Lesson page has a title ("Why Carbon? · Structure & Bonding · AstraTron") and one main region; the ✕ is named "Leave the Lesson", the back button "Previous Step".
- Rank Steps tell the Student how to use the keyboard ("Drag a card, or focus it and press the up and down arrow keys to move it.").

## Found and fixed in this pass

1. **Lesson 0, Step 5 (build-by-sharing):** the drawing that holds the carbon and the tray of H atoms was exposed as a picture with no name, wrapping its own buttons. Screen readers treat a picture's insides as decoration, so some would skip every button in it. Fixed: the drawing is now no picture at all, and its buttons sit straight inside the named Scene group (`scenes/src/build-by-sharing/BuildBySharing.tsx`).

## Found, not fixed (for the fix pass)

1. **Moving to the next Step says nothing.** After Continue, focus stays on the bottom button and nothing is announced, so a screen-reader user doesn't hear the new Step until they move back up the page. Suggested fix: move focus to the new Step's text (or announce "Step 4 of 14" and its prompt) on each Step change. This is the most important item here.
2. **Lesson 0, Step 5:** the six tray buttons all read "Hydrogen atom in the tray", and loose letters ("Tray H", "H", "C", "Around C: 4") are read as text between them. Numbering them ("Hydrogen 1 of 6") and hiding the drawn letters would read more cleanly.
3. **Lesson 8, Step 5:** HOMO and LUMO are spelled out with bold first letters (**H**ighest **O**ccupied…). Some screen readers read each bold letter as its own word ("H, ighest"). Drop the bold inside the words, or add a hidden plain-text reading.
4. **Symbols read aloud:** the Source note opens with "ⓘ" (read as "circled i"), and reveals start with "→" (read as "right arrow"). Harmless, but noisy; the symbol could be hidden from screen readers since the words already say what it is.
5. **Check is shown as disabled** until an answer is picked. Screen readers say "dimmed" or "unavailable", which is correct, but a Student who doesn't know they must pick first may be confused. Worth a listen on the phone check.

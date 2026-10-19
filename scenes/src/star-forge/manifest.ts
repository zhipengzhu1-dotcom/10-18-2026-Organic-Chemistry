// star-forge: Lesson 0's watch-only intro (s01), a silent Manim CE render
// (scenes/manim/star_forge.py, the owner-approved prototype cut 2). A star's
// core; three helium nuclei fuse into one carbon nucleus with the equation
// written on; the carbon drifts out through a nebula into a living cell and
// becomes a C with four valence dots; it ends on the star-line card.
// The only numbers on screen are the nuclides' mass numbers, read from the
// cited data; the proton counts set how many nucleons are drawn of each kind.
import type { Cited } from "@astratron/content/data";
import type { WatchSceneManifest } from "../types.ts";

const HE_A = "nuclides/He-4.A";
const C_A = "nuclides/C-12.A";

const words = ["zero", "one", "two", "three", "four", "five", "six"];
/** How many helium nuclei make one carbon nucleus, as a word ("three"). */
const heliumPerCarbon = (cited: Record<string, Cited>) => {
  const n = Number(cited[C_A].value) / Number(cited[HE_A].value);
  return words[n] ?? String(n);
};

/** The star-line card, in its portrait line breaks (16:9 sets each block on one line). */
const card = {
  card: ["Every carbon atom", "in you was forged", "in a star."],
  cardSub: ["Organic chemistry is what", "that carbon learned to do next."],
};

export const starForge: WatchSceneManifest = {
  id: "star-forge",
  title: "Forged in a star",
  render: { engine: "manim", script: "star_forge.py", sceneClass: "StarForge" },
  describe: (cited) => {
    const n = heliumPerCarbon(cited);
    const cap = n[0].toUpperCase() + n.slice(1);
    return (
      `A star's core. ${cap} helium nuclei fuse into one carbon nucleus: ${n} helium-${cited[HE_A].display} make carbon-${cited[C_A].display}. ` +
      "The carbon drifts out through a nebula and into a living cell, then becomes a letter C with four electrons around it. " +
      `Text: ${card.card.join(" ")} ${card.cardSub.join(" ")}`
    );
  },
  reducedMotion: "Opens paused on the poster frame, the star-line card with the C and its four dots; Play starts the video.",
  data: ["nuclides/He-4.Z", HE_A, "nuclides/C-12.Z", C_A],
  text: card,
  duration: 13,
  poster: 13,
  aspects: ["16:9", "9:16"],
};

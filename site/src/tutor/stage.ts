// What is on the Step player's stage now, read from the page for the Tutor context.
// Today only whether the Step shows a Scene; the control and labelled atoms come with the
// Tutor's stage moves (#107).
import type { Stage } from "./context.ts";

export function readStage(player: ParentNode = document): Stage {
  return { scene: !!player.querySelector('.player input[aria-label="Scrub"]'), control: null, atoms: [] };
}

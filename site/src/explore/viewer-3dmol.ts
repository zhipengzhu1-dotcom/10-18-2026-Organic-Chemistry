// The only module that touches 3Dmol.js (#71). ExploreIn3D imports it dynamically when
// the Student presses "Explore in 3D", so 3Dmol never ships with the page.
// Every atom gets our cited colour and radius (scene.ts); nothing falls back to 3Dmol's defaults.
import { createViewer } from "3dmol";
import type { ExploreMolecule } from "@astratron/content";
import { molBlock, styles, type ExploreStyle } from "./scene.ts";

export interface ExploreViewer {
  setStyle(mode: ExploreStyle): void;
  /** Turns the molecule by `degrees` about the screen's x (up/down) or y (left/right) axis. */
  turn(axis: "x" | "y", degrees: number): void;
  /** Zooms by `factor` (above 1 moves closer). */
  zoom(factor: number): void;
  reset(): void;
  dispose(): void;
}

export function mountViewer(
  element: HTMLElement,
  molecule: ExploreMolecule,
  mode: ExploreStyle,
  animateMs: number,
): ExploreViewer {
  // backgroundAlpha 0: the dialog's own surface shows through, in both themes.
  const viewer = createViewer(element, { backgroundColor: "black", backgroundAlpha: 0, antialias: true });
  viewer.addModel(molBlock(molecule), "sdf", { keepH: true });

  const apply = (m: ExploreStyle) => {
    viewer.setStyle({}, {});
    for (const { elem, style } of styles(molecule, m)) viewer.setStyle({ elem }, style);
    viewer.render();
  };
  apply(mode);
  // CCCBDB puts a planar molecule in the yz plane with its main axis on z, which 3Dmol
  // shows edge-on. Start turned most of the way round, slightly tipped, so it reads as 3D.
  viewer.rotate(70, "y", 0);
  viewer.rotate(15, "x", 0);
  viewer.zoomTo();
  viewer.render();
  const start = viewer.getView();

  const resize = new ResizeObserver(() => {
    viewer.resize();
    viewer.render();
  });
  resize.observe(element);

  return {
    setStyle: apply,
    turn(axis, degrees) {
      viewer.rotate(degrees, axis, animateMs);
      if (!animateMs) viewer.render();
    },
    zoom(factor) {
      viewer.zoom(factor, animateMs);
      if (!animateMs) viewer.render();
    },
    reset() {
      viewer.setView(start);
      viewer.render();
    },
    dispose() {
      resize.disconnect();
      viewer.clear();
      element.replaceChildren();
    },
  };
}

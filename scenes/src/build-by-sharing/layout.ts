// build-by-sharing layout: where carbon, its four sides, the tray and the two CH₃ pieces sit
// at each aspect (a row at 16:9, a column at 9:16). Hit areas are big enough to stay 48 px
// across on a phone (the frame scales to about 0.19 there), and never overlap.
import type { Aspect } from "../types.ts";
import type { Pt } from "../dots/dots.tsx";
import type { SharingState, Side } from "./manifest.ts";

export interface PieceLayout {
  apart: Pt;
  joined: Pt;
  /** Directions (degrees, y down) of its three H atoms. */
  hydrogens: number[];
  /** Direction of its single dot: toward the other piece. */
  toward: number;
}

export interface SharingLayout {
  carbon: Pt;
  /** Atom-to-atom distance. */
  reach: number;
  letter: number;
  dot: number;
  /** Radius of every handle's and target's hit circle. */
  hit: number;
  tray: Pt[];
  trayLabel: Pt;
  count: Pt;
  pieces: { left: PieceLayout; right: PieceLayout };
  handleAt: (id: string, state: SharingState) => Pt | undefined;
  targetAt: (id: string, state: SharingState) => Pt | undefined;
}

const COMPASS: Record<Side, number> = { n: -90, e: 0, s: 90, w: 180 };

export function layoutSharing(aspect: Aspect): SharingLayout {
  const wide = aspect === "16:9";
  const reach = 300;
  const carbon = wide ? { x: 620, y: 520 } : { x: 540, y: 620 };
  const tray = wide
    ? [260, 540, 820].flatMap((y) => [1360, 1660].map((x) => ({ x, y })))
    : [1360, 1660].flatMap((y) => [240, 540, 840].map((x) => ({ x, y })));
  const pieces = wide
    ? {
        left: { apart: { x: 480, y: 520 }, joined: { x: 800, y: 520 }, hydrogens: [-90, 180, 90], toward: 0 },
        right: { apart: { x: 1440, y: 520 }, joined: { x: 1120, y: 520 }, hydrogens: [-90, 0, 90], toward: 180 },
      }
    : {
        left: { apart: { x: 540, y: 480 }, joined: { x: 540, y: 800 }, hydrogens: [180, -90, 0], toward: 90 },
        right: { apart: { x: 540, y: 1480 }, joined: { x: 540, y: 1120 }, hydrogens: [180, 90, 0], toward: -90 },
      };
  const off = (at: Pt, deg: number): Pt => ({
    x: at.x + Math.cos((deg * Math.PI) / 180) * reach,
    y: at.y + Math.sin((deg * Math.PI) / 180) * reach,
  });
  return {
    carbon,
    reach,
    letter: 120,
    dot: 14,
    hit: 140,
    tray,
    trayLabel: wide ? { x: 1510, y: 90 } : { x: 540, y: 1190 },
    count: wide ? { x: 620, y: 1010 } : { x: 540, y: 1050 },
    pieces,
    handleAt: (id, state) => {
      if (id.startsWith("tray-")) return tray[Number(id.slice(5)) - 1];
      if (id === "piece-left" || id === "piece-right") return pieces[id.slice(6) as "left" | "right"][state.joined === "yes" ? "joined" : "apart"];
      return undefined;
    },
    targetAt: (id) => {
      if (id === "carbon") return carbon;
      if (id.startsWith("dot-") || id.startsWith("h-")) {
        const key = id.slice(id.indexOf("-") + 1);
        if (key === "left" || key === "right") return off(pieces[key].apart, pieces[key].toward);
        return off(carbon, COMPASS[key as Side]);
      }
      if (id === "piece-left" || id === "piece-right") return pieces[id.slice(6) as "left" | "right"].apart;
      return undefined;
    },
  };
}

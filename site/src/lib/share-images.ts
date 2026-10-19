// The Blender-rendered share images (#69), for a page's og:image / twitter:image tags (#77).
// The files are rendered by `pnpm blender render` (pipelines/blender) and committed; CI checks
// they're current (`pnpm blender check`). Paths are site-relative: prefix the site address.

export interface ShareImage {
  path: string;
  width: number;
  height: number;
  type: "image/webp";
  alt: string;
}

export const SHARE_IMAGES = {
  site: {
    path: "/share/site.webp",
    width: 1200,
    height: 630,
    type: "image/webp",
    alt: "AstraTron: a 3D water molecule beside the words Come build.",
  },
  "unit-1": {
    path: "/share/unit-1.webp",
    width: 1200,
    height: 630,
    type: "image/webp",
    alt: "AstraTron Unit 1, Structure & Bonding: 3D models of methane, ethylene and acetylene.",
  },
} as const satisfies Record<string, ShareImage>;

/** The share image for a page: Unit 1's for Unit 1 pages (its Unit page, Lessons and Practice Set), else the site's. */
export function shareImageFor(unitId?: string): ShareImage {
  return unitId === "u1" ? SHARE_IMAGES["unit-1"] : SHARE_IMAGES.site;
}

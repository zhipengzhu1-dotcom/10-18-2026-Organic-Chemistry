import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { shareImageFor } from "./share-images.ts";

const publicDir = fileURLToPath(new URL("../../public", import.meta.url));

describe("shareImageFor (the share image a page's meta tags name, #77)", () => {
  it("gives Unit 1 pages the Unit 1 image", () => {
    expect(shareImageFor("u1")).toMatchObject({ path: "/share/unit-1.webp", width: 1200, height: 630, type: "image/webp" });
  });

  it("gives every other page the site image", () => {
    expect(shareImageFor()).toMatchObject({ path: "/share/site.webp", width: 1200, height: 630 });
    expect(shareImageFor("u2").path).toBe("/share/site.webp");
  });

  it("names files that are in the site's public folder, with alt text", () => {
    for (const unit of [undefined, "u1"]) {
      const image = shareImageFor(unit);
      expect(existsSync(publicDir + image.path)).toBe(true);
      expect(image.alt.length).toBeGreaterThan(10);
    }
  });
});

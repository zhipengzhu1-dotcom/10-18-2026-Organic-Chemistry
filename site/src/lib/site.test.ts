import { describe, expect, it } from "vitest";
import { absoluteUrl, pageMeta, sitemapXml } from "./site.ts";

const SITE = "https://example.org";

describe("absoluteUrl (canonical URLs and share images from the one site-address setting)", () => {
  it("puts a page path on the site address, without a trailing slash", () => {
    expect(absoluteUrl("/organic/orgo-1/structure-bonding/", SITE)).toBe("https://example.org/organic/orgo-1/structure-bonding");
    expect(absoluteUrl("/organic", "https://example.org/")).toBe("https://example.org/organic");
  });

  it("keeps the home page as the bare site address with its slash", () => {
    expect(absoluteUrl("/", SITE)).toBe("https://example.org/");
    expect(absoluteUrl("", SITE)).toBe("https://example.org/");
  });

  it("keeps a file path as it is", () => {
    expect(absoluteUrl("/share/unit-1.webp", SITE)).toBe("https://example.org/share/unit-1.webp");
  });
});

describe("pageMeta (a page's canonical URL and share image)", () => {
  it("gives a Unit 1 page the Unit 1 share image, absolute", () => {
    const meta = pageMeta({ path: "/organic/orgo-1/structure-bonding/", unitId: "u1" }, SITE);
    expect(meta.canonical).toBe("https://example.org/organic/orgo-1/structure-bonding");
    expect(meta.image.url).toBe("https://example.org/share/unit-1.webp");
    expect(meta.image).toMatchObject({ width: 1200, height: 630, type: "image/webp" });
  });

  it("gives every other page the site share image", () => {
    expect(pageMeta({ path: "/privacy" }, SITE).image.url).toBe("https://example.org/share/site.webp");
  });
});

describe("sitemapXml", () => {
  it("lists each page once, on the site address", () => {
    const xml = sitemapXml(["/", "/organic", "/organic", "/privacy/"], SITE);
    expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www.sitemaps.org\/schemas\/sitemap\/0.9">/);
    expect([...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1])).toEqual([
      "https://example.org/",
      "https://example.org/organic",
      "https://example.org/privacy",
    ]);
  });

  it("escapes characters XML reserves", () => {
    expect(sitemapXml(["/a&b"], SITE)).toContain("<loc>https://example.org/a&amp;b</loc>");
  });
});

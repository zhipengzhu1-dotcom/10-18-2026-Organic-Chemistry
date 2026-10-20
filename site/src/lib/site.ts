// The site shell's settings (#77). Going public means setting SITE_ADDRESS and PUBLIC here;
// the sitemap, canonical URLs, share-image tags and every page's `noindex` follow them.
import { shareImageFor, type ShareImage } from "./share-images.ts";

/** The one site-address setting. A placeholder until the owner registers a domain (pre-public checklist). */
export const SITE_ADDRESS = "https://astratron.pages.dev";

/** False until going public: while false every page carries `noindex` (story 101). */
export const PUBLIC: boolean = false;

/** The robots meta every page carries: `noindex` until the site is public, then none. */
export const robots = (isPublic = PUBLIC): string | undefined => (isPublic ? undefined : "noindex");

/** Where Donate goes. The owner publishes the Ko-fi page before going public. */
export const KOFI_URL = "https://ko-fi.com/astratron";

/** A site path on the site address. Pages lose a trailing slash; the home page is the bare address. */
export function absoluteUrl(path: string, site = SITE_ADDRESS): string {
  const clean = path.replace(/\/+$/, "");
  return `${site.replace(/\/+$/, "")}${clean || "/"}`;
}

export interface PageMeta {
  canonical: string;
  image: ShareImage & { url: string };
}

/** A page's canonical URL and share image (Unit 1's on Unit 1 pages, else the site's). */
export function pageMeta(page: { path: string; unitId?: string }, site = SITE_ADDRESS): PageMeta {
  const image = shareImageFor(page.unitId);
  return { canonical: absoluteUrl(page.path, site), image: { ...image, url: absoluteUrl(image.path, site) } };
}

const xmlEscape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The sitemap for these page paths, each once, on the site address. */
export function sitemapXml(paths: string[], site = SITE_ADDRESS): string {
  const urls = [...new Set(paths.map((p) => absoluteUrl(p, site)))];
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((u) => `  <url><loc>${xmlEscape(u)}</loc></url>`),
    "</urlset>",
    "",
  ].join("\n");
}

// The watch-only Scenes (#66): videos rendered offline by Manim CE and
// committed under site/public/scenes/<id>/. Browser-safe (no React, no Node),
// so the site, the content check and the render command all read this list.
// Adding one: see scenes/manim/README.md.
import type { Aspect, WatchSceneManifest } from "./types.ts";
import { starForge } from "./star-forge/manifest.ts";
import { lesson08Watch } from "./lesson-08-watch/manifests.ts";

export const watchSceneManifests: readonly WatchSceneManifest[] = [starForge, ...lesson08Watch];

export const watchScene = (id: string): WatchSceneManifest | undefined => watchSceneManifests.find((m) => m.id === id);

/** "16:9" → "16x9", the spelling file names use. */
export const aspectSlug = (aspect: Aspect) => aspect.replace(":", "x");

/** The shipped files of one aspect, relative to the site root (site/public). */
export function watchSceneFiles(id: string, aspect: Aspect) {
  const base = `scenes/${id}/${id}-${aspectSlug(aspect)}`;
  return { video: `${base}.mp4`, poster: `${base}.poster.jpg`, sources: `${base}.sources.json` };
}

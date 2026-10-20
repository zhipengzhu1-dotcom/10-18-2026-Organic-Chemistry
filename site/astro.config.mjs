import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { tutorRoute } from "./src/tutor/route.ts";

export default defineConfig({
  integrations: [react()],
  vite: {
    // The Tutor route (spec #104) runs on the dev server only (`apply: "serve"`).
    plugins: [tailwindcss(), tutorRoute()],
    // The content build is bundled into the build-time server code, which
    // moves it away from the content tree, so the tree's path is fixed here.
    define: {
      __CONTENT_ROOT__: JSON.stringify(fileURLToPath(new URL("../content/subjects", import.meta.url))),
    },
  },
});

import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://projectbirdsong.org",
  trailingSlash: "ignore",
  build: { format: "directory" },
  devToolbar: { enabled: false },
  vite: {
    build: {
      // The minifier folds animation-timeline into the animation shorthand,
      // which Chrome rejects, silently killing every scroll-driven effect.
      cssMinify: false,
    },
  },
});

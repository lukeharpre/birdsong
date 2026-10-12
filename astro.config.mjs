import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://presh.nz",
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

import posts from "../../content/posts.json";
import pages from "../../content/pages.json";
import newsletters from "../../content/newsletters.json";
import reports from "../../content/reports.json";
import media from "../../content/media.json";
import { variants, variantPath } from "./variants.mjs";

export type Post = (typeof posts)[number];
export { newsletters, reports };

// The old blog has one story posted twice; keep the newer copy.
export const stories = [...posts]
  .sort((a, b) => b.date.localeCompare(a.date))
  .filter((p, i, all) => all.findIndex((q) => q.title === p.title) === i);

// Covers that are logos or posters: show whole, never cropped.
const posterCovers = new Set(["2026-07-travel3.jpg", "2026-07-auckland-council.png", "2025-12-titi-image-for-facebook.png", "2025-12-feral-cat_clear-cut.png"]);
export const isPoster = (name: string | null) => !!name && posterCovers.has(name);
export const page = (slug: keyof typeof pages) => pages[slug];

const dims = media as Record<string, { width: number; height: number }>;

export function image(name: string) {
  const d = dims[name];
  if (!d) throw new Error(`unknown image ${name}`);
  const ws = variants(d.width);
  return {
    src: variantPath(name, ws[Math.min(1, ws.length - 1)]),
    srcset: ws.map((w) => `${variantPath(name, w)} ${w}w`).join(", "),
    width: d.width,
    height: d.height,
  };
}

export const date = (iso: string, opts: Intl.DateTimeFormatOptions = {}) =>
  new Date(iso).toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Pacific/Auckland",
    ...opts,
  });

export const readingTime = (html: string) =>
  Math.max(1, Math.round(html.replace(/<[^>]+>/g, " ").split(/\s+/).length / 220));

// Swap the snapshot's media: placeholders for responsive, lazy images.
export function renderHtml(html: string, sizes = "(min-width: 60rem) 44rem, 100vw") {
  return html.replace(/<img src="media:([^"]+)" alt="([^"]*)" ?\/?>/g, (_, name, alt) => {
    const i = image(name);
    return `<img src="${i.src}" srcset="${i.srcset}" sizes="${sizes}" width="${i.width}" height="${i.height}" alt="${alt}" loading="lazy" decoding="async">`;
  });
}

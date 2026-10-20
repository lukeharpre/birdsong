import posts from "../../content/posts.json";
import pages from "../../content/pages.json";
import newsletters from "../../content/newsletters.json";
import reports from "../../content/reports.json";
import media from "../../content/media.json";
import { variants, variantPath } from "./variants.mjs";

export type Post = (typeof posts)[number];

// PDFs are served from our own copy in public/files/, named like media.
export const pdfPath = (url: string) => {
  const m = url.match(/wp-content\/uploads\/(\d{4})\/(\d{2})\/([^?#]+)/);
  return m ? `/files/${m[1]}-${m[2]}-${m[3].toLowerCase()}` : url;
};
const local = <T extends { pdf: string }>(list: T[]) => list.map((x) => ({ ...x, pdf: pdfPath(x.pdf) }));
const localNewsletters = local(newsletters);
const localReports = local(reports);
export { localNewsletters as newsletters, localReports as reports };

// Every story sits under one of the three pillars, or Community.
export type Tag = "Understand" | "Restore" | "Protect" | "Community";
const tags: Record<string, Tag> = {
  "new-partnership-launches-first-collaborative-conservation-project": "Protect",
  "auckland-council-renews-support-for-mahurangi-west-pest": "Community",
  "thank-you-to-auckland-council": "Restore",
  "thank-you-huawai-bay-volunteers": "Restore",
  "kaka-making-a-comeback-in-mahurangi-west": "Understand",
  "planting-day-at-mahurangi-west": "Restore",
  "project-birdsong-a-wonderful-day-in-nature": "Community",
  "volunteer-days-a-success": "Restore",
  "titi-cooks-petrel-research": "Understand",
  "art-meets-conservation": "Community",
  "have-you-voted-for-bird-of-the-year-yet": "Understand",
  "volunteers-planting-for-biodiversity": "Restore",
  "a-month-of-weed-cafes": "Restore",
  "esplanade-planting-bee": "Restore",
  "mahurangi-west-community-event": "Community",
  "our-first-annual-report": "Community",
  "celebrating-matariki-with-kutai-mussel-regeneration": "Restore",
  "first-kereru-fledgling-in-19-years": "Understand",
  "grant-to-find-research-and-protect-our-native-bat": "Understand",
  "a-year-in-bird-counting": "Understand",
};
export const tagOf = (slug: string) => tags[slug];

// Stories mainly about trapping and predators stay in content/posts.json as
// part of the record, but aren't built or listed. Untagged means archived.
export const stories = [...posts]
  .sort((a, b) => b.date.localeCompare(a.date))
  .filter((p) => tags[p.slug]);


const pinnedSlugs = [
  "new-partnership-launches-first-collaborative-conservation-project",
  "auckland-council-renews-support-for-mahurangi-west-pest",
  "kaka-making-a-comeback-in-mahurangi-west",
];
export const pinned = pinnedSlugs.map((s) => stories.find((p) => p.slug === s)!);

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

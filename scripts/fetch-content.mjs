// Snapshot the current WordPress.com site into ./content.
//
//   npm run fetch
//
// Pulls every post and page from the public WordPress.com REST API, cleans the
// block-editor HTML down to plain semantic markup, downloads each image into
// content/media/, and writes JSON the Astro build reads. Run it again whenever
// the old site has new material; the build itself never touches the network.

import sanitizeHtml from "sanitize-html";
import sharp from "sharp";
import { mkdir, writeFile, access } from "node:fs/promises";
import { join } from "node:path";

const SITE = "mahurangiwestpest.wordpress.com";
const API = `https://public-api.wordpress.com/rest/v1.1/sites/${SITE}`;
const OUT = new URL("../content/", import.meta.url).pathname;
const MEDIA = join(OUT, "media");

await mkdir(MEDIA, { recursive: true });

const get = async (path) => {
  const res = await fetch(API + path);
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
};

const decode = (s = "") =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&hellip;/g, "…");

const text = (html = "") =>
  decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

// ---- media -----------------------------------------------------------------

const media = {};

// /wp-content/uploads/2026/07/rachel11.jpg -> 2026-07-rachel11.jpg
const mediaName = (src) => {
  const m = src.match(/wp-content\/uploads\/(\d{4})\/(\d{2})\/([^?#]+)/);
  return m ? `${m[1]}-${m[2]}-${m[3].toLowerCase()}` : null;
};

async function download(src) {
  const name = mediaName(src);
  if (!name || !/\.(jpe?g|png|webp|gif)$/i.test(name)) return null;
  const file = join(MEDIA, name);
  try {
    await access(file);
  } catch {
    const url = src.split("?")[0].replace(/^\/\//, "https://");
    const res = await fetch(`${url}?w=2000`);
    if (!res.ok) {
      console.warn(`  skip ${res.status} ${url}`);
      return null;
    }
    await writeFile(file, Buffer.from(await res.arrayBuffer()));
  }
  if (!media[name]) {
    const { width, height } = await sharp(file).metadata();
    media[name] = { width, height };
  }
  return name;
}

// ---- links -----------------------------------------------------------------

const routes = {
  "mahurangi-west-pest/contact": "/contact",
  contact: "/contact",
  donate: "/donate",
  "about-us": "/about",
  "our-team": "/about#team",
  "volunteer-with-us": "/get-involved",
  "our-coverage-area": "/our-work#hubs",
  "annual-reports": "/resources#reports",
  "pest-plant-buffer-project": "/our-work#buffer",
};

function rewriteLink(href, postSlugs) {
  if (!href.includes(SITE)) return href;
  const path = href.split(SITE)[1].replace(/^\/|\/$/g, "").split("?")[0];
  if (path.startsWith("wp-content/")) return href; // PDFs stay on the old host for now
  if (routes[path]) return routes[path];
  const slug = path.split("/").filter(Boolean).pop();
  if (postSlugs.has(slug)) return `/stories/${slug}`;
  return "/";
}

// ---- html cleaning ---------------------------------------------------------

async function clean(html, postSlugs) {
  // File blocks render a name link plus a separate "Download" button; keep one.
  html = html.replace(/<a[^>]*wp-block-file__button[^>]*>.*?<\/a>/gs, "");
  html = html.replace(/<div[^>]*wp-block-file[^>]*>/g, '<p class="file">').replace(
    /(<p class="file">[\s\S]*?<\/a>)\s*<\/div>/g,
    "$1</p>",
  );

  const images = [];
  const srcs = [...html.matchAll(/<img[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]);
  const local = {};
  for (const src of srcs) {
    const name = await download(src);
    if (name) local[src] = name;
  }

  const out = sanitizeHtml(html, {
    allowedTags: [
      "p", "h2", "h3", "h4", "ul", "ol", "li", "a", "strong", "em", "blockquote",
      "figure", "figcaption", "img", "br", "table", "thead", "tbody", "tr", "td", "th",
    ],
    allowedAttributes: { a: ["href"], img: ["src", "alt"] },
    allowedSchemesByTag: { img: ["media"] },
    allowedClasses: { p: ["file"], figure: ["wp-block-gallery"] },
    transformTags: {
      h1: "h2",
      b: "strong",
      i: "em",
      a: (tag, attribs) => ({
        tagName: "a",
        attribs: { href: rewriteLink(attribs.href ?? "#", postSlugs) },
      }),
      img: (tag, attribs) => {
        const name = local[attribs.src];
        if (!name) return { tagName: "span", attribs: {} };
        images.push(name);
        return { tagName: "img", attribs: { src: `media:${name}`, alt: attribs.alt ?? "" } };
      },
    },
    exclusiveFilter: (frame) =>
      ["p", "figure", "span", "li"].includes(frame.tag) &&
      !frame.text.trim() &&
      !frame.mediaChildren?.length &&
      frame.tag !== "figure",
  });

  return {
    html: out
      .replace(/<span><\/span>/g, "")
      .replace(/<p>(\s|&nbsp;)*<\/p>/g, "")
      .replace(/<figure>\s*<\/figure>/g, "")
      .trim(),
    images,
  };
}

// ---- posts -----------------------------------------------------------------

const fields = "ID,title,date,slug,content,excerpt,featured_image";
const { posts: rawPosts } = await get(`/posts/?number=100&fields=${fields}`);
const { posts: rawPages } = await get(`/posts/?type=page&number=100&fields=${fields},parent`);
const postSlugs = new Set(rawPosts.map((p) => p.slug));

console.log(`posts: ${rawPosts.length}`);
const posts = [];
for (const p of rawPosts) {
  const { html, images } = await clean(p.content, postSlugs);
  let cover = images[0] ?? null;
  if (p.featured_image) cover = (await download(p.featured_image)) ?? cover;
  posts.push({
    slug: p.slug,
    title: decode(p.title),
    date: p.date,
    excerpt: text(p.excerpt).replace(/\s*\[…\]$|\s*…$/, "…"),
    cover,
    html,
  });
}

console.log(`pages: ${rawPages.length}`);
const pages = {};
for (const p of rawPages) {
  const { html, images } = await clean(p.content, postSlugs);
  pages[p.slug] = { title: decode(p.title), html, images };
}

// ---- newsletters + reports (structured from their pages) -------------------

function issues(html) {
  // Each issue is an <h2>Month Year</h2>, a PDF link, then a list of headlines.
  const out = [];
  const blocks = html.split(/<h2[^>]*>/).slice(1);
  for (const b of blocks) {
    const title = text(b.split("</h2>")[0]);
    const pdf = b.match(/href="([^"]+\.pdf)"/)?.[1] ?? null;
    const topics = [...b.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)]
      .map((m) => text(m[1]).replace(/\s*–\s*To listen.*$/, ""))
      .filter(Boolean);
    if (pdf) out.push({ title, pdf, topics });
  }
  return out;
}

const rawBySlug = Object.fromEntries(rawPages.map((p) => [p.slug, p.content]));
const newsletters = issues(rawBySlug["mahurangi-west-pest-enews"] ?? "");
const reports = issues(rawBySlug["annual-reports"] ?? "").map(({ title, pdf }) => ({ title, pdf }));

// ---- write -----------------------------------------------------------------

const write = (name, data) => writeFile(join(OUT, name), JSON.stringify(data, null, 2) + "\n");
await write("posts.json", posts);
await write("pages.json", pages);
await write("newsletters.json", newsletters);
await write("reports.json", reports);
await write("media.json", Object.fromEntries(Object.entries(media).sort()));

console.log(
  `media: ${Object.keys(media).length}, newsletters: ${newsletters.length}, reports: ${reports.length}`,
);

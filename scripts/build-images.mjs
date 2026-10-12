// Turn every snapshotted image into resized WebP files under public/media.
// Already-built files are skipped, so re-runs are quick.

import sharp from "sharp";
import { mkdir, access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { variants, variantPath } from "../src/lib/variants.mjs";

const root = new URL("../", import.meta.url).pathname;
const manifest = JSON.parse(await readFile(join(root, "content/media.json"), "utf8"));
await mkdir(join(root, "public/media"), { recursive: true });

let made = 0;
for (const [name, { width }] of Object.entries(manifest)) {
  for (const w of variants(width)) {
    const out = join(root, "public", variantPath(name, w));
    try {
      await access(out);
    } catch {
      await sharp(join(root, "content/media", name))
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 74 })
        .toFile(out);
      made++;
    }
  }
}
console.log(`images: ${made} built, ${Object.keys(manifest).length} sources`);

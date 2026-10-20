# Project Birdsong

Proof-of-concept redesign of the Mahurangi West Pest website
(mahurangiwestpest.wordpress.com) as a static site for Project Birdsong,
served by GitHub Pages at [presh.nz](https://presh.nz).

## Deploying

Every push to `main` builds the site and publishes it to GitHub Pages
(`.github/workflows/deploy.yml`). In the repo settings, Pages → Source must be
set to **GitHub Actions**, and the custom domain is set under Pages → Custom
domain.

## How it fits together

| Path | What it is |
| --- | --- |
| `content/` | Snapshot of the WordPress site: posts, pages, newsletters, reports and original images |
| `scripts/fetch-content.mjs` | Re-pulls `content/` from the WordPress.com public API, and copies newsletter and report PDFs into `public/files/` (`npm run fetch`) |
| `scripts/build-images.mjs` | Makes 480/960/1600px WebP copies of every image into `public/media/` |
| `src/` | Astro pages, components and styles |
| `.github/workflows/deploy.yml` | Builds with Node 24 and deploys `dist/` to Pages |

## Local development

```sh
npm install
npm run images   # once, or after npm run fetch
npm run dev      # http://localhost:4321
```

`npm run build && npm run preview` serves the production build.

## Not done yet

- Contact uses email only; the newsletter button still points at the MailerLite preview link.
- Donations are bank transfer only, as on the current site.

# Knight Fitness Lawnton — Website

Static multi-page marketing site for Knight Fitness Lawnton. No build step required — it deploys as-is to any static host (configured here for **Vercel**).

## Run locally
Serve the folder with any static server (don't open via `file://` — the homepage loads JS modules and the clean-URL paths assume a server root):

```bash
npx serve .
# or
python3 -m http.server 8000
```

Then open http://localhost:3000 (or :8000).

## Deploy (Vercel)
- Drag this folder into https://vercel.com/new, or run `vercel` from here.
- `vercel.json` is already set up: clean URLs (`/programs/womens`), long-cache headers for static assets, and security headers (HSTS, X-Content-Type-Options, etc.).
- Add the custom domain in Project → Settings → Domains.

## Structure
```
index.html              Homepage (React via CDN + Babel, mounts components/AppContentV5.jsx)
about.html              About & coaches
contact.html            Contact + embedded enquiry form
programs/
  index.html            Programs overview
  bootcamp.html         Bootcamp program
  mens.html             Men's Club program
  womens.html           Women's Club program
  youth.html            Redirect → youngknights.com.au
  program.css           Shared styles for program pages
components/
  AppContentV5.jsx      Homepage React app (JSX, transpiled in-browser by Babel)
  lovable-home.css      Shared styles for homepage / about / contact
assets/lov/...          Images (compressed) + the coach video
favicon.svg, apple-touch-icon.png, og-image.jpg
robots.txt, sitemap.xml, 404.html, vercel.json
```

## Important implementation notes

### Homepage rendering (recommended upgrade)
`index.html` currently loads **React 18 (production) + Babel Standalone from a CDN** and transpiles `components/AppContentV5.jsx` **in the browser** at runtime. This works, but Babel-in-the-browser adds ~1s to first paint and a large script download.

**Recommended:** migrate the homepage to a real build (Vite or similar):
1. `npm create vite@latest` (React template).
2. Move `AppContentV5.jsx` in as a component; keep the other static HTML pages as-is (or port them too).
3. Build to static output and deploy that. This removes the CDN React + Babel `<script>` tags and pre-compiles the JSX.

The JSX has been left **uncompiled on purpose** so it stays readable and editable.

### Third-party embeds (need internet; not part of this repo)
- **Enquiry form** — GoHighLevel/LeadConnector iframe (`api.leadconnectorhq.com`) on `contact.html` and the program pages. Loader: `https://link.msgsndr.com/js/form_embed.js`.
- **Map** — Google Maps embed iframe on the homepage.

### Assets
All photography lives under `assets/lov/`. Large source images were downscaled (~1100–1400px) and re-encoded to JPEG (q≈0.82) to cut page weight. The coach video `assets/lov/videos/womens-club-hannah.mp4` (~9 MB) is the largest file — consider hosting it on a CDN / streaming provider (e.g. Mux, Cloudflare Stream, or even YouTube) and embedding instead of shipping the MP4.

### SEO
Each page has meta description, canonical, Open Graph + Twitter cards (`og-image.jpg`, 1200×630). The homepage includes `HealthClub` JSON-LD (address, hours, phone, 5.0/350 rating). `sitemap.xml` and `robots.txt` reference `https://www.knightfitness.com.au` — update if the production domain differs.

## Brand tokens
- Red `#E31E24` (dark `#B71C1C`) · Black `#1A1A1A` · Greys `#F5F5F5` / `#666`
- Display font: **Bebas Neue** · Body: **Lato** (both via Google Fonts)
- Women's Club page adds a berry accent theme (`#C2185B` / `#7A1F4B`).

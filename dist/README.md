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
5rm.html                Members' 5RM Board (/5rm) — see "5RM Board" below
5rm/
  board-core.js         Board logic (pure functions, unit-tested from ../tests)
  board.css             Board styles + self-hosted font faces
components/
  AppContentV5.jsx      Homepage React app (JSX, transpiled in-browser by Babel)
  FiveRMBoard.jsx       5RM Board React app (JSX, transpiled in-browser by Babel)
  lovable-home.css      Shared styles for homepage / about / contact
assets/lov/...          Images (compressed) + the coach video
assets/5rm/             Board logo + Inter / Plus Jakarta Sans woff2
assets/vendor/          Self-hosted React 18.3.1, ReactDOM, Babel standalone 7.29.0
favicon.svg, apple-touch-icon.png, og-image.jpg
robots.txt, sitemap.xml, 404.html, vercel.json
```

Outside `dist/`:

```
apps-script/knight-5rm-save-back.gs   Google Apps Script that writes board scores back into the 5RM sheet
tests/board-core.test.mjs             Unit tests for 5rm/board-core.js (`npm test`, Node 18+, no dependencies)
```

## 5RM Board (`/5rm`)

A member-facing strength board for the gym TV, built from the *Knight Fitness 5RM Board* design handoff. It shows squat, bench and deadlift 5RM numbers, progress since the last test, leaderboards, biggest movers, new PBs, milestone clubs and the full roster, and gives coaches a phone-friendly score-entry flow plus a data admin panel. It is `noindex` and not in the sitemap: it sits behind a gym passcode.

### How it is built
- `5rm.html` mounts `components/FiveRMBoard.jsx` with the same React 18 + Babel-in-browser pattern as the homepage, but with React, ReactDOM and Babel **self-hosted** from `assets/vendor/` and the fonts from `assets/5rm/fonts/`, so a kiosk TV never depends on a CDN at render time.
- All calculations (parsing the Google Sheet CSV, ranking, movers, PBs, milestone clubs, roster paging, member-card trends, duplicate detection, import/merge/roll-forward) live in `5rm/board-core.js` as pure functions. `npm test` runs 58 unit tests against it with Node's built-in runner.
- `5rm/board.css` carries the design tokens (colours, type scale, radii, shadows) as CSS custom properties; only per-item values (crew colour, bar widths) are set inline.
- The TV layout is a fixed 1920×1080 stage scaled to fit the viewport (`--tv-scale`); under 760px wide the phone layout renders instead.
- Data is stored in the browser's `localStorage` (`kf5rm.*` keys) and flushed on unload/visibility change; up to 10 pre-edit snapshots are kept for "Restore" in Coach mode. The gym passcode unlock is remembered for 30 days per device.

### Options (query string)
- `/5rm?coach=1` — **the coach link**. Opens straight into score entry, skipping the board. Give this to coaches for their phone or iPad and add it to the home screen for one-tap access. Coach mode shows the link with a Copy button.
- `/5rm?rotate=20` — seconds per view (6–40, default 14).
- `/5rm?demo=1` — preview every view with placeholder history (invented previous-round values and crews). Nothing is saved in demo mode.

### Screens by device
Under 1100px wide — every phone, and an iPad in either orientation — the board renders its touch layout: a single scrolling list, large tap targets and a full-size number pad. Tablets get two columns of member cards and a bigger keypad. At 1100px and up (laptops, the gym TV) the fixed 1920×1080 stage is scaled to fit instead.

### Coach setup (once per board)
1. Open `/5rm` on the TV browser in kiosk / full-screen mode and enter the gym passcode (default **4500**).
2. Tap **Coach mode** (bottom right). Set **This round tested** and **Next testing date** — they show in the header and the next date counts down inside three weeks.
3. Set a **Coach PIN** so only staff can open *Enter scores* and *Coach mode*, and change the **Gym passcode** if you like.
4. Assign each member's **Class** (crew timeslot). You can set them one at a time in the table, or far faster with **Paste from sheet**: one `Name, crew` per line, e.g. `Keith Gray, 5:40 AM`. A crew in any column is recognised (`4:50 AM`, `540am`, `6:30 PM crew`), and a line with only a name and a crew changes the class without touching their numbers. Crews drive the coloured left borders, the crew filter on the board, and the crew you pick when entering scores. The shipped roster has everyone on 4:50 AM until you change it.
5. **Live link to your Google Sheet** (optional): in the sheet, *File → Share → Publish to web → Comma-separated values* for each lift tab and paste the links, one per line. The board merges by name every 10 minutes. If a tab's header just says "5RM" rather than "Squat 5RM", prefix the link with the lift: `squat=https://…`, `bench=https://…`, `deadlift=https://…`.
6. **Save-back link** (optional, so scores entered on the board flow into the sheet): open the 5RM sheet → *Extensions → Apps Script*, paste `apps-script/knight-5rm-save-back.gs`, set `COACH_PIN` to the same PIN as step 3, check the `TABS` names match your tab names, then *Deploy → New deployment → Web app* (execute as you, access: anyone) and paste the `/exec` URL into Coach mode. Then press **Test connection**: it checks the link, the PIN and the tab names without writing anything, so a setup mistake surfaces now rather than midway through a testing session. Writes that fail (offline, wrong PIN) are queued on the device and retried automatically; the count of queued scores shows in Coach mode and on the board's footer.
7. **Start new test round** copies every current number into "previous" and archives the round so the trend lines grow; then use **Enter scores** during testing.

### Running a testing session
Tap **Enter scores** (bottom right of the board, or top right on a phone).

1. **Pick the crew in front of you.** The session defaults to whatever crew the board is filtered to. Choosing 5:40 AM makes the list a dozen people instead of the whole gym; you can change crew at any point during the session.
2. **Pick what you are entering** — a single lift to walk the list once, or **All three lifts** to enter squat, bench and deadlift while each member is in front of you. Switching afterwards starts a fresh pass.
3. **Work down the list.** Type the number and press *Save · next*. *Not today* skips someone. *Back* returns to the previous member. The undo pill after each save puts the numbers back **and** returns you to that member with what you typed still on screen, so a wrong entry is corrected rather than retyped.
4. **Show what is left** filters the list to whoever has not been entered or skipped, which is what you want near the end of a session.
5. **Unusual numbers are queried once.** Typing 1275 instead of 127.5, or a number far above or below someone's last, brings up a check with the likely number offered as a one-tap fix. It never blocks a save — a real but surprising lift goes in with *Save anyway*.
6. **The first score of a session offers to date the round**, and sets the next round twelve weeks out if that date is missing or already past.

The line under the progress bar always says where scores are going: into the gym sheet, or saved on this device only.

**Keyboard** (a laptop during testing): digits and `.` type, Backspace deletes, Enter saves and moves on, → skips, ← goes back, ↑ ↓ pick the lift when entering all three, Esc finishes.

### Adding members
**Add members** in Coach mode takes a pasted list, one name per line, so a new intake goes in at once rather than one at a time. Put a crew after a comma to set someone's class (`Jane Smith, 5:40 AM`); everyone else lands in the crew chosen below the box. Before anything is written it shows what will happen: how many are new, who is already on the roster and is being skipped, and who looks like an existing member spelled differently (`Keith Grey` against `Keith Gray`). Near-matches are held back unless you tick to add them anyway.

A single name works the same way — type one line and add it. During a testing session you can also add someone on the spot: search their name and the panel offers to add them to the roster and the current crew.

Use **Paste from sheet** instead when you are importing numbers rather than names.

### Data notes
- The shipped roster is the current numbers from the gym's spreadsheet at hand-over. Previous-round values are **not** seeded (the prototype's were placeholders), so *Movers*, *New PBs* and the ▲ gains fill in after the first roll-forward + test round or once a linked sheet supplies "Previous 5RM" columns.
- Two clubs are modelled (Men's and Women's). Club filters appear automatically once any member has `club: "womens"` (via a JSON backup import or the sheet).
- With no testing dates set the board's header line stays blank rather than showing a note meant for coaches. Set them in Coach mode, where **Today** and **+8 / +12 weeks** fill the fields in one tap.
- Kilograms throughout; values are shown with at most two decimals and trailing zeros stripped.

## Important implementation notes

### Homepage rendering (recommended upgrade)
`index.html` currently loads **React 18 (production) + Babel Standalone from a CDN** and transpiles `components/AppContentV5.jsx` **in the browser** at runtime (the same libraries are self-hosted in `assets/vendor/` for the 5RM Board, so the homepage could point there too). This works, but Babel-in-the-browser adds ~1s to first paint and a large script download.

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

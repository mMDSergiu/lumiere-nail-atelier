# Architecture: how everything works

## Big picture
```
Browser
 ├─ website/index.html + assets/js/main.js   (renders the page from CONTENT + TEXTS)
 │    ├─ <nail-designer> web component        (widget/src, imported from source and bundled)
 │    └─ admin.js                             (salon login + editor drawer, live preview)
 │         │  fetch ./api/*  (same origin, JSON, cookie session)
 ▼
Node server (server/index.js → server/api.js)     ← also mounted inside Vite dev (vite.config.ts)
 ├─ GET  /api/content     public, the saved content (404 → page uses built-in DEFAULT_CONTENT)
 ├─ GET  /api/me          is the editor signed in?
 ├─ POST /api/login       {user,password} → HttpOnly SameSite=Strict cookie "salon_session" (12 h, in memory)
 ├─ POST /api/logout
 ├─ PUT  /api/content     signed in: save (sanitizeContent → data/content.json, previous → content.backup.json)
 ├─ POST /api/upload      signed in: {data: "data:image/...;base64"} → data/uploads/<24hex>.jpg|png|webp
 └─ GET  /uploads/<file>  serves uploaded photos
```
Without a server (file:// or GitHub Pages) the page still works fully, using DEFAULT_CONTENT. Only the
editor is unavailable: the login says "needs the salon server".

## File structure
```
nail/
├─ CLAUDE.md                     index of the rules (loaded automatically)
├─ README.md                     owner-facing guide (how to open, login, Masters, hosting, embed API)
├─ start.bat                     Windows: npm install (first time) → npm run build → opens localhost:4321 → npm start
├─ package.json                  scripts: dev, build, start, set-password, build:widget, build:website, preview
├─ vite.config.ts                website build (root: website, base './', single classic script, API plugin)
├─ vite.widget.config.ts         widget library build → dist/widget (ES + IIFE)
├─ tsconfig.json                 strict TS for widget/src only
├─ .env (secret, gitignored)     ADMIN_USER, ADMIN_PASSWORD_HASH (scrypt), optional PORT, DATA_DIR, TRUST_PROXY, ALLOWED_ORIGIN
├─ .env.example                  format of .env
├─ .gitignore                    node_modules, dist, .env, data/
├─ .github/workflows/pages.yml   builds and deploys dist/website to GitHub Pages on every push to main
├─ .claude/rules/                these rules
├─ server/
│  ├─ api.js                     the whole API (createApi middleware, hashPassword, loadEnv)
│  ├─ index.js                   production HTTP server: API + static dist/website + security headers (CSP…)
│  └─ set-password.js            writes ADMIN_USER + scrypt hash into .env
├─ data/ (gitignored)            content.json, content.backup.json, uploads/ (created on first save/upload)
├─ website/
│  ├─ index.html                 all sections; every visible text has data-i18n / data-i18n-rich / data-i18n-attr
│  ├─ public/boot.js             runs before paint: sets <html data-theme> and lang from localStorage/device
│  └─ assets/
│     ├─ css/styles.css          site styles, :root tokens + :root[data-theme='dark'] overrides, responsive 1100/920/600
│     ├─ css/admin.css           editor styles (login modal, bottom bar, right drawer), own tokens --a-*
│     ├─ js/main.js              page logic (see "Website" below)
│     ├─ js/admin.js             salon editor (see "Editor" below)
│     ├─ js/content.js           DEFAULT_CONTENT, sanitizeContent(), loc(), safeUrl(), UPLOAD_RE, LOOK_NAMES
│     ├─ js/i18n.js              STRINGS {en, ro, ru}, LANGS, EDITABLE_KEYS, createT(lang, overrides), toLang()
│     ├─ js/designs.js           INSPIRATIONS: the 8 signature looks (DesignState JSON)
│     └─ img/favicon.svg
├─ widget/src/                   the <nail-designer> studio (TypeScript, no dependencies)
│  ├─ main.ts                    defines the custom element
│  ├─ NailDesigner.ts            UI, events, public API, lang/theme attributes
│  ├─ types.ts                   data model (DesignState, NailDesign, Base, layers)
│  ├─ store.ts                   state + undo/redo (JSON snapshots, key coalescing, endGroup)
│  ├─ geometry.ts                nail shapes, lengths, hand/finger geometry, hit-testing
│  ├─ presets.ts                 ~50 shapes (lines, circles, abstract, symbols, doodles) + ~21 stickers (gems, cute, nature)
│  ├─ render.ts                  all Canvas drawing: nails, finishes, hand, selection, thumbnails, export image
│  ├─ sanitize.ts                sanitizeDesign() for setDesign() input
│  ├─ i18n.ts                    studio texts RO/RU (English text is the key), makeTranslator, toLang
│  ├─ styles.ts                  Shadow DOM CSS, container queries, :host([theme="dark"])
│  ├─ icons.ts · colors.ts       SVG icons · palette (29 colors), skin tones, color helpers
└─ dist/ (generated)             website/ (static site, file:// safe) and widget/ (nail-designer.js / .iife.js)
```

## Widget: `<nail-designer>`
- Attributes: `salon-name`, `accent`, `lang` (en|ro|ru), `theme` (light|dark). Observed live.
- API: `getDesign()`, `setDesign(json)` (sanitized), `toDataURL()`, `previewImage(design?, w, h, bg)`,
  `nailImage(design?, index, w, h)`.
- Events: `nail-design-finish` {image, design}, `nail-design-download` {image}. Both bubble and are composed.
- Coordinates: designs are vectors in nail-width units (x −0.5..0.5, cuticle y=0, tip y=−L).
  Lengths: short 1.05, medium 1.4, long 1.8, xl 2.3.
- Tools:
  - Nails: shape, length, skin tone.
  - Polish: solid, gradient, radial, ombré, French; finish gloss, matte, glitter or chrome.
  - Brush: color, size, smoothness (lazy stabilizer + Chaikin), opacity.
  - Shapes and Stickers: move, scale and rotate with the corner handle, delete handle, flip, layer order.
  - Eraser: cuts strokes only, and removes shapes/stickers it rubs over.
- This nail / All nails, copy/paste a nail, use on all, clear.
- Undo/redo and keyboard shortcuts (scoped to the host element). Finish → modal → Download PNG
  (a 1200×1660 export with the hand and five close-ups).
- i18n: static labels carry `data-i18n` / `data-i18n-title` / `data-i18n-aria`; `applyLang()` relabels them and
  re-renders the panel. Dynamic text goes through `this.t()`.
- Dark theme: `:host([theme="dark"])` sets the `--nd-*` tokens; the host page may override `--nd-*` too.

## Website (`main.js`)
- `state` = {content, saved, lang, theme, designImage, t}. `render()` re-renders everything from state:
  texts, settings, theme attribute on the widget, marquee, services, gallery, portfolio photos, team, booking.
- Texts: `createT(lang, content.texts[lang])`. Salon overrides beat the built-in translations, which fall back
  to English. `setRich()` escapes the text, then `*word*` becomes `<em>` and a newline becomes `<br>`.
- Language menu (`#lang-btn`) and theme button (`#theme-btn`) save to localStorage (`site-lang`, `site-theme`)
  and fire a `site-language` event.
- Images from the widget are cached (`imageCache`). Gallery previews use the CSS var `--look-bg`, so they are
  re-rendered when the theme changes.
- Booking:
  - With `settings.bookingUrl` (https): the `#book-online` card shows. The "Book" buttons and hero CTA open the
    Masters link in a new tab, or in `#booking-modal` (an iframe) when `bookingMode === 'embed'`.
  - Team members can have their own `bookingUrl`.
  - Without a link: `#book-form` shows. It validates, then fires a `booking-request` CustomEvent that is
    **not connected to anything**.
- Design card: listens for `nail-design-finish`, then shows the design with a download link.
- Startup:
  1. Render with defaults.
  2. `fetch('./api/content')`; on success sanitize, then render again.
  3. `setupAdmin({getContent, getSavedContent, onSaved, getLang, setLang, preview})`.

## Editor (`admin.js`)
- Open it with "Salon login" in the footer or the URL hash `#admin`. On load `GET /api/me` restores the
  signed-in state (bottom bar).
- Bottom bar: status dot, "Edit website", Save (when there are changes), Log out.
- The right-hand drawer has six tabs:
  - **General**: brand, under-name, phone, currency, email, address, Instagram, hero photo.
  - **Texts**: every key in `EDITABLE_KEYS`, grouped by prefix, with search. Placeholder = original text.
    Empty = use the original.
  - **Prices**: services with name, description, price, minutes, price note, picture look, add-on; add, move, delete.
  - **Gallery**: a "show signature looks" toggle plus portfolio photos with captions; upload, move, delete.
  - **Team**: name, role, bio, photo, personal booking link.
  - **Booking**: Masters link, how it opens, help text, "Test the link".
- Localized fields edit the **current site language**; the EN/RO/RU switch in the drawer changes the site language.
- `draft` is a working copy. Changes call `changed()`, which runs a debounced `preview(draft)`; preview sanitizes
  before rendering. Save does `PUT /api/content` (unchanged text overrides are dropped). Discard restores `saved`.
- Delete needs a second click within 4 seconds. Photos are resized in the browser to at most 1800 px JPEG
  before upload. A 401 response opens the login again and keeps the draft.

## Content model (`content.js`, validated identically in browser and server)
```
{ version: 1,
  settings: { brand, brandSub, phone, email, address, instagram(https|http), currency, heroImage(uploads/…),
              bookingUrl(https only), bookingMode: 'newtab'|'embed' },
  texts: { en:{key:text}, ro:{…}, ru:{…} },        // overrides only
  showLooks: bool,
  services: [{ id, name{en,ro,ru}, desc{…}, minutes, addOn, price, priceNote{…}, look (one of LOOK_NAMES), nail 0-4 }],
  team: [{ id, name, role{…}, bio{…}, photo, bookingUrl }],
  photos: [{ id, src (uploads/…), caption{…} }] }
```

## Build
- `npm run build` runs `tsc --noEmit`, then the widget lib build, then the website build.
- The website build is one classic deferred script: the custom `openFromDisk` plugin wraps the chunk in an IIFE and
  rewrites `<script type=module>`, so `dist/website/index.html` works from file://.
- The Google Fonts `<link>` needs `vite-ignore`. `boot.js` lives in `public/` and is copied as is; the warning
  "can't be bundled without type=module" is expected.

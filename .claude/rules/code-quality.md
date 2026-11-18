# Code quality

- Stack:
  - Widget: **TypeScript (strict) + Canvas 2D + Web Components** (no runtime dependencies).
  - Website: plain HTML/CSS/JS (ES modules bundled by **Vite 8**).
  - Server: plain **Node.js** (node:http, node:crypto), no framework, no database.
- Folder layout: see `architecture.md` → File structure. Keep it that way.
- `dist/` is generated. Never edit it.

## Website
- Paths are always **relative** (`./assets/...`, `./api/...`, `uploads/...`), so the site works in a subfolder
  (GitHub Pages) and from file://.
- The website build must stay **one classic script** (see `vite.config.ts`) so `dist/website/index.html` works from file://.
- Keep the Google Fonts `<link>` marked `vite-ignore`, or the build drops it.
- **Every visible text** needs a key in all three languages in `website/assets/js/i18n.js` and goes in the HTML
  as `data-i18n`, `data-i18n-rich` (allows *em* and line breaks) or `data-i18n-attr="attr:key;attr2:key2"`.
  Keys under `ui.`, `admin.`, `shape.` and `length.` are not editable by the salon. All others appear in the editor's Texts tab.
- Editable content shape lives in `content.js`. When adding a field, update DEFAULT_CONTENT, `sanitizeContent()`
  (used by both browser and server), the renderer in main.js and the editor panel in admin.js.
- Colors: use the CSS variables (`--ivory`, `--white` (card), `--deep`, `--btn`, …). Dark values live under
  `:root[data-theme='dark']`. No hard-coded light colors.
- A global `img { max-width: 100% }` shrinks images inside zero-width containers: set `max-width: none` there.

## Widget
- All CSS lives in the Shadow DOM (`styles.ts`). Never touch the host page from the widget.
- Layout responds to the component's own width (container queries), not the viewport.
- New UI text: write it in English and wrap it with `this.t('…')`, or `data-i18n` for static markup.
  Add RO and RU in `widget/src/i18n.ts`.

## Safety
- Never insert user- or salon-provided text with innerHTML; use textContent or `h()` in admin.js. Rich text
  goes through `setRich()`, which escapes first.
- Links from content go through `safeUrl()`; booking links must be https.
- Config and secrets come from environment variables (`.env`), never hard-coded.

## Done means
- `npm run build` passes (it includes `tsc --noEmit`).
- Checked in a real browser: light and dark, EN/RO/RU, the editor if touched, no console errors.
- Readable over clever. Small functions, clear names, no dead code.

# Product

## Vision
An embeddable **nail design tool** that salons add to their own websites. Clients design the nails they want
on a hand sketch (draw, add shapes and stickers, pick polish, gradient, shape, length), then download the image
to show their nail technician. It is delivered together with a complete, professional **salon website** that the
owner can edit herself and that books appointments through her **Masters Salon** app.

## Users
- **Salon clients** (primary): browse, design nails and book, mostly on phones. They speak RO, RU or EN.
- **Salon owner / master**: edits the website (texts, prices, photos, team, booking link) via the salon login.
- **Nail technicians**: receive the downloaded design image and the bookings in the Masters app.

## Domain glossary
- **Service**: something the salon sells (manicure, pedicure, gel, BIAB, acrylic, Gel-X, nail art, removal…).
- **Master / technician / artist**: staff member who performs services ("Team" on the site).
- **Nail shape**: square, squoval, round, almond, coffin (ballerina), stiletto.
- **French tip**: base color with a contrasting tip and a curved "smile line".
- **Ombré / baby boomer**: soft vertical fade from cuticle color to tip color.
- **Finish**: glossy, matte, glitter, chrome.
- **Fill / refill**: maintenance appointment for gel or acrylic, usually every 2–3 weeks.
- **Masters Salon**: the salon's appointment app (Jam Soft LLC). It has an online booking page with a share link
  and **no public API**.

## Features (built)
### Design studio (`<nail-designer>`)
- Hand sketch with 5 nails; tap a finger to edit it; edits apply to **this nail** or **all nails**
- Copy / paste a nail design, use on all, clear; duplicate, flip and reorder elements
- Brush: color, size, smoothness (stabilizer for nice curves), opacity; eraser
- Preset shapes by category: Lines, Circles, Abstract, Symbols, Doodles; move, resize and rotate them
- Stickers: gems and metal, cute, nature
- Nail length (4) and shape (6), skin tone (6)
- Polish: solid, linear gradient, radial, ombré, French; finishes gloss, matte, glitter, chrome
- Undo / redo, keyboard shortcuts; Finish → preview → Download PNG
- Languages EN/RO/RU (`lang` attribute) and light/dark (`theme` attribute)

### Website
- Sections: announcement, nav, hero (rendered nail "press-on set" or an uploaded photo), marquee,
  services/prices, studio, signature looks (open in studio), "From our studio" photos (lightbox), team, about,
  booking, footer
- Language menu EN/RO/RU and light/dark toggle (remembered; the theme follows the device by default)
- Booking: a Masters online booking card (new tab or in-site window) when a link is set, otherwise a request
  form (not connected yet)
- Design card in booking: shows the finished studio design with a download link

### Salon login + editor
- Login with username and password (hashed in .env); bottom editing bar; right-hand drawer with live preview
- Tabs: General, Texts (all texts in each language), Prices, Gallery (photo uploads), Team, Booking (Masters link)
- Save publishes for everyone (data/content.json); Discard reverts

## Decisions log
| Date | Decision | Reason |
|------|----------|--------|
| 2026-11-17 | Framework-free Web Component `<nail-designer>` (TypeScript + Canvas 2D + Shadow DOM, Vite build) | Must embed in any salon website without style/JS conflicts |
| 2026-11-17 | Designs stored as vectors in "nail-width units" | Same design copies to any nail and renders at any resolution |
| 2026-11-17 | Shapes & stickers always render above brush strokes; the eraser only cuts strokes and removes shapes/stickers it rubs over | No invisible "ghost" elements or holes in moved stickers |
| 2026-11-17 | `setDesign()` input is sanitized (`widget/src/sanitize.ts`) | Saved/shared designs are untrusted |
| 2026-11-17 | Project split into `widget/` and `website/`; website built to `dist/website` as a file://-safe static site | Owner can double-click to view, or upload anywhere |
| 2026-11-17 | Brand style: ivory/sand/espresso, deep rose accent #9f4e5e, champagne gold, Cormorant Garamond + Jost | Elegant, professional look for a nail salon |
| 2026-11-17 | Rules live in `.claude/rules/` | Keep project and Claude rules in one place |
| 2026-11-18 | Masters Salon integration via its online booking page link; no scraping or unofficial API | Real free times, days off and hours stay correct; bookings go straight into the Masters app |
| 2026-11-18 | Small Node server, no framework or database: data/content.json, data/uploads, scrypt login in .env, in-memory sessions | Owner can edit the site; minimal moving parts |
| 2026-11-18 | EN/RO/RU for site, studio and editor; light/dark theme | Clients speak Romanian and Russian |
| 2026-11-18 | Server port 4321 | Port 3000 is used by another app on the owner's PC |
| 2026-11-18 | Public GitHub repo + GitHub Pages for a free static live version | Free shareable link; the editor needs a Node host later |

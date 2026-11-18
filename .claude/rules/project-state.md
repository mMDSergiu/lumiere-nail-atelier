# Project state: read this first

The current status, what has been built, where we left off and what is next.
Update this file at the end of every work session.

## What this project is
A **nail salon website** ("Lumière Nail Atelier", placeholder brand) with:
1. **Nail Design Studio**: an embeddable web component `<nail-designer>`. Clients design nails on a hand sketch
   and download a PNG to show their technician. This was the original product idea: a tool that any nail salon
   can add to its own website.
2. **The salon website** around it: hero, services/prices, studio, gallery, team, about, booking, footer.
3. **Salon login + editor**: the owner ("the master") edits texts in EN/RO/RU, prices, photos and team members.
   She can also add a hero photo and a booking link.
4. **Online booking through Masters Salon**: the salon's appointment app, used via its online booking page link.
5. **Three languages** (English, Română, Русский) and a **light/dark theme**.

The owner is a person building this for nail salons; their clients use the **Masters Salon** app.
Market: Romanian and Russian speakers, so likely Moldova or Romania. Currency is still the placeholder €.

## Timeline (what was done)
- **2026-11-17, session 1**: rules folder created. Studio widget built with all agreed tools, then QA-reviewed and
  fixed. The salon website was built with a professional design, made openable from file://, and the folders restructured.
- **2026-11-18, session 2**:
  - Researched Masters: no public API; it offers an online booking page and share links. Chose the
    booking-link integration.
  - Added EN/RO/RU (site + studio + editor) and the dark theme.
  - Added a Node server with salon login, an editor, photo uploads, and team and portfolio sections.
  - Ran a QA agent and fixed what it found: a server crash on a bad URL, the login rate-limit race, keeping the
    draft after re-login, member links opening in the same tab, sanitizing the preview, and dark-mode contrast.
  - Rewrote the rules, created the GitHub repo and set up free hosting on GitHub Pages (see `deployment.md`).

## Where we left off
- Everything works locally: `start.bat` → http://localhost:4321 (production server) or `npm run dev`.
- **GitHub repo**: https://github.com/mMDSergiu/lumiere-nail-atelier (public, branch `main`).
- **Live free version (GitHub Pages)**: https://mmdsergiu.github.io/lumiere-nail-atelier/
  - It is **static only**: studio, languages, theme and booking button all work.
  - The salon login shows "needs the salon server", because Pages cannot run Node.
- The user said they will test the local version next and report back.

## Open items / next steps (ask the user before doing them)
1. **Masters booking link**: the user must paste the real link from the Masters Salon app.
   Path: Salon login → Edit website → Booking. Nothing was tested against a real Masters page.
   The in-site window mode depends on Masters allowing iframes; this is unknown.
2. **Full hosting with the editor online**: needs a Node host. The free tiers have no persistent disk; Render's
   free disk is wiped on deploy and restart. Options:
   - a cheap host with a persistent disk (Render paid disk, Railway volume, Fly.io volume, a VPS);
   - change storage to GitHub or a database.
   The user must create the account (Claude must not create accounts or enter passwords).
3. **Request form** (shown when no Masters link is set) is **not connected**: clients see "thank you" but the salon
   gets nothing. Offer email (e.g. Resend), Telegram bot, or remove the form.
4. Replace placeholders: brand name, address, phone, email, team (Ana, Elena, Maria), currency (MDL/lei?), hours.
   All of these are editable in the editor.
5. Uploaded photos are never deleted from `data/uploads` when removed in the editor (cleanup task).
6. Possible extras discussed earlier: salon presets for the widget, a `/security-review` before real launch.
   Phone layout (~390px) has only been checked at about 600px window width.

## Test login (local)
- The username is `adminbeauty`. The password is the one the user gave in chat on 2026-11-18; never write it into files.
- It is stored hashed in `.env`. Change it with `npm run set-password -- <user> <password>`.
- 8 wrong attempts lock login for 15 minutes per IP. Restarting the server clears the lock.

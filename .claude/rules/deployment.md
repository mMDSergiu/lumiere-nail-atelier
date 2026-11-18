# Running, building, GitHub and hosting

## Local
| Goal | Command | URL |
|---|---|---|
| Full site + salon login (what the owner uses) | `start.bat`, or `npm run build && npm start` | http://localhost:4321 |
| Development with live reload (API included) | `npm run dev` | http://localhost:5173 |
| Static look, no login | open `dist/website/index.html` | file:// |
| Built site via Vite preview (API included) | `npx vite preview` | http://localhost:4173 |

- **Port 3000 is used by another app on the owner's PC.** Never assume it is free; the server uses 4321 (`PORT` in .env).
- The Vite dev server was once killed by Claude Code for low memory. Do not leave dev servers running without need.
- In Chrome automation, screenshots can time out after `javascript_tool`. Prefer clicks, scrolls and `find`.
  Changing only the URL hash does not reload the page: add `?v=n`.

## GitHub
- Repo: https://github.com/mMDSergiu/lumiere-nail-atelier (public, default branch `main`), created with `gh`
  as account mMDSergiu.
- Never committed: `.env`, `data/`, `node_modules/`, `dist/` (see .gitignore).
- Commit or push only when the user asks. Commit messages end with the Co-Authored-By line from the system reminder.

## Free live version: GitHub Pages
- URL: https://mmdsergiu.github.io/lumiere-nail-atelier/
- `.github/workflows/pages.yml`: on every push to `main` it runs `npm ci`, then `npm run build`, then deploys
  `dist/website`.
- It is a static site: everything except the salon editor works. The editor needs the Node server and shows
  the "needs the salon server" message.
- Content shown there is DEFAULT_CONTENT in `website/assets/js/content.js` plus the texts in `i18n.js`.
  To change the live site without a server, edit those files and push.

## Full hosting (editor online): not done yet
- Needs Node 20+ and a **persistent folder** for `DATA_DIR` (content.json + uploads).
- Commands: `npm ci && npm run build && npm start`.
- Env vars: `ADMIN_USER`, `ADMIN_PASSWORD_HASH`, `PORT`, `DATA_DIR`. Behind a proxy also set `TRUST_PROXY=1` and,
  if Host is rewritten, `ALLOWED_ORIGIN=https://your-domain`.
- Options: Render (free web service has no persistent disk, so content is lost on redeploy; a disk is paid),
  Railway or Fly.io (volumes), or a small VPS.
- The user must create the hosting account themselves.

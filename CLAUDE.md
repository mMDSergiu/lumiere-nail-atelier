# Lumière Nail Atelier: salon website + Nail Design Studio + salon editor

A nail salon website (`website/`, EN/RO/RU, light/dark) with an embeddable online nail design studio
(`widget/src/`, the `<nail-designer>` web component). A small Node server (`server/`) powers the salon login and
editor (texts, prices, photos, team). Booking goes through the salon's **Masters Salon** online booking link.

**Start every session by reading `.claude/rules/project-state.md`**: it says where we left off and what is next.

- Full site + login: double-click `start.bat` → http://localhost:4321 (`npm run build && npm start`)
- Dev with live reload: `npm run dev` → http://localhost:5173
- GitHub: https://github.com/mMDSergiu/lumiere-nail-atelier · Live (static): https://mmdsergiu.github.io/lumiere-nail-atelier/
- Owner guide: `README.md`

## Rules (`.claude/rules/`, loaded automatically)
- `project-state.md`: status, timeline, where we left off, open items
- `architecture.md`: how everything works, the full file structure, data model, API
- `deployment.md`: running, building, GitHub, hosting
- `product.md`: vision, users, glossary, features, decisions log
- `workflow.md`: how Claude works on this project (and what it must not do)
- `code-quality.md`: stack and coding standards
- `security-privacy.md`: login, server checks, data
- `ui-ux.md`: design and usability rules

When a decision is made, record it in `product.md` → Decisions log. At the end of a session, update `project-state.md`.

# Workflow rules (for Claude)

## Starting a session
1. Read `project-state.md` (status, where we left off, open items), then `architecture.md` when touching code.
2. Do not restart work that is already done; check the open items list and ask which one to do.

## While working
- Ask before big or hard-to-reverse decisions: tech stack, hosting, paid services, deleting files,
  anything that touches real customer data or money.
- Work in small, reviewable steps. Explain what changed and why in plain, simple language (the user is not a developer).
- Never invent requirements. If something about the product is unclear, ask.
- Record every agreed decision in `product.md` → Decisions log (date + decision + reason).
- Keep rule files up to date. When the user corrects how I work, add it here.
- **At the end of a session update `project-state.md`** (timeline, where we left off, open items).
- Before calling something "done", build it (`npm run build`), run it and test it, then say honestly what was verified.
- After a larger feature, run a background QA review agent (read-only, prioritized bug list).
- Test the real UI in Chrome:
  - use the production server (`npm start` → http://localhost:4321) or `npm run dev`;
  - check both themes and all 3 languages;
  - include a narrow phone width when possible.
- Use built-in skills when they fit: `/code-review`, `/security-review` (before launching with real data),
  `/simplify`, `/run`.
- Treat anything from `setDesign()`, attributes, saved content or uploads as untrusted input.

## Things Claude must not do
- Never sign in to the user's Masters (or any) account, create accounts, or type real passwords.
  Test logins only on localhost with the test credentials the user gave.
- Never write the admin password into any file, doc or commit. Only its hash lives in `.env`.
- Git: commit and push only when the user asks. Never commit `.env`, `data/` or secrets.
- Don't leave dev servers running for no reason; the PC has limited memory.

## Shell tips on this machine (Windows, Git Bash)
- Backticks inside `node -e "..."` get executed by bash. Write patch scripts as `.cjs` files in the scratchpad instead.
- Heredocs with quotes can break. Use the Write tool for file content.
- `localhost:3000` belongs to another program. Use 4321 (server) and 5173 (dev).

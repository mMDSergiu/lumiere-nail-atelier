# Security & privacy

## Data
- Client data (names, phone numbers, appointments, photos) is personal data. Collect only what is needed and
  follow GDPR. Bookings live in Masters, not on our server.
- Our server stores only salon content and uploaded photos (`data/`). Never store card numbers. Payments, if
  ever added, go through a provider such as Stripe.

## Salon login (server/api.js)
- Credentials live only in `.env`: `ADMIN_USER` and an scrypt `ADMIN_PASSWORD_HASH`, written by
  `npm run set-password`. Never write the password in code, docs, commits or chat.
- Session: a random 32-byte token in memory, HttpOnly + SameSite=Strict cookie (+ Secure behind https), 12 hours.
- Login rate limit: 8 attempts per 15 minutes per IP, counted *before* the password check. `TRUST_PROXY=1`
  uses X-Forwarded-For.
- CSRF: every write must be `Content-Type: application/json`, and its Origin must match Host (or `ALLOWED_ORIGIN`).
- Uploads: data-URL JPEG/PNG/WebP only, checked by magic bytes, ≤ 20 MB body, random file names, served with
  `nosniff`. Only `uploads/<24 hex>.<ext>` paths are accepted anywhere.
- All saved content passes `sanitizeContent()`: types, lengths, enums, https links, upload paths.
- The static server blocks path traversal, sends a CSP (`script-src 'self'`, `frame-src https:`), and sets
  X-Frame-Options SAMEORIGIN and nosniff. Bad URL encodings return 400; they must never crash the process.

## Before going live with the editor
- Use HTTPS, a strong new password (`npm run set-password`), and a persistent, backed-up `DATA_DIR`.
- Run `/security-review`.

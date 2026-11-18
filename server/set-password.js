// Creates or changes the salon login. Usage: npm run set-password -- <user> <password>
// Stores the username and a scrypt hash (never the password itself) in .env.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hashPassword } from './api.js';

const [user, password] = process.argv.slice(2);
if (!user || !password) {
  console.error('Usage: npm run set-password -- <user> <password>');
  process.exit(1);
}
if (!/^[A-Za-z0-9._@-]{3,40}$/.test(user)) {
  console.error('Use 3-40 letters, digits or . _ @ - for the username.');
  process.exit(1);
}
if (password.length < 8 || /[\r\n]/.test(password)) {
  console.error('Use a password of at least 8 characters.');
  process.exit(1);
}

const envFile = join(fileURLToPath(new URL('..', import.meta.url)), '.env');
const keep = existsSync(envFile)
  ? readFileSync(envFile, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line.trim() && !/^(ADMIN_USER|ADMIN_PASSWORD_HASH)=/.test(line))
  : [];
const lines = [...keep, `ADMIN_USER=${user}`, `ADMIN_PASSWORD_HASH=${await hashPassword(password)}`];
writeFileSync(envFile, lines.join('\n') + '\n', 'utf8');
console.log(`Salon login saved for "${user}". Restart the server to use it.`);

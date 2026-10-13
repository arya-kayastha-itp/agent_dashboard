require('dotenv').config();
const db = require('./databricksClient');
const env = require('../config/env');
const usersService = require('../services/users.service');

// Prints a fresh set-password link for an existing account. This is how the
// first Agent Manager gets in after migration 010 (everyone else is invited
// from the Teams page), and a fallback if someone is locked out of email.
// Links point at APP_URL — set it to the deployed URL for a production link.
//
// Usage: npm run users:link --workspace backend -- someone@intuitive.ai
async function run() {
  const email = (process.argv[2] || '').trim().toLowerCase();
  if (!email) {
    console.error('Usage: npm run users:link --workspace backend -- <email>');
    process.exitCode = 1;
    return;
  }

  const account = await db.queryOne('SELECT id FROM users WHERE email = :email', { email });
  if (!account) {
    console.error(`No account for ${email}. Accounts are created from the Teams page (or migration 010).`);
    process.exitCode = 1;
    return;
  }

  const link = await usersService.sendNewLink(account.id, { id: null });
  console.log(`\n${link.purpose === 'invite' ? 'Invite' : 'Password reset'} link for ${email} (expires ${link.expiresAt}):\n`);
  console.log(`  ${link.url}\n`);
  console.log(link.emailed ? 'It was also emailed.' : `Not emailed — email isn't configured. Links point at ${env.appUrl}.`);
}

run()
  .catch((err) => {
    console.error('Failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => db.close());

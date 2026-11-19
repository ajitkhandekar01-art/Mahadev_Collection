const readline = require('readline');
const crypto = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const db = require('../server/db');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function main() {
  console.log('\n=======================================');
  console.log(' Mahadev Collection - Set Admin Password');
  console.log('=======================================\n');

  try {
    let email = '';
    while (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      email = (await ask('Admin Email: ')).trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        console.log('Please enter a valid email address.');
      }
    }

    let password = '';
    while (!password || password.length < 8) {
      password = (await ask('Admin Password (min 8 chars): ')).trim();
      if (password.length < 8) {
        console.log('Password must be at least 8 characters long.');
      }
    }

    const { salt, hash } = hashPassword(password);

    const stmt = db.prepare(`
      INSERT INTO admin_users (email, password_hash, salt, created_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(email) DO UPDATE SET
        password_hash = excluded.password_hash,
        salt = excluded.salt
    `);

    stmt.run(email, hash, salt);

    console.log(`\nAdmin user '${email}' configured successfully!`);
    console.log('You can now log in at http://localhost:3000/admin.html\n');
  } catch (err) {
    console.error('Error setting admin credentials:', err.message);
  } finally {
    rl.close();
    process.exit(0);
  }
}

main();


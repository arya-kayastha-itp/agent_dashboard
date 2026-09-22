require('dotenv').config();
const db = require('./src/db/databricksClient');

async function run() {
  const rows = await db.query('SELECT id, name, assigned_to FROM agents ORDER BY sort_order');
  console.log(JSON.stringify(rows, null, 2));
}

run()
  .catch((err) => { console.error('Query failed:', err); process.exitCode = 1; })
  .finally(() => db.close());

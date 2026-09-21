require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./databricksClient');

const MIGRATIONS_DIR = path.join(__dirname, 'databricks-migrations');

function splitStatements(sql) {
  return sql
    .split(';')
    .map((s) => s.trim())
    // A trailing `-- comment` block after the last real statement splits off
    // as its own "statement" with no executable SQL in it — drop those.
    .filter((s) => s.replace(/--.*/g, '').trim().length > 0);
}

// A statement can already have taken effect on a prior run that failed
// partway through the same file (before it got recorded in
// schema_migrations) — CREATE TABLE IF NOT EXISTS already tolerates that,
// but ALTER TABLE ADD CONSTRAINT has no IF NOT EXISTS equivalent, so treat
// "already exists" as success rather than aborting the rest of the file.
async function runStatement(statement) {
  try {
    await db.query(statement);
  } catch (err) {
    if (/already exists/i.test(err.message || '')) {
      console.log(`  (already applied, skipping) ${statement.split('\n')[0].slice(0, 80)}`);
      return;
    }
    throw err;
  }
}

async function getAppliedMigrations() {
  try {
    const rows = await db.query('SELECT name FROM schema_migrations');
    return new Set(rows.map((r) => r.name));
  } catch (err) {
    // schema_migrations doesn't exist yet — first run.
    return new Set();
  }
}

async function run() {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  // 000_create_schema_migrations.sql must run unconditionally first so the
  // tracking table exists before we ask what's already applied.
  const bootstrapFile = files.find((f) => f.startsWith('000_'));
  if (bootstrapFile) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, bootstrapFile), 'utf8');
    for (const statement of splitStatements(sql)) {
      await runStatement(statement);
    }
    console.log(`Applied ${bootstrapFile}`);
  }

  const applied = await getAppliedMigrations();

  for (const file of files) {
    if (file === bootstrapFile || applied.has(file)) {
      continue;
    }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    for (const statement of splitStatements(sql)) {
      await runStatement(statement);
    }
    await db.query('INSERT INTO schema_migrations (name, applied_at) VALUES (:name, current_timestamp())', {
      name: file,
    });
    console.log(`Applied ${file}`);
  }

  console.log('Databricks migrations up to date.');
}

run()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  })
  .finally(() => db.close());

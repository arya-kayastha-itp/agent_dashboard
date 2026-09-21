// One-time data load: parses a `scripts/backup-db.js` pg_dump (plain-text,
// COPY format) directly and inserts its rows into the already-migrated
// Databricks tables (run `npm run migrate:databricks --workspace backend`
// first so the tables exist). Reads the dump file itself rather than
// connecting to a live Postgres, so it works even when the Postgres
// container isn't running. Safe to re-run: each table is cleared before
// it's repopulated.
//
// Usage: node src/db/load-backup-to-databricks.js [path/to/backup.sql]
// (defaults to the most recent file in backups/, like scripts/restore-db.js)
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./databricksClient');

const TABLE_DEFS = {
  agents: {
    casts: { eta: 'DATE', current_progress: 'INT', sort_order: 'INT', last_update_at: 'TIMESTAMP', created_at: 'TIMESTAMP', updated_at: 'TIMESTAMP' },
  },
  agent_updates: {
    casts: { update_date: 'DATE', progress: 'INT', created_at: 'TIMESTAMP' },
  },
  model_pricing: {
    casts: { input_price_per_1k_tokens: 'DECIMAL(12,6)', output_price_per_1k_tokens: 'DECIMAL(12,6)', effective_from: 'TIMESTAMP', created_at: 'TIMESTAMP' },
  },
  api_usage_logs: {
    casts: { tokens_input: 'INT', tokens_output: 'INT', tokens_total: 'INT', cost_usd: 'DECIMAL(12,6)', latency_ms: 'INT', occurred_at: 'TIMESTAMP', created_at: 'TIMESTAMP' },
  },
  finops_thresholds: {
    casts: { threshold_value: 'DECIMAL(12,4)', window_minutes: 'INT', created_at: 'TIMESTAMP', updated_at: 'TIMESTAMP' },
  },
  finops_alerts: {
    casts: { created_at: 'TIMESTAMP', resolved_at: 'TIMESTAMP' },
  },
};

// Parent-before-child for readability; Delta doesn't enforce FKs so order
// doesn't affect correctness. Cleared in reverse before reload.
const LOAD_ORDER = ['agents', 'agent_updates', 'model_pricing', 'api_usage_logs', 'finops_thresholds', 'finops_alerts'];

function unescapeCopyValue(raw) {
  if (raw === '\\N') return null;
  return raw.replace(/\\(t|n|r|\\)/g, (_, c) => ({ t: '\t', n: '\n', r: '\r', '\\': '\\' }[c]));
}

function parseDump(sql) {
  const tables = {};
  const copyRegex = /^COPY public\.(\w+) \(([^)]*)\) FROM stdin;\n([\s\S]*?)^\\\.$/gm;
  let match = copyRegex.exec(sql);
  while (match) {
    const [, table, columnList, body] = match;
    const columns = columnList.split(',').map((c) => c.trim());
    const rows = body
      .split('\n')
      .filter((line) => line.length > 0)
      .map((line) => line.split('\t').map(unescapeCopyValue));
    tables[table] = { columns, rows };
    match = copyRegex.exec(sql);
  }
  return tables;
}

function resolveBackupFile(argPath) {
  const rootDir = path.join(__dirname, '..', '..', '..');
  if (argPath) {
    return path.isAbsolute(argPath) ? argPath : path.join(rootDir, argPath);
  }
  const backupsDir = path.join(rootDir, 'backups');
  const files = fs
    .readdirSync(backupsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  if (files.length === 0) {
    throw new Error(`No .sql backups found in ${backupsDir}`);
  }
  return path.join(backupsDir, files[files.length - 1]);
}

async function loadTable(name, parsed) {
  const table = parsed[name];
  const def = TABLE_DEFS[name];
  if (!table) {
    console.log(`${name}: not present in dump, skipping`);
    return;
  }

  await db.query(`DELETE FROM ${name}`);

  if (table.rows.length === 0) {
    console.log(`${name}: 0 rows`);
    return;
  }

  const valuesSql = table.columns.map((c) => (def.casts[c] ? `CAST(:${c} AS ${def.casts[c]})` : `:${c}`)).join(', ');
  const insertSql = `INSERT INTO ${name} (${table.columns.join(', ')}) VALUES (${valuesSql})`;

  for (const rowValues of table.rows) {
    const params = {};
    table.columns.forEach((col, i) => {
      params[col] = rowValues[i];
    });
    // eslint-disable-next-line no-await-in-loop
    await db.query(insertSql, params);
  }

  console.log(`${name}: ${table.rows.length} row(s) loaded`);
}

async function run() {
  const file = resolveBackupFile(process.argv[2]);
  console.log(`Loading backup from ${file} ...`);
  const sql = fs.readFileSync(file, 'utf8');
  const parsed = parseDump(sql);

  for (const table of LOAD_ORDER) {
    // eslint-disable-next-line no-await-in-loop
    await loadTable(table, parsed);
  }

  console.log('Backup load complete.');
}

run()
  .catch((err) => {
    console.error('Load failed:', err);
    process.exitCode = 1;
  })
  .finally(() => db.close());

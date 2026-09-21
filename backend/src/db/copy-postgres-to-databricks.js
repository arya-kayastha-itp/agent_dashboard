// One-time data copy: reads every row out of the old Postgres database and
// inserts it into the already-migrated Databricks tables (run
// `npm run migrate:databricks --workspace backend` first so the tables
// exist). Safe to re-run: each table is truncated before it's repopulated,
// so re-running after a partial failure doesn't duplicate rows.
//
// Usage: npm run copy:postgres-to-databricks --workspace backend
require('dotenv').config();
const { Client } = require('pg');
const db = require('./databricksClient');

const TABLES = [
  {
    name: 'agents',
    columns: ['id', 'name', 'description', 'assigned_to', 'eta', 'current_status', 'current_progress', 'current_status_description', 'last_update_at', 'sort_order', 'created_at', 'updated_at'],
    casts: { eta: 'DATE', last_update_at: 'TIMESTAMP', created_at: 'TIMESTAMP', updated_at: 'TIMESTAMP' },
  },
  {
    name: 'agent_updates',
    columns: ['id', 'agent_id', 'update_date', 'status', 'progress', 'status_description', 'source', 'created_at'],
    casts: { update_date: 'DATE', created_at: 'TIMESTAMP' },
  },
  {
    name: 'model_pricing',
    columns: ['id', 'model', 'input_price_per_1k_tokens', 'output_price_per_1k_tokens', 'effective_from', 'created_at', 'created_by'],
    casts: { input_price_per_1k_tokens: 'DECIMAL(12,6)', output_price_per_1k_tokens: 'DECIMAL(12,6)', effective_from: 'TIMESTAMP', created_at: 'TIMESTAMP' },
  },
  {
    name: 'api_usage_logs',
    columns: ['id', 'agent_id', 'request_id', 'endpoint', 'model', 'tokens_input', 'tokens_output', 'tokens_total', 'status', 'error_category', 'error_code', 'cost_usd', 'latency_ms', 'source', 'occurred_at', 'created_at', 'raw_metadata'],
    casts: { cost_usd: 'DECIMAL(12,6)', occurred_at: 'TIMESTAMP', created_at: 'TIMESTAMP' },
    transform: (row) => ({ ...row, raw_metadata: row.raw_metadata ? JSON.stringify(row.raw_metadata) : null }),
  },
  {
    name: 'finops_thresholds',
    columns: ['id', 'agent_id', 'alert_type', 'threshold_value', 'window_minutes', 'created_at', 'updated_at'],
    casts: { threshold_value: 'DECIMAL(12,4)', created_at: 'TIMESTAMP', updated_at: 'TIMESTAMP' },
  },
  {
    name: 'finops_alerts',
    columns: ['id', 'agent_id', 'alert_type', 'severity', 'message', 'details', 'status', 'created_at', 'resolved_at'],
    casts: { created_at: 'TIMESTAMP', resolved_at: 'TIMESTAMP' },
    transform: (row) => ({ ...row, details: row.details ? JSON.stringify(row.details) : null }),
  },
];

function toParamValue(value) {
  if (value instanceof Date) return value.toISOString();
  return value;
}

async function copyTable(pg, table) {
  const { rows } = await pg.query(`SELECT ${table.columns.join(', ')} FROM ${table.name}`);
  console.log(`${table.name}: ${rows.length} row(s) to copy`);

  await db.query(`DELETE FROM ${table.name}`);

  const valuesSql = table.columns.map((c) => (table.casts[c] ? `CAST(:${c} AS ${table.casts[c]})` : `:${c}`)).join(', ');
  const insertSql = `INSERT INTO ${table.name} (${table.columns.join(', ')}) VALUES (${valuesSql})`;

  for (const rawRow of rows) {
    const row = table.transform ? table.transform(rawRow) : rawRow;
    const params = {};
    for (const column of table.columns) params[column] = toParamValue(row[column]);
    // eslint-disable-next-line no-await-in-loop
    await db.query(insertSql, params);
  }

  console.log(`${table.name}: done`);
}

async function run() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set — nothing to copy from.');
  }

  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  try {
    for (const table of TABLES) {
      // eslint-disable-next-line no-await-in-loop
      await copyTable(pg, table);
    }
    console.log('Postgres -> Databricks copy complete.');
  } finally {
    await pg.end();
  }
}

run()
  .catch((err) => {
    console.error('Copy failed:', err);
    process.exitCode = 1;
  })
  .finally(() => db.close());

// One-time verification: compares every row of every migrated table between
// the live Postgres database and Databricks, so the Postgres cutover can be
// confirmed safe before Postgres is decommissioned.
//
// Usage: node src/db/verify-migration.js
require('dotenv').config();
const crypto = require('crypto');
const { Client, types } = require('pg');
const db = require('./databricksClient');

// DATE columns (OID 1082) come back from node-postgres as a JS Date built
// from the local timezone at midnight; leaving that default on means
// .toISOString() later shifts the value onto the wrong calendar day on any
// machine not in UTC. Keep the raw 'YYYY-MM-DD' string instead so date-only
// columns compare on the actual calendar date, not a timezone-shifted one.
types.setTypeParser(1082, (value) => value);

const TABLES = [
  { name: 'agents', columns: ['id', 'name', 'description', 'assigned_to', 'eta', 'current_status', 'current_progress', 'current_status_description', 'last_update_at', 'sort_order', 'created_at', 'updated_at'], json: [], dateOnly: ['eta'] },
  { name: 'agent_updates', columns: ['id', 'agent_id', 'update_date', 'status', 'progress', 'status_description', 'source', 'created_at'], json: [], dateOnly: ['update_date'] },
  { name: 'model_pricing', columns: ['id', 'model', 'input_price_per_1k_tokens', 'output_price_per_1k_tokens', 'effective_from', 'created_at', 'created_by'], json: [], dateOnly: [] },
  { name: 'api_usage_logs', columns: ['id', 'agent_id', 'request_id', 'endpoint', 'model', 'tokens_input', 'tokens_output', 'tokens_total', 'status', 'error_category', 'error_code', 'cost_usd', 'latency_ms', 'source', 'occurred_at', 'created_at', 'raw_metadata'], json: ['raw_metadata'], dateOnly: [] },
  { name: 'finops_thresholds', columns: ['id', 'agent_id', 'alert_type', 'threshold_value', 'window_minutes', 'created_at', 'updated_at'], json: [], dateOnly: [] },
  { name: 'finops_alerts', columns: ['id', 'agent_id', 'alert_type', 'severity', 'message', 'details', 'status', 'created_at', 'resolved_at'], json: ['details'], dateOnly: [] },
];

function normalizeValue(value, isJson, isDateOnly) {
  if (value === null || value === undefined) return '';
  if (isJson) {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return JSON.stringify(parsed, Object.keys(parsed || {}).sort());
  }
  if (isDateOnly) {
    // Postgres gives the raw 'YYYY-MM-DD' string (see setTypeParser above);
    // Databricks gives a Date at UTC midnight for the same calendar date.
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value).slice(0, 10);
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number') return String(value);
  // Decimal columns can come back as string from one driver and number from
  // the other; normalize numeric-looking strings to a fixed representation.
  if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value)) return String(Number(value));
  return String(value);
}

function rowHash(table, row) {
  const parts = table.columns.map((c) => normalizeValue(row[c], table.json.includes(c), table.dateOnly.includes(c)));
  return crypto.createHash('sha256').update(parts.join('\u0001')).digest('hex');
}

async function fetchRowsById(pg, table) {
  const { rows: pgRows } = await pg.query(`SELECT ${table.columns.join(', ')} FROM ${table.name} ORDER BY id`);
  const dbRows = await db.query(`SELECT ${table.columns.join(', ')} FROM ${table.name} ORDER BY id`);
  return { pgRows, dbRows };
}

async function verifyTable(pg, table) {
  const { pgRows, dbRows } = await fetchRowsById(pg, table);
  const result = { table: table.name, pgCount: pgRows.length, dbCount: dbRows.length, mismatches: [], missingInDb: [], missingInPg: [] };

  const dbById = new Map(dbRows.map((r) => [String(r.id), r]));
  const pgIds = new Set(pgRows.map((r) => String(r.id)));

  for (const pgRow of pgRows) {
    const id = String(pgRow.id);
    const dbRow = dbById.get(id);
    if (!dbRow) {
      result.missingInDb.push(id);
      continue;
    }
    const pgHash = rowHash(table, pgRow);
    const dbHash = rowHash(table, dbRow);
    if (pgHash !== dbHash) {
      result.mismatches.push({ id, pg: pgRow, db: dbRow });
    }
  }

  for (const dbRow of dbRows) {
    if (!pgIds.has(String(dbRow.id))) result.missingInPg.push(String(dbRow.id));
  }

  return result;
}

async function run() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set — nothing to verify against.');
  }

  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  let allOk = true;
  try {
    for (const table of TABLES) {
      // eslint-disable-next-line no-await-in-loop
      const result = await verifyTable(pg, table);
      const ok = result.pgCount === result.dbCount && result.mismatches.length === 0 && result.missingInDb.length === 0 && result.missingInPg.length === 0;
      allOk = allOk && ok;
      console.log(`${ok ? 'OK  ' : 'FAIL'} ${result.table}: postgres=${result.pgCount} databricks=${result.dbCount}` + (ok ? '' : ` mismatches=${result.mismatches.length} missingInDb=${result.missingInDb.length} missingInPg=${result.missingInPg.length}`));
      if (!ok) {
        if (result.missingInDb.length) console.log(`  missing in Databricks: ${result.missingInDb.join(', ')}`);
        if (result.missingInPg.length) console.log(`  missing in Postgres: ${result.missingInPg.join(', ')}`);
        for (const m of result.mismatches) {
          console.log(`  mismatch id=${m.id}`);
          console.log(`    pg: ${JSON.stringify(m.pg)}`);
          console.log(`    db: ${JSON.stringify(m.db)}`);
        }
      }
    }
  } finally {
    await pg.end();
  }

  console.log(allOk ? '\nAll tables match.' : '\nMismatches found — see above.');
  process.exitCode = allOk ? 0 : 1;
}

run()
  .catch((err) => {
    console.error('Verification failed:', err);
    process.exitCode = 1;
  })
  .finally(() => db.close());

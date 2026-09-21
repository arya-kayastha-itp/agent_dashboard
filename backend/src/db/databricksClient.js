const { DBSQLClient } = require('@databricks/sql');

const CATALOG = process.env.DATABRICKS_CATALOG;
const SCHEMA = process.env.DATABRICKS_SCHEMA;

let client = null;
let connectPromise = null;

// The TLS/auth handshake is the expensive part of talking to a SQL Warehouse,
// so one DBSQLClient connection is kept alive for the process lifetime and
// reused; a fresh, cheap session is opened per query so concurrent requests
// don't share operation state.
async function getConnection() {
  if (!connectPromise) {
    client = new DBSQLClient();
    connectPromise = client
      .connect({
        host: process.env.DATABRICKS_HOST,
        path: process.env.DATABRICKS_HTTP_PATH,
        token: process.env.DATABRICKS_TOKEN,
      })
      .catch((err) => {
        connectPromise = null;
        throw err;
      });
  }
  return connectPromise;
}

// Runs one DDL/DML statement and returns its rows (or [] for statements with
// no result set). `namedParameters` are bound server-side by the driver, so
// callers must never interpolate values into `sql` directly.
async function query(sql, namedParameters = {}) {
  const connection = await getConnection();
  const session = await connection.openSession({
    initialCatalog: CATALOG,
    initialSchema: SCHEMA,
  });
  try {
    const operation = await session.executeStatement(sql, {
      namedParameters,
      runAsync: true,
    });
    const rows = await operation.fetchAll();
    await operation.close();
    return rows;
  } finally {
    await session.close();
  }
}

async function close() {
  if (client) {
    await client.close();
    client = null;
    connectPromise = null;
  }
}

module.exports = { query, close };

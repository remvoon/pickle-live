/**
 * D1 Database helpers for pickle-live
 */

/**
 * Execute a query with optional bindings
 * Uses .all() binding instead of .bind() to avoid D1 binding issues
 */
export async function query(db, sql, ...bindings) {
  let stmt = db.prepare(sql);
  if (bindings && bindings.length > 0) {
    stmt = stmt.bind(...bindings);
  }
  const result = await stmt.all();
  return result.results || [];
}

/**
 * Execute a query and return the first row
 */
export async function queryOne(db, sql, ...bindings) {
  let stmt = db.prepare(sql);
  if (bindings && bindings.length > 0) {
    stmt = stmt.bind(...bindings);
  }
  const result = await stmt.first();
  return result || null;
}

/**
 * Execute a query that returns no rows (INSERT, UPDATE, DELETE)
 */
export async function execute(db, sql, ...bindings) {
  let stmt = db.prepare(sql);
  if (bindings && bindings.length > 0) {
    stmt = stmt.bind(...bindings);
  }
  const result = await stmt.run();
  return result;
}

/**
 * Execute multiple statements in a batch
 */
export async function batch(db, statements) {
  const prepared = statements.map(([sql, ...bindings]) => {
    let stmt = db.prepare(sql);
    if (bindings && bindings.length > 0) {
      stmt = stmt.bind(...bindings);
    }
    return stmt;
  });
  const results = await db.batch(prepared);
  return results;
}

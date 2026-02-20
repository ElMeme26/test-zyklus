import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
});

export async function query<T = pg.QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}

export async function healthCheck(): Promise<boolean> {
  try {
    const result = await query('SELECT 1 as ok');
    return result.rowCount !== null && result.rowCount > 0;
  } catch {
    return false;
  }
}

export default pool;

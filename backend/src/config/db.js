import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
dotenv.config({ path: path.join(backendRoot, '.env') });

const { Pool } = pg;
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required in backend/.env');
}

const useSsl =
  process.env.DATABASE_SSL === 'true' ||
  /sslmode=require|ssl=true/i.test(process.env.DATABASE_URL || '');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_SIZE) || 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS) || 15000,
  ...(useSsl ? { ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' } } : {}),
});

console.log('DB CONFIG => (using DATABASE_URL)');

// An idle Postgres socket can be closed by the server. Without this listener,
// Node treats the pool "error" event as fatal and exits, so :5001 refuses
// connections until the process is started again.
pool.on('error', (err) => {
  console.error('[db] idle connection dropped; the pool will reconnect:', err?.message || err);
});

// Do not block process startup on this ping. The HTTP server must listen
// immediately; a slow database check used to leave :5001 closed while Vite
// was already proxying dashboard requests.
pool
  .query('SELECT current_user, current_database()')
  .then((test) => {
    console.log('DB CONNECTED =>', test.rows);
  })
  .catch((err) => {
    console.error('DB CONNECTION TEST FAILED =>', err);
  });

export async function query(text, params) {
  return await pool.query(text, params);
}

/** Run work inside a single client transaction. */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      /* ignore rollback errors */
    }
    throw err;
  } finally {
    client.release();
  }
}

export default pool;
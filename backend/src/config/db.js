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

try {
  const test = await pool.query('SELECT current_user, current_database()');
  console.log('DB CONNECTED =>', test.rows);
} catch (err) {
  console.error('DB CONNECTION TEST FAILED =>', err);
}

export async function query(text, params) {
  return await pool.query(text, params);
}

export default pool;
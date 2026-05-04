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

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
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
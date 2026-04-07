import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
dotenv.config({ path: path.join(backendRoot, '.env') });

const { Pool } = pg;

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'admin@123',
  database: process.env.DB_NAME || 'Placement_Tracking',
  max: 10,
  idleTimeoutMillis: 30000,
};

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
    })
  : new Pool(dbConfig);

console.log(
  'DB CONFIG =>',
  process.env.DATABASE_URL ? '(using DATABASE_URL)' : dbConfig,
);

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